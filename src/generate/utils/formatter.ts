import type { PropsInfo } from "./types"

export function formatPropsInfo(info: PropsInfo, _depth = 0) {
  const lines: string[] = []
  if (info.kind === "object") {
    for (const p of info.props) {
      const nameOut = p.optional ? `[${p.name}]` : p.name
      const base = `@property {${p.type}} ${nameOut}`
      lines.push(p.description ? `${base} - ${p.description}` : base)
    }
  } else {
    lines.push(`@property {${info.typeText}} props`)
  }
  return lines.join("\n")
}
