import { JSDoc, Node } from "ts-morph"

function collectJsDocs(node: Node): JSDoc[] {
  if (Node.isFunctionDeclaration(node)) {
    return node.getJsDocs()
  }
  if (Node.isVariableDeclaration(node)) {
    const varStatement = node.getVariableStatement()
    if (varStatement) {
      return varStatement.getJsDocs()
    }
  }
  return []
}

export function hasJSDocTag(node: Node, tagName: string): boolean {
  const jsDocs = collectJsDocs(node)
  for (const jsDoc of jsDocs) {
    const tags = jsDoc.getTags()
    if (tags.some((tag) => tag.getTagName() === tagName)) {
      return true
    }
  }
  return false
}

export function getJSDocTagValues(node: Node, tagName: string): string[] {
  const jsDocs = collectJsDocs(node)
  const values: string[] = []

  for (const jsDoc of jsDocs) {
    const tags = jsDoc.getTags()
    for (const tag of tags) {
      if (tag.getTagName() === tagName) {
        const text = tag.getCommentText()
        if (typeof text === "string" && text.length > 0) {
          values.push(text)
        }
      }
    }
  }

  return values
}
