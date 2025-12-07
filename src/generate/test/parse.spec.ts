import path from "node:path"
import fs from "node:fs"
import { describe, it, expect } from "vitest"
import { parseFile } from "../utils/parse"

const monoRoot = path.resolve(
  process.cwd(),
  "src/generate/test/fixtures/mono",
)

describe("parseFile", () => {
  it("@generate 태그가 있는 함수 컴포넌트(Button)를 인식하고 props를 추출한다", async () => {
    const filePath = path.resolve(
      monoRoot,
      "packages/ui/src/Button.tsx",
    )
    const results = await parseFile({ filePath })
    const button = results.find((r) => r.name === "Button")
    expect(button).toBeTruthy()
    expect(button?.kind).toBe("FunctionDeclaration")
    expect(button?.hasGenerateTag).toBe(true)
    expect(button?.props).not.toBeNull()
  })

  it("변수 선언 화살표 함수(Foo)도 목록에 포함한다", async () => {
    const filePath = path.resolve(
      monoRoot,
      "packages/core/src/Foo.tsx",
    )
    const results = await parseFile({ filePath })
    const foo = results.find((r) => r.name === "Foo")
    expect(foo).toBeTruthy()
    expect(foo?.kind).toBe("FunctionComponent")
    expect(foo?.hasGenerateTag).toBe(false)
  })

  it("export default 화살표 컴포넌트는 목록에 포함되지 않는다(@generate도 무시)", async () => {
    const base = path.resolve(monoRoot)
    const tmp = path.resolve(process.cwd(), ".tmp-test", "parse-default")
    fs.rmSync(tmp, { recursive: true, force: true })
    fs.mkdirSync(tmp, { recursive: true })
    fs.cpSync(base, tmp, { recursive: true })

    const filePath = path.resolve(
      tmp,
      "packages/ui/src/DefaultExport.tsx",
    )
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(
      filePath,
      `/**\n * @generate\n */\nexport default () => <div/>\n`,
    )

    try {
      const results = await parseFile({ filePath })
      const def = results.find((r) => r.kind === "DefaultExport")
      expect(def).toBeUndefined()
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})
