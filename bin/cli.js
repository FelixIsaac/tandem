#!/usr/bin/env node
/**
 * Tandem - CLI Installer
 * 
 * Installs the Chrome extension and native messaging host for browser automation.
 */

import { createInterface } from "readline";
import { existsSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, readdirSync, statSync, lstatSync, unlinkSync } from "fs";
import { homedir, platform } from "os";
import { join, dirname, sep, resolve } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PACKAGE_ROOT = join(__dirname, "..");
const NATIVE_HOST_NAME = "com.tandem.browser";

const BROWSERS = [
  {
    id: "chrome",
    name: "Google Chrome",
    windowsRegKey: `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`,
    macDir: ["Library", "Application Support", "Google", "Chrome", "NativeMessagingHosts"],
    linuxDir: [".config", "google-chrome", "NativeMessagingHosts"],
  },
  {
    id: "edge",
    name: "Microsoft Edge",
    windowsRegKey: `HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`,
    macDir: ["Library", "Application Support", "Microsoft Edge", "NativeMessagingHosts"],
    linuxDir: [".config", "microsoft-edge", "NativeMessagingHosts"],
  },
  {
    id: "brave",
    name: "Brave",
    windowsRegKey: `HKCU\\Software\\BraveSoftware\\Brave-Browser\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`,
    macDir: ["Library", "Application Support", "BraveSoftware", "Brave-Browser", "NativeMessagingHosts"],
    linuxDir: [".config", "BraveSoftware", "Brave-Browser", "NativeMessagingHosts"],
  },
  {
    id: "vivaldi",
    name: "Vivaldi",
    windowsRegKey: `HKCU\\Software\\Vivaldi\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`,
    macDir: ["Library", "Application Support", "Vivaldi", "NativeMessagingHosts"],
    linuxDir: [".config", "vivaldi", "NativeMessagingHosts"],
  },
];

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function color(c, text) {
  return `${COLORS[c]}${text}${COLORS.reset}`;
}

function log(msg) {
  console.log(msg);
}

function success(msg) {
  console.log(color("green", "✓ " + msg));
}

function warn(msg) {
  console.log(color("yellow", "⚠ " + msg));
}

function error(msg) {
  console.log(color("red", "✗ " + msg));
}

function header(msg) {
  console.log("\n" + color("cyan", color("bright", msg)));
  console.log(color("cyan", "─".repeat(msg.length)));
}

function copyDirSafe(srcDir, destDir) {
  if (!existsSync(srcDir)) return;
  mkdirSync(destDir, { recursive: true });
  const safeRoot = resolve(destDir) + sep;
  for (const file of readdirSync(srcDir, { recursive: true })) {
    const srcPath = join(srcDir, file);
    const destPath = join(destDir, file);
    if (!resolve(destPath).startsWith(safeRoot)) {
      throw new Error(`Refusing to write outside install dir: ${destPath}`);
    }
    if (lstatSync(srcPath).isSymbolicLink()) {
      warn(`Skipping symlink in package: ${file}`);
      continue;
    }
    if (statSync(srcPath).isDirectory()) {
      mkdirSync(destPath, { recursive: true });
    } else {
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
    }
  }
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function confirm(question) {
  const answer = await ask(`${question} (y/n): `);
  return answer.toLowerCase() === "y" || answer.toLowerCase() === "yes";
}

// ============================================================================
// Multi-agent auto-configuration
// ============================================================================

function commandExists(cmd) {
  try {
    execSync(platform() === "win32" ? `where ${cmd}` : `command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch { return false; }
}

// Resolve the most stable node path available — prefers version-manager shims
// (Volta, nvm) over process.execPath, which embeds a version number and breaks
// on Node upgrades.
function resolveStableNodePath() {
  const isWin = platform() === "win32";
  try {
    const out = execSync(isWin ? "where node" : "which node", { stdio: "pipe", shell: true, timeout: 5000 });
    const candidate = out.toString().trim().split(/\r?\n/)[0]?.trim();
    if (candidate && existsSync(candidate)) return candidate;
  } catch {}
  if (isWin) {
    // PowerShell resolves Volta/nvm shims even when CMD PATH differs
    try {
      const out = execSync(
        `powershell -NoProfile -Command "(Get-Command node -ErrorAction SilentlyContinue).Source"`,
        { stdio: "pipe", timeout: 8000 }
      );
      const candidate = out.toString().trim();
      if (candidate && existsSync(candidate)) return candidate;
    } catch {}
    for (const c of [
      process.env.VOLTA_HOME && join(process.env.VOLTA_HOME, "bin", "node.exe"),
      process.env.NVM_SYMLINK && join(process.env.NVM_SYMLINK, "node.exe"),
      "C:\\Program Files\\nodejs\\node.exe",
    ].filter(Boolean)) {
      if (existsSync(c)) return c;
    }
  }
  return process.execPath;
}

function mergeJsonConfig(path, mutate) {
  let config = {};
  if (existsSync(path)) {
    try { config = JSON.parse(readFileSync(path, "utf-8")); }
    catch (e) { throw new Error(`Existing file is not valid JSON: ${e.message}`); }
  } else {
    mkdirSync(dirname(path), { recursive: true });
  }
  mutate(config);
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
}

function appendCodexToml(path, serverPath) {
  const block = `\n[mcp_servers.browser]\ncommand = "node"\nargs = ["${serverPath.replace(/\\/g, "\\\\")}"]\n`;
  if (existsSync(path)) {
    const existing = readFileSync(path, "utf-8");
    if (existing.includes("[mcp_servers.browser]")) {
      throw new Error("[mcp_servers.browser] section already exists — edit manually");
    }
    writeFileSync(path, existing.replace(/\s+$/, "") + block);
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, block.trimStart());
  }
}

function nativeManifestPathFor(browser, currentPlatform, wrapperDir) {
  if (currentPlatform === "win32") return join(wrapperDir, `${browser.id}.${NATIVE_HOST_NAME}.json`);
  const parts = currentPlatform === "darwin" ? browser.macDir : browser.linuxDir;
  return join(homedir(), ...parts, `${NATIVE_HOST_NAME}.json`);
}

function registerNativeHostForBrowser(browser, currentPlatform, manifest, wrapperDir) {
  const manifestPath = nativeManifestPathFor(browser, currentPlatform, wrapperDir);
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  if (currentPlatform === "win32") {
    execSync(`REG ADD "${browser.windowsRegKey}" /ve /t REG_SZ /d "${manifestPath}" /f`, { stdio: "ignore", shell: true });
  }
  return manifestPath;
}

function isNativeHostRegistered(browser, currentPlatform) {
  if (currentPlatform === "win32") {
    try { execSync(`REG QUERY "${browser.windowsRegKey}" /ve`, { stdio: "ignore", shell: true }); return true; }
    catch { return false; }
  }
  return existsSync(nativeManifestPathFor(browser, currentPlatform, join(homedir(), ".tandem")));
}

function detectInstalledBrowsers(currentPlatform) {
  if (currentPlatform === "win32") {
    return BROWSERS.filter(browser => {
      const names = {
        chrome: ["chrome.exe"],
        edge: ["msedge.exe"],
        brave: ["brave.exe"],
        vivaldi: ["vivaldi.exe"],
      }[browser.id];
      return names.some(commandExists);
    });
  }
  if (currentPlatform === "darwin") {
    const apps = {
      chrome: "/Applications/Google Chrome.app",
      edge: "/Applications/Microsoft Edge.app",
      brave: "/Applications/Brave Browser.app",
      vivaldi: "/Applications/Vivaldi.app",
    };
    return BROWSERS.filter(browser => existsSync(apps[browser.id]));
  }
  const commands = {
    chrome: ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"],
    edge: ["microsoft-edge", "microsoft-edge-stable"],
    brave: ["brave-browser", "brave"],
    vivaldi: ["vivaldi", "vivaldi-stable"],
  };
  return BROWSERS.filter(browser => commands[browser.id].some(commandExists));
}

async function autoConfigureAgents(serverPath) {
  const home = homedir();
  const updated = [];

  const agents = [
    {
      name: "Claude Code",
      detect: () => commandExists("claude"),
      apply: () => {
        try {
          execSync(`claude mcp add -s user browser -- node "${serverPath}"`, { stdio: "pipe" });
        } catch (e) {
          const stderr = e.stderr?.toString() ?? "";
          if (stderr.includes("already") || stderr.includes("exists")) {
            execSync(`claude mcp remove browser -s user`, { stdio: "pipe" });
            execSync(`claude mcp add -s user browser -- node "${serverPath}"`, { stdio: "pipe" });
          } else {
            throw new Error(stderr || e.message);
          }
        }
      },
    },
    {
      name: "OpenCode (global)",
      path: join(home, ".config", "opencode", "opencode.json"),
      detect: function () { return existsSync(dirname(this.path)); },
      apply: function () {
        mergeJsonConfig(this.path, (c) => {
          c.mcp = c.mcp || {};
          c.mcp.browser = { type: "local", command: ["node", serverPath], enabled: true };
        });
      },
    },
    {
      name: "Cursor",
      path: join(home, ".cursor", "mcp.json"),
      detect: function () { return existsSync(dirname(this.path)); },
      apply: function () {
        mergeJsonConfig(this.path, (c) => {
          c.mcpServers = c.mcpServers || {};
          c.mcpServers.browser = { command: "node", args: [serverPath] };
        });
      },
    },
    {
      name: "Windsurf",
      path: join(home, ".codeium", "windsurf", "mcp_config.json"),
      detect: function () { return existsSync(join(home, ".codeium", "windsurf")); },
      apply: function () {
        mergeJsonConfig(this.path, (c) => {
          c.mcpServers = c.mcpServers || {};
          c.mcpServers.browser = { command: "node", args: [serverPath] };
        });
      },
    },
    {
      name: "Gemini CLI",
      path: join(home, ".gemini", "settings.json"),
      detect: function () { return existsSync(dirname(this.path)); },
      apply: function () {
        mergeJsonConfig(this.path, (c) => {
          c.mcpServers = c.mcpServers || {};
          c.mcpServers.browser = { command: "node", args: [serverPath] };
        });
      },
    },
    {
      name: "Codex CLI",
      path: join(home, ".codex", "config.toml"),
      detect: function () { return existsSync(dirname(this.path)); },
      apply: function () { appendCodexToml(this.path, serverPath); },
    },
  ];

  const detected = agents.filter((a) => {
    try { return a.detect(); } catch { return false; }
  });

  if (detected.length === 0) {
    log(color("yellow", "  No installed agents detected — configure manually using Step 5 above."));
    return updated;
  }

  log(color("bright", `\nDetected ${detected.length} agent(s): ${detected.map((a) => a.name).join(", ")}`));

  for (const agent of detected) {
    if (await confirm(`  Configure ${agent.name}?`)) {
      try {
        agent.apply();
        success(`Configured ${agent.name}`);
        updated.push(agent.name);
      } catch (e) {
        error(`${agent.name}: ${e.message}`);
      }
    }
  }

  return updated;
}

async function main() {
  console.log(`
${color("cyan", color("bright", "╔═══════════════════════════════════════════════════════════╗"))}
${color("cyan", color("bright", "║"))}      ${color("bright", "Tandem")} - Browser Automation for AI Agents       ${color("cyan", color("bright", "║"))}
${color("cyan", color("bright", "║"))}                                                           ${color("cyan", color("bright", "║"))}
${color("cyan", color("bright", "║"))}  Inspired by Claude in Chrome - browser automation that   ${color("cyan", color("bright", "║"))}
${color("cyan", color("bright", "║"))}  works with your existing logins and bookmarks.           ${color("cyan", color("bright", "║"))}
${color("cyan", color("bright", "╚═══════════════════════════════════════════════════════════╝"))}
`);

  const command = process.argv[2];

  if (command === "install") {
    await install();
  } else if (command === "doctor") {
    await doctor();
  } else if (command === "uninstall") {
    await uninstall();
  } else {
    log(`
${color("bright", "Usage:")}
  npx @felixisaac/tandem install     Install extension and native host
  npx @felixisaac/tandem doctor      Diagnose local setup
  npx @felixisaac/tandem uninstall   Remove native host registration

${color("bright", "After installation:")}
  Configure your agent to run: node ~/.tandem/server.js
`);
  }

  rl.close();
}

async function install() {
  header("Step 1: Check Platform");

  const currentPlatform = platform();
  if (currentPlatform !== "darwin" && currentPlatform !== "linux" && currentPlatform !== "win32") {
    error(`Unsupported platform: ${currentPlatform}`);
    process.exit(1);
  }
  const platformName = currentPlatform === "darwin" ? "macOS" : currentPlatform === "win32" ? "Windows" : "Linux";
  success(`Platform: ${platformName}`);

  header("Step 2: Install Extension Directory");

  const extensionDir = join(homedir(), ".tandem", "extension");
  const srcExtensionDir = join(PACKAGE_ROOT, "extension");

  mkdirSync(extensionDir, { recursive: true });

  // Zip-Slip guard: a malicious tarball could include entries like
  // "../../.ssh/authorized_keys" or symlinks pointing outside the package.
  // Refuse anything that resolves outside extensionDir, and skip symlinks
  // entirely so copyFileSync can't write through them.
  const safeRoot = resolve(extensionDir) + sep;
  const files = readdirSync(srcExtensionDir, { recursive: true });
  for (const file of files) {
    const srcPath = join(srcExtensionDir, file);
    const destPath = join(extensionDir, file);
    if (!resolve(destPath).startsWith(safeRoot)) {
      throw new Error(`Refusing to write outside install dir: ${destPath}`);
    }
    if (lstatSync(srcPath).isSymbolicLink()) {
      warn(`Skipping symlink in package: ${file}`);
      continue;
    }
    if (statSync(srcPath).isDirectory()) {
      mkdirSync(destPath, { recursive: true });
    } else {
      mkdirSync(dirname(destPath), { recursive: true });
      copyFileSync(srcPath, destPath);
    }
  }

  success(`Extension files copied to: ${extensionDir}`);

  header("Step 3: Load Extension in Chrome");

  log(`
To load the extension:

1. Open Chrome and go to: ${color("cyan", "chrome://extensions")}
2. Enable ${color("bright", "Developer mode")} (toggle in top right)
3. Click ${color("bright", "Load unpacked")}
4. Select this folder: ${color("cyan", extensionDir)}
5. Copy the ${color("bright", "Extension ID")} shown under the extension name
   (looks like: abcdefghijklmnopqrstuvwxyz123456)
`);

  const openChrome = await confirm("Open Chrome extensions page now? (load unpacked there, then come back)");
  if (openChrome) {
    try {
      if (currentPlatform === "darwin") {
        execSync('open -a "Google Chrome" "chrome://extensions"', { stdio: "ignore" });
      } else if (currentPlatform === "win32") {
        execSync('start chrome "chrome://extensions"', { stdio: "ignore", shell: true });
      } else {
        execSync('xdg-open "chrome://extensions"', { stdio: "ignore" });
      }
    } catch {}
  }

  log("");
  const extensionId = await ask(color("bright", "Enter your Extension ID: "));

  const openFinder = await confirm("Open extension folder in file manager?");
  if (openFinder) {
    try {
      if (currentPlatform === "darwin") {
        execSync(`open "${extensionDir}"`, { stdio: "ignore" });
      } else if (currentPlatform === "win32") {
        execSync(`explorer "${extensionDir}"`, { stdio: "ignore", shell: true });
      } else {
        execSync(`xdg-open "${extensionDir}"`, { stdio: "ignore" });
      }
    } catch {}
  }

  if (!extensionId) {
    error("Extension ID is required");
    process.exit(1);
  }

  if (!/^[a-z]{32}$/.test(extensionId)) {
    warn("Extension ID format looks unusual (expected 32 lowercase letters)");
    const proceed = await confirm("Continue anyway?");
    if (!proceed) process.exit(1);
  }

  header("Step 4: Register Native Messaging Host");

  const nodePath = resolveStableNodePath();
  const wrapperDir = join(homedir(), ".tandem");
  mkdirSync(wrapperDir, { recursive: true });
  // Wrapper points to the installed host.js (copied below) — not the npx cache,
  // which can be cleared/relocated and would break Chrome's native messaging launch.
  const hostScriptPath = join(wrapperDir, "host.js");

  let wrapperPath;
  if (currentPlatform === "win32") {
    wrapperPath = join(wrapperDir, "host-wrapper.cmd");
    writeFileSync(wrapperPath, `@echo off\r\n"${nodePath}" "${hostScriptPath}" %*\r\n`);
  } else {
    wrapperPath = join(wrapperDir, "host-wrapper.sh");
    writeFileSync(wrapperPath, `#!/bin/bash\nexec "${nodePath}" "${hostScriptPath}" "$@"\n`, { mode: 0o755 });
  }

  const manifest = {
    name: NATIVE_HOST_NAME,
    description: "Tandem Browser Automation Native Messaging Host",
    path: wrapperPath,
    type: "stdio",
    allowed_origins: [`chrome-extension://${extensionId}/`],
  };

  const installedBrowsers = detectInstalledBrowsers(currentPlatform);
  const browsersToRegister = [];
  const chrome = BROWSERS.find(b => b.id === "chrome");
  browsersToRegister.push(chrome);
  for (const browser of installedBrowsers.filter(b => b.id !== "chrome")) {
    if (await confirm(`Register native host for ${browser.name}?`)) browsersToRegister.push(browser);
  }

  for (const browser of browsersToRegister) {
    const manifestPath = registerNativeHostForBrowser(browser, currentPlatform, manifest, wrapperDir);
    success(`${browser.name} native host: ${manifestPath}`);
  }

  const logsDir = join(homedir(), ".tandem", "logs");
  mkdirSync(logsDir, { recursive: true });

  // Copy server.js and host.js to ~/.tandem/ so agents (and the
  // native-messaging wrapper) reference a stable path, not the npx cache.
  const installedServerPath = join(wrapperDir, "server.js");
  const installedHostPath = join(wrapperDir, "host.js");
  copyFileSync(join(PACKAGE_ROOT, "src", "server.js"), installedServerPath);
  copyFileSync(join(PACKAGE_ROOT, "src", "host.js"), installedHostPath);
  copyFileSync(join(PACKAGE_ROOT, "AGENTS.md"), join(wrapperDir, "AGENTS.md"));
  copyFileSync(join(PACKAGE_ROOT, "CLAUDE.md"), join(wrapperDir, "CLAUDE.md"));
  copyDirSafe(join(PACKAGE_ROOT, ".opencode"), join(wrapperDir, ".opencode"));
  copyDirSafe(join(PACKAGE_ROOT, ".codex"), join(wrapperDir, ".codex"));

  // Write package.json with deps so `npm install` below resolves them
  const rootPkg = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf-8"));
  writeFileSync(
    join(wrapperDir, "package.json"),
    JSON.stringify({
      name: "tandem-installed",
      version: rootPkg.version,
      type: "module",
      dependencies: rootPkg.dependencies,
    }, null, 2) + "\n"
  );
  try {
    execSync("npm install --omit=dev --prefer-offline", { cwd: wrapperDir, stdio: "pipe" });
    success(`Server installed at: ${installedServerPath}`);
  } catch (e) {
    throw new Error(`Failed to install server dependencies: ${e.message}`);
  }

  header("Step 5: Configure Your Agent");

  const mcpConfig = {
    browser: {
      type: "local",
      command: ["node", installedServerPath],
      enabled: true,
    },
  };

  log(`
${color("bright", "Claude Code (global):")}
  claude mcp add -s user browser -- node ${installedServerPath}

${color("bright", "OpenCode")} — add to opencode.json under "mcp":
${color("bright", JSON.stringify(mcpConfig, null, 2))}

${color("bright", "Other agents")} — use: node ${installedServerPath}
`);

  const updatedConfigs = await autoConfigureAgents(installedServerPath);

  // Project-level opencode.json takes precedence if present in cwd
  const opencodeJsonPath = join(process.cwd(), "opencode.json");
  if (existsSync(opencodeJsonPath)) {
    if (await confirm(`Also update project opencode.json in current directory?`)) {
      try {
        const config = JSON.parse(readFileSync(opencodeJsonPath, "utf-8"));
        config.mcp = config.mcp || {};
        config.mcp.browser = { type: "local", command: ["node", installedServerPath], enabled: true };
        writeFileSync(opencodeJsonPath, JSON.stringify(config, null, 2) + "\n");
        success("Updated project opencode.json");
        updatedConfigs.push("opencode.json (project)");
      } catch (e) {
        error(`Failed to update opencode.json: ${e.message}`);
      }
    }
  }

  header("Installation Complete!");

  log(`
${color("green", "✓")} Extension installed at: ${extensionDir}
${color("green", "✓")} Server installed at:    ${installedServerPath}
${color("green", "✓")} Native host registered
${updatedConfigs.length ? color("green", "✓") + " Auto-configured: " + updatedConfigs.join(", ") : color("yellow", "○") + " No agent configs auto-updated — see Step 5 above"}

${color("bright", "Next steps:")}
1. ${color("cyan", "Restart Chrome")} (close all windows and reopen)
2. Click the extension icon to verify connection
3. Restart your agent to load the MCP server

${color("bright", "Available tools (15):")}
  browser_snapshot         - Accessibility tree — start here
  browser_screenshot       - Visual page capture
  browser_navigate         - Go to a URL
  browser_click            - Click by CSS selector
  browser_type             - Type into an input
  browser_keyboard         - Send key events
  browser_wait_for_selector- Wait for element to appear
  browser_scroll           - Scroll page or element
  browser_wait             - Wait fixed duration
  browser_execute          - Run JavaScript (via chrome.debugger)
  browser_get_tabs         - List open tabs
  browser_new_tab          - Open a new tab
  browser_close_tab        - Close a tab
  browser_switch_tab       - Focus a tab
  browser_new_window       - Open a new window

${color("bright", "Logs:")} ~/.tandem/logs/
`);
}

async function uninstall() {
  header("Uninstalling Tandem");

  const currentPlatform = platform();

  if (currentPlatform === "win32") {
    for (const browser of BROWSERS) {
      try {
        execSync(`REG DELETE "${browser.windowsRegKey}" /f`, { stdio: "ignore", shell: true });
        success(`Removed ${browser.name} registry key`);
      } catch {
        warn(`${browser.name} registry key not found`);
      }
      const manifestPath = nativeManifestPathFor(browser, currentPlatform, join(homedir(), ".tandem"));
      if (existsSync(manifestPath)) {
        unlinkSync(manifestPath);
        success(`Removed ${browser.name} native host manifest`);
      }
    }
  } else {
    for (const browser of BROWSERS) {
      const manifestPath = nativeManifestPathFor(browser, currentPlatform, join(homedir(), ".tandem"));
      if (existsSync(manifestPath)) {
        unlinkSync(manifestPath);
        success(`Removed ${browser.name} native host registration`);
      } else {
        warn(`${browser.name} native host manifest not found`);
      }
    }
  }

  log(`
${color("bright", "Note:")} Extension files at ~/.tandem/ were not removed.
Remove manually if needed:
  Windows: rmdir /s /q %USERPROFILE%\\.tandem
  Unix:    rm -rf ~/.tandem/

Also remove the "browser" MCP entry from your agent config.
`);
}

async function doctor() {
  header("Tandem Doctor");
  const currentPlatform = platform();
  const isWin = currentPlatform === "win32";
  const baseDir = join(homedir(), ".tandem");
  const checks = [];
  const add = (ok, label, detail = "") => checks.push({ ok, label, detail });

  add(existsSync(baseDir), "~/.tandem exists", baseDir);
  add(existsSync(join(baseDir, "server.js")), "server.js installed", join(baseDir, "server.js"));
  add(existsSync(join(baseDir, "host.js")), "host.js installed", join(baseDir, "host.js"));
  add(existsSync(join(baseDir, "AGENTS.md")), "AGENTS.md installed", join(baseDir, "AGENTS.md"));
  add(existsSync(join(baseDir, ".codex", "skills", "tandem", "SKILL.md")), "Codex skill installed", join(baseDir, ".codex", "skills", "tandem", "SKILL.md"));
  add(existsSync(join(baseDir, ".opencode", "skills", "tandem", "SKILL.md")), "OpenCode skill installed", join(baseDir, ".opencode", "skills", "tandem", "SKILL.md"));
  add(existsSync(join(baseDir, "extension", "manifest.json")), "Extension files installed", join(baseDir, "extension"));
  add(existsSync(join(baseDir, "package.json")), "Runtime package.json installed", join(baseDir, "package.json"));
  add(existsSync(join(baseDir, "node_modules", "@modelcontextprotocol", "sdk")), "Runtime MCP SDK installed", join(baseDir, "node_modules"));
  add(existsSync(join(baseDir, "auth.token")), "Auth token present", join(baseDir, "auth.token"));

  // Check that the Node path baked into the host wrapper still resolves.
  // This breaks when users switch Node version managers (Volta, nvm, fnm) or
  // upgrade Node, because process.execPath embeds a version-specific path.
  const wrapperFile = isWin
    ? join(baseDir, "host-wrapper.cmd")
    : join(baseDir, "host-wrapper.sh");
  if (existsSync(wrapperFile)) {
    const wrapperContent = readFileSync(wrapperFile, "utf8");
    const nodePathMatch = isWin
      ? wrapperContent.match(/"([^"]+node(?:\.exe)?)"/)
      : wrapperContent.match(/exec "([^"]+node)"/);
    const wrapperNodePath = nodePathMatch?.[1];
    if (!wrapperNodePath) {
      add(false, "Node path in host wrapper (could not parse)", wrapperFile);
    } else if (!existsSync(wrapperNodePath)) {
      log(color("yellow", `  ⚠ Node path in wrapper is stale: ${wrapperNodePath}`));
      log("    Attempting auto-fix...");
      try {
        const fixedPath = resolveStableNodePath();
        if (isWin) {
          writeFileSync(wrapperFile, `@echo off\r\n"${fixedPath}" "${join(baseDir, "host.js")}" %*\r\n`);
        } else {
          writeFileSync(wrapperFile, `#!/bin/bash\nexec "${fixedPath}" "${join(baseDir, "host.js")}" "$@"\n`, { mode: 0o755 });
        }
        success(`  Auto-fixed Node path → ${fixedPath}`);
        add(true, `Node path in host wrapper (auto-fixed)`, fixedPath);
      } catch (e) {
        add(false, `Node path in host wrapper — stale (${wrapperNodePath})`, e.message);
      }
    } else {
      add(true, "Node path in host wrapper", wrapperNodePath);
    }
  } else {
    add(false, "host-wrapper exists", wrapperFile);
  }

  if (existsSync(join(baseDir, "server.js"))) {
    try {
      execSync(`"${process.execPath}" --check "${join(baseDir, "server.js")}"`, { stdio: "pipe", shell: true });
      add(true, "Installed server syntax OK");
    } catch (e) {
      add(false, "Installed server syntax failed", e.stderr?.toString()?.trim() || e.message);
    }
  }

  const installedBrowsers = new Set(detectInstalledBrowsers(currentPlatform).map(browser => browser.id));
  for (const browser of BROWSERS) {
    const registered = isNativeHostRegistered(browser, currentPlatform);
    if (registered || browser.id === "chrome" || installedBrowsers.has(browser.id)) {
      const manifestPath = nativeManifestPathFor(browser, currentPlatform, baseDir);
      add(registered, `${browser.name} native host registered`, manifestPath);
      // On Windows, also verify the registry value points to an existing file
      if (isWin && registered) {
        try {
          const regOut = execSync(`REG QUERY "${browser.windowsRegKey}" /ve`, { stdio: "pipe", shell: true }).toString();
          const regFileMatch = regOut.match(/REG_SZ\s+(.+)/);
          const regFile = regFileMatch?.[1]?.trim();
          if (regFile && !existsSync(regFile)) {
            add(false, `${browser.name} registry target exists`, regFile);
          }
        } catch {}
      }
    } else {
      add(true, `${browser.name} not detected; native host optional`);
    }
  }

  // Show extension ID from installed manifest so user can verify it matches chrome://extensions
  const nativeManifestFile = join(baseDir, `${NATIVE_HOST_NAME}.json`);
  const fallbackManifest = join(baseDir, `chrome.${NATIVE_HOST_NAME}.json`);
  const manifestToRead = existsSync(nativeManifestFile) ? nativeManifestFile : existsSync(fallbackManifest) ? fallbackManifest : null;
  if (manifestToRead) {
    try {
      const manifest = JSON.parse(readFileSync(manifestToRead, "utf8"));
      const origins = manifest.allowed_origins ?? [];
      const idMatch = origins[0]?.match(/chrome-extension:\/\/([a-z]{32})\//);
      const extId = idMatch?.[1];
      if (extId) {
        add(true, `Extension ID in manifest: ${extId}`);
        log(color("yellow", `  ⚠ Verify this ID matches the Tandem extension in chrome://extensions`));
      } else {
        add(false, "Extension ID in manifest (not found or malformed)", manifestToRead);
      }
    } catch {
      add(false, "Native messaging manifest (parse error)", manifestToRead);
    }
  }

  const codexConfig = join(homedir(), ".codex", "config.toml");
  if (existsSync(codexConfig)) {
    const text = readFileSync(codexConfig, "utf8");
    add(text.includes("[mcp_servers.browser]") && text.includes("server.js"), "Codex MCP config present", codexConfig);
  } else {
    add(false, "Codex MCP config present", codexConfig);
  }

  let failed = 0;
  for (const check of checks) {
    if (check.ok) {
      success(`${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
    } else {
      failed++;
      warn(`${check.label}${check.detail ? ` — ${check.detail}` : ""}`);
    }
  }

  log("");
  if (failed) {
    warn(`${failed} check(s) need attention. Re-run: npx @felixisaac/tandem install`);
  } else {
    success("All checks passed. Try /mcp in Claude Code.");
  }
}

main().catch((e) => {
  error(e.message);
  process.exit(1);
});
