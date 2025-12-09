import type { PropsInfo } from "./types"

function sanitize(text: string): string {
  return text.replace(/import\("[^"]+"\)\./g, "")
}

export function formatPropsInfo(info: PropsInfo, _depth = 0): string {
  const lines: string[] = []
  lines.push("@description React component.")
  lines.push("@component")
  const paramType = info.kind === "alias" ? sanitize(info.typeText) : "object"
  lines.push(`@param {${paramType}} props - Component props.`)
  if (info.kind === "object") {
    for (const p of info.props) {
      const nameOut = p.optional ? `[${p.name}]` : p.name
      const base = `@property {${sanitize(p.type)}} ${nameOut}`
      lines.push(p.description ? `${base} - ${p.description}` : base)
    }
  }
  lines.push("<!-- This comment was AI-generated. Please review before using. -->")
  return lines.join("\n")
}
