import path from "node:path"
import { Command } from "commander"
import fg from "fast-glob"
import { loadConfig } from "../config/loadConfig"
import { buildPropsPrompt } from "./utils/prompt"
import { extractComponentFromFile } from "./utils/parse"
import { applyJSDoc } from "./generate"
import { find as findTsconfig } from "tsconfck"
import { Node, Project } from "ts-morph"
import { hasJSDocTag } from "./utils/jsdoc"
import { extractPropsTypeInfo } from "./utils/extractFromProps"
import { formatPropsInfo } from "./utils/formatter"

export const generateCommand = new Command("generate")
  .description("Generate JSDoc from props")
  .requiredOption("--cwd <path>", "working directory")
  .action(async (_options: { cwd: string }) => {
    const config = await loadConfig(_options?.cwd || process.cwd())
    const root = path.resolve(_options.cwd, config.workspace.root)
    const { include, exclude } = config.workspace
    const { files } = config.commands.generate

    const patterns: string[] = []
    for (const basePath of include) {
      for (const file of files) {
        patterns.push(`${basePath}/${file}`)
      }
    }

    const matches = await fg(patterns, {
      cwd: root,
      absolute: true,
      onlyFiles: true,
      ignore: exclude,
    })

    for (const filePath of matches) {
      const tsconfigPath = await findTsconfig(path.dirname(filePath))
      if (!tsconfigPath) {
        console.log("cannot find tsconfig from", filePath)
        continue
      }
      const project = new Project({ tsConfigFilePath: tsconfigPath })
      const sourceFile = project.addSourceFileAtPathIfExists(filePath)

      if (!sourceFile) {
        console.log("cannot add sourceFile from", filePath)
        continue
      }

      const components = extractComponentFromFile(sourceFile)

      const results = components.map((component) => {
        const targetNode = component.node
        const hasGenerateTag = hasJSDocTag(targetNode, "generate")
        const info = hasGenerateTag ? extractPropsTypeInfo(targetNode) : null
        let declarationText = ""
        if (Node.isFunctionDeclaration(targetNode)) {
          declarationText = targetNode.getText()
        } else if (Node.isVariableDeclaration(targetNode)) {
          const variableStatement = targetNode.getVariableStatement()
          declarationText = variableStatement
            ? variableStatement.getText()
            : targetNode.getText()
        }
        return {
          name: component.name,
          kind: component.kind,
          hasGenerateTag,
          props: info,
          declarationText: declarationText,
        }
      })

      for (const component of results) {
        if (!component.hasGenerateTag || !component.props) continue
        const { props, kind, name, declarationText } = component

        const jsdocFetcher = config.commands.generate.jsdoc?.fetcher
        if (jsdocFetcher) {
          const signature = JSON.stringify({
            componentName: name,
            filePath,
            kind,
            declarationText,
          })
          const jsdoc = await Promise.resolve(
            jsdocFetcher({
              signature,
              prompt: buildPropsPrompt({
                componentName: component.name,
                props,
                sourceText: component.declarationText,
              }),
            }),
          )
          await applyJSDoc(sourceFile, {
            filePath,
            componentName: name,
            kind,
            text: jsdoc,
            sourceFile,
          })
        } else {
          const jsdoc = formatPropsInfo(props)
          await applyJSDoc(sourceFile, {
            filePath,
            componentName: name,
            kind,
            text: jsdoc,
            sourceFile,
          })
        }
        sourceFile.saveSync()
      }
    }
  })
