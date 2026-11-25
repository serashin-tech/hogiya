import { freshData } from "./mock-data";
import { saveRetelling } from "./review";
import { loadSynthetic } from "./synthetic";
import type { Data } from "./types";

const teacher = { role: "teacher", id: "t-과학" } as const;

/**
 * 화면 확인용 데이터. 기본 시드에 자료를 더하고, 합성 시도(학생 1~8번)를 쌓고, 복습 중인 학생을 한 명 만든다.
 * 테스트가 쓰는 freshData()는 그대로 두고 앱 저장소(store.ts)만 이 함수를 쓴다.
 */
export function demoData(): Data {
  const data = freshData();
  data.materials.push(
    {
      id: "m-electric-2",
      lessonId: "l-electric",
      title: "전기 회로 만들기",
      body: "전지, 전선, 전구, 스위치를 끊김 없이 이으면 전류가 흘러 전구에 불이 켜진다. 스위치를 열면 회로가 끊겨 불이 꺼진다.",
    },
    {
      id: "m-electric-3",
      lessonId: "l-electric",
      title: "전기를 안전하게 쓰는 방법",
      body: "젖은 손으로 전기 기구를 만지지 않는다. 한 개의 멀티탭에 많은 전기 기구를 꽂지 않는다.",
    },
  );
  loadSynthetic(data, teacher, "l-electric");
  addCombustionLesson(data);
  loadSynthetic(data, teacher, "l-combustion");

  // 학생 2번은 다시 설명하기를 써서 복습 중이다.
  const attempt = data.attempts.find((a) => a.studentId === "s-02");
  if (attempt) {
    saveRetelling(data, { role: "student", id: "s-02" }, attempt.id, "k-series-parallel", "직렬은 한 줄이라 전구가 늘수록 어두워지고, 병렬은 갈래마다 따로 켜져요.");
  }
  return data;
}

/**
 * 가상의 과학 선생님이 만든 수업 「연소와 소화」. 수업 자료, 개념, 문항, 루브릭, 예상 오개념을 모두 갖춘 예시다.
 * samples/ 폴더의 연소와-소화_수업자료.pptx, 연소와-소화_진단문항.xlsx와 같은 내용이다.
 */
function addCombustionLesson(data: Data) {
  data.lessons.push({ id: "l-combustion", classId: "c-6-2", subject: "과학", title: "연소와 소화", state: "공개" });

  const slides: [string, string][] = [
    ["연소와 소화", "6학년 2반 과학"],
    ["학습 목표", "물질이 타는 조건을 설명할 수 있다.\n불을 끄는 방법을 연소의 조건과 연결해 설명할 수 있다."],
    ["물질이 타는 조건", "탈 물질이 있어야 한다.\n산소가 있어야 한다.\n발화점 이상의 온도여야 한다.\n세 가지가 모두 있어야 불이 탄다."],
    ["실험: 촛불에 유리 덮개 씌우기", "촛불 위에 유리 덮개를 씌우고 불꽃을 관찰한다.\n얼마 뒤 촛불이 꺼진다.\n덮개 안의 산소가 줄어들었기 때문이다."],
    ["불을 끄는 방법", "연소의 조건 중 하나 이상을 없애면 불이 꺼진다.\n탈 물질 없애기: 가스 밸브 잠그기\n산소 막기: 소화 담요로 덮기\n온도 낮추기: 물 뿌리기"],
    ["정리하기", "불이 나려면 탈 물질, 산소, 발화점 이상의 온도가 모두 필요하다.\n소화는 이 세 가지 중 하나 이상을 없애는 일이다."],
  ];
  slides.forEach(([title, body], i) =>
    data.materials.push({
      id: `m-combustion-${i + 1}`,
      lessonId: "l-combustion",
      title,
      body,
      origin: "연소와-소화_수업자료.pptx",
    }),
  );

  data.concepts.push(
    {
      id: "k-conditions",
      lessonId: "l-combustion",
      name: "연소의 조건",
      activityGuide: "촛불에 유리 덮개를 씌우고, 꺼지는 때까지 걸리는 시간을 재어 보세요.",
    },
    {
      id: "k-extinguish",
      lessonId: "l-combustion",
      name: "소화 방법",
      activityGuide: "알코올램프의 뚜껑을 닫아 불을 끄고, 어떤 조건이 없어졌는지 말해 보세요.",
    },
  );

  const q = (n: number, stem: string, choices: string[], answerIndex: number, hasReason: boolean, conceptId: string, rubric: string, misconception: string) => ({
    id: `q-combustion-${n}`,
    stem,
    choices,
    answerIndex,
    hasReason,
    conceptId,
    rubric,
    misconception,
  });
  data.questionSets.push({
    id: "qs-combustion-1",
    lessonId: "l-combustion",
    version: 1,
    draft: false, // 루브릭까지 갖춘 완성본
    frozen: true,
    questions: [
      q(1, "물질이 타려면 꼭 필요한 세 가지로 알맞은 것은?", ["탈 물질, 산소, 발화점 이상의 온도", "탈 물질, 물, 바람", "산소, 이산화탄소, 불씨", "탈 물질, 질소, 열"], 0, false, "k-conditions", "세 가지 조건을 모두 말하면 잘 알아요, 한두 가지만 말하면 거의 알아요", "불씨나 바람이 있으면 탄다고 생각한다"),
      q(2, "촛불 위에 유리 덮개를 씌우면 얼마 뒤 촛불이 꺼집니다. 그 까닭은?", ["초가 다 닳아서", "덮개 안의 산소가 줄어서", "덮개 안의 온도가 올라가서", "빛이 막혀서"], 1, true, "k-conditions", "산소가 줄어든 까닭을 쓰면 잘 알아요, 꺼진다는 결과만 쓰면 거의 알아요", "열이 빠져나가지 못해서 꺼진다고 생각한다"),
      q(3, "알코올램프의 불을 뚜껑으로 덮어 끄는 방법은 연소의 조건 중 무엇을 없애는 것인가요?", ["탈 물질", "산소", "발화점 이상의 온도"], 1, false, "k-extinguish", "산소를 막는 방법임을 알면 잘 알아요", "불을 덮으면 온도가 내려간다고 생각한다"),
      q(4, "불이 난 곳에 물을 뿌려 끄는 방법은 연소의 조건 중 무엇을 없애는 것인가요?", ["탈 물질", "산소", "온도를 발화점 아래로 낮추기"], 2, true, "k-extinguish", "온도를 발화점 아래로 낮춘다고 설명하면 잘 알아요", "물이 산소를 없앤다고 생각한다"),
      q(5, "가스레인지에서 불이 났을 때 가스 밸브를 잠그는 것은 무엇을 없애는 것인가요?", ["탈 물질", "산소", "발화점 이상의 온도"], 0, false, "k-extinguish", "연료(탈 물질)를 없애는 방법임을 알면 잘 알아요", "불을 끄려면 항상 물을 써야 한다고 생각한다"),
    ],
  });
}
