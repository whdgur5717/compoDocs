import path from "node:path"
import { Project } from "ts-morph"
import { describe, it, expect } from "vitest"

const monoRoot = path.resolve(process.cwd(), "src/generate/test/fixtures/mono")

describe("경로 준비", () => {
  it("픽스처 파일 경로들을 구성한다", () => {
    const uiButtonPath = path.resolve(monoRoot, "packages/ui/src/Button.tsx")
    const coreFooPath = path.resolve(monoRoot, "packages/core/src/Foo.tsx")
    expect(typeof uiButtonPath).toBe("string")
    expect(typeof coreFooPath).toBe("string")
  })
})

describe("extractComponentfromFile", () => {
  it("프로젝트 초기화하고 sourceFile을 로드한다", () => {
    const tsconfig = path.resolve(monoRoot, "packages/ui/tsconfig.json")
    const project = new Project({ tsConfigFilePath: tsconfig })
    const filePath = path.resolve(monoRoot, "packages/ui/src/Button.tsx")
    const sourceFile =
      project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath)
    expect(sourceFile).toBeTruthy()
    expect(sourceFile.getFilePath()).toContain("Button.tsx")
  })
})
