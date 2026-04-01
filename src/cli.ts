#!/usr/bin/env node

import { Command } from "commander"
import { pathToFileURL } from "node:url"

import { generateCommand } from "./generate"

const VERSION = "1.0.0"

export const program = new Command()
  .name("compodocs")
  .description("Generate JSDoc for React components from their props")
  .version(VERSION)
  .addCommand(generateCommand)

export async function runCli(argv = process.argv) {
  await program.parseAsync(argv)
}

if (process.argv[1]) {
  const entryUrl = pathToFileURL(process.argv[1]).href

  if (import.meta.url === entryUrl) {
    runCli().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error"
      console.error(message)
      process.exitCode = 1
    })
  }
}
