# compoDocs

Automatically generate JSDoc documentation for React components by statically analyzing their Props.

compoDocs reads your TypeScript source, extracts prop types through the compiler API, and generates accurate JSDoc comments — optionally powered by AI. No more writing docs by hand, no more docs drifting out of sync.

## Features

- **Static prop extraction** — Resolves prop types directly from TypeScript's type system via [ts-morph](https://github.com/dsherret/ts-morph). Supports generics, intersections, and utility types.
- **Broad component detection** — Recognizes function declarations, arrow functions, `React.memo`, `React.forwardRef`, `React.lazy`, HOC wrappers (`withXxx`), and styled-components.
- **AI-powered generation** — Bring your own LLM fetcher. compoDocs builds a structured prompt from extracted props and source code, sends it to your fetcher, and writes the result back.
- **Fallback mode** — No AI configured? compoDocs still generates `@property` annotations from the type information alone.
- **Non-destructive updates** — Only touches JSDoc blocks that have actually changed. Existing docs without the `@generate` tag are left untouched.
- **Monorepo-ready** — Workspace-aware config with `include` / `exclude` glob patterns. Works with any pnpm/yarn/npm workspace layout.

## Usage

**1. Add the `@generate` tag** to any component you want documented:

```tsx
/** @generate */
export function Button(props: ButtonProps) {
  return <button className={props.variant}>{props.children}</button>
}
```

**2. Create a config file** (`compodocs.config.ts`):

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

**3. Run the CLI:**

```bash
npx compodocs generate --cwd .
```

compoDocs scans your workspace, finds components tagged with `@generate`, extracts their props, and writes JSDoc directly above each declaration.

## AI Fetcher

To enable AI-powered documentation, provide a `fetcher` function in your config:

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
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
            }),
          })
          const json = await res.json()
          return json.choices[0].message.content
        },
      },
    },
  },
}
```

The fetcher receives `prompt` (the full generation prompt with props data) and `signature` (component metadata as JSON). Return the JSDoc body as a string.

## What Gets Generated

Given a component like this:

```tsx
interface AlertDialogProps {
  /** Whether the dialog is currently open */
  open: boolean
  /** Callback fired when the open state changes */
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

/** @generate */
export function AlertDialog(props: AlertDialogProps) { ... }
```

compoDocs generates:

```ts
/**
 * @description A dialog component that displays an alert to the user.
 * @component
 * @param {AlertDialogProps} props - The component props.
 * @property {boolean} open - Whether the dialog is currently open
 * @property {(open: boolean) => void} [onOpenChange] - Callback fired when the open state changes
 * @property {React.ReactNode} children
 * @returns {JSX.Element}
 * @example
 * import { AlertDialog } from './AlertDialog'
 *
 * <AlertDialog open={true} onOpenChange={(v) => setOpen(v)}>
 *   <p>Are you sure?</p>
 * </AlertDialog>
 * <!-- This comment was AI-generated. Please review before using. -->
 */
```

## Detected Component Patterns

| Pattern | Example |
|---|---|
| Function declaration | `function Button() { ... }` |
| Arrow function | `const Button = () => { ... }` |
| `React.memo` | `const Button = memo(ButtonInner)` |
| `React.forwardRef` | `const Input = forwardRef((props, ref) => ...)` |
| `React.lazy` | `const Page = lazy(() => import('./Page'))` |
| HOC wrapper | `const Page = withAuth(BasePage)` |
| styled-components | `` const Box = styled.div`...` `` |

## Configuration

```ts
// compodocs.config.ts
export default {
  workspace: {
    include: string[]     // Workspace package globs (default: ["packages/*"])
    exclude?: string[]    // Packages to skip
    root: string          // Workspace root directory
  },
  commands: {
    generate: {
      files: string[]     // File globs to scan (default: ["**/*.tsx"])
      exclude?: string[]  // Files to skip
      outputDir: string   // Output directory (default: "__generated__")
      tag: string         // JSDoc tag to trigger generation (default: "generate")
      jsdoc?: {
        fetcher: (params: { prompt: string, signature: string }) => string | Promise<string>
      }
    },
    build?: {
      outputDir: string   // Markdown docs output (default: "docs")
    }
  }
}
```

Config files are resolved from the `--cwd` directory. Supported formats: `.ts`, `.mts`, `.cts`, `.js`, `.mjs`, `.cjs`, `.json`.

## License

ISC
