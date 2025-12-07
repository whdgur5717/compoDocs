import path from "node:path"
import { describe, it, expect, beforeEach } from "vitest"
import { Project } from "ts-morph"
import { ComponentDetector } from "../utils/componentDetector"

function makeProject() {
  const tsconfig = path.resolve(
    process.cwd(),
    "src/generate/test/fixtures/mono/packages/ui/tsconfig.json",
  )
  return new Project({ tsConfigFilePath: tsconfig })
}

describe("ComponentDetector", () => {
  let project: Project

  beforeEach(() => {
    project = makeProject()
  })

  it("기본 함수 선언 컴포넌트를 감지한다", () => {
    const filePath = path.resolve(
      process.cwd(),
      "src/generate/test/fixtures/mono/packages/ui/src/VirtualA.tsx",
    )
    const source = project.createSourceFile(
      filePath,
      `
      export function MyComp() {
        return <div />
      }
    `,
      { overwrite: true },
    )
    const fn = source.getFunctionOrThrow("MyComp")
    const detector = new ComponentDetector()
    expect(detector.isBasicComponent(fn)).toBe(true)
  })

  it("변수 선언 노드 기준 isBasicComponent는 JSX+PascalCase에서 true", () => {
    const filePath = path.resolve(
      process.cwd(),
      "src/generate/test/fixtures/mono/packages/ui/src/VirtualB.tsx",
    )
    const source = project.createSourceFile(
      filePath,
      `
      export const ArrowComp = () => <span />
    `,
      { overwrite: true },
    )
    const varDecl = source.getVariableDeclarationOrThrow("ArrowComp")
    const detector = new ComponentDetector()
    expect(detector.isBasicComponent(varDecl)).toBe(true)
  })

  it("HOC 패턴을 감지한다(with*)", () => {
    const filePath = path.resolve(
      process.cwd(),
      "src/generate/test/fixtures/mono/packages/ui/src/VirtualC.tsx",
    )
    const source = project.createSourceFile(
      filePath,
      `
      const Base = () => <div />
      export const Enhanced = withAuth(Base)
    `,
      { overwrite: true },
    )
    const varDecl = source.getVariableDeclarationOrThrow("Enhanced")
    const detector = new ComponentDetector()
    expect(detector.detectComponentKind(varDecl)).toBe("HOC")
  })

  it("React.memo 패턴을 감지한다", () => {
    const filePath = path.resolve(
      process.cwd(),
      "src/generate/test/fixtures/mono/packages/ui/src/VirtualD.tsx",
    )
    const source = project.createSourceFile(
      filePath,
      `
      const Base = () => <div />
      export const Memoed = React.memo(Base)
    `,
      { overwrite: true },
    )
    const varDecl = source.getVariableDeclarationOrThrow("Memoed")
    const detector = new ComponentDetector()
    expect(detector.detectComponentKind(varDecl)).toBe("React.memo")
  })

  it("forwardRef 패턴을 감지한다", () => {
    const filePath = path.resolve(
      process.cwd(),
      "src/generate/test/fixtures/mono/packages/ui/src/VirtualE.tsx",
    )
    const source = project.createSourceFile(
      filePath,
      `
      export const RefComp = forwardRef((props, ref) => <div />)
    `,
      { overwrite: true },
    )
    const varDecl = source.getVariableDeclarationOrThrow("RefComp")
    const detector = new ComponentDetector()
    expect(detector.detectComponentKind(varDecl)).toBe("React.forwardRef")
  })

  it("React.lazy 패턴을 감지한다", () => {
    const filePath = path.resolve(
      process.cwd(),
      "src/generate/test/fixtures/mono/packages/ui/src/VirtualF.tsx",
    )
    const source = project.createSourceFile(
      filePath,
      `
      export const LazyComp = React.lazy(() => import("./X"))
    `,
      { overwrite: true },
    )
    const varDecl = source.getVariableDeclarationOrThrow("LazyComp")
    const detector = new ComponentDetector()
    expect(detector.detectComponentKind(varDecl)).toBe("React.lazy")
  })

  it("styled-components 패턴을 감지한다", () => {
    const filePath = path.resolve(
      process.cwd(),
      "src/generate/test/fixtures/mono/packages/ui/src/VirtualG.tsx",
    )
    const source = project.createSourceFile(
      filePath,
      `
      export const StyledDiv = styled.div` +
        "`color: red;`" +
        `
    `,
      { overwrite: true },
    )
    const varDecl = source.getVariableDeclarationOrThrow("StyledDiv")
    const detector = new ComponentDetector()
    expect(detector.detectComponentKind(varDecl)).toBe("styled-component")
  })
})
