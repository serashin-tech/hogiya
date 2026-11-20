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

  // 학생 2번은 다시 설명하기를 써서 복습 중이다.
  const attempt = data.attempts.find((a) => a.studentId === "s-02");
  if (attempt) {
    saveRetelling(data, { role: "student", id: "s-02" }, attempt.id, "k-series-parallel", "직렬은 한 줄이라 전구가 늘수록 어두워지고, 병렬은 갈래마다 따로 켜져요.");
  }
  return data;
}
