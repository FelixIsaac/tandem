# Tandem

> A hardened, multi-agent fork of [opencode-browser](https://github.com/benjaminshafii/opencode-browser) by Benjamin Shafii.

Browser automation for AI agents via Chrome extension + Native Messaging. Works with Claude Code, OpenCode, Cursor, Windsurf, VS Code Copilot, Gemini CLI, Codex, and any MCP-compatible agent.

**Runs inside your existing Chrome session** — shares your logins, cookies, and bookmarks. No separate profiles, no re-authentication.

> Agent tabs open in a dedicated **Tandem** window (cyan tab group) so your browsing is never interrupted.

## Why not Playwright / DevTools?

Chrome 136+ blocks `--remote-debugging-port` on your default profile. DevTools-based tools trigger a security prompt every time. This project uses Chrome's Native Messaging API — the same approach Anthropic uses for Claude in Chrome — so automation works silently against your live session.

## Comparison

Tandem is for agents that need a real local Chrome session without taking over the user's browsing. It uses a Chrome extension plus Native Messaging, exposes MCP tools/resources/prompts/skills, and keeps agent work in claimed tabs/windows so multiple agents can coexist. It is not as mature, packaged, or widely tested as larger browser automation stacks.

| Project | Best fit | Compared with Tandem |
|---------|----------|----------------------|
| [Vercel Labs agent-browser](https://github.com/vercel-labs/agent-browser) | Polished agent browser CLI and skills | More mature distribution; Tandem focuses on the user's live Chrome via extension/native messaging and MCP context resources. |
| [Vercel MCP](https://vercel.com/docs/ai-resources/vercel-mcp) / [Toolbar](https://vercel.com/docs/vercel-toolbar) | Vercel project/deployment workflows | Product-platform integration, not general local Chrome control. |
| [opencode-browser](https://github.com/benjaminshafii/opencode-browser) | Upstream local Chrome MCP bridge | Tandem is a hardened fork with multi-agent tab claims, installer docs, resources, prompts, and broader tool coverage. |
| [Scout](https://www.scout.i.ng/) | MCP + CDP browser automation platform | CDP-oriented automation; Tandem avoids remote-debugging-profile friction by using extension/native messaging. |
| [BrowserMCP](https://www.browsermcp.app/) | Real Chrome control from AI tools | Similar local-browser goal; Tandem emphasizes non-interference, tab ownership, and bundled agent guidance. |
| [Playwright MCP](https://github.com/microsoft/playwright-mcp) | Test automation and reproducible browser control | Strong ecosystem and testing story; Tandem is better when the agent must share your existing Chrome session. |
| [Browserbase / Stagehand](https://www.browserbase.com/stagehand/) | Production web agents, hosted browsers, AI actions | More mature cloud/SDK path; Tandem is local-first and relies on your Chrome profile/session. |
| [Browser Use](https://github.com/browser-use/browser-use) | Python browser agents and task automation | Broader agent framework; Tandem is a lightweight MCP bridge for existing agent clients. |

## Installation

```bash
npx @felixisaac/tandem install
```

The installer:
1. Copies the extension to `~/.tandem/extension/`
2. Opens Chrome so you can load the unpacked extension
3. Registers the native messaging host for Chrome and optionally Edge, Brave, or Vivaldi
4. Installs runtime agent guides and skills under `~/.tandem/`
5. Optionally updates your agent config file

Run diagnostics any time:

```bash
npx @felixisaac/tandem doctor
```

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

Tandem exposes 59 public MCP tools. Related operations use `action` fields to keep the picker compact while preserving full capability.

### Page Interaction
| Tool | Description |
|------|-------------|
| `browser_snapshot` | **Start here.** Accessibility tree with CSS selectors |
| `browser_snapshot_cached` | Cached snapshot for repeated reads |
| `browser_invalidate_cache` | Clear snapshot cache for one tab or all tabs |
| `browser_page_text` | Plain text extraction |
| `browser_screenshot` | Visual capture; supports full-page screenshots |
| `browser_navigate` | Navigate a tab |
| `browser_click` | Click an element by CSS selector |
| `browser_double_click` | Double-click an element |
| `browser_right_click` | Right-click an element |
| `browser_hover` | Hover an element |
| `browser_drag_drop` | Drag an element to another element or coordinates |
| `browser_select_option` | Select a native `<select>` option |
| `browser_type` | Type text into an input |
| `browser_keyboard` | Send key events |
| `browser_dialog_handle` | Accept or dismiss JS dialogs |
| `browser_wait_for_selector` | Wait for an element |
| `browser_scroll` | Scroll page or element |
| `browser_wait` | Fixed wait, capped at 30s |
| `browser_execute` | Run JavaScript via `chrome.debugger` |
| `browser_print_to_pdf` | Print page to PDF |
| `browser_performance` | CDP performance metrics |
| `browser_inspect` | DOM, version, security, styles, issues, accessibility, or element info via `action` |

### Tab Management
| Tool | Description |
|------|-------------|
| `browser_status` | Connection status and current tab claims |
| `browser_list_claims` | List per-session tab ownership claims |
| `browser_claim_tab` | Claim a tab for this session |
| `browser_release_tab` | Release a claimed tab |
| `browser_open_tab` | Open and claim a fresh agent tab |
| `browser_get_tabs` | List all open tabs |
| `browser_new_tab` | Open a tab in the agent window |
| `browser_close_tab` | Close a tab |
| `browser_switch_tab` | Focus a tab |
| `browser_new_window` | Open a new browser window |
| `browser_open_batch` | Open up to 20 URLs |
| `browser_deduplicate_tabs` | Find and close duplicate-URL tabs; dry-run by default |
| `browser_tab_group` | List, create, update, or move tab groups via `action` |

### Sessions & History
| Tool | Description |
|------|-------------|
| `browser_session` | Save/restore named sessions or list/restore recently closed sessions via `action` |
| `browser_history` | Search history, recent visits, or stats via `action` |
| `browser_get_bookmarks` | Full bookmarks tree |
| `browser_find_tabs` | Find open tabs by title or URL |
| `browser_top_sites` | List top visited sites |
| `browser_reading_list` | Get, add, or remove reading-list entries via `action` |

### Browser Utilities
| Tool | Description |
|------|-------------|
| `browser_downloads` | List recent Chrome downloads |
| `browser_notify` | Send a desktop notification |
| `browser_storage` | Read extension storage, inspect page storage, or clear origin storage via `action` |
| `browser_clear_browsing_data` | Clear selected browsing data types |
| `browser_save_mhtml` | Save a tab as MHTML |
| `browser_console_logs` | Capture console logs briefly |
| `browser_context_events` | Read right-click "Send to Tandem" captures |
| `browser_watch_page` | Start/stop page watching or query idle state via `action` |
| `browser_list_fonts` | List browser font settings |
| `browser_list_extensions` | List installed extensions |
| `browser_set_site_permission` | Set site permission |
| `browser_wait_for_navigation` | Wait for navigation events |
| `browser_batch_execute` | Run one JS snippet across selected tabs |
| `browser_system_info` | Read CPU/memory/display info |
| `browser_speak` | Speak text with Chrome TTS |

### Control & Data
| Tool | Description |
|------|-------------|
| `browser_cookies` | Get, list all, set, or delete cookies via `action` |
| `browser_inject_script` | Inject JS at document start |
| `browser_emulation` | Device, network, geolocation, user agent, or URL blocking via `action` |

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
