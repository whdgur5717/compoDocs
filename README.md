# compodocs

Generate JSDoc for React components by statically analyzing their props.

`compodocs` scans TypeScript/TSX files, finds components tagged for generation, extracts prop types with `ts-morph`, and writes JSDoc directly above each component declaration.

## What v1 does

- Provides one CLI command: `compodocs generate`
- Reads `compodocs.config.*` from your project
- Finds tagged React components in the configured workspace
- Extracts prop names, types, optional flags, and prop JSDoc descriptions
- Writes or updates JSDoc in the source file itself
- Optionally calls a user-provided `fetcher` for AI-generated JSDoc bodies

## Installation

```bash
npm install -D compodocs
```

You can also run it without adding it to your repo:

```bash
npx compodocs generate --cwd .
```

## Quickstart

Add a tag to the component you want to document:

```tsx
/** @generate */
export function Button(props: { label: string }) {
  return <button>{props.label}</button>
}
```

Create `compodocs.config.ts`:

```ts
export default {
  workspace: {
    include: ["packages/*"],
    root: ".",
  },
  commands: {
    generate: {
      files: ["**/*.tsx"],
      tag: "generate",
    },
  },
}
```

Run:

```bash
npx compodocs generate --cwd .
```

Fallback output without AI looks like this:

```ts
/**
 * @property {string} label
 */
export function Button(props: { label: string }) {
  return <button>{props.label}</button>
}
```

## CLI

```bash
compodocs generate --cwd <path> [--config <dir>]
```

- `--cwd`: workspace root used for glob expansion and relative path resolution
- `--config`: optional directory that contains `compodocs.config.*`

If `--config` is omitted, `compodocs` looks for the config file in `--cwd`.

## Configuration

```ts
export default {
  workspace: {
    include: ["packages/*"],
    exclude: ["packages/legacy"],
    root: ".",
  },
  commands: {
    generate: {
      files: ["**/*.tsx"],
      exclude: ["**/*.stories.tsx"],
      tag: "generate",
      jsdoc: {
        fetcher: async ({ prompt, signature }) => {
          return "..."
        },
      },
    },
  },
}
```

### Config shape

```ts
type Config = {
  workspace: {
    include: string[]
    exclude?: string[]
    root: string
  }
  commands: {
    generate: {
      files: string[]
      exclude?: string[]
      tag: string
      jsdoc?: {
        fetcher: (params: {
          prompt: string
          signature: string
        }) => string | Promise<string>
      }
    }
  }
}
```

## AI fetcher

`compodocs` is vendor-agnostic. It does not ship with a built-in model provider. Instead, you provide a `fetcher` function that receives:

- `prompt`: the generated prompt with props data and source code
- `signature`: JSON metadata for the current component

The `fetcher` must return the JSDoc body string to insert into the file.

### Example: Anthropic Agent SDK

```ts
import { query } from "@anthropic-ai/claude-agent-sdk"

export default {
  workspace: {
    include: ["packages/*"],
    root: ".",
  },
  commands: {
    generate: {
      files: ["**/*.tsx"],
      tag: "generate",
      jsdoc: {
        fetcher: async ({ prompt }) => {
          let result = ""

          for await (const message of query({
            prompt,
            options: {
              maxTurns: 1,
              permissionMode: "dontAsk",
              tools: [],
            },
          })) {
            if (message.type === "result" && message.subtype === "success") {
              result = message.result
            }
          }

          return result
        },
      },
    },
  },
}
```

### Example: custom HTTP backend

```ts
export default {
  workspace: {
    include: ["packages/*"],
    root: ".",
  },
  commands: {
    generate: {
      files: ["**/*.tsx"],
      tag: "generate",
      jsdoc: {
        fetcher: async ({ prompt, signature }) => {
          const response = await fetch("https://example.com/api/jsdoc", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ prompt, signature }),
          })

          if (!response.ok) {
            throw new Error(`Fetcher failed with ${response.status}`)
          }

          const data = await response.json()
          return data.jsdoc
        },
      },
    },
  },
}
```

## Supported component patterns

- Function declarations
- PascalCase arrow/function expression components
- `React.memo(...)`
- `React.forwardRef(...)`
- `React.lazy(...)`
- HOC wrappers like `withAuth(Component)`
- styled-component style declarations

## Notes

- `compodocs` only touches declarations tagged with the configured `tag`
- Existing JSDoc is replaced only when the generated body changes
- If no `fetcher` is configured, `compodocs` still generates minimal `@property` lines from static type information

## License

ISC
