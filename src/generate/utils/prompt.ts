import type { PropsInfo } from "./types"

export const DEFAULT_PROMPT = `
입력으로 제공되는 JSON의 props 정보만 사용해, 오직 props에 대한 JSDoc 블록 한 개를 생성하라.

절대추론금지(STRICT):
- 입력에 없는 내용(설명/예시/시그니처/typedef/param/category 등)은 절대 추가하지 말 것.
- 타입 문자열은 입력 그대로 사용하고 수정/축약/의역 금지.
- 프로퍼티 순서는 입력 배열 순서를 그대로 유지.
- 누락/빈 값은 무시(라인 생성 금지).

출력 언어/형식:
- 한국어. 공손하고 명확한 톤.
- 출력은 하나의 마크다운 코드블록 내 JSDoc만 포함. 코드블록 밖 텍스트 금지.
- JSDoc 마지막 줄은 반드시 다음 문구로 끝난다: \`<!-- This comment was AI-generated. Please review before using. -->\`

출력 규칙(Props Only):
1) 각 prop에 대해 정확히 한 줄의 @property를 출력한다.
   - 형식: \`@property {<Type>} <name>\`
   - 선택적(optional)인 경우: \`@property {<Type>} [<name>]\`
   - per-prop JSDoc 설명이 입력에 있을 때만, 공백-하이픈-공백( \` - \` ) 뒤에 원문 그대로 붙인다. 없으면 설명 생략.
2) origin(typeName, filePath) 처리(둘 다 있을 때만 출력):
   - 타입 전체 origin: 모든 @property 라인 이후에 \`@see <typeName> - <filePath>\` 한 줄 추가.
   - prop 단위 origin: 해당 @property 바로 다음 줄에 \`@see <propName>: <typeName> - <filePath>\` 한 줄 추가.
3) 그 외 어떤 태그도 출력하지 않는다(@typedef, @param, @example, @signature, @returns 등 금지).

결과 문서 구조(문자 그대로 따를 것):
\`\`\`ts
/**
 * @property ...
 * @see ...(선택적, 조건 충족 시)
 * <!-- This comment was AI-generated. Please review before using. -->
 */
\`\`\`

입력(JSON) → 출력(JSDoc) 예시(같은 규칙 적용):

입력(JSON):
\`\`\`json
{
  "componentName": "Description",
  "props": {
    "kind": "object",
    "origin": { "typeName": "DialogDescriptionProps", "filePath": "/abs/path/index.d.ts" },
    "props": [
      {
        "name": "id",
        "type": "string",
        "optional": false,
        "description": "요소의 고유 식별자"
      },
      {
        "name": "open",
        "type": "boolean",
        "optional": true,
        "origin": { "typeName": "BooleanLike", "filePath": "/abs/types/util.d.ts" }
      }
    ]
  }
}
\`\`\`

출력(JSDoc):
\`\`\`ts
/**
 * <!-- This comment was AI-generated. Please review before using. -->
 * @property {string} id - 요소의 고유 식별자
 * @property {boolean} [open]
 * @see open: BooleanLike - /abs/types/util.d.ts
 * @see DialogDescriptionProps - /abs/path/index.d.ts
 */
\`\`\`
`

// 입력 데이터(props 정보)를 함께 포함하는 프롬프트 빌더
export function buildPropsPrompt(params: {
  componentName: string
  props: PropsInfo
}): string {
  const { componentName, props } = params
  const payload = {
    componentName,
    props,
  }

  return [
    DEFAULT_PROMPT,
    "\n---",
    "INPUT (DO NOT HALLUCINATE):",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
  ].join("\n")
}
