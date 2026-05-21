# Changelog

## Unreleased

### Fixed
- `browser_print_to_pdf` no longer fails with `Connection closed` on pages whose rendered PDF exceeds ~1MB. Root cause: extension returned the base64 PDF inline over native messaging; extension→host messages are capped at 1MB, oversized responses kill the host process and drop the MCP pipe. Fix: write PDF to disk via `chrome.downloads.download()` with a `data:` URL and return only `{ downloadId, filename, bytes, url, title }` — response is ~200 bytes regardless of PDF size. Tool now accepts optional `filename` arg.

### Added

**MCP Agent Context**
- Added MCP prompts: `tandem_usage_guide`, `safe_tab_cleanup`, `inspect_page`, `extract_open_tabs`
- Added MCP resources: `tandem://skill-guide`, `tandem://security-model`, `tandem://tool-map`, `tandem://workflows/tab-management`
- Added Codex skill at `.codex/skills/tandem/SKILL.md`
- Installer now copies `AGENTS.md`, `CLAUDE.md`, `.opencode/`, and `.codex/` into `~/.tandem/`
- Added `tandem doctor` diagnostics
- Installer can register native messaging for Chrome, Edge, Brave, and Vivaldi
- Added `browser_context_events` for right-click "Send to Tandem" context captures

**Safety**
- `browser_deduplicate_tabs` now defaults to `dryRun:true`; closing requires `dryRun:false` and `close:true`
- `browser_deduplicate_tabs` supports `windowId`, `tabIds`, and `includePinned`
- `browser_session(action:"save")` supports `windowId`, `tabIds`, and skips blocklisted URLs unless `includeSensitive:true`
- `browser_batch_execute` is now marked destructive/open-world in MCP annotations
- Explicit-tab screenshots restore the previously active tab/window after capture
- Full-page screenshots use CDP `Page.captureScreenshot` when `fullPage:true`
- `browser_click` dispatches pointer/mouse events for ARIA/custom listbox controls

**Tool Surface**
- Consolidated Reading List tools into `browser_reading_list(action)`
- Consolidated page watch/idle tools into `browser_watch_page(action)`
- Consolidated similar browser clusters into action tools: `browser_history`, `browser_tab_group`, `browser_session`, `browser_storage`, `browser_inspect`, `browser_cookies`, and `browser_emulation`
- Public MCP surface reduced from 82 to 59 tools
- Added `npm run audit:mcp` to detect README/tool/schema drift

### Changed

- README now includes first-time setup, MCP prompts/resources, and updated tool docs
- Agent docs now clarify that browser-wide metadata tools may still expose tab titles/URLs even when content-touching tools are blocklisted

## 1.5.0 — 2026-05-16

### Added

**Advanced Interaction** (no new permissions — `debugger` covers all CDP)
- `browser_hover` — trigger mouseover/mousemove on element; essential for hover menus and tooltips
- `browser_select_option` — select `<select>` dropdown by value or visible label text; dispatches `change`+`input` events
- `browser_double_click` — double-click element via CDP Input; for text selection, file open, etc.
- `browser_right_click` — right-click element to open context menu
- `browser_drag_drop` — drag from source element to target element or coordinates; interpolates 3 move steps

**Dialog & Page Control**
- `browser_dialog_handle` — accept or dismiss the currently-open `alert`/`confirm`/`prompt` dialog; no-op if no dialog is open

**Cookie Management**
- `browser_get_all_cookies` — get all browser cookies (not just current tab's URL) via `Network.getAllCookies`, with optional domain filter
- `browser_set_cookie` — set a cookie with full control (domain, path, secure, httpOnly, sameSite, expiry)
- `browser_delete_cookies` — delete cookies by name, optionally scoped to domain/URL

**Network & Emulation**
- `browser_network_conditions` — emulate network throttling with presets: `offline`, `slow-2g`, `2g`, `3g`, `slow-3g`, `fast-3g`, `4g`, or custom bandwidth/latency values
- `browser_geolocation` — override GPS coordinates via `Emulation.setGeolocationOverride`; `reset:true` clears override
- `browser_user_agent` — override user agent (built-ins: `mobile-android`, `mobile-ios`), timezone (IANA), and locale; `reset:true` clears all

**Script & Resource Control**
- `browser_inject_script` — inject JS at `document_start` on every page load via `Page.addScriptToEvaluateOnNewDocument`; returns scriptId
- `browser_block_urls` — block URL patterns from loading via `Network.setBlockedURLs` (ad networks, analytics, images, etc.); `reset:true` clears

**Inspection**
- `browser_get_element_info` — get precise bounds, center coordinates, contentQuad, visibility, display, opacity, z-index for any element

## 1.4.1 — 2026-05-16

### Added

**Snapshot caching** (no new permissions)
- `browser_snapshot_cached` — return cached accessibility snapshot (30 s TTL, invalidated on URL change). Use instead of `browser_snapshot` in repeated-read workflows to avoid re-running expensive layout reflows.
- `browser_invalidate_cache` — explicitly clear snapshot cache for one tab or all tabs. Call after a mutating action when you need the next `browser_snapshot_cached` to reflect current page state.

**MCP Resources**
- `tandem://agents-guide` — exposes `AGENTS.md` as an MCP resource. Agents can call `resources/read` to pull the full behavioral guide at runtime (closes #14).

## 1.4.0 — 2026-05-16

### Added

**Idle & System** (`idle`, `fontSettings`, `management` permissions)
- `browser_watch_idle` — query user idle state (active/idle/locked) or set detection threshold
- `browser_list_fonts` — get configured font families per generic category and script
- `browser_list_extensions` — list all installed Chrome extensions with status and metadata

**CDP: Security, CSS, Audits, Accessibility** (no new permissions — `debugger` already granted)
- `browser_get_security_state` — TLS cert info, mixed content warnings, safe browsing state
- `browser_get_computed_styles` — computed CSS property values for any DOM element
- `browser_get_page_issues` — accessibility violations, mixed content, deprecation warnings via Audits domain
- `browser_query_accessibility` — find elements by ARIA role and/or accessible name

**Site Control** (`contentSettings`, `webNavigation` permissions)
- `browser_set_site_permission` — set per-site allow/block for JS, cookies, popups, geolocation, camera, mic, etc.
- `browser_wait_for_navigation` — event-driven wait for page navigation (replaces polling patterns)

## 1.3.0 — 2026-05-16

### Added

**Chrome Sessions, Top Sites & Reading List** (`sessions`, `topSites`, `readingList` permissions)
- `browser_recently_closed` — list recently closed tabs/windows with sessionIds
- `browser_restore_session` — restore a closed tab or window by sessionId
- `browser_top_sites` — get most-visited URLs (same as Chrome NTP tiles)
- `browser_reading_list_get` — read all Chrome Reading List entries
- `browser_reading_list_add` — add a URL to Chrome's Reading List
- `browser_reading_list_remove` — remove a URL from Reading List

**System Info, TTS & Data Management** (`system.cpu`, `system.memory`, `system.display`, `tts`, `browsingData`, `pageCapture` permissions)
- `browser_system_info` — CPU model/cores, available RAM, display config
- `browser_speak` — OS text-to-speech with rate/pitch/lang/voice control
- `browser_clear_browsing_data` — clear cache, cookies, history, localStorage etc. by type + time range
- `browser_save_mhtml` — save full page as MHTML archive (base64); richer than screenshot

**CDP Tools** (`debugger` permission, already granted)
- `browser_console_logs` — capture browser Log domain entries via CDP
- `browser_get_cookies` — dump cookies for a tab's URL via `Network.getCookies`
- `browser_get_dom` — full serialized `outerHTML` via `DOM.getOuterHTML` (truncated at 200KB)
- `browser_get_version` — Chrome version, protocol version, user agent string
- `browser_clear_storage` — clear `localStorage`, `sessionStorage`, `IndexedDB`, cache for an origin

**Tab Search & Page Watcher** (no new permissions)
- `browser_find_tabs` — keyword search across all tab titles + URLs
- `browser_watch_page_start` — poll a tab for content changes; sends Chrome notification on change
- `browser_watch_page_stop` — stop watching a tab

## 1.2.0 — 2026-05-16

### Added

**History & Bookmarks** (`history` + `bookmarks` permissions)
- `browser_search_history` — search by keyword, URL, date range
- `browser_recent_browsing` — visits from last N hours
- `browser_history_stats` — total entries, date range, top 20 domains
- `browser_get_bookmarks` — full bookmarks tree (read-only)

**Tab Groups** (`tabGroups` permission, already granted)
- `browser_get_tab_groups` — list all groups with colors, titles, member tabs
- `browser_create_tab_group` — create group from tab IDs with title + color
- `browser_update_tab_group` — rename, recolor, collapse/expand
- `browser_move_to_group` — move tabs into an existing group

**CDP Tools** (`debugger` permission, already granted)
- `browser_print_to_pdf` — print page to PDF via `Page.printToPDF` (base64)
- `browser_performance` — CDP Performance domain metrics (heap, DOM nodes, layout count)
- `browser_device_emulate` — mobile viewport emulation via `Emulation.*`; reset to desktop with `reset=true`

**Page Utilities** (no new permissions)
- `browser_page_text` — extract `innerText` from a tab; cheaper than snapshot for reading tasks
- `browser_deduplicate_tabs` — find and close duplicate-URL tabs (supports `dryRun`)
- `browser_open_batch` — open up to 20 URLs as tabs in one call
- `browser_storage_inspect` — read `localStorage` or `sessionStorage` from a tab

**Session Management** (`storage` permission, already granted)
- `browser_session_save` — snapshot all open tab URLs to Chrome storage by name
- `browser_session_restore` — reopen a saved session (skips blocklisted URLs)

**Browser Utilities**
- `browser_notify` — send a Chrome desktop notification with optional buttons
- `browser_storage_read` — read Chrome extension storage (local or sync)
- `browser_downloads` — list recent downloads (`downloads` permission added)

## 1.1.0 — 2026-04-26

### Added
- Per-session tab ownership claims (ported from opencode-browser v4)
- New MCP tools: `browser_status`, `browser_list_claims`, `browser_claim_tab`, `browser_release_tab`, `browser_open_tab`
- Auto-create default agent tab per MCP client session
- OpenCode skill file (`.opencode/skills/tandem/SKILL.md`)
- MCP tool annotations on all tools (destructiveHint, readOnlyHint, idempotentHint, openWorldHint)

### Changed
- `browser_new_tab` default `active` changed from `true` to `false` (non-interference)
- Tab claims enforced on ALL explicit `tabId` tools including `close_tab`/`switch_tab`
- Session IDs now use `crypto.randomBytes()` instead of `Math.random()`
- Claim cleanup uses deterministic request tracking instead of regex parsing

### Security
- Fixed: claim enforcement bypass on tab management tools
- Fixed: insecure randomness for session IDs

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
