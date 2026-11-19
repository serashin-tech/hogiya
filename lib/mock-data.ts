import type { Data, Subject } from "./types";

const subjects: Subject[] = ["과학", "국어", "영어", "수학"];

export const data: Data = {
  classrooms: [{ id: "c-6-2", name: "6학년 2반" }],
  students: Array.from({ length: 20 }, (_, i) => ({
    id: `s-${String(i + 1).padStart(2, "0")}`,
    classId: "c-6-2",
    number: i + 1,
  })),
  teachers: subjects.map((s) => ({ id: `t-${s}`, name: `${s} 교사` })),
  assignments: subjects.map((s) => ({ teacherId: `t-${s}`, classId: "c-6-2", subject: s })),
  lessons: [
    { id: "l-electric", classId: "c-6-2", subject: "과학", title: "전기의 이용", state: "공개" },
  ],
  materials: [
    {
      id: "m-electric-1",
      lessonId: "l-electric",
      title: "전구의 직렬연결과 병렬연결",
      body: "전구를 한 줄로 잇는 것이 직렬연결이고, 여러 갈래로 나누어 잇는 것이 병렬연결이다.",
    },
  ],
  concepts: [
    {
      id: "k-series-parallel",
      name: "전지·전구의 직렬·병렬연결",
      activityGuide: "전구 2개를 직렬과 병렬로 각각 연결해 밝기를 비교해 보세요.",
    },
    {
      id: "k-circuit",
      name: "전기 회로의 구성",
      activityGuide: "전지, 전구, 스위치를 끊김 없이 이어 불을 켜 보세요.",
    },
  ],
  questionSets: [
    {
      id: "qs-electric-1",
      lessonId: "l-electric",
      version: 1,
      draft: true, // 검수 전 초안
      questions: [
        q(1, "전구 2개를 직렬로 연결하면 전구 1개일 때보다 밝기가 어떻게 되나요?", ["더 밝다", "더 어둡다", "같다"], 1, "k-series-parallel", "직렬이면 전류가 줄어 어두워짐을 안다."),
        q(2, "전구 2개를 병렬로 연결하고 한 개를 빼면 다른 전구는?", ["꺼진다", "계속 켜진다", "더 어두워진다"], 1, "k-series-parallel", "병렬은 갈래마다 독립임을 안다."),
        q(3, "한 전구가 꺼지면 모두 꺼지는 연결은?", ["직렬", "병렬", "둘 다"], 0, "k-series-parallel", "직렬의 특징을 안다."),
        q(4, "전구에 불이 켜지려면 회로는 어때야 하나요?", ["끊겨 있다", "끊김 없이 이어져 있다", "상관없다"], 1, "k-circuit", "닫힌 회로가 필요함을 안다."),
        q(5, "전지의 + 극과 − 극을 모두 연결해야 하는 이유는?", ["전류가 흐를 길이 필요해서", "모양 때문에", "무게 때문에"], 0, "k-circuit", "전류의 경로 개념을 안다."),
      ],
    },
  ],
  attempts: [],
  evaluations: [],
  retellings: [],
};

function q(n: number, stem: string, choices: string[], answerIndex: number, conceptId: string, rubric: string) {
  return { id: `q-electric-${n}`, stem, choices, answerIndex, hasReason: n <= 2, conceptId, rubric };
}
