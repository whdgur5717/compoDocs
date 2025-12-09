import type { PropsInfo } from "./types"

function sanitize(text: string): string {
  return text.replace(/import\("[^"]+"\)\./g, "")
}

export function formatProps(info: PropsInfo) {
  const lines: string[] = []
  if (info.kind === "object") {
    for (const prop of info.props) {
      const nameOut = prop.optional ? `[${prop.name}]` : prop.name
      const base = `@property {${sanitize(prop.type)}} ${nameOut}`
      lines.push(prop.description ? `${base} - ${prop.description}` : base)
    }
  } else {
    lines.push(`@property {${sanitize(info.typeText)}} props`)
  }
  lines.push("<!-- This comment was AI-generated. Please review before using. -->")
  return lines.join("\n")
}
