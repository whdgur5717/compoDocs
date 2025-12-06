import path from "node:path"
import { describe, expect, it } from "vitest"

import { loadConfig } from "../loadConfig"

describe("loadConfig", () => {
  it("유효한 설정을 기본값과 함께 로드한다", async () => {
    const dir = path.resolve(process.cwd(), "src/config/test/fixtures/basic")
    const config = await loadConfig(dir)

    expect(config).toEqual({
      workspace: {
        include: ["packages/*", "apps/*"],
        exclude: ["packages/legacy"],
      },
      commands: {
        generate: {
          files: ["**/*.tsx"],
          outputDir: "__generated__",
          tag: "generate",
        },
      },
    })
  })

  it("설정이 유효하지 않으면 에러를 발생한다", async () => {
    const dir = path.resolve(process.cwd(), "src/config/test/fixtures/wrong")
    await expect(loadConfig(dir)).rejects.toThrowError()
  })
})
