import { Command } from "commander"

const VERSION = "1.0.0"

export const program = new Command()
  .name("compoDocs")
  .description("Component documentation and code generation CLI")
  .version(VERSION)
  .option("--config <path>", "config file path", "compodocs.config.ts")
  .option("--cwd <path>", "current working directory", process.cwd())

export default program
