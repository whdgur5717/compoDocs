# AGENTS.md — Project Agent Guidelines

These instructions apply to the entire repository unless a more deeply nested AGENTS.md overrides them.

## Domain‑based Folder Structure (src)

- `src/cli.ts`
  - CLI program entry (`compoDocs`). Global options only. Subcommands are registered from their domains.

- `src/config/`
  - `loadConfig.ts`: Load user config via `unconfig`. `--config` is a directory. Look for `compodocs.config.*` (ts/mts/cts/js/mjs/cjs/json).
  - `schema.ts`: Single Zod schema `ConfigSchema` (only config validation; no CLI option schemas).

- `src/generate/` (props → prompt → AI → JSDoc)
  - `runner.ts`: Orchestrates target discovery, parsing, prompt build, fetcher call, output.
  - `apply.ts`: Insert/update JSDoc above the declaration; uses the fixed last‑line marker.

- `src/build/`
  - `index.ts`: Build Markdown docs from `@public` JSDoc.

- `src/check/`
  - `index.ts`: Report exports missing `@public`.

- `src/utils/`
  - `resolveTargets.ts`: Expand `--file/--glob` (fast‑glob), apply exclude.
  - `logger.ts`: Minimal leveled logging.
  - `errors.ts`: Error helpers and exit codes.

- Existing helpers used by generate
  - `src/prompt.ts`: Prompt builder (props‑only JSDoc rules).
  - `src/fetcher.ts`: Example fetcher only (real fetcher must come from config).
  - `src/utils/parse.ts`, `componentDetector.ts`, `extractFromProps.ts`, `jsdoc.ts`, `formatter.ts`.

## Config Policy

- Program name: `compoDocs`.
- Config discovery: `--config <dir>` (directory only). Inside it, resolve `compodocs.config.*`.
- Validation: Parse loaded config with `ConfigSchema` (Zod). Reject on failure.
- No implicit `process.cwd()` inside loaders. Always use the provided `cwd` argument for path resolution.

## CLI/Options Policy

- Global options exist only in `src/cli.ts`. Command‑specific options live in each subcommand module.
- Validate options with Zod (separate from `ConfigSchema`). Enforce: `verbose` and `quiet` cannot both be true.
- Exit codes: 0 (ok), 1 (error), 2 (check found issues), 3 (no targets).

## Coding Conventions

- TypeScript strict. Do not use `any` or cast with `as`. Use type guards/narrowing.
- No inline/block comments in code unless explicitly requested. Keep code self‑descriptive.
- No hidden defaults: do not read `process.cwd()` or environment values inside pure utilities unless the caller passes them.
- ESM modules only. Keep imports explicit and sorted.
- No caching layers unless explicitly requested.

## Generate Rules (AI JSDoc)

- Sources: only declarations with the configured tag (default `@generate`).
- Output: single JSDoc block composed of `@property` lines only; no extra tags; end with the fixed marker `<!-- This comment was AI-generated. Please review before using. -->`.
- Apply: insert/update immediately above the target declaration; only update on diffs.

## External Services

- The AI fetcher must be provided by user config (`commands.generate.jsdoc.fetcher`).
- Do not hardcode API keys/models/endpoints in source. Use environment variables inside user‑provided fetchers only.

## Utilities & Libraries

- Config: `unconfig`
- Globbing: `fast-glob`
- Concurrency (optional): `p-limit`
- Interactive selection (optional): `prompts`
- Diff preview (optional): `diff`

## Do / Don’t

- Do: keep changes minimal and scoped to the task. Prefer pure functions and explicit parameters.
- Do: validate inputs with Zod at module boundaries.
- Don’t: introduce `any`, `as` casts, or silent fallbacks.
- Don’t: introduce caching, network calls, or side effects outside designated modules.

## 테스트 정책 (Vitest)

- 테스트 러너: Vitest (Node.js ≥ 18).
- 폴더 구조(도메인별 분리):
  - `src/generate/test/` — 생성 파이프라인 단위 테스트/스냅샷
  - `src/build/test/` — 빌드 파이프라인 단위 테스트
  - `src/check/test/` — 체크 로직 단위 테스트
  - `src/config/test/` — 설정 로더/스키마 검증 테스트
  - `src/utils/test/` — 공용 유틸 테스트
- 파일 명명 규칙:
  - 단위 테스트: `*.spec.ts`
  - 통합/시나리오: `*.e2e.ts` (필요 시)
- 실행 원칙:
  - 외부 네트워크 금지(특히 AI 호출). fetcher는 스텁/목으로 대체.
  - 파일 시스템 변경은 임시 디렉터리(`.tmp-test/` 등)에서만 수행하고 정리.
  - 순수 함수 우선 테스트, CLI/통합은 최소한으로 유지.
- 모아서 실행(집합 테스트):
  - 각 도메인 `test/` 폴더를 한 번에 실행한다(예: `vitest run`).
  - 필요 시 루트에 집합 테스트 엔트리(`tests/all.e2e.ts`)를 두어 서브커맨드 동작을 종합 검증.
  - 모든 테스트 코드는 한국어로 작성한다. `describe/it`의 설명 문구도 한국어를 사용한다.
  - 테스트 메시지는 해당 테스트 로직을 가장 잘 표현하도록 간결하게 작성한다.

### Fixture 사용 지침

- 목적: 파일 시스템이 필요한 통합성 테스트(예: ts-morph 파싱, CLI `--write` 동작)에서만 사용한다.
- 단순 유틸(순수 함수)은 fixture를 사용하지 않는다. 문자열/가짜 입력으로 테스트한다.
- 위치(도메인별):
  - `src/generate/test/fixtures/<case>/`
  - `src/build/test/fixtures/<case>/`
  - `src/check/test/fixtures/<case>/`
  - `src/config/test/fixtures/<case>/`
- 구성 예시(권장):
  - `<case>/input/` — 소스 파일(ts/tsx/tsconfig 등)
  - `<case>/expected/` — 기대 결과(예: 생성된 JSDoc 스냅샷, 생성된 md, 로그 JSON 등)
- 실행 방식:
  - fixture는 읽기 전용으로 유지한다. 테스트 시작 시 임시 디렉터리(예: `.tmp-test/<suite>/<case>` )에 복사하여 쓰기 동작을 수행한다.
  - 네트워크 호출은 금지한다. AI fetcher 등은 스텁/목으로 대체한다.
- 관리 원칙:
  - 최소 크기/최소 파일만 포함한다. 비밀키/대용량/`node_modules` 금지.
  - 필요한 타입 선언은 최소한으로 vendor 하거나, tsconfig 경로 매핑을 활용한다.
  - 스냅샷 사용 시, 의미 있는 변경만 승인하고 PR 리뷰에서 차이를 확인한다.
