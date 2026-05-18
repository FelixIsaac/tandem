#!/usr/bin/env node

import { readFileSync } from "fs";

const server = readFileSync(new URL("../src/server.js", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

const toolNames = [...server.matchAll(/name:\s*"(?<name>browser_[^"]+)"/g)]
  .map(m => m.groups.name)
  .filter((name, index, arr) => arr.indexOf(name) === index)
  .sort();

const readmeTools = new Set([...readme.matchAll(/`(browser_[a-z_]+)`/g)].map(m => m[1]));
const missingDocs = toolNames.filter(name => !readmeTools.has(name));

const structuredSetMatch = server.match(/const STRUCTURED_OUTPUT_TOOLS = new Set\(\[\n(?<body>[\s\S]*?)\n\]\);/);
const structuredTools = structuredSetMatch
  ? [...structuredSetMatch.groups.body.matchAll(/"(browser_[^"]+)"/g)].map(m => m[1]).sort()
  : [];

const defaultSchemaSetMatch = server.match(/const GENERIC_STRUCTURED_OUTPUT_TOOL_NAMES = new Set\(\[\n(?<body>[\s\S]*?)\n\]\);/);
const defaultSchemaTools = defaultSchemaSetMatch
  ? [...defaultSchemaSetMatch.groups.body.matchAll(/"(browser_[^"]+)"/g)].map(m => m[1]).sort()
  : [];

const missingSchemaFallback = structuredTools.filter(name => !defaultSchemaTools.includes(name));
const promptsWired = /ListPromptsRequestSchema/.test(server) && /GetPromptRequestSchema/.test(server) && /prompts:\s*\{\}/.test(server);
const resources = [...server.matchAll(/"tandem:\/\/[^"]+"/g)].map(m => m[0]).filter((v, i, a) => a.indexOf(v) === i);

let failed = false;
function fail(message, items = []) {
  failed = true;
  console.error(message);
  for (const item of items) console.error(`  - ${item}`);
}

if (toolNames.length < 1) fail("No MCP browser tools found.");
if (missingDocs.length) fail("README missing tool docs:", missingDocs);
if (missingSchemaFallback.length) fail("Structured tools missing outputSchema fallback:", missingSchemaFallback);
if (!promptsWired) fail("MCP prompts are not fully wired.");
if (resources.length < 4) fail("Expected multiple Tandem MCP resources.");

if (failed) process.exit(1);

console.log(`MCP surface audit passed: ${toolNames.length} tools, ${structuredTools.length} structured tools, ${resources.length} resources.`);

