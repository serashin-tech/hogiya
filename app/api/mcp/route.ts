import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';

// 호기 수업안 양식. 학교 양식이 바뀌면 이 문자열만 고친다.
const LESSON_TEMPLATE = `# 수업안

- 단원명:
- 학년·과목:
- 성취기준:
- 차시 목표:

## 활동
| 단계 | 활동 | 자료·유의점 |
|---|---|---|
| 도입 | | |
| 전개 | | |
| 정리 | | |

## 평가 방법

## 루브릭
| 평가 요소 | 성취기준 | 상 | 중 | 하 |
|---|---|---|---|---|
`;

// [4국02-01], [9과03-01], [10공국1-01-01]처럼 대괄호 안에 학년·과목·번호가 있는 모양
const STANDARD_CODE = /^\[\d{1,2}[가-힣]+\d*(-\d{2}){1,2}\]$/;

const RubricItem = z.object({
  criterion: z.string().describe('평가 요소'),
  standard: z.string().describe('성취기준 코드, 예: [4국02-01]'),
  high: z.string().describe('상 수준 설명'),
  mid: z.string().describe('중 수준 설명'),
  low: z.string().describe('하 수준 설명'),
});

// route 파일은 GET·POST 말고는 내보낼 수 없어서 검사 함수는 내보내지 않는다.
function checkRubric(items: z.infer<typeof RubricItem>[]): string[] {
  const problems: string[] = [];
  if (items.length === 0) problems.push('루브릭 항목이 없습니다.');
  items.forEach((it, i) => {
    const name = `${i + 1}번 항목(${it.criterion || '평가 요소 없음'})`;
    if (!STANDARD_CODE.test(it.standard.trim())) problems.push(`${name}: 성취기준 코드 모양이 아닙니다: ${it.standard}`);
    const levels = [it.high, it.mid, it.low].map((s) => s.trim());
    if (levels.some((s) => !s)) problems.push(`${name}: 상·중·하 가운데 빈 설명이 있습니다.`);
    else if (new Set(levels).size < 3) problems.push(`${name}: 상·중·하 설명이 서로 같습니다.`);
  });
  return problems;
}

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      'get_lesson_template',
      { description: '호기 수업안 양식(마크다운)을 돌려준다. 수업안을 쓰기 전에 먼저 부른다.', inputSchema: z.object({}) },
      async () => ({ content: [{ type: 'text', text: LESSON_TEMPLATE }] }),
    );

    server.registerTool(
      'check_rubric',
      {
        description: '루브릭의 형식을 정해진 규칙으로 검사한다. 성취기준 코드 모양, 상·중·하 설명이 모두 있고 서로 다른지 본다.',
        inputSchema: z.object({ items: z.array(RubricItem) }),
      },
      async ({ items }) => {
        const problems = checkRubric(items);
        const text = problems.length === 0 ? '통과' : `고칠 점 ${problems.length}개\n- ${problems.join('\n- ')}`;
        return { content: [{ type: 'text', text }] };
      },
    );

    server.registerPrompt(
      'lesson-plan',
      {
        description: '단원 하나로 수업안과 루브릭을 만든다.',
        argsSchema: z.object({ unit: z.string().describe('단원명과 성취기준') }),
      },
      ({ unit }) => ({
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `다음 단원의 1차시 수업안을 만들어 줘: ${unit}
1. hogi의 get_lesson_template로 양식을 받아 모든 칸을 채운다.
2. 루브릭은 평가 요소마다 성취기준 코드와 상·중·하 설명을 쓴다.
3. 루브릭을 hogi의 check_rubric로 검사하고, 통과할 때까지 고쳐서 다시 검사한다.
4. 완성한 수업안을 lesson-plan.md로 저장한다. 학생 이름이나 번호는 넣지 않는다.`,
            },
          },
        ],
      }),
    );
  },
  { serverInfo: { name: 'hogi', version: '1.1.0' } },
);

export { handler as GET, handler as POST };
