// 모의 데이터의 타입 계약 (docs/SPEC.md 공통 약속). 3주차에 DB로 바꿔도 이 타입을 유지한다.

export type Subject = "과학" | "국어" | "영어" | "수학";
export type PublishState = "작성 중" | "공개" | "마감";

export type Classroom = { id: string; name: string };
export type Student = { id: string; classId: string; number: number };
export type Teacher = { id: string; name: string };
export type Assignment = { teacherId: string; classId: string; subject: Subject };

export type Lesson = {
  id: string;
  classId: string;
  subject: Subject;
  title: string;
  state: PublishState;
};
export type Material = {
  id: string;
  lessonId: string;
  title: string;
  body: string;
  /** PowerPoint에서 가져온 슬라이드이면 원본 파일 이름. 직접 쓴 자료에는 없다. */
  origin?: string;
};

export type Concept = { id: string; lessonId: string; name: string; activityGuide: string };
export type Question = {
  id: string;
  stem: string;
  choices: string[];
  answerIndex: number;
  hasReason: boolean;
  conceptId: string;
  rubric: string;
  /** 교사가 미리 적어 두는 예상 오개념. 판정과 집계에는 쓰지 않는다. */
  misconception?: string;
};
export type QuestionSet = {
  id: string;
  lessonId: string;
  version: number;
  /** 검수 전 초안이면 화면에 표시한다. */
  draft: boolean;
  /** 공개된 적이 있으면 true. 굳은 세트를 고치면 새 버전이 된다(ADR 0001). */
  frozen: boolean;
  questions: Question[];
};

export type Answer = { questionId: string; choiceIndex: number; reason?: string };
export type Attempt = {
  id: string;
  studentId: string;
  questionSetId: string;
  key: string;
  answers: Answer[];
  submittedAt: string;
};

export type Level = "더 알아봐요" | "거의 알아요" | "잘 알아요";
/** 시도에서 계산한 개념별 이해 수준과 근거(맞히고 틀린 문항). */
export type Evaluation = {
  attemptId: string;
  conceptId: string;
  level: Level;
  evidence: { questionId: string; correct: boolean }[];
};
export type Retelling = { attemptId: string; conceptId: string; text: string };

export type Data = {
  classrooms: Classroom[];
  students: Student[];
  teachers: Teacher[];
  assignments: Assignment[];
  lessons: Lesson[];
  materials: Material[];
  concepts: Concept[];
  questionSets: QuestionSet[];
  attempts: Attempt[];
  evaluations: Evaluation[];
  retellings: Retelling[];
};

export type User = { role: "teacher" | "student"; id: string };
export type Target =
  | { kind: "lesson"; id: string }
  | { kind: "material"; id: string }
  | { kind: "attempt"; id: string };
