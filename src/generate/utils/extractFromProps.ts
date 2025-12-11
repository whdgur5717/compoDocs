import { Node, Type } from "ts-morph"

import type { PropItem, PropsInfo, PropsOrigin } from "./types"
import { formatPropsInfo } from "./formatter"

// 첫 번째 파라미터 타입 추출: 함수 선언/화살표/함수식 공통
function firstParamTypeFromFunctionLike(node: Node): Type | undefined {
  if (Node.isFunctionDeclaration(node)) {
    const params = node.getParameters()
    return params[0]?.getType()
  }
  if (Node.isArrowFunction(node) || Node.isFunctionExpression(node)) {
    const params = node.getParameters()
    return params[0]?.getType()
  }
  return undefined
}

// React.ComponentType<P> | React.FC<P> | React.FunctionComponent<P> => P
function unwrapComponentType(t: Type) {
  const aliasName =
    t.getAliasSymbol()?.getName() || t.getSymbol()?.getName() || ""
  if (
    aliasName === "ComponentType" ||
    aliasName === "FC" ||
    aliasName === "FunctionComponent"
  ) {
    return t.getTypeArguments()[0]
  }
  return undefined
}

// React.MemoExoticComponent<T> | React.NamedExoticComponent<P>
function unwrapMemoOrNamedExotic(t: Type): Type | undefined {
  const aliasName =
    t.getAliasSymbol()?.getName() || t.getSymbol()?.getName() || ""
  if (aliasName === "MemoExoticComponent") {
    return t.getTypeArguments()[0]
  }
  if (aliasName === "NamedExoticComponent") {
    return t.getTypeArguments()[0]
  }
  return undefined
}

// React.ForwardRefExoticComponent<PropsWithoutRef<P> & RefAttributes<R>> => P
function unwrapForwardRef(t: Type): Type | undefined {
  const aliasName =
    t.getAliasSymbol()?.getName() || t.getSymbol()?.getName() || ""
  if (aliasName !== "ForwardRefExoticComponent") {
    return undefined
  }
  const arg = t.getTypeArguments()[0]
  if (!arg) {
    return undefined
  }
  const parts = arg.getIntersectionTypes()
  if (parts.length === 0) {
    return arg
  }
  const picked = parts.find((p) => {
    const name = p.getAliasSymbol()?.getName() || p.getSymbol()?.getName() || ""
    const text = p.getText()
    return (
      name === "PropsWithoutRef" ||
      (!/RefAttributes<.*>/.test(text) && !/ClassAttributes<.*>/.test(text))
    )
  })
  if (!picked) {
    return undefined
  }
  if (picked.getAliasSymbol()?.getName() === "PropsWithoutRef") {
    return picked.getTypeArguments()[0]
  }
  return picked
}

// 호출 가능한 타입에서 첫 파라미터 타입(폴백)
function fallbackFromCallSignature(t: Type): Type | undefined {
  const sig = t.getCallSignatures()[0]
  if (!sig) {
    return undefined
  }
  const decl = sig.getDeclaration()
  const param = sig.getParameters()[0]
  if (!decl || !param) {
    return undefined
  }
  return param.getTypeAtLocation(decl)
}

// 주어진 타입에서 Props 타입을 최대한 도출
function propsTypeFromType(t: Type): Type | undefined {
  // 1) memo/named exotic 풀기
  const maybeInner = unwrapMemoOrNamedExotic(t)
  if (maybeInner) {
    const viaComp = unwrapComponentType(maybeInner)
    if (viaComp) {
      return viaComp
    }
    const viaFwd = unwrapForwardRef(maybeInner)
    if (viaFwd) {
      return viaFwd
    }
  }

  // 2) 바로 ComponentType/FC/FunctionComponent
  const viaComp = unwrapComponentType(t)
  if (viaComp) {
    return viaComp
  }

  // 3) 바로 ForwardRefExoticComponent
  const viaFwd = unwrapForwardRef(t)
  if (viaFwd) {
    return viaFwd
  }

  // 4) 콜 시그니처 폴백
  return fallbackFromCallSignature(t)
}

// 호출식 첫 번째 인자에서 Props 타입 도출
function propsTypeFromArg(node: Node): Type | undefined {
  // 인라인 함수라면 첫 파라미터 타입
  const inline = firstParamTypeFromFunctionLike(node)
  if (inline) {
    return inline
  }

  // 식별자라면 정의 추적 → 타입 해석
  if (Node.isIdentifier(node)) {
    const defs = node.getDefinitionNodes()
    if (defs.length > 0 && defs[0]) {
      return (
        firstParamTypeFromFunctionLike(defs[0]) ??
        propsTypeFromType(node.getType())
      )
    }
    return propsTypeFromType(node.getType())
  }

  // 속성 접근(Dialog.Portal 등)이라면 타입 해석
  if (Node.isPropertyAccessExpression(node)) {
    return propsTypeFromType(node.getType())
  }

  return undefined
}

function getTypeOrigin(type: Type): PropsOrigin {
  const symbol = type.getAliasSymbol() || type.getSymbol()
  const typeName = symbol ? symbol.getName() || null : null
  const decls = symbol ? symbol.getDeclarations() : []
  if (decls.length > 0) {
    const filePath = decls[0]?.getSourceFile().getFilePath() || "unknown"
    return { typeName, filePath }
  }
  const properties = type.getProperties()
  if (properties.length > 0) {
    const counts = new Map<string, number>()
    for (const prop of properties) {
      const pDecls = prop.getDeclarations()
      if (pDecls.length === 0) continue
      const pFile = pDecls[0]?.getSourceFile().getFilePath()
      if (typeof pFile === "string" && pFile.length > 0) {
        counts.set(pFile, (counts.get(pFile) ?? 0) + 1)
      }
    }
    if (counts.size > 0) {
      let bestPath = ""
      let bestCount = -1
      for (const [p, c] of counts) {
        if (c > bestCount) {
          bestPath = p
          bestCount = c
        }
      }
      return { typeName, filePath: bestPath }
    }
  }
  return { typeName, filePath: null }
}

function propsInfoFromType(type: Type): PropsInfo {
  const properties = type.getProperties()
  const origin = getTypeOrigin(type)
  if (properties.length > 0) {
    const items: PropItem[] = []
    for (const prop of properties) {
      const propName = prop.getName()
      const propDecls = prop.getDeclarations()
      if (propDecls.length === 0) {
        items.push({ name: propName, type: "unknown", optional: false })
        continue
      }
      const decl = propDecls[0]
      if (!decl) {
        continue
      }
      const propType = prop.getTypeAtLocation(decl)
      let description = ""
      if (Node.isJSDocable(decl)) {
        const jsDocs = decl.getJsDocs()
        if (jsDocs.length > 0) {
          description = jsDocs[0]?.getDescription().trim() || ""
        }
      }
      const propOrigin = getTypeOrigin(propType)
      items.push({
        name: propName,
        type: propType.getText(),
        optional: prop.isOptional(),
        description: description || undefined,
        origin: propOrigin,
      })
    }
    return { kind: "object", props: items, origin }
  }
  return { kind: "alias", typeText: type.getText(), origin }
}

export function extractPropsTypeInfo(node: Node): PropsInfo | null {
  // 1) 함수 선언/화살표/함수식: 첫 파라미터 타입
  const fnParam = firstParamTypeFromFunctionLike(node)
  if (fnParam) {
    return propsInfoFromType(fnParam)
  }

  // 2) 변수 선언 + 호출식(HOC/memo/forwardRef 등)
  if (Node.isVariableDeclaration(node)) {
    const initializer = node.getInitializer()
    if (initializer && Node.isCallExpression(initializer)) {
      const args = initializer.getArguments()
      if (args.length > 0) {
        const firstArg = args[0]
        if (!firstArg) {
          return null
        }
        const t = propsTypeFromArg(firstArg)
        if (t) {
          return propsInfoFromType(t)
        }
      }
    }
  }
  return null
}

export function formatExtractedProps(info: PropsInfo | null): string | null {
  if (!info) return null
  return formatPropsInfo(info, 0)
}
