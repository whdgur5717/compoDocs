import path from "node:path"
import { Command } from "commander"
import { loadConfig } from "../config/loadConfig"
import fg from "fast-glob"

export const generateCommand = new Command("generate")
  .description("Generate JSDoc from props")
  .requiredOption("--cwd <path>", "working directory")
  .action(async (_options: { cwd: string }) => {
    const config = await loadConfig(_options.cwd)
    const root = path.resolve(_options.cwd, config.workspace.root)
    const include = config.workspace.include
    const exclude = config.workspace.exclude
    const fileGlobs = config.commands.generate?.files

    const patterns: string[] = []
    for (const base of include) {
      for (const g of fileGlobs || []) {
        patterns.push(`${base}/${g}`)
      }
    }

    const matches = await fg(patterns, {
      cwd: root,
      absolute: true,
      onlyFiles: true,
      ignore: exclude,
    })
  })
