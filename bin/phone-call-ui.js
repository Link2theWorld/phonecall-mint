#!/usr/bin/env node
/*!
 * phone-call-ui CLI — `npx phone-call-ui init`
 * Installs the package into the current frontend project and teaches the project's AI coding agent
 * (Claude Code, Codex, Cursor, …) how to integrate it.
 * SPDX-License-Identifier: MIT
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync } from 'node:fs';
import { join, dirname, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PKG_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PKG = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8'));
const NAME = PKG.name;
const START = `<!-- ${NAME}:start -->`;
const END = `<!-- ${NAME}:end -->`;
const isWin = process.platform === 'win32';

const c = {
  bold: (s) => `\x1b[1m${s}\x1b[22m`,
  green: (s) => `\x1b[32m${s}\x1b[39m`,
  dim: (s) => `\x1b[2m${s}\x1b[22m`,
  yellow: (s) => `\x1b[33m${s}\x1b[39m`,
};
const log = (...a) => console.log(...a);

function parseArgs(argv) {
  const opts = { cmd: 'init', install: true, with: null, dir: process.cwd(), vendor: false, lang: null };
  const rest = [...argv];
  if (rest[0] && !rest[0].startsWith('-')) opts.cmd = rest.shift();
  while (rest.length) {
    const a = rest.shift();
    if (a === '--no-install') opts.install = false;
    else if (a === '--vendor') opts.vendor = true;
    else if (a === '--with') opts.with = rest.shift();
    else if (a.startsWith('--with=')) opts.with = a.slice(7);
    else if (a === '--dir') opts.dir = resolve(rest.shift());
    else if (a.startsWith('--dir=')) opts.dir = resolve(a.slice(6));
    else if (a === '--lang') opts.lang = rest.shift();
    else if (a.startsWith('--lang=')) opts.lang = a.slice(7);
    else if (a === '-h' || a === '--help') opts.cmd = 'help';
    else if (a === '-v' || a === '--version') opts.cmd = 'version';
    else { console.error(`Unknown option: ${a}`); opts.cmd = 'help'; }
  }
  return opts;
}

function help() {
  log(`${c.bold(NAME)} ${PKG.version} — phone-call UI web component

${c.bold('Usage')}
  npx ${NAME} init                 install + teach your AI agent how to integrate it
  npx ${NAME} init --with claude   …then start Claude Code with the integration prompt
  npx ${NAME} init --with codex    …then start Codex with the integration prompt
  npx ${NAME} prompt               print the integration prompt again

${c.bold('Options')}
  --no-install     don't run the package manager (already installed / monorepo)
  --vendor         copy the files into ./${NAME}/ instead of installing (for projects without npm)
  --dir <path>     project folder (default: current folder)
  --lang <code>    language for the printed prompt: zh | en (default: auto)
`);
}

function readJson(p) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } }

function detect(dir) {
  const pkg = readJson(join(dir, 'package.json'));
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const has = (n) => n in deps;
  let pm = 'npm';
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) pm = 'pnpm';
  else if (existsSync(join(dir, 'yarn.lock'))) pm = 'yarn';
  else if (existsSync(join(dir, 'bun.lockb')) || existsSync(join(dir, 'bun.lock'))) pm = 'bun';
  let framework = 'plain HTML / vanilla JS';
  if (has('next')) framework = 'Next.js (React)';
  else if (has('nuxt')) framework = 'Nuxt (Vue)';
  else if (has('@sveltejs/kit')) framework = 'SvelteKit';
  else if (has('@remix-run/react') || has('react-router')) framework = has('react-router') ? 'React Router / Remix' : 'Remix (React)';
  else if (has('@angular/core')) framework = 'Angular';
  else if (has('svelte')) framework = 'Svelte';
  else if (has('vue')) framework = 'Vue 3';
  else if (has('solid-js')) framework = 'SolidJS';
  else if (has('react')) framework = 'React';
  const reactMajor = has('react') ? parseInt(String(deps.react).replace(/[^\d.]/g, ''), 10) || null : null;
  const ts = has('typescript') || existsSync(join(dir, 'tsconfig.json'));
  const bundler = has('vite') ? 'Vite' : has('webpack') ? 'webpack' : null;
  const installed = has(NAME);
  return { pkg, pm, framework, reactMajor, ts, bundler, installed };
}

function run(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: isWin });
  return r.status === 0;
}

function install(dir, pm) {
  const args = { npm: ['install', NAME], pnpm: ['add', NAME], yarn: ['add', NAME], bun: ['add', NAME] }[pm];
  log(c.dim(`$ ${pm} ${args.join(' ')}`));
  return run(pm, args, dir);
}

function vendor(dir) {
  const dest = join(dir, NAME);
  mkdirSync(dest, { recursive: true });
  cpSync(join(PKG_DIR, 'src'), join(dest, 'src'), { recursive: true });
  for (const f of ['AI.md', 'LICENSE', 'README.md']) cpSync(join(PKG_DIR, f), join(dest, f));
  return dest;
}

function hintsText(info, guidePath, importHint) {
  return [
    `- Integration guide: \`${guidePath}\` — read it fully before editing.`,
    `- Import: ${importHint}`,
    `- Detected: ${info.framework}${info.reactMajor ? ` (React ${info.reactMajor})` : ''}${info.bundler ? `, ${info.bundler}` : ''}${info.ts ? ', TypeScript' : ''}, package manager ${info.pm}.`,
  ].join('\n');
}

function writeAgentFiles(dir, info, guidePath, importHint) {
  const written = [];
  const hints = hintsText(info, guidePath, importHint);

  // Claude Code skill
  const skillDir = join(dir, '.claude', 'skills', NAME);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(join(skillDir, 'SKILL.md'), `---
name: ${NAME}
description: Integrate or modify the <phone-call> phone/FaceTime-style call UI (phone-call-ui package) in this project — adding a "call the character" button, incoming calls, voice replies, call screens. Use whenever the user mentions phone calls, voice calls, 打电话, 来电, 通话 in this app.
---

# phone-call-ui

${hints}

Follow the guide's steps in order (mount once near the app root → wire \`reply\` to this project's existing
LLM/chat backend → optional TTS → persist turns → checklist). Reuse existing code; never put API keys in client code.
`);
  written.push(relative(dir, join(skillDir, 'SKILL.md')));

  // AGENTS.md (Codex, Cursor, Copilot, Gemini CLI, Aider… read this)
  const agentsPath = join(dir, 'AGENTS.md');
  const block = `${START}
## phone-call-ui (call screen component)

This project uses / is adding **${NAME}**, a \`<phone-call>\` web component for phone-call style voice chat.
${hints}
${END}`;
  let agents = existsSync(agentsPath) ? readFileSync(agentsPath, 'utf8') : '';
  if (agents.includes(START) && agents.includes(END)) {
    agents = agents.replace(new RegExp(`${START}[\\s\\S]*?${END}`), block);
  } else {
    agents = `${agents.trimEnd()}${agents.trim() ? '\n\n' : ''}${block}\n`;
  }
  writeFileSync(agentsPath, agents);
  written.push('AGENTS.md');
  return written;
}

function promptText(lang, guidePath) {
  if (lang === 'en') {
    return `Integrate phone-call-ui into this app by following ${guidePath}: add a button that calls the current character/assistant using our existing chat backend for replies, keep it working on mobile, and save call turns into the chat history.`;
  }
  return `按照 ${guidePath} 把 phone-call-ui 电话组件接进这个项目：加一个「打电话」按钮，用我们现有的聊天后端生成角色回复，手机上也能用，通话内容写回聊天记录。`;
}

function detectLang(opt) {
  if (opt) return opt.startsWith('zh') ? 'zh' : 'en';
  const l = (process.env.LANG || process.env.LC_ALL || Intl.DateTimeFormat().resolvedOptions().locale || '').toLowerCase();
  return l.startsWith('zh') ? 'zh' : 'en';
}

function launchAgent(which, prompt, dir) {
  const bin = { claude: 'claude', codex: 'codex' }[which];
  if (!bin) { console.error(`--with must be "claude" or "codex"`); return false; }
  log(`\n${c.bold(`Starting ${bin}…`)} ${c.dim('(you will review and approve its changes there)')}\n`);
  // with shell:true (Windows) the argument must be quoted for cmd.exe; elsewhere pass it as-is
  const arg = isWin ? `"${prompt.replace(/"/g, '\\"')}"` : prompt;
  return run(bin, [arg], dir);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.cmd === 'help') return help();
  if (opts.cmd === 'version') return log(PKG.version);
  if (opts.cmd !== 'init' && opts.cmd !== 'prompt') { help(); process.exitCode = 1; return; }

  const dir = opts.dir;
  const info = detect(dir);
  const lang = detectLang(opts.lang);
  const useVendor = opts.vendor || !info.pkg;

  let guidePath = `node_modules/${NAME}/AI.md`;
  let importHint = `\`import '${NAME}'\` / \`import { createCallSession } from '${NAME}'\` (ESM, browser-only side effects).`;
  if (useVendor) {
    guidePath = `${NAME}/AI.md`;
    importHint = `\`<script type="module" src="./${NAME}/src/index.js"></script>\` or \`import { createCallSession } from './${NAME}/src/index.js'\` (adjust the relative path). The guide says \`'${NAME}'\` — use this path instead.`;
  }

  if (opts.cmd === 'prompt') { log(promptText(lang, guidePath)); return; }

  log(`${c.bold(NAME)} ${c.dim(PKG.version)}\n`);
  log(`Project:   ${dir}`);
  log(`Detected:  ${info.framework}${info.ts ? ' + TypeScript' : ''}${info.pkg ? `, ${info.pm}` : ' (no package.json)'}`);

  if (useVendor) {
    const dest = vendor(dir);
    log(`${c.green('✓')} Copied files to ${relative(dir, dest) || dest}/`);
  } else if (info.installed) {
    log(`${c.green('✓')} ${NAME} is already in package.json`);
  } else if (opts.install) {
    if (!install(dir, info.pm)) {
      console.error(c.yellow(`\nInstall failed. Run it yourself, then re-run with --no-install.`));
      process.exitCode = 1;
      return;
    }
    log(`${c.green('✓')} Installed ${NAME}`);
  } else {
    log(c.yellow(`! Skipped install (--no-install). Make sure ${NAME} is installed.`));
  }

  const files = writeAgentFiles(dir, info, guidePath, importHint);
  for (const f of files) log(`${c.green('✓')} Wrote ${f}`);

  const prompt = promptText(lang, guidePath);
  if (opts.with) {
    if (!launchAgent(opts.with, prompt, dir)) process.exitCode = 1;
    return;
  }
  log(`\n${c.bold(lang === 'zh' ? '下一步：把这句话发给你的 AI 编程助手（Claude Code / Codex / Cursor …）' : 'Next: paste this to your AI coding agent (Claude Code / Codex / Cursor …)')}\n`);
  log(`  ${prompt}\n`);
  log(c.dim(lang === 'zh'
    ? `或者直接：npx ${NAME} init --with claude   （或 --with codex）`
    : `Or run: npx ${NAME} init --with claude   (or --with codex)`));
}

main();
