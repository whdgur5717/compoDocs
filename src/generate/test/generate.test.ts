import path from "node:path"
import { describe, it } from "vitest"
import { generateCommand } from ".."

describe("generateCommand", () => {
  it(
    "configDir 기준으로 설정과 대상을 찾는다",
    async () => {
      const configDir = path.resolve(
        process.cwd(),
        "src/generate/test/fixtures/mono",
      )
      await generateCommand.parseAsync(["node", "test", "--cwd", configDir])
    },
    Infinity,
  )
})
