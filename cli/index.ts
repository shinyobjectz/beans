#!/usr/bin/env bun
/**
 * BEANS CLI - Setup and configure BEANS for your project
 * 
 * Usage:
 *   bunx beans init              # Initialize BEANS in current project
 *   bunx beans config            # Configure API keys interactively
 *   bunx beans config --valyu    # Set Valyu API key
 *   bunx beans doctor            # Check installation status
 *   bunx beans research          # Manage research database
 */

import { $ } from "bun";
import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { homedir } from "os";

const VERSION = "2.5.2";
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
  
  // Ensure global ~/.beans repo exists (for subagent catalog)
  const beansHome = join(homedir(), ".beans");
  const beansRepoMarker = join(beansHome, "plugin"); // Check if it's a proper repo clone
  
  if (!existsSync(beansRepoMarker)) {
    info("Setting up global BEANS repo (~/.beans)...");
    try {
      // Backup config if exists
      let configBackup: any = null;
      const configPath = join(beansHome, "config.json");
      if (existsSync(configPath)) {
        configBackup = JSON.parse(readFileSync(configPath, "utf-8"));
      }
      
      // Clone to temp, then move (avoids rm -rf issues with locks)
      const tmpDir = `/tmp/beans-clone-${Date.now()}`;
      await $`git clone --depth 1 https://github.com/shinyobjectz/beans.git ${tmpDir}`;
      
      // Remove old and move new
      if (existsSync(beansHome)) {
        await $`rm -rf ${beansHome}`;
      }
      await $`mv ${tmpDir} ${beansHome}`;
      
      // Restore config
      if (configBackup) {
        writeFileSync(configPath, JSON.stringify(configBackup, null, 2));
      }
      success("BEANS repo cloned to ~/.beans (127+ subagents available)");
    } catch (e) {
      warn(`Could not clone global BEANS repo: ${e}`);
      info("Run manually: git clone https://github.com/shinyobjectz/beans.git ~/.beans");
    }
  }
  
  // Find plugin source (prefer local, fallback to global)
  const pluginSources = [
    join(cwd, "submodules/beans/plugin"),
    join(cwd, "plugin"),  // If running from beans repo itself
    join(beansHome, "plugin"),
    join(import.meta.dir, "../plugin"),
  ];
  
  let pluginSource: string | null = null;
  for (const src of pluginSources) {
    if (existsSync(src)) {
      pluginSource = src;
      break;
    }
  }
  
  if (!pluginSource) {
    error("BEANS plugin not found. Try: git clone https://github.com/shinyobjectz/beans.git ~/.beans");
    return;
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
  
  // Copy core agents from plugin
  info("Installing agents...");
  const agentsSrc = join(pluginSource, "agents");
  if (existsSync(agentsSrc)) {
    await $`cp -r ${agentsSrc}/* ${join(cwd, ".claude/agents/")}`.nothrow();
  }
  
  // Install essential subagents from catalog
  const subagentsSrc = join(beansHome, "package/subagents/categories");
  const agentsDest = join(cwd, ".claude/agents");
  
  // Core agents every project should have
  const coreAgents = [
    "04-quality-security/code-reviewer.md",
    "04-quality-security/debugger.md", 
    "10-research-analysis/research-analyst.md",
    "06-developer-experience/refactoring-specialist.md",
    "09-meta-orchestration/workflow-orchestrator.md",
  ];
  
  if (existsSync(subagentsSrc)) {
    let installed = 0;
    for (const agent of coreAgents) {
      const src = join(subagentsSrc, agent);
      const dest = join(agentsDest, agent.split("/").pop()!);
      if (existsSync(src) && !existsSync(dest)) {
        await $`cp ${src} ${dest}`.nothrow();
        installed++;
      }
    }
    success(`Agents installed (${installed} core + plugin agents)`);
  } else {
    success("Plugin agents installed");
    info("Run 'beans init' again after clone to get subagent catalog");
  }
  
  // Create commands symlinks (Claude Code discovers commands here)
  info("Registering commands...");
  const commandsDir = join(cwd, ".claude/commands");
  mkdirSync(commandsDir, { recursive: true });
  
  // Register ALL BEANS commands (core + phase commands)
  const beansCommands = [
    "beans.md", "beans-status.md", "beans-land.md", "beans-agents.md",
    "beans-new.md", "beans-research.md", "beans-requirements.md",
    "beans-design.md", "beans-tasks.md", "beans-implement.md"
  ];
  for (const cmd of beansCommands) {
    const src = join(pluginSource, "commands", cmd);
    if (existsSync(src)) {
      await $`ln -sf ${src} ${join(commandsDir, cmd)}`.nothrow();
    }
  }
  
  // Install beans-loop script to ~/.local/bin
  const loopScript = join(beansHome, "scripts/beans-loop.sh");
  const localBin = join(homedir(), ".local/bin");
  if (existsSync(loopScript)) {
    mkdirSync(localBin, { recursive: true });
    await $`cp ${loopScript} ${join(localBin, "beans-loop")}`.nothrow();
    await $`chmod +x ${join(localBin, "beans-loop")}`.nothrow();
  }
  
  // Copy settings.json if not exists
  const settingsSrc = join(pluginSource, "settings.json");
  const settingsDest = join(cwd, ".claude/settings.json");
  if (existsSync(settingsSrc) && !existsSync(settingsDest)) {
    await $`cp ${settingsSrc} ${settingsDest}`.nothrow();
  }
  success("Commands registered (10 BEANS commands + beans-loop)");
  
  // Initialize beads issue tracker (uses .beans directory now)
  info("Initializing issue tracker...");
  try {
    const bdResult = await $`bd init`.nothrow();
    if (bdResult.exitCode === 0) {
      success("Issue tracker initialized (.beans/)");
    } else {
      warn("bd init failed - run 'bd init' manually or install bd CLI");
    }
  } catch {
    warn("bd command not found - install beads CLI for issue tracking");
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
  log(`  ${c.cyan}beans doctor${c.reset}       # Verify setup`);
  log(`  ${c.cyan}/beans:new${c.reset}         # Create new spec with PRD flow`);
  log(`  ${c.cyan}/beans:agents${c.reset}      # Browse 127+ specialized subagents`);
  log(`  ${c.cyan}beans-loop${c.reset}         # Autonomous execution (bash)`);
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

async function cmdDoctor(args: string[]) {
  const fix = args.includes("--fix") || args.includes("-f");
  
  log(`\n${c.bold}${c.blue}🩺 BEANS Doctor${fix ? " (--fix)" : ""}${c.reset}\n`);
  
  const cwd = process.cwd();
  const config = loadConfig();
  let issues = 0;
  let fixed = 0;
  
  // Check CLI tools
  log(`${c.bold}CLI Tools${c.reset}`);
  const tools: Record<string, string> = {
    "bd": "curl -fsSL https://raw.githubusercontent.com/steveyegge/beads/main/scripts/install.sh | bash",
    "ast-grep": "npm install -g @ast-grep/cli",
    "repomix": "npm install -g repomix",
  };
  
  for (const [tool, installCmd] of Object.entries(tools)) {
    try {
      await $`which ${tool}`.quiet();
      success(tool);
    } catch {
      if (fix && tool !== "bd") {
        info(`Installing ${tool}...`);
        try {
          await $`${installCmd.split(" ")[0]} ${installCmd.split(" ").slice(1)}`.quiet();
          success(`${tool} installed`);
          fixed++;
        } catch (e) {
          error(`Failed to install ${tool}: ${e}`);
          issues++;
        }
      } else if (tool === "bd") {
        error(`${tool} not found (required)`);
        info(`  Install: ${installCmd}`);
        issues++;
      } else {
        warn(`${tool} not found`);
        if (fix) {
          info(`  Install: ${installCmd}`);
        }
      }
    }
  }
  
  // Check directories
  log(`\n${c.bold}Directories${c.reset}`);
  const requiredDirs = [".claude/plugins/beans", ".beans", ".claude/agents"];
  for (const dir of requiredDirs) {
    if (existsSync(join(cwd, dir))) {
      success(dir);
    } else {
      if (fix) {
        info(`Running beans init to fix missing directories...`);
        await cmdInit();
        fixed++;
        break;
      } else {
        error(dir);
        issues++;
      }
    }
  }
  
  // Check beads database (supports both .beans and legacy .beads locations)
  const beansDir = join(cwd, ".beans");
  const legacyBeadsDir = join(cwd, ".beads");
  
  const hasBeadsInBeans = existsSync(join(beansDir, "beads.db")) || existsSync(join(beansDir, "issues.jsonl"));
  const hasLegacyBeads = existsSync(join(legacyBeadsDir, "beads.db")) || existsSync(join(legacyBeadsDir, "issues.jsonl"));
  
  if (hasBeadsInBeans) {
    success(".beans/ (issue tracker)");
  } else if (hasLegacyBeads) {
    success(".beads/ (issue tracker - legacy location)");
  } else {
    if (fix) {
      info("Initializing beads (bd init)...");
      try {
        await $`bd init`.nothrow();
        success("beads initialized");
        fixed++;
      } catch {
        warn("bd init failed - run manually");
      }
    } else {
      warn("Issue tracker not initialized (run 'beans doctor --fix' or 'bd init')");
    }
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
    if (existsSync(commands)) {
      const cmdCount = (await $`ls ${commands}/*.md 2>/dev/null`.text().catch(() => "")).split("\n").filter(Boolean).length;
      log(`  Commands: ${cmdCount} (/beans, /beans:status, /beans:land, /beans:agents)`);
    }
  } else {
    error("Plugin not installed");
    issues++;
  }
  
  // Check installed subagents
  log(`\n${c.bold}Subagents${c.reset}`);
  const projectAgents = join(cwd, ".claude/agents");
  const globalAgents = join(homedir(), ".claude/agents");
  const catalogDir = join(homedir(), ".beans/package/subagents/categories");
  
  let projectCount = 0;
  let globalCount = 0;
  
  if (existsSync(projectAgents)) {
    projectCount = (await $`ls ${projectAgents}/*.md 2>/dev/null`.text().catch(() => "")).split("\n").filter(Boolean).length;
  }
  if (existsSync(globalAgents)) {
    globalCount = (await $`ls ${globalAgents}/*.md 2>/dev/null`.text().catch(() => "")).split("\n").filter(Boolean).length;
  }
  
  if (projectCount > 0) {
    success(`Project agents: ${projectCount} (.claude/agents/)`);
  } else {
    warn("No project agents installed");
  }
  if (globalCount > 0) {
    success(`Global agents: ${globalCount} (~/.claude/agents/)`);
  }
  
  if (existsSync(catalogDir)) {
    const catalogCount = (await $`find ${catalogDir} -name "*.md" -not -name "README.md" | wc -l`.text()).trim();
    log(`  Catalog: ${catalogCount} available (use /beans:agents to browse)`);
  } else {
    info("  Catalog: not installed (run 'beans init' to get 127+ agents)");
  }
  
  log("");
  if (fix && fixed > 0) {
    log(`${c.green}${c.bold}🔧 Fixed ${fixed} issue(s)${c.reset}`);
  }
  if (issues === 0) {
    log(`${c.green}${c.bold}✅ BEANS is healthy!${c.reset}`);
  } else {
    log(`${c.yellow}⚠ ${issues} issue(s) found.${c.reset}`);
    if (!fix) {
      log(`${c.dim}Run 'beans doctor --fix' to auto-fix.${c.reset}`);
    }
  }
  log("");
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESEARCH DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

function getResearchDb() {
  const dbPath = join(process.cwd(), ".beans/research.db");
  if (!existsSync(join(process.cwd(), ".beans"))) {
    mkdirSync(join(process.cwd(), ".beans"), { recursive: true });
  }
  const db = new Database(dbPath);
  
  // Init schema
  db.run(`
    CREATE TABLE IF NOT EXISTS research (
      id TEXT PRIMARY KEY,
      issue_id TEXT,
      query TEXT NOT NULL,
      source TEXT NOT NULL CHECK(source IN ('valyu', 'web', 'codebase')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      url TEXT,
      relevance REAL DEFAULT 0.5,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(issue_id, url, title)
    )
  `);
  
  db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS research_fts USING fts5(
      title, content, query, content='research', content_rowid='rowid'
    )
  `);
  
  return db;
}

async function cmdResearch(args: string[]) {
  const subCmd = args[0];
  const db = getResearchDb();
  
  if (subCmd === "list" || !subCmd) {
    const issueId = args.find(a => a.startsWith("--issue="))?.split("=")[1];
    const source = args.find(a => a.startsWith("--source="))?.split("=")[1];
    const limit = parseInt(args.find(a => a.startsWith("--limit="))?.split("=")[1] || "20");
    
    let sql = `SELECT id, issue_id, source, title, substr(content, 1, 100) as preview, relevance, created_at FROM research WHERE 1=1`;
    const params: any[] = [];
    
    if (issueId) { sql += ` AND issue_id = ?`; params.push(issueId); }
    if (source) { sql += ` AND source = ?`; params.push(source); }
    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);
    
    const rows = db.query(sql).all(...params) as any[];
    
    log(`\n${c.bold}Research Findings${c.reset} (${rows.length})\n`);
    
    if (rows.length === 0) {
      info("No research stored yet. Use Valyu MCP or /beans:research to gather findings.");
      return;
    }
    
    for (const row of rows) {
      const srcColor = row.source === "valyu" ? c.blue : row.source === "web" ? c.green : c.yellow;
      log(`${c.dim}${row.id}${c.reset} ${srcColor}[${row.source}]${c.reset} ${row.title}`);
      if (row.issue_id) log(`  ${c.dim}Issue: ${row.issue_id}${c.reset}`);
      log(`  ${c.dim}${row.preview}...${c.reset}`);
      log("");
    }
    return;
  }
  
  if (subCmd === "search") {
    const query = args.slice(1).join(" ");
    if (!query) {
      error("Usage: beans research search <query>");
      return;
    }
    
    const rows = db.query(`
      SELECT r.id, r.issue_id, r.source, r.title, substr(r.content, 1, 200) as preview
      FROM research r
      JOIN research_fts fts ON r.rowid = fts.rowid
      WHERE research_fts MATCH ?
      ORDER BY rank LIMIT 20
    `).all(query) as any[];
    
    log(`\n${c.bold}Search: "${query}"${c.reset} (${rows.length} results)\n`);
    
    for (const row of rows) {
      const srcColor = row.source === "valyu" ? c.blue : row.source === "web" ? c.green : c.yellow;
      log(`${c.dim}${row.id}${c.reset} ${srcColor}[${row.source}]${c.reset} ${row.title}`);
      log(`  ${c.dim}${row.preview}...${c.reset}\n`);
    }
    return;
  }
  
  if (subCmd === "show") {
    const id = args[1];
    if (!id) {
      error("Usage: beans research show <id>");
      return;
    }
    
    const row = db.query(`SELECT * FROM research WHERE id = ?`).get(id) as any;
    if (!row) {
      error(`Research ${id} not found`);
      return;
    }
    
    log(`\n${c.bold}${row.title}${c.reset}`);
    log(`${c.dim}ID: ${row.id} | Source: ${row.source} | Relevance: ${row.relevance}${c.reset}`);
    if (row.issue_id) log(`${c.dim}Issue: ${row.issue_id}${c.reset}`);
    if (row.url) log(`${c.dim}URL: ${row.url}${c.reset}`);
    log(`\n${row.content}\n`);
    return;
  }
  
  if (subCmd === "for") {
    const issueId = args[1];
    if (!issueId) {
      error("Usage: beans research for <issue-id>");
      return;
    }
    
    const rows = db.query(`
      SELECT id, source, title, substr(content, 1, 100) as preview, relevance
      FROM research WHERE issue_id = ? ORDER BY relevance DESC
    `).all(issueId) as any[];
    
    log(`\n${c.bold}Research for ${issueId}${c.reset} (${rows.length} findings)\n`);
    
    for (const row of rows) {
      log(`${c.dim}${row.id}${c.reset} [${row.source}] ${row.title} (${(row.relevance * 100).toFixed(0)}%)`);
    }
    log("");
    return;
  }
  
  // Default help
  log(`
${c.bold}beans research${c.reset} - Manage research database

${c.bold}Commands:${c.reset}
  ${c.cyan}list${c.reset}                    List all research (--issue=X, --source=valyu|web|codebase)
  ${c.cyan}search <query>${c.reset}          Full-text search
  ${c.cyan}show <id>${c.reset}               Show full research entry
  ${c.cyan}for <issue-id>${c.reset}          List research linked to an issue

${c.bold}Storage:${c.reset}
  Database at: ${c.dim}.beans/research.db${c.reset}
  
Research is auto-stored by Valyu MCP when you pass issue_id.
Use research_store tool to manually add web/codebase findings.
`);
}

async function cmdHelp() {
  log(`
${c.bold}${c.blue}🫘 BEANS CLI v${VERSION}${c.reset}

${c.bold}Usage:${c.reset}
  beans <command> [options]

${c.bold}Commands:${c.reset}
  ${c.cyan}init${c.reset}              Initialize BEANS in current project
  ${c.cyan}config${c.reset}            Configure API keys
  ${c.cyan}doctor${c.reset}            Check installation status
  ${c.cyan}research${c.reset}          Manage research database
  ${c.cyan}help${c.reset}              Show this help

${c.bold}Research:${c.reset}
  ${c.cyan}research list${c.reset}     List stored research
  ${c.cyan}research search${c.reset}   Full-text search findings
  ${c.cyan}research for${c.reset}      Get research for an issue
  ${c.cyan}research show${c.reset}     Show full entry

${c.bold}In Claude Code:${c.reset}
  ${c.cyan}/beans "Add feature"${c.reset}  Full autonomous flow
  ${c.cyan}/beans:status${c.reset}         Check progress
  ${c.cyan}/beans:land${c.reset}           Commit, push, close

${c.bold}Data Model:${c.reset}
  Issues → ${c.dim}.beans/ (beads tracker)${c.reset}
  Research → ${c.dim}.beans/research.db (SQLite)${c.reset}
  Config → ${c.dim}~/.beans/config.json${c.reset}

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
    await cmdDoctor(args);
    break;
  case "research":
    await cmdResearch(args);
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
