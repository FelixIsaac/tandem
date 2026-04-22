# OpenCode Browser — Claude Code Instructions

See [AGENTS.md](./AGENTS.md) for full agent behavioral guidance.

## Quick Setup (Claude Code global)

Add to `~/.claude/.mcp.json`:
```json
{
  "mcpServers": {
    "browser": {
      "command": "node",
      "args": ["/path/to/opencode-browser/src/server.js"],
      "type": "stdio"
    }
  }
}
```

Then approve in `~/.claude/settings.json`:
```json
{
  "enabledMcpjsonServers": ["browser"]
}
```

## Key Reminders
- `browser_snapshot` before `browser_screenshot` — saves tokens
- `browser_wait_for_selector` before `browser_click` on any SPA
- Agent tabs open in a separate Chrome window — user's window is untouched
- Never switch to user's tabs without being asked
