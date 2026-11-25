import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { parsePptx } from "./pptx";

const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const shape = (ph: string, paragraphs: string[]) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="2" name="s"/><p:cNvSpPr/><p:nvPr>${ph}</p:nvPr></p:nvSpPr><p:txBody>${paragraphs
    .map((t) => `<a:p><a:r><a:t>${t}</a:t></a:r></a:p>`)
    .join("")}</p:txBody></p:sp>`;
const slideXml = (shapes: string[]) => `<p:sld ${NS}><p:cSld><p:spTree>${shapes.join("")}</p:spTree></p:cSld></p:sld>`;

/** 시험용 .pptx. files는 ppt/slides/ 아래 파일 이름과 XML이다. */
async function makePptx(files: Record<string, string>): Promise<Uint8Array> {
  const zip = new JSZip();
  for (const [name, xml] of Object.entries(files)) zip.file(`ppt/slides/${name}`, xml);
  return zip.generateAsync({ type: "uint8array" });
}

describe("parsePptx", () => {
  it("슬라이드마다 제목과 본문을 뽑는다", async () => {
    const bytes = await makePptx({
      "slide1.xml": slideXml([shape('<p:ph type="title"/>', ["전기의 이용"]), shape('<p:ph idx="1"/>', ["전지를 잇는다", "전구가 켜진다"])]),
    });
    const r = await parsePptx(bytes);
    expect(r).toEqual({ ok: true, value: [{ title: "전기의 이용", text: "전지를 잇는다\n전구가 켜진다" }] });
  });

  it("slide2가 slide10보다 앞이다(숫자 순서)", async () => {
    const mk = (t: string) => slideXml([shape('<p:ph type="title"/>', [t])]);
    const bytes = await makePptx({ "slide10.xml": mk("열"), "slide2.xml": mk("둘"), "slide1.xml": mk("하나") });
    const r = await parsePptx(bytes);
    expect(r.ok && r.value.map((s) => s.title)).toEqual(["하나", "둘", "열"]);
  });

  it("제목 칸이 없으면 첫 문단이 제목이다", async () => {
    const bytes = await makePptx({ "slide1.xml": slideXml([shape("", ["첫 줄", "둘째 줄"])]) });
    const r = await parsePptx(bytes);
    expect(r.ok && r.value).toEqual([{ title: "첫 줄", text: "둘째 줄" }]);
  });

  it("XML 기호를 글자로 되돌리고, 글이 없는 슬라이드는 건너뛴다", async () => {
    const bytes = await makePptx({
      "slide1.xml": slideXml([shape('<p:ph type="title"/>', ["A &amp; B &lt;전구&gt;"])]),
      "slide2.xml": slideXml([]),
    });
    const r = await parsePptx(bytes);
    expect(r.ok && r.value.map((s) => s.title)).toEqual(["A & B <전구>"]);
  });

  it("pptx가 아니거나 글을 찾지 못하면 file 오류를 돌려준다", async () => {
    const notZip = await parsePptx(new TextEncoder().encode("hello"));
    expect(notZip).toMatchObject({ ok: false, errors: { file: expect.stringContaining("PowerPoint") } });
    const empty = await parsePptx(await makePptx({ "slide1.xml": slideXml([]) }));
    expect(empty).toMatchObject({ ok: false, errors: { file: expect.stringContaining("글") } });
  });

  it("슬라이드는 60장까지만 받는다", async () => {
    const files = Object.fromEntries(
      Array.from({ length: 61 }, (_, i) => [`slide${i + 1}.xml`, slideXml([shape('<p:ph type="title"/>', [`슬라이드 ${i + 1}`])])]),
    );
    const r = await parsePptx(await makePptx(files));
    expect(r).toMatchObject({ ok: false, errors: { file: expect.stringContaining("60") } });
  });
});

describe("parsePptx 그림", () => {
  const pic = (rid: string) => `<p:pic><p:blipFill><a:blip r:embed="${rid}"/></p:blipFill></p:pic>`;
  const withMedia = async (media: Record<string, number>, rels: string) => {
    const zip = new JSZip();
    zip.file("ppt/slides/slide1.xml", slideXml([shape('<p:ph type="title"/>', ["회로"]), pic("rId2"), pic("rId3")]).replace(NS, `${NS} xmlns:r="r"`));
    zip.file("ppt/slides/_rels/slide1.xml.rels", `<Relationships>${rels}</Relationships>`);
    for (const [name, size] of Object.entries(media)) zip.file(`ppt/media/${name}`, new Uint8Array(size).fill(1));
    return parsePptx(await zip.generateAsync({ type: "uint8array" }));
  };
  const rel = (id: string, target: string) => `<Relationship Target="${target}" Id="${id}" Type="image"/>`;

  it("슬라이드의 그림을 data: 주소로 가져오고 EMF 같은 형식은 건너뛴다", async () => {
    const r = await withMedia({ "a.png": 4, "b.emf": 4 }, rel("rId2", "../media/a.png") + rel("rId3", "../media/b.emf"));
    expect(r.ok && r.value[0].images).toEqual(["data:image/png;base64,AQEBAQ=="]);
  });

  it("그림 하나가 3MB를 넘으면 file 오류를 돌려준다", async () => {
    const r = await withMedia({ "a.png": 3 * 1024 * 1024 + 1 }, rel("rId2", "../media/a.png"));
    expect(!r.ok && r.errors.file).toMatch(/그림/);
  });
});
