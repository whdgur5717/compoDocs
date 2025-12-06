import { z } from "zod"

export const workspaceConfigSchema = z.object({
  include: z.array(z.string()).default(["packages/*"]),
  exclude: z.array(z.string()).optional(),
  root: z.string(),
})

export const generateConfigSchema = z.object({
  files: z.array(z.string()).default(["**/*.tsx"]),
  exclude: z.array(z.string()).optional(),
  outputDir: z.string().default("__generated__"),
  tag: z.string().default("generate"),
})

export const buildConfigSchema = z
  .object({
    outputDir: z.string().default("docs"),
  })
  .optional()

export const configSchema = z.object({
  workspace: workspaceConfigSchema,
  commands: z.object({
    generate: generateConfigSchema.optional(),
    build: buildConfigSchema.optional(),
  }),
})

export type ConfigSchema = z.infer<typeof configSchema>
