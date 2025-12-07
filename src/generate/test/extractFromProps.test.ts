import path from "node:path"
import { describe, it, expect, beforeEach } from "vitest"
import { Project } from "ts-morph"
import { extractPropsTypeInfo } from "../utils/extractFromProps"

function makeProject() {
  const tsconfig = path.resolve(
    process.cwd(),
    "src/generate/test/fixtures/mono/packages/ui/tsconfig.json",
  )
  return new Project({ tsConfigFilePath: tsconfig })
}

describe("extractFromProps.extractPropsTypeInfo", () => {
  let project: Project

  beforeEach(() => {
    project = makeProject()
  })

  it("함수 첫 파라미터에서 Props 객체 정보를 추출한다(JSDoc 포함)", () => {
    const filePath = path.resolve(
      process.cwd(),
      "src/generate/test/fixtures/mono/packages/ui/src/PropsA.tsx",
    )
    const source = project.createSourceFile(
      filePath,
      `
      interface Props {
        /** 식별자 */
        id: string
        /** 라벨 */
        label?: string
      }
      export function Comp(props: Props) { return null }
    `,
      { overwrite: true },
    )
    const fn = source.getFunctionOrThrow("Comp")
    const info = extractPropsTypeInfo(fn)
    expect(info).not.toBeNull()
    if (info && info.kind === "object") {
      const map = new Map(info.props.map((p) => [p.name, p]))
      expect(map.get("id")?.type).toContain("string")
      expect(map.get("id")?.optional).toBe(false)
      expect(map.get("id")?.description).toBe("식별자")
      expect(map.get("label")?.optional).toBe(true)
      expect(map.get("label")?.description).toBe("라벨")
    }
  })

  it("변수 선언 + memo(Foo) 형태에서 원본 함수 Props를 추출한다", () => {
    const filePath = path.resolve(
      process.cwd(),
      "src/generate/test/fixtures/mono/packages/ui/src/PropsB.tsx",
    )
    const source = project.createSourceFile(
      filePath,
      `
      interface P { a: number }
      function Foo(props: P) { return null }
      export const M = memo(Foo)
    `,
      { overwrite: true },
    )
    const varDecl = source.getVariableDeclarationOrThrow("M")
    const info = extractPropsTypeInfo(varDecl)
    expect(info).not.toBeNull()
    if (info && info.kind === "object") {
      expect(info.props.find((p) => p.name === "a")?.type).toContain("number")
    }
  })

  it("변수 선언 + memo((p: T) => null) 형태에서 Props를 추출한다", () => {
    const filePath = path.resolve(
      process.cwd(),
      "src/generate/test/fixtures/mono/packages/ui/src/PropsC.tsx",
    )
    const source = project.createSourceFile(
      filePath,
      `
      type P = { x: boolean }
      export const M = memo((p: P) => null)
    `,
      { overwrite: true },
    )
    const varDecl = source.getVariableDeclarationOrThrow("M")
    const info = extractPropsTypeInfo(varDecl)
    expect(info).not.toBeNull()
    if (info && info.kind === "object") {
      expect(info.props.find((p) => p.name === "x")?.type).toContain("boolean")
    }
  })

  it("속성이 없는 타입은 alias로 반환한다", () => {
    const filePath = path.resolve(
      process.cwd(),
      "src/generate/test/fixtures/mono/packages/ui/src/PropsD.tsx",
    )
    const source = project.createSourceFile(
      filePath,
      `
      type U = unknown
      export function F(p: U) { return null }
    `,
      { overwrite: true },
    )
    const fn = source.getFunctionOrThrow("F")
    const info = extractPropsTypeInfo(fn)
    expect(info).not.toBeNull()
    expect(info && info.kind).toBe("alias")
  })
})
