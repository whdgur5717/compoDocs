import { Node, SyntaxKind, type VariableDeclaration } from "ts-morph"

/**
 * React 컴포넌트 감지 클래스
 * 다양한 React 컴포넌트 패턴을 식별하는 유틸리티
 */
export class ComponentDetector {
  /**
   * 기본 함수/화살표 함수 컴포넌트 체크
   *
   * 판단 기준:
   * - JSX 요소를 반환하는가? (JsxElement, JsxSelfClosingElement, JsxFragment)
   * - 함수명이 대문자로 시작하는가? (React 컴포넌트 네이밍 규칙)
   *
   * 감지 가능한 패턴:
   * - function MyComponent() { return <div /> }
   * - const MyComponent = () => <div />
   * - const MyComponent = function() { return <div /> }
   */
  isBasicComponent(node: Node): boolean {
    const hasJsxReturn =
      node.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0 ||
      node.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0 ||
      node.getDescendantsOfKind(SyntaxKind.JsxFragment).length > 0

    let name = ""
    if (Node.isFunctionDeclaration(node)) {
      name = node.getName() || ""
      const isDefault = node.isDefaultExport()
      if (hasJsxReturn && isDefault) {
        return true
      }
    } else if (Node.isVariableDeclaration(node)) {
      name = node.getName()
    } else if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
      const parent = node.getParent()
      if (parent && Node.isVariableDeclaration(parent)) {
        name = parent.getName()
      }
    }

    const startsWithCapital = /^[A-Z]/.test(name)
    return hasJsxReturn && startsWithCapital
  }

  /**
   * HOC 패턴 체크 (withXXX(Component) 형태)
   *
   * 감지 가능한 패턴:
   * - const EnhancedComponent = withAuth(BaseComponent)
   * - const ProtectedPage = withLayout(PageComponent)
   */
  private isHOCWrappedComponent(varDecl: VariableDeclaration): boolean {
    const initializer = varDecl.getInitializer()
    if (!initializer || !Node.isCallExpression(initializer)) {
      return false
    }

    const name = varDecl.getName()
    const startsWithCapital = /^[A-Z]/.test(name)

    const expression = initializer.getExpression()
    const hocName = expression.getText()

    return (
      startsWithCapital &&
      (hocName.startsWith("with") || hocName.startsWith("use"))
    )
  }

  /**
   * React.memo 체크
   *
   * 감지 가능한 패턴:
   * - const MemoComponent = React.memo(MyComponent)
   * - const MemoComponent = memo(MyComponent)
   */
  private isMemoComponent(varDecl: VariableDeclaration): boolean {
    const initializer = varDecl.getInitializer()
    if (!initializer || !Node.isCallExpression(initializer)) {
      return false
    }

    const name = varDecl.getName()
    const startsWithCapital = /^[A-Z]/.test(name)

    const expression = initializer.getExpression()
    const text = expression.getText()

    return startsWithCapital && (text === "React.memo" || text === "memo")
  }

  /**
   * React.forwardRef 체크
   *
   * 감지 가능한 패턴:
   * - const RefComponent = React.forwardRef((props, ref) => <div />)
   * - const RefComponent = forwardRef((props, ref) => <div />)
   */
  private isForwardRefComponent(varDecl: VariableDeclaration): boolean {
    const initializer = varDecl.getInitializer()
    if (!initializer || !Node.isCallExpression(initializer)) {
      return false
    }

    const name = varDecl.getName()
    const startsWithCapital = /^[A-Z]/.test(name)

    const expression = initializer.getExpression()
    const text = expression.getText()

    return (
      startsWithCapital &&
      (text === "React.forwardRef" || text === "forwardRef")
    )
  }

  /**
   * React.lazy 체크
   *
   * 감지 가능한 패턴:
   * - const LazyComponent = React.lazy(() => import('./Component'))
   * - const LazyComponent = lazy(() => import('./Component'))
   */
  private isLazyComponent(varDecl: VariableDeclaration): boolean {
    const initializer = varDecl.getInitializer()
    if (!initializer || !Node.isCallExpression(initializer)) {
      return false
    }

    const name = varDecl.getName()
    const startsWithCapital = /^[A-Z]/.test(name)

    const expression = initializer.getExpression()
    const text = expression.getText()

    return startsWithCapital && (text === "React.lazy" || text === "lazy")
  }

  /**
   * styled-components 체크
   *
   * 감지 가능한 패턴:
   * - const StyledDiv = styled.div`color: red;`
   * - const StyledButton = styled(Button)`padding: 10px;`
   * - const StyledDiv = styled.div({ color: 'red' })
   */
  private isStyledComponent(varDecl: VariableDeclaration): boolean {
    const initializer = varDecl.getInitializer()
    if (!initializer) {
      return false
    }

    const name = varDecl.getName()
    const startsWithCapital = /^[A-Z]/.test(name)

    const text = initializer.getText()
    return (
      startsWithCapital &&
      (text.includes("styled.") || text.includes("styled("))
    )
  }

  /**
   * default export 컴포넌트 체크
   *
   * 감지 가능한 패턴:
   * - export default () => <div />
   * - export default function() { return <div /> }
   */
  isDefaultExportComponent(node: Node): boolean {
    if (!Node.isExportAssignment(node)) {
      return false
    }

    const expression = node.getExpression()

    if (
      Node.isArrowFunction(expression) ||
      Node.isFunctionExpression(expression)
    ) {
      return this.isBasicComponent(expression)
    }

    return false
  }

  /**
   * 변수 선언이 어떤 종류의 컴포넌트인지 판별
   * @returns 컴포넌트 타입 문자열 또는 null
   */
  detectComponentKind(varDecl: VariableDeclaration): string | null {
    const initializer = varDecl.getInitializer()

    // 기본 함수형 컴포넌트
    if (
      initializer &&
      (Node.isArrowFunction(initializer) ||
        Node.isFunctionExpression(initializer)) &&
      this.isBasicComponent(initializer)
    ) {
      return "FunctionComponent"
    }

    // HOC 패턴
    if (this.isHOCWrappedComponent(varDecl)) {
      return "HOC"
    }

    // React.memo
    if (this.isMemoComponent(varDecl)) {
      return "React.memo"
    }

    // React.forwardRef
    if (this.isForwardRefComponent(varDecl)) {
      return "React.forwardRef"
    }

    // React.lazy
    if (this.isLazyComponent(varDecl)) {
      return "React.lazy"
    }

    // styled-components
    if (this.isStyledComponent(varDecl)) {
      return "styled-component"
    }

    return null
  }
}
