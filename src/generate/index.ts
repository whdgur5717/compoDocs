import path from "node:path"
import { Command } from "commander"
import fg from "fast-glob"
import { find as findTsconfig } from "tsconfck"
import { Node, Project } from "ts-morph"

import { loadConfig } from "../config/loadConfig"
import { applyJSDoc } from "./generate"
import { extractPropsTypeInfo } from "./utils/extractFromProps"
import { formatPropsInfo } from "./utils/formatter"
import { hasJSDocTag } from "./utils/jsdoc"
import { extractComponentFromFile } from "./utils/parse"
import { buildPropsPrompt } from "./utils/prompt"

export interface GenerateLogger {
  error(message: string): void
  info(message: string): void
  warn(message: string): void
}

export interface RunGenerateOptions {
  config?: string
  cwd: string
  logger?: GenerateLogger
}

export interface GenerateResult {
  failedFiles: number
  matchedComponents: number
  scannedFiles: number
  skippedComponents: number
  updatedFiles: number
}

function getDeclarationText(node: Node) {
  if (Node.isFunctionDeclaration(node)) {
    return node.getText()
  }

  if (Node.isVariableDeclaration(node)) {
    const variableStatement = node.getVariableStatement()
    return variableStatement ? variableStatement.getText() : node.getText()
  }

  return node.getText()
}

function createLogger(logger?: GenerateLogger): GenerateLogger {
  if (logger) {
    return logger
  }

  return {
    error: console.error,
    info: console.log,
    warn: console.warn,
  }
}

export async function runGenerate(options: RunGenerateOptions) {
  const logger = createLogger(options.logger)
  const configDir = options.config
    ? path.resolve(options.cwd, options.config)
    : options.cwd
  const config = await loadConfig(configDir)
  const root = path.resolve(options.cwd, config.workspace.root)
  const workspaceExclude = config.workspace.exclude ?? []
  const generateExclude = config.commands.generate.exclude ?? []
  const patterns = config.workspace.include.flatMap((basePath) =>
    config.commands.generate.files.map((file) => `${basePath}/${file}`),
  )
  const matches = await fg(patterns, {
    cwd: root,
    absolute: true,
    onlyFiles: true,
    ignore: [...workspaceExclude, ...generateExclude],
  })
  const result: GenerateResult = {
    failedFiles: 0,
    matchedComponents: 0,
    scannedFiles: matches.length,
    skippedComponents: 0,
    updatedFiles: 0,
  }
  const tagName = config.commands.generate.tag

  if (matches.length === 0) {
    logger.warn(`No source files matched generate patterns in ${root}.`)
    return result
  }

  for (const filePath of matches) {
    try {
      const tsconfigPath = await findTsconfig(path.dirname(filePath))
      if (!tsconfigPath) {
        result.failedFiles += 1
        logger.warn(`Skipping ${filePath}: tsconfig.json was not found.`)
        continue
      }

      const project = new Project({ tsConfigFilePath: tsconfigPath })
      const sourceFile = project.addSourceFileAtPathIfExists(filePath)

      if (!sourceFile) {
        result.failedFiles += 1
        logger.warn(`Skipping ${filePath}: source file could not be loaded.`)
        continue
      }

      let fileUpdated = false
      const components = extractComponentFromFile(sourceFile)

      for (const component of components) {
        const targetNode = component.node
        if (!hasJSDocTag(targetNode, tagName)) {
          continue
        }

        const props = extractPropsTypeInfo(targetNode)
        if (!props) {
          result.skippedComponents += 1
          logger.warn(
            `Skipping ${component.name} in ${filePath}: props could not be resolved.`,
          )
          continue
        }

        result.matchedComponents += 1

        const declarationText = getDeclarationText(targetNode)
        const jsdocFetcher = config.commands.generate.jsdoc?.fetcher
        const text = jsdocFetcher
          ? await Promise.resolve(
              jsdocFetcher({
                signature: JSON.stringify({
                  componentName: component.name,
                  declarationText,
                  filePath,
                  kind: component.kind,
                }),
                prompt: buildPropsPrompt({
                  componentName: component.name,
                  props,
                  sourceText: declarationText,
                }),
              }),
            )
          : formatPropsInfo(props)

        const changed = await applyJSDoc(sourceFile, {
          filePath,
          componentName: component.name,
          kind: component.kind,
          text,
        })

        if (changed) {
          fileUpdated = true
        } else {
          result.skippedComponents += 1
        }
      }

      if (fileUpdated) {
        sourceFile.saveSync()
        result.updatedFiles += 1
      }
    } catch (error) {
      result.failedFiles += 1
      const message = error instanceof Error ? error.message : "Unknown error"
      logger.error(`Failed to generate JSDoc for ${filePath}: ${message}`)
    }
  }

  logger.info(
    `Scanned ${result.scannedFiles} files, matched ${result.matchedComponents} components, updated ${result.updatedFiles} files.`,
  )
  return result
}

export const generateCommand = new Command("generate")
  .description("Generate JSDoc from React component props")
  .requiredOption("--cwd <path>", "working directory")
  .option("--config <dir>", "config directory")
  .action(async (options: { config?: string; cwd: string }) => {
    await runGenerate(options)
  })
