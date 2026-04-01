import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { program } from "../../cli"
import { runGenerate } from ".."

const monoFixtureRoot = path.resolve(
  process.cwd(),
  "src/generate/test/fixtures/mono",
)

const tempDirs: string[] = []

async function makeFixtureCopy() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "compodocs-generate-"))
  tempDirs.push(dir)
  await cp(monoFixtureRoot, dir, { recursive: true })
  return dir
}

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((dir) => rm(dir, { force: true, recursive: true })),
  )
})

describe("program", () => {
  it("generate 명령을 등록한다", () => {
    const commandNames = program.commands.map((command) => command.name())
    expect(commandNames).toContain("generate")
  })
})

describe("runGenerate", () => {
  it("설정된 tag를 기준으로 JSDoc을 생성한다", async () => {
    const cwd = await makeFixtureCopy()
    const configPath = path.join(cwd, "compodocs.config.ts")
    const buttonPath = path.join(cwd, "packages/ui/src/Button.tsx")

    await writeFile(
      configPath,
      `export default {
  workspace: {
    include: ["packages/*"],
    root: "",
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

    await writeFile(
      buttonPath,
      `/**
 * @autodoc
 */
export function Button(props: { label: string }) {
  return <button>{props.label}</button>
}
`,
    )

    const result = await runGenerate({ cwd })
    const nextSource = await readFile(buttonPath, "utf8")

    expect(result).toMatchObject({
      matchedComponents: 1,
      updatedFiles: 1,
    })
    expect(nextSource).toContain("@property {string} label")
  })

  it("generate.exclude에 매칭된 파일은 건너뛴다", async () => {
    const cwd = await makeFixtureCopy()
    const configPath = path.join(cwd, "compodocs.config.ts")
    const buttonPath = path.join(cwd, "packages/ui/src/Button.tsx")
    const excludedPath = path.join(cwd, "packages/core/src/Excluded.tsx")

    await writeFile(
      configPath,
      `export default {
  workspace: {
    include: ["packages/*"],
    root: "",
  },
  commands: {
    generate: {
      files: ["**/*.tsx"],
      exclude: ["**/Excluded.tsx"],
      tag: "generate",
    },
  },
}
`,
    )

    await writeFile(
      excludedPath,
      `/**
 * @generate
 */
export function Excluded(props: { id: string }) {
  return <div>{props.id}</div>
}
`,
    )

    const result = await runGenerate({ cwd })
    const excludedSource = await readFile(excludedPath, "utf8")
    const buttonSource = await readFile(buttonPath, "utf8")

    expect(result).toMatchObject({
      matchedComponents: 1,
      updatedFiles: 1,
    })
    expect(buttonSource).toContain("@property {string} label")
    expect(excludedSource).not.toContain("@property {string} id")
  })
})
