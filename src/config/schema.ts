import { z } from "zod"

export const workspaceConfigSchema = z.object({
  include: z.array(z.string()).default(["packages/*"]),
  exclude: z.array(z.string()).optional(),
  root: z.string(),
})

type Fetcher = (params: { signature: string; prompt: string }) => string | Promise<string>

const fetcherSchema = z.custom<Fetcher>((v) => typeof v === "function")

const jsdocConfigSchema = z.object({ fetcher: fetcherSchema }).optional()

export const generateConfigSchema = z.object({
  files: z.array(z.string()).default(["**/*.tsx"]),
  exclude: z.array(z.string()).optional(),
  outputDir: z.string().default("__generated__"),
  tag: z.string().default("generate"),
  jsdoc: jsdocConfigSchema,
})

export const buildConfigSchema = z
  .object({
    outputDir: z.string().default("docs"),
  })
  .optional()

export const configSchema = z.object({
  workspace: workspaceConfigSchema,
  commands: z.object({
    generate: generateConfigSchema,
    build: buildConfigSchema,
  }),
})

export type ConfigSchema = z.infer<typeof configSchema>
