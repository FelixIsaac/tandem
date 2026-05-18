# Tandem

> A hardened, multi-agent fork of [opencode-browser](https://github.com/benjaminshafii/opencode-browser) by Benjamin Shafii.

Browser automation for AI agents via Chrome extension + Native Messaging. Works with Claude Code, OpenCode, Cursor, Windsurf, VS Code Copilot, Gemini CLI, Codex, and any MCP-compatible agent.

**Runs inside your existing Chrome session** — shares your logins, cookies, and bookmarks. No separate profiles, no re-authentication.

> Agent tabs open in a dedicated **Tandem** window (cyan tab group) so your browsing is never interrupted.

## Why not Playwright / DevTools?

Chrome 136+ blocks `--remote-debugging-port` on your default profile. DevTools-based tools trigger a security prompt every time. This project uses Chrome's Native Messaging API — the same approach Anthropic uses for Claude in Chrome — so automation works silently against your live session.

## Installation

```bash
npx @felixisaac/tandem install
```

The installer:
1. Copies the extension to `~/.tandem/extension/`
2. Opens Chrome so you can load the unpacked extension
3. Registers the native messaging host (registry on Windows, `NativeMessagingHosts` on macOS/Linux)
4. Installs runtime agent guides and skills under `~/.tandem/`
5. Optionally updates your agent config file

## First-Time Setup

1. Run the installer:

   ```bash
   npx @felixisaac/tandem install
   ```

2. Load the Chrome extension when prompted:
   - Open `chrome://extensions`
   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select `~/.tandem/extension`
   - Copy the extension ID back into the installer

3. Let the installer configure your agent, or add the MCP server manually:

   ```bash
   node ~/.tandem/server.js
   ```

4. Restart your agent so it reconnects to MCP.

5. Verify the server is visible:
   - Tools should include `browser_snapshot`, `browser_get_tabs`, and `browser_open_tab`
   - Resources should include `tandem://agents-guide`
   - Prompts should include `tandem_usage_guide`

6. First browser task:
   - Read `tandem://agents-guide` if your client exposes resources
   - Call `browser_snapshot` before acting on a page
   - Use agent-owned tabs, preferably via `browser_open_tab`

## Agent Setup

After installing, the server lives at `~/.tandem/server.js`. Configure your agent:

<details>
<summary><strong>Claude Code</strong></summary>

```bash
claude mcp add -s user browser -- node ~/.tandem/server.js
```

Adds the server globally — available in every Claude Code session.

</details>

<details>
<summary><strong>OpenCode</strong></summary>

Add to `opencode.json` (project) or `~/.config/opencode/opencode.json` (global):

```json
{
  "mcp": {
    "browser": {
      "type": "local",
      "command": ["node", "~/.tandem/server.js"],
      "enabled": true
    }
  }
}
```

</details>

<details>
<summary><strong>Cursor</strong></summary>

Add to `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "browser": {
      "command": "node",
      "args": ["~/.tandem/server.js"]
    }
  }
}
```

Restart Cursor after saving.

</details>

<details>
<summary><strong>Windsurf</strong></summary>

Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "browser": {
      "command": "node",
      "args": ["~/.tandem/server.js"]
    }
  }
}
```

</details>

<details>
<summary><strong>VS Code + GitHub Copilot</strong></summary>

Add to `.vscode/mcp.json` (workspace) or open **MCP: Open User Configuration** from the command palette:

```json
{
  "servers": {
    "browser": {
      "type": "stdio",
      "command": "node",
      "args": ["~/.tandem/server.js"]
    }
  }
}
```

Reload the window after saving (`Ctrl+Shift+P` → **Developer: Reload Window**).

</details>

<details>
<summary><strong>Gemini CLI</strong></summary>

Add to `~/.gemini/settings.json`:

```json
{
  "mcpServers": {
    "browser": {
      "command": "node",
      "args": ["~/.tandem/server.js"]
    }
  }
}
```

</details>

<details>
<summary><strong>Codex CLI (OpenAI)</strong></summary>

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.browser]
command = "node"
args = ["~/.tandem/server.js"]
```

</details>

## Available Tools

### Page Interaction
| Tool | Description |
|------|-------------|
| `browser_snapshot` | **Start here.** Accessibility tree with CSS selectors — low token cost (200–1500 tokens) |
| `browser_snapshot_cached` | Cached snapshot — re-uses last result if URL unchanged and < 30 s old. Use in multi-step flows to skip re-layout |
| `browser_invalidate_cache` | Clear snapshot cache for a tab (or all tabs) — call after mutating actions |
| `browser_page_text` | Plain text (innerText) — cheapest way to read page content |
| `browser_screenshot` | Visual capture — use only when layout matters (500–3000 tokens) |
| `browser_navigate` | Navigate to a URL |
| `browser_click` | Click an element by CSS selector |
| `browser_double_click` | Double-click an element (text selection, file open) |
| `browser_right_click` | Right-click to trigger context menu |
| `browser_hover` | Hover mouse over element — triggers mouseover/mousemove for hover menus |
| `browser_drag_drop` | Drag element to target element or coordinates |
| `browser_select_option` | Select a `<select>` option by value or label text |
| `browser_type` | Type text into an input |
| `browser_keyboard` | Send key events (Enter, Escape, Tab, ctrl+a, …) |
| `browser_dialog_handle` | Accept or dismiss alert/confirm/prompt dialogs |
| `browser_wait_for_selector` | Wait for element to appear — essential for SPAs |
| `browser_scroll` | Scroll page or element into view |
| `browser_wait` | Wait for a fixed duration (capped at 30s) |
| `browser_execute` | Run JavaScript via `chrome.debugger` — works on all pages including CSP-strict sites |
| `browser_storage_inspect` | Read localStorage or sessionStorage from a tab |
| `browser_print_to_pdf` | Print page to PDF via Chrome's print engine (base64) |
| `browser_performance` | CDP Performance metrics: heap size, DOM nodes, layout count |
| `browser_device_emulate` | Emulate mobile viewport via CDP; `reset=true` restores desktop |
| `browser_get_element_info` | Get precise bounds, center, visibility, and z-index for any element |

### Tab Management
| Tool | Description |
|------|-------------|
| `browser_status` | Show connection status + current tab claims |
| `browser_list_claims` | List per-session tab ownership claims |
| `browser_claim_tab` | Claim a specific tab for this session |
| `browser_release_tab` | Release a claimed tab |
| `browser_open_tab` | Open and claim a fresh agent tab for this session |
| `browser_get_tabs` | List all open tabs |
| `browser_new_tab` | Open a new tab in the agent window |
| `browser_close_tab` | Close a tab |
| `browser_switch_tab` | Focus a tab (use to hand off to user) |
| `browser_new_window` | Open a new browser window (supports incognito) |
| `browser_open_batch` | Open up to 20 URLs as tabs in one call |
| `browser_deduplicate_tabs` | Find and close duplicate-URL tabs (supports dry-run) |

### Tab Groups
| Tool | Description |
|------|-------------|
| `browser_get_tab_groups` | List all tab groups with colors, titles, and member tabs |
| `browser_create_tab_group` | Create a new group from tab IDs with optional title and color |
| `browser_update_tab_group` | Rename, recolor, or collapse/expand a group |
| `browser_move_to_group` | Move tabs into an existing group |

### Sessions
| Tool | Description |
|------|-------------|
| `browser_session_save` | Save all open tabs as a named session to Chrome storage |
| `browser_session_restore` | Restore a saved session (opens all saved URLs) |
| `browser_recently_closed` | List recently closed tabs/windows |
| `browser_restore_session` | Restore a recently closed tab/window by session ID |

### History & Bookmarks
| Tool | Description |
|------|-------------|
| `browser_search_history` | Search history by keyword, URL, and date range |
| `browser_recent_browsing` | Recent visits from the last N hours |
| `browser_history_stats` | Total entries, date range, top visited domains |
| `browser_get_bookmarks` | Full bookmarks tree |

### Browser Utilities
| Tool | Description |
|------|-------------|
| `browser_downloads` | List recent Chrome downloads |
| `browser_notify` | Send a Chrome desktop notification (supports buttons) |
| `browser_storage_read` | Read Chrome extension storage (local or sync) |
| `browser_clear_browsing_data` | Clear selected browsing data types |
| `browser_save_mhtml` | Save a tab as MHTML |
| `browser_console_logs` | Capture console logs briefly |
| `browser_get_dom` | Return DOM document data via CDP |
| `browser_get_version` | Return browser/CDP version |
| `browser_clear_storage` | Clear origin storage data |
| `browser_find_tabs` | Find open tabs by URL/title/window/group |
| `browser_watch_page` | Start/stop page watching or query idle state |
| `browser_get_security_state` | Read page security state |
| `browser_list_fonts` | List browser fonts |
| `browser_list_extensions` | List installed extensions |
| `browser_get_computed_styles` | Read computed styles for an element |
| `browser_get_page_issues` | Read page issues via CDP |
| `browser_query_accessibility` | Query accessibility tree by role/name |
| `browser_set_site_permission` | Set a site permission |
| `browser_wait_for_navigation` | Wait for navigation events |
| `browser_batch_execute` | Run one JS snippet across selected tabs |
| `browser_top_sites` | List top visited sites |
| `browser_system_info` | Read CPU/memory/display info |
| `browser_speak` | Speak text with Chrome TTS |

### Cookie Management
| Tool | Description |
|------|-------------|
| `browser_get_cookies` | Get cookies for a tab's URL via CDP |
| `browser_get_all_cookies` | Get all browser cookies (optional domain filter) |
| `browser_set_cookie` | Set a cookie with full control over flags and expiry |
| `browser_delete_cookies` | Delete cookies by name, domain, or URL |

### Reading List
| Tool | Description |
|------|-------------|
| `browser_reading_list` | Get, add, or remove reading-list entries |

### Network & Emulation
| Tool | Description |
|------|-------------|
| `browser_network_conditions` | Throttle bandwidth / add latency / go offline — presets: offline, slow-2g, 2g, 3g, fast-3g, 4g |
| `browser_geolocation` | Override GPS coordinates; `reset=true` clears |
| `browser_user_agent` | Override UA string (presets: mobile-android, mobile-ios), timezone, and locale |
| `browser_inject_script` | Inject JS at document start on every page load; returns scriptId |
| `browser_block_urls` | Block URL patterns from loading (ads, analytics, images); `reset=true` clears |

## MCP Resources

| URI | Description |
|-----|-------------|
| `tandem://agents-guide` | Full `AGENTS.md` behavioral guide — fetch via `resources/read` for runtime agent context |
| `tandem://skill-guide` | Client skill instructions where available |
| `tandem://security-model` | Security boundaries and high-risk tool guidance |
| `tandem://tool-map` | Current tool list and selection guidance |
| `tandem://workflows/tab-management` | Safe tab cleanup and organization workflow |

## MCP Prompts

| Prompt | Description |
|--------|-------------|
| `tandem_usage_guide` | Load Tandem's core usage, safety, and workflow rules |
| `safe_tab_cleanup` | Plan scoped tab cleanup with dry-run first |
| `inspect_page` | Inspect a page with snapshot-first workflow |
| `extract_open_tabs` | Extract data from selected open tabs safely |

## Per-tab Ownership

Tandem enforces **per-session tab claims** so multiple agents can share one Chrome session without stepping on each other.

- If you omit `tabId`, Tandem auto-creates (once) and reuses a **default agent tab** per MCP client session.
- If you pass an explicit `tabId`, Tandem will reject the call if that tab is claimed by another session.
- Use `browser_open_tab` to open a tab that is automatically claimed for your session.
- Claims expire after inactivity (`TANDEM_CLAIM_TTL_MS`, default 5 minutes). Debug with `browser_status` / `browser_list_claims`.

## Agent Instructions

See [AGENTS.md](./AGENTS.md) for full behavioral guidance:
- Snapshot-first workflow (token efficiency)
- Waiting for dynamic elements before clicking
- Hand-off pattern for login walls / CAPTCHAs
- Error recovery table
- Security rules and prompt injection protection

Claude Code users: see [CLAUDE.md](./CLAUDE.md).

## Architecture

![Architecture](https://mermaid.ink/svg/pako:eNpVkUFqwzAQRa8yzCqBut6HEggikEKdmprShdWFbE1lNbFkJDkJhEBP0ytkn6P0JCWOEtrdSPO-Pv9rj7WVhBNUTnQNPL1wAwAwKznOFJnwULl0OmJr0UuCFJ47MswOI-udt-7n63vM8f2iKkqO3tWpJ7chd__pB3XGciiGmxu4iGBjfbhiSxH0hiAj74XSRsHC-nBTzEuOtAtkvLYmrUS9Us72Rl7VrHG2pcFH1wRv1q3--LGSYyRm-eNFEUTl4XSErTbSbofR10534ex9OoKkqlcqPhJbgSQBjj5IbWGUsXzMEZJkCkXMf9kvRUsSct2da3o1egeFrVcUIryIHVzh_7EjNI-xhwPDO2zJtUJLnOwxNNSev0zSh-jXAQ-HX-XskeE)

- **`src/server.js`** — MCP server; exposes tools, enforces rate limits, routes to host
- **`src/host.js`** — Native messaging host; bridges socket ↔ Chrome, handles auth
- **`extension/background.js`** — Service worker; executes Chrome APIs, runs JS via `chrome.debugger`

Multiple agents can share one browser session simultaneously.

## Security model

The agent acts as **you** inside your real Chrome session. The trust boundary is the **URL space**, not the JS the agent runs.

- **URL blocklist** — banking, email, OAuth, password managers, crypto blocked by default for content-touching tab tools. Browser-wide metadata tools can still reveal tab titles/URLs. Extend via `~/.tandem/blocklist.txt` (one regex per line, `#` for comments). The host pushes updates to the extension on reconnect.
- **Socket auth** — 256-bit token rotated on every host start. Server reads token fresh on each connect.
- **Prompt injection** — agents are instructed never to act on instructions in page content (see [AGENTS.md](./AGENTS.md#security)). This remains an unsolved problem industry-wide; the URL blocklist is your safety net.
- **`browser_execute`** — runs arbitrary JS as you via `chrome.debugger`. No content filter (regex blocklists are trivially bypassable); 50KB result cap as DoS guard. Don't run untrusted agents.
- **Logging** — `~/.tandem/logs/host.log` redacts `code`, `text`, and URL query strings; rotates at 5MB; dir is `0700`.

**Known limitation (Windows):** the named pipe has the default ACL (Everyone). Any process running as the same Windows user can connect. Token rotation per host start limits exposure. Run only agents you trust.

## Platform Support

| Platform | Status |
|----------|--------|
| Windows | ✓ (named pipe, registry) |
| macOS | ✓ |
| Linux | ✓ |

## Uninstall

```bash
npx @felixisaac/tandem uninstall
```

Then remove the extension from Chrome and optionally delete `~/.tandem/`.

## Logs

```
~/.tandem/logs/host.log
```

## License

MIT — forked from [benjaminshafii/opencode-browser](https://github.com/benjaminshafii/opencode-browser)
