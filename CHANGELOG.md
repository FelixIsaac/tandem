# Changelog

## 1.0.0 — 2026-04-24

First published release. Fork of [benjaminshafii/opencode-browser](https://github.com/benjaminshafii/opencode-browser) rewritten for multi-agent support and production hardening.

### Added
- Auto-configure for Claude Code, OpenCode, Cursor, Windsurf, Gemini CLI, Codex
- User-extensible URL blocklist at `~/.opencode-browser/blocklist.txt`, pushed to extension on reconnect
- Token rotation on every host start (256-bit, `0o600`)
- Log redaction (`code`, `text`, password, URL query strings) with 5MB rotation; log dir `0o700`
- `AGENTS.md` as canonical agent instructions; `CLAUDE.md` imports via `@AGENTS.md`
- Zip-slip guard and symlink rejection in installer
- TOCTOU re-check on `browser_execute` and post-navigate URL check in `browser_new_tab`

### Changed
- Snapshot selectors use `data-opencode-snap` attribute for uniqueness (was class-based, collided)
- `browser_execute` trust boundary is URL-space only; regex/AST content filter dropped (security theater)
- Host wrapper points to installed `host.js`, not npx cache

### Fixed
- Server timeout handle leak on resolve/reject; reject on socket write failure
- `debuggerQueue` unbounded growth
- Version read when server.js copied outside package dir
