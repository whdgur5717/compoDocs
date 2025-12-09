import path from "node:path"
import { Node, Project } from "ts-morph"
import { find } from "tsconfck"

import type { PropsInfo } from "./types"
import { ComponentDetector } from "./componentDetector"
import { extractPropsTypeInfo } from "./extractFromProps"
import { hasJSDocTag } from "./jsdoc"

interface ComponentInfo {
  name: string
  kind: string
  jsDoc: string | null
  node: Node
}

export interface ParsedComponent {
  name: string
  kind: string
  filePath: string
  hasGenerateTag: boolean
  props: PropsInfo | null
  declarationText: string
}

export async function parseFile({ filePath }: { filePath: string }) {
  const dir = path.dirname(filePath)
  const tsconfigPath = await find(dir)
  if (tsconfigPath === null) {
    throw new Error(`tsconfig not found near: ${filePath}`)
  }
  const project = new Project({ tsConfigFilePath: tsconfigPath })

  const sourceFile =
    project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath)
  const components: ComponentInfo[] = []
  const detector = new ComponentDetector()

  sourceFile.getFunctions().forEach((func) => {
    if (detector.isBasicComponent(func)) {
      const jsDocComments = func.getJsDocs()
      const jsDocText =
        jsDocComments.length > 0
          ? jsDocComments.map((doc) => doc.getFullText()).join("\n")
          : null

      components.push({
        name: func.getName() || "Anonymous",
        kind: "FunctionDeclaration",
        jsDoc: jsDocText,
        node: func,
      })
    }
  })

  // 2. 변수 선언 컴포넌트
  sourceFile.getVariableDeclarations().forEach((varDecl) => {
    const name = varDecl.getName()
    const componentKind = detector.detectComponentKind(varDecl)

    if (componentKind) {
      const variableStatement = varDecl.getVariableStatement()
      const jsDocComments = variableStatement?.getJsDocs() || []
      const jsDocText =
        jsDocComments.length > 0
          ? jsDocComments.map((doc) => doc.getFullText()).join("\n")
          : null

      components.push({
        name: name,
        kind: componentKind,
        jsDoc: jsDocText,
        node: varDecl,
      })
    }
  })

  // 3. default export
  sourceFile.getExportAssignments().forEach((exportAssignment) => {
    if (detector.isDefaultExportComponent(exportAssignment)) {
      components.push({
        name: "default",
        kind: "DefaultExport",
        jsDoc: null,
        node: exportAssignment,
      })
    }
  })

  // 4. @generate만 찾아서 Props 정보 수집 (파일에 주석은 추가하지 않음)
  const results: ParsedComponent[] = []
  for (const component of components) {
    const targetNode = component.node
    const hasGenerate = hasJSDocTag(targetNode, "generate")
    const info = hasGenerate ? extractPropsTypeInfo(targetNode) : null
    let declText = ""
    if (Node.isFunctionDeclaration(targetNode)) {
      declText = targetNode.getText()
    } else if (Node.isVariableDeclaration(targetNode)) {
      const vs = targetNode.getVariableStatement()
      declText = vs ? vs.getText() : targetNode.getText()
    }

    results.push({
      name: component.name,
      kind: component.kind,
      filePath,
      hasGenerateTag: hasGenerate,
      props: info,
      declarationText: declText,
    })
  }

  return results
}
