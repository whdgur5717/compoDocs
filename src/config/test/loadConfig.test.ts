import { mkdtemp, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { loadConfig } from "../loadConfig"

const tempDirs: string[] = []

async function makeTempDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "compodocs-config-"))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((dir) => rm(dir, { force: true, recursive: true })),
  )
})

describe("loadConfig", () => {
  it("유효한 설정을 기본값과 함께 로드한다", async () => {
    const dir = path.resolve(process.cwd(), "src/config/test/fixtures/basic")
    const config = await loadConfig(dir)

    expect(config).toEqual({
      workspace: {
        include: ["packages/*", "apps/*"],
        exclude: ["packages/legacy"],
        root: "",
      },
      commands: {
        generate: {
          files: ["**/*.tsx"],
          tag: "generate",
        },
      },
    })
  })

  it("설정이 유효하지 않으면 에러를 발생한다", async () => {
    const dir = path.resolve(process.cwd(), "src/config/test/fixtures/wrong")
    await expect(loadConfig(dir)).rejects.toThrowError()
  })

  it("config 디렉터리를 별도로 지정해 설정을 로드한다", async () => {
    const configDir = await makeTempDir()

    await writeFile(
      path.join(configDir, "compodocs.config.mjs"),
      `export default {
  workspace: {
    include: ["packages/*"],
    root: ".",
  },
  commands: {
    generate: {
      files: ["**/*.tsx"],
      tag: "autodoc",
    },
  },
}
`,
    )

    const config = await loadConfig(configDir)

    expect(config.commands.generate.tag).toBe("autodoc")
  })
})
