import { loadConfig as loadUserConfig } from "unconfig"
import { configSchema } from "./schema"

export async function loadConfig(cwd = process.cwd()) {
  try {
    const { config, sources } = await loadUserConfig({
      cwd,
      sources: [
        {
          files: "compodocs.config",
          extensions: ["ts", "mts", "cts", "js", "mjs", "cjs", "json"],
        },
      ],
    })
    if (!sources || sources.length === 0) {
      throw new Error(
        `Config file not found in ${cwd}. Expected 'compodocs.config.*'`,
      )
    }

    return configSchema.parse(config)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    throw new Error(`Failed to load config: ${msg}`)
  }
}
