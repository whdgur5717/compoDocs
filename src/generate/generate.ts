import type { SourceFile } from "ts-morph"

export interface ApplyJSDocParams {
  filePath: string
  componentName: string
  kind: string
  text: string
  sourceFile?: SourceFile
}

export async function applyJSDoc(
  sourceFile: SourceFile,
  params: ApplyJSDocParams,
) {
  const { componentName, kind, text } = params

  if (kind === "FunctionDeclaration") {
    const functionDeclaration = sourceFile.getFunction(componentName)
    if (!functionDeclaration) return false
    const jsDocNodes = functionDeclaration.getJsDocs()
    const current = jsDocNodes
      .map((d) => d.getInnerText().trim())
      .join("\n")
      .trim()
    const next = text.trim()
    if (current === next) return false
    jsDocNodes.forEach((d) => d.remove())
    functionDeclaration.addJsDoc(text)
    return true
  } else {
    const variableDeclaration = sourceFile.getVariableDeclaration(componentName)
    const variableStatement = variableDeclaration?.getVariableStatement()
    if (!variableStatement) return false
    const jsDocNodes = variableStatement.getJsDocs()
    const current = jsDocNodes
      .map((d) => d.getInnerText().trim())
      .join("\n")
      .trim()
    const next = text.trim()
    if (current === next) return false
    jsDocNodes.forEach((d) => d.remove())
    variableStatement.addJsDoc(text)
    return true
  }
}
