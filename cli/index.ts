#!/usr/bin/env bun
/**
 * BEANS CLI - Setup and configure BEANS for your project
 * 
 * Usage:
 *   bunx beans init              # Initialize BEANS in current project
 *   bunx beans config            # Configure API keys interactively
 *   bunx beans config --valyu    # Set Valyu API key
 *   bunx beans doctor            # Check installation status
 *   bunx beans upgrade           # Update to latest version
 */

import { $ } from "bun";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

const VERSION = "2.0.3";
const BEANS_HOME = join(homedir(), ".beans");
const BEANS_CONFIG = join(BEANS_HOME, "config.json");

// Colors
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
};

function log(msg: string) { console.log(msg); }
function info(msg: string) { console.log(`${c.blue}ℹ${c.reset} ${msg}`); }
function success(msg: string) { console.log(`${c.green}✓${c.reset} ${msg}`); }
function warn(msg: string) { console.log(`${c.yellow}⚠${c.reset} ${msg}`); }
function error(msg: string) { console.log(`${c.red}✗${c.reset} ${msg}`); }

interface BeansConfig {
  valyu_api_key?: string;
  github_token?: string;
  default_model?: string;
  installed_at?: string[];
}

function loadConfig(): BeansConfig {
  if (!existsSync(BEANS_CONFIG)) return {};
  try {
    return JSON.parse(readFileSync(BEANS_CONFIG, "utf-8"));
  } catch {
    return {};
  }
}

function saveConfig(config: BeansConfig) {
  mkdirSync(BEANS_HOME, { recursive: true });
  writeFileSync(BEANS_CONFIG, JSON.stringify(config, null, 2));
}

function maskKey(key: string): string {
  if (!key || key.length < 8) return "***";
  return key.slice(0, 4) + "..." + key.slice(-4);
}

async function prompt(question: string, hidden = false): Promise<string> {
  process.stdout.write(`${c.cyan}?${c.reset} ${question} `);
  
  if (hidden) {
    // For hidden input, we'd need readline or similar
    // For now, just read normally with a note
    process.stdout.write(`${c.dim}(input hidden)${c.reset} `);
  }
  
  const reader = Bun.stdin.stream().getReader();
  const { value } = await reader.read();
  reader.releaseLock();
  
  return new TextDecoder().decode(value).trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════════════════════

async function cmdInit() {
  log(`\n${c.bold}${c.blue}🫘 BEANS Setup${c.reset}\n`);
  
  const cwd = process.cwd();
  const config = loadConfig();
  
  // Check if already initialized
  if (existsSync(join(cwd, ".claude/plugins/beans"))) {
    warn("BEANS already installed in this project");
    info("Run 'beans doctor' to check status");
    return;
  }
  
  // Create directories
  info("Creating directories...");
  const dirs = [
    ".claude/plugins",
    ".claude/agents", 
    ".beans/analysis",
    ".beans/context",
    ".beans/cache",
    ".beans/logs",
  ];
  
  for (const dir of dirs) {
    mkdirSync(join(cwd, dir), { recursive: true });
  }
  success("Directories created");
  
  // Find plugin source
  const pluginSources = [
    join(cwd, "submodules/beans/plugin"),
    join(cwd, "plugin"),  // If running from beans repo itself
    join(homedir(), ".beans/plugin"),
    join(import.meta.dir, "../plugin"),
  ];
  
  let pluginSource: string | null = null;
  for (const src of pluginSources) {
    if (existsSync(src)) {
      pluginSource = src;
      break;
    }
  }
  
  // Auto-clone if not found
  if (!pluginSource) {
    info("BEANS plugin not found locally, cloning from GitHub...");
    const beansHome = join(homedir(), ".beans");
    
    try {
      if (existsSync(beansHome)) {
        info("Updating existing ~/.beans...");
        await $`cd ${beansHome} && git pull`.quiet();
      } else {
        await $`git clone https://github.com/shinyobjectz/beans.git ${beansHome}`;
      }
      pluginSource = join(beansHome, "plugin");
      
      if (!existsSync(pluginSource)) {
        error("Clone succeeded but plugin directory not found");
        return;
      }
      success("BEANS repo cloned to ~/.beans");
    } catch (e) {
      error(`Failed to clone BEANS repo: ${e}`);
      info("Try manually: git clone https://github.com/shinyobjectz/beans.git ~/.beans");
      return;
    }
  }
  
  // Symlink plugin
  info("Installing plugin...");
  const pluginDest = join(cwd, ".claude/plugins/beans");
  
  try {
    await $`ln -sf ${pluginSource} ${pluginDest}`;
    success(`Plugin linked from ${pluginSource}`);
  } catch (e) {
    error(`Failed to link plugin: ${e}`);
    return;
  }
  
  // Copy agents
  info("Installing agents...");
  const agentsSrc = join(pluginSource, "agents");
  if (existsSync(agentsSrc)) {
    await $`cp -r ${agentsSrc}/* ${join(cwd, ".claude/agents/")}`.nothrow();
    success("Agents installed");
  }
  
  // Track installation
  config.installed_at = config.installed_at || [];
  if (!config.installed_at.includes(cwd)) {
    config.installed_at.push(cwd);
  }
  saveConfig(config);
  
  // Check for API keys
  log("");
  if (!config.valyu_api_key) {
    warn("Valyu API key not configured (optional, for research)");
    info("Run 'beans config --valyu' to set it");
  } else {
    success(`Valyu API key: ${maskKey(config.valyu_api_key)}`);
  }
  
  log(`\n${c.green}${c.bold}✅ BEANS initialized!${c.reset}\n`);
  log("Next steps:");
  log(`  ${c.cyan}beans doctor${c.reset}     # Verify setup`);
  log(`  ${c.cyan}beans config${c.reset}     # Configure API keys`);
  log(`  ${c.cyan}/beans${c.reset}           # In Claude Code: start building`);
  log("");
}

async function cmdConfig(args: string[]) {
  log(`\n${c.bold}${c.blue}🔧 BEANS Configuration${c.reset}\n`);
  
  const config = loadConfig();
  
  if (args.includes("--valyu") || args.includes("-v")) {
    log("Enter your Valyu API key (get one at https://valyu.ai):");
    const key = await prompt("Valyu API Key:", true);
    if (key) {
      config.valyu_api_key = key;
      saveConfig(config);
      success(`Valyu API key saved: ${maskKey(key)}`);
    }
    return;
  }
  
  if (args.includes("--github") || args.includes("-g")) {
    log("Enter your GitHub token (for PR creation):");
    const key = await prompt("GitHub Token:", true);
    if (key) {
      config.github_token = key;
      saveConfig(config);
      success(`GitHub token saved: ${maskKey(key)}`);
    }
    return;
  }
  
  if (args.includes("--show")) {
    log("Current configuration:");
    log(`  Config file: ${BEANS_CONFIG}`);
    log(`  Valyu API Key: ${config.valyu_api_key ? maskKey(config.valyu_api_key) : c.dim + "(not set)" + c.reset}`);
    log(`  GitHub Token: ${config.github_token ? maskKey(config.github_token) : c.dim + "(not set)" + c.reset}`);
    log(`  Installed at: ${(config.installed_at || []).length} projects`);
    return;
  }
  
  // Interactive config
  log("Configure BEANS (press Enter to skip):\n");
  
  // Valyu
  const currentValyu = config.valyu_api_key ? ` [${maskKey(config.valyu_api_key)}]` : "";
  log(`Valyu API Key${currentValyu}:`);
  const valyu = await prompt("", true);
  if (valyu) config.valyu_api_key = valyu;
  
  // GitHub
  const currentGithub = config.github_token ? ` [${maskKey(config.github_token)}]` : "";
  log(`GitHub Token${currentGithub}:`);
  const github = await prompt("", true);
  if (github) config.github_token = github;
  
  saveConfig(config);
  success("Configuration saved");
  
  log(`\nConfig stored at: ${c.dim}${BEANS_CONFIG}${c.reset}`);
}

async function cmdDoctor() {
  log(`\n${c.bold}${c.blue}🩺 BEANS Doctor${c.reset}\n`);
  
  const cwd = process.cwd();
  const config = loadConfig();
  let issues = 0;
  
  // Check CLI tools
  log(`${c.bold}CLI Tools${c.reset}`);
  const tools = ["bd", "ast-grep", "repomix"];
  for (const tool of tools) {
    try {
      await $`which ${tool}`.quiet();
      success(tool);
    } catch {
      warn(`${tool} not found (optional)`);
    }
  }
  
  // Check directories
  log(`\n${c.bold}Directories${c.reset}`);
  const requiredDirs = [".claude/plugins/beans", ".beans", ".claude/agents"];
  for (const dir of requiredDirs) {
    if (existsSync(join(cwd, dir))) {
      success(dir);
    } else {
      error(dir);
      issues++;
    }
  }
  // Optional: .beads (created by bd init)
  if (existsSync(join(cwd, ".beads"))) {
    success(".beads (beads issue tracker)");
  } else {
    warn(".beads not initialized (run 'bd init' to enable issue tracking)");
  }
  
  // Check config
  log(`\n${c.bold}Configuration${c.reset}`);
  log(`  Config: ${BEANS_CONFIG}`);
  if (config.valyu_api_key) {
    success(`Valyu API Key: ${maskKey(config.valyu_api_key)}`);
  } else {
    warn("Valyu API Key: not set (run 'beans config --valyu')");
  }
  if (config.github_token) {
    success(`GitHub Token: ${maskKey(config.github_token)}`);
  } else {
    warn("GitHub Token: not set (run 'beans config --github')");
  }
  
  // Check plugin
  log(`\n${c.bold}Plugin${c.reset}`);
  const pluginPath = join(cwd, ".claude/plugins/beans");
  if (existsSync(pluginPath)) {
    const pluginJson = join(pluginPath, "plugin.json");
    if (existsSync(pluginJson)) {
      try {
        const plugin = JSON.parse(readFileSync(pluginJson, "utf-8"));
        success(`BEANS v${plugin.version || "unknown"}`);
      } catch {
        warn("plugin.json invalid");
      }
    }
    
    // Count components
    const commands = join(pluginPath, "commands");
    const agents = join(pluginPath, "agents");
    if (existsSync(commands)) {
      const bdCount = existsSync(join(commands, "bd")) ? 
        (await $`ls ${join(commands, "bd")}`.text()).split("\n").filter(Boolean).length : 0;
      const ralphCount = existsSync(join(commands, "ralph")) ?
        (await $`ls ${join(commands, "ralph")}`.text()).split("\n").filter(Boolean).length : 0;
      log(`  Commands: ${bdCount} bd, ${ralphCount} ralph`);
    }
    if (existsSync(agents)) {
      const agentCount = (await $`ls ${agents}`.text()).split("\n").filter(Boolean).length;
      log(`  Agents: ${agentCount}`);
    }
  } else {
    error("Plugin not installed");
    issues++;
  }
  
  log("");
  if (issues === 0) {
    log(`${c.green}${c.bold}✅ BEANS is healthy!${c.reset}`);
  } else {
    log(`${c.yellow}⚠ ${issues} issue(s) found. Run 'beans init' to fix.${c.reset}`);
  }
  log("");
}

async function cmdHelp() {
  log(`
${c.bold}${c.blue}🫘 BEANS CLI v${VERSION}${c.reset}

${c.bold}Usage:${c.reset}
  beans <command> [options]

${c.bold}Commands:${c.reset}
  ${c.cyan}init${c.reset}              Initialize BEANS in current project
  ${c.cyan}config${c.reset}            Configure API keys interactively
  ${c.cyan}config --valyu${c.reset}    Set Valyu API key
  ${c.cyan}config --github${c.reset}   Set GitHub token
  ${c.cyan}config --show${c.reset}     Show current configuration
  ${c.cyan}doctor${c.reset}            Check installation status
  ${c.cyan}help${c.reset}              Show this help message

${c.bold}In Claude Code:${c.reset}
  ${c.cyan}/beans${c.reset}                    List ready issues
  ${c.cyan}/beans "Add feature"${c.reset}      Full autonomous flow
  ${c.cyan}/beans task-001${c.reset}           Build existing issue
  ${c.cyan}/bd:create "Bug"${c.reset}          Create beads issue
  ${c.cyan}/ralph:start${c.reset}              Start spec workflow

${c.bold}Environment:${c.reset}
  Config stored at: ${c.dim}~/.beans/config.json${c.reset}
  
${c.bold}More info:${c.reset}
  https://github.com/shinyobjectz/beans
`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "init":
    await cmdInit();
    break;
  case "config":
    await cmdConfig(args);
    break;
  case "doctor":
    await cmdDoctor();
    break;
  case "help":
  case "--help":
  case "-h":
  case undefined:
    await cmdHelp();
    break;
  default:
    error(`Unknown command: ${command}`);
    await cmdHelp();
    process.exit(1);
}
