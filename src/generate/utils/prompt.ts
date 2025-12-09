import type { PropsInfo } from "./types"

export const DEFAULT_PROMPT = `
You are an AI documentation assistant. Generate a single JSDoc comment BODY for a React function component using ONLY the provided inputs.

Strict constraints:
- Use ONLY information from the provided props JSON and reference source code. Do NOT invent props, parameters, or behavior.
- Output MUST be the JSDoc BODY ONLY (no Markdown fences, no /** */ wrapper, no extra text).
- Do NOT use @typedef, @signature, @type, or any typedef-like tags.
- Always end with this exact last line: \`<!-- This comment was AI-generated. Please review before using. -->\`.

Language and tone:
- English only. Clear, friendly, concise. Junior-developer friendly.
- No implementation details; focus on what the component helps users accomplish.

What to include for a React component:
1) Summary via @description (one or two sentences).
2) @component to indicate this is a React component.
3) @param for the component's props object, e.g. \`@param {<PropsType>} props - Brief description of the props object.\`
4) @property lines for each prop from the props JSON:
   - Format: \`@property {<Type>} <name>\` or \`@property {<Type>} [<name>]\` if optional
   - If a per-prop JSDoc description exists in input, append \` - <description>\` to that @property line
   - Do NOT output any @see line for anonymous or same-file origins
5) @returns with the appropriate React element type (e.g. {JSX.Element} or {ReactElement}).
6) A concise @example demonstrating typical usage, including import and JSX usage. Do NOT invent non-existent props.

Additional notes:
- Keep tag order logical: @description, @component, @param, @property..., @returns, @example, final disclaimer line.
- Do NOT output anything else beyond the JSDoc BODY described above.
`

// 입력 데이터(props 정보)를 함께 포함하는 프롬프트 빌더
export function buildPropsPrompt(params: {
  componentName: string
  props: PropsInfo
  sourceText: string
}): string {
  const { componentName, props, sourceText } = params
  const payload = { componentName, props }
  return [
    DEFAULT_PROMPT,
    "\n---",
    "INPUT (DO NOT HALLUCINATE):",
    "```json",
    JSON.stringify(payload, null, 2),
    "```",
    "\nREFERENCE SOURCE (READ-ONLY):",
    "```ts",
    sourceText,
    "```",
  ].join("\n")
}
