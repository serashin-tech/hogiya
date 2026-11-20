import JSZip from "jszip";
import { fail, ok, type Result } from "./result";

export type Slide = { title: string; text: string };

const MAX_SLIDES = 60;
const MAX_SLIDE_XML = 5 * 1024 * 1024; // 압축을 풀었을 때 슬라이드 하나의 한도(zip 폭탄 방지)
const NOT_PPTX = "PowerPoint(.pptx) 파일이 아닙니다. 파일을 확인해 주세요";

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (m, e: string) => {
    if (e[0] !== "#") return ENTITIES[e.toLowerCase()];
    const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : m;
  });

/** <a:p> 문단마다 글자(<a:t>)를 이어 붙인다. 빈 문단은 뺀다. */
const paragraphs = (xml: string): string[] =>
  [...xml.matchAll(/<a:p[ >][\s\S]*?<\/a:p>/g)]
    .map((p) => decode([...p[0].matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)].map((t) => t[1]).join("")).trim())
    .filter(Boolean);

function readSlide(xml: string): Slide | undefined {
  const shapes = [...xml.matchAll(/<p:sp[ >][\s\S]*?<\/p:sp>/g)].map((m) => m[0]);
  const isTitle = (s: string) => /<p:ph[^>]*type="(?:title|ctrTitle)"/.test(s);
  const titleParas = shapes.filter(isTitle).flatMap(paragraphs);
  const bodyParas = shapes.filter((s) => !isTitle(s)).flatMap(paragraphs);
  if (titleParas.length) return { title: titleParas.join(" "), text: bodyParas.join("\n") };
  const [first, ...rest] = bodyParas;
  return first ? { title: first, text: rest.join("\n") } : undefined;
}

/**
 * .pptx에서 슬라이드의 제목과 본문 글을 뽑는다. 모양과 그림은 가져오지 않는다.
 * 파일은 파싱만 하고 어디에도 쓰지 않는다.
 */
export async function parsePptx(bytes: Uint8Array | ArrayBuffer): Promise<Result<Slide[]>> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    return fail({ file: NOT_PPTX });
  }
  const files = Object.keys(zip.files)
    .map((name) => ({ name, n: /^ppt\/slides\/slide(\d+)\.xml$/.exec(name)?.[1] }))
    .filter((f): f is { name: string; n: string } => f.n !== undefined)
    .sort((a, b) => Number(a.n) - Number(b.n));
  if (files.length === 0) return fail({ file: NOT_PPTX });
  if (files.length > MAX_SLIDES) return fail({ file: `슬라이드는 ${MAX_SLIDES}장까지 올릴 수 있습니다` });

  const slides: Slide[] = [];
  for (const { name } of files) {
    const entry = zip.files[name];
    const size = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
    if (size > MAX_SLIDE_XML) return fail({ file: "슬라이드 하나가 너무 큽니다" });
    const slide = readSlide(await entry.async("string"));
    if (slide) slides.push(slide);
  }
  if (slides.length === 0) return fail({ file: "슬라이드에서 글을 찾지 못했습니다. 글이 든 슬라이드가 있는지 확인해 주세요" });
  return ok(slides);
}
