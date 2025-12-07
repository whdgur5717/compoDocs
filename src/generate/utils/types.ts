export interface PropItem {
  name: string
  type: string
  optional: boolean
  description?: string
  origin?: PropsOrigin
}

export interface PropsOrigin {
  typeName: string | null
  filePath: string | null
}

export type PropsInfo =
  | { kind: "object"; props: PropItem[]; origin: PropsOrigin }
  | { kind: "alias"; typeText: string; origin: PropsOrigin }
