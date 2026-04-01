import { z } from "zod"

export const workspaceConfigSchema = z.object({
  include: z.array(z.string()).default(["packages/*"]),
  exclude: z.array(z.string()).optional(),
  root: z.string(),
})

type Fetcher = (params: {
  signature: string
  prompt: string
}) => string | Promise<string>

const fetcherSchema = z.custom<Fetcher>((v) => typeof v === "function")

const jsdocConfigSchema = z.object({ fetcher: fetcherSchema }).optional()

export const generateConfigSchema = z.object({
  files: z.array(z.string()).default(["**/*.tsx"]),
  exclude: z.array(z.string()).optional(),
  tag: z.string().default("generate"),
  jsdoc: jsdocConfigSchema,
})

export const configSchema = z.object({
  workspace: workspaceConfigSchema,
  commands: z.object({
    generate: generateConfigSchema,
  }),
})

export type ConfigSchema = z.infer<typeof configSchema>
