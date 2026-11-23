/*!
 * phone-call — SillyTavern extension entry.
 * Opens a phone-call UI with the current character, generates replies with the active
 * SillyTavern connection, and (optionally) writes the call back into the chat.
 * Copyright (c) 2026 phonecall-mint contributors
 * SPDX-License-Identifier: MIT
 */
import './src/phone-call.js';
import { createCallSession, sanitizeForSpeech } from './src/call-session.js';

const MODULE = 'phone_call';
const DEFAULTS = {
  lang: 'zh-CN',
  voiceName: '',
  rate: 1,
  pitch: 1,
  listen: true,
  bargeIn: true,
  writeBack: true,
  subtitle: '语音通话',
  layout: 'auto',          // auto | floating | fullscreen
  theme: 'diary',          // diary | '' (classic)
  activeView: 'full',      // full (character fills the screen) | avatar (round avatar)
  ttsUrl: '',              // OpenAI-compatible /v1/audio/speech endpoint (optional)
  ttsKey: '',
  ttsModel: 'tts-1',
  ttsVoice: 'alloy',
};

const ctx = () => SillyTavern.getContext();

function settings() {
  const { extensionSettings } = ctx();
  extensionSettings[MODULE] ??= {};
  const s = extensionSettings[MODULE];
  for (const [k, v] of Object.entries(DEFAULTS)) if (!(k in s)) s[k] = v;
  return s;
}

function toast(msg, type = 'info') {
  if (globalThis.toastr?.[type]) globalThis.toastr[type](msg, 'Phone Call');
  else console.log('[phone-call]', msg);
}

/* ---------------- character ---------------- */

function currentCharacter() {
  const c = ctx();
  if (c.groupId) return { error: '群聊暂不支持打电话，请在单人聊天里使用' };
  const ch = c.characters?.[c.characterId];
  if (!ch) return { error: '先打开一个角色的聊天' };
  const avatar = ch.avatar && ch.avatar !== 'none' ? `/characters/${encodeURIComponent(ch.avatar)}` : '';
  return { name: c.name2 || ch.name, avatar };
}

/* ---------------- reply generation ---------------- */

function buildPrompt(userText, { history, direction }) {
  const c = ctx();
  const s = settings();
  const user = c.name1;
  const char = c.name2;
  const parts = [
    `[Phone call in progress: ${user} and ${char} are talking on the phone right now. ` +
    `Reply as ${char} with only the words ${char} says out loud — one to three short, natural spoken sentences, ` +
    `in the language ${user} is using. No narration, no actions, no asterisks, no emoji, no quotation marks.]`,
  ];
  if (!s.writeBack && history.length) {
    const recent = history.slice(-12).map((t) => `${t.role === 'user' ? user : char}: ${t.text}`).join('\n');
    parts.push(`[The call so far:\n${recent}]`);
  }
  if (userText == null) {
    parts.push(direction === 'incoming'
      ? `[${char} called ${user}, and ${user} just picked up. ${char} speaks first.]`
      : `[${user} is calling ${char}. ${char} just answered the phone and speaks first.]`);
  } else {
    parts.push(`[${user} says on the phone: "${userText}"]`);
  }
  return parts.join('\n');
}

async function generateReply(userText, info) {
  const c = ctx();
  const prompt = buildPrompt(userText, info);
  const fn = c.generateQuietPrompt;
  if (typeof fn !== 'function') throw new Error('generateQuietPrompt is not available in this SillyTavern version');
  // Newer SillyTavern takes an options object; older versions take positional args.
  const out = fn.length >= 1 ? await fn(prompt, false, false) : await fn({ quietPrompt: prompt });
  return cleanReply(out, c.name2);
}

function cleanReply(text, charName) {
  let t = String(text || '').trim();
  if (charName && t.startsWith(`${charName}:`)) t = t.slice(charName.length + 1);
  t = t.replace(/^["“「]|["”」]$/g, '');
  return sanitizeForSpeech(t) || t;
}

/* ---------------- speech out ---------------- */

async function openAiSpeak(text, { signal }) {
  const s = settings();
  const res = await fetch(s.ttsUrl, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', ...(s.ttsKey ? { Authorization: `Bearer ${s.ttsKey}` } : {}) },
    body: JSON.stringify({ model: s.ttsModel, voice: s.ttsVoice, input: text, response_format: 'mp3' }),
  });
  if (!res.ok) throw new Error(`TTS ${res.status}`);
  return res.blob();
}

/* ---------------- chat write-back ---------------- */

async function writeBack(turn) {
  if (!settings().writeBack) return;
  const c = ctx();
  const isUser = turn.role === 'user';
  const msg = {
    name: isUser ? c.name1 : c.name2,
    is_user: isUser,
    is_system: false,
    send_date: new Date().toISOString(),
    mes: turn.text,
    extra: { phone_call: true },
  };
  c.chat.push(msg);
  try { c.addOneMessage(msg); } catch (e) { console.warn('[phone-call] addOneMessage', e); }
  try { await c.saveChat(); } catch (e) { console.warn('[phone-call] saveChat', e); }
}

/* ---------------- UI ---------------- */

let ui = null;
let session = null;

function ensureUi() {
  if (ui) return ui;
  ui = document.createElement('phone-call');
  ui.id = 'phone_call_ui';
  ui.setAttribute('controls', 'speaker,camera,mute,keypad,end');
  document.body.append(ui);
  return ui;
}

function applyLayout() {
  const s = settings();
  const mobile = window.matchMedia('(max-width: 700px)').matches;
  const full = s.layout === 'fullscreen' || (s.layout === 'auto' && mobile);
  ui.toggleAttribute('fullscreen', full);
  ui.toggleAttribute('floating', !full);
  ui.toggleAttribute('no-status-bar', full && mobile);
  if (s.theme) ui.setAttribute('theme', s.theme); else ui.removeAttribute('theme');
  ui.setAttribute('active-view', s.activeView || 'full');
}

function startCall(direction) {
  const who = currentCharacter();
  if (who.error) { toast(who.error, 'warning'); return; }
  if (ui && ui.state !== 'idle') { toast('已经在通话中了', 'warning'); return; }
  const s = settings();
  ensureUi();
  applyLayout();
  session?.destroy();
  session = createCallSession(ui, {
    lang: s.lang,
    voice: s.voiceName || null,
    rate: Number(s.rate) || 1,
    pitch: Number(s.pitch) || 1,
    listen: s.listen,
    bargeIn: s.bargeIn,
    reply: generateReply,
    speak: s.ttsUrl ? openAiSpeak : null,
    onTurn: (turn) => { writeBack(turn); },
    onError: (e) => { console.warn('[phone-call]', e); toast(String(e?.message || e), 'error'); },
  });
  const meta = { name: who.name, avatar: who.avatar, subtitle: s.subtitle };
  if (direction === 'incoming') session.ring(meta);
  else session.dial(meta);
}

/* ---------------- settings panel ---------------- */

function settingsHtml() {
  return `
<div id="phone_call_settings" class="inline-drawer">
  <div class="inline-drawer-toggle inline-drawer-header">
    <b>Phone Call 电话</b>
    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
  </div>
  <div class="inline-drawer-content pc-grid">
    <div class="pc-row">
      <div class="menu_button" data-pc="dial"><i class="fa-solid fa-phone"></i> 打给角色</div>
      <div class="menu_button" data-pc="ring"><i class="fa-solid fa-phone-volume"></i> 让角色打来</div>
    </div>
    <label>语言 <input class="text_pole" data-k="lang" type="text"></label>
    <label>来电副标题 <input class="text_pole" data-k="subtitle" type="text"></label>
    <label>浏览器语音 <select class="text_pole" data-k="voiceName"></select></label>
    <label>语速 <input data-k="rate" type="range" min="0.5" max="2" step="0.05"></label>
    <label>主题
      <select class="text_pole" data-k="theme">
        <option value="diary">手帐</option>
        <option value="">经典</option>
      </select>
    </label>
    <label>接通后
      <select class="text_pole" data-k="activeView">
        <option value="full">角色图铺满画面</option>
        <option value="avatar">圆形头像</option>
      </select>
    </label>
    <label>布局
      <select class="text_pole" data-k="layout">
        <option value="auto">自动（手机全屏，电脑悬浮）</option>
        <option value="floating">悬浮手机</option>
        <option value="fullscreen">全屏</option>
      </select>
    </label>
    <label class="checkbox_label"><input data-k="listen" type="checkbox"> 用麦克风说话（Chrome / Edge）</label>
    <label class="checkbox_label"><input data-k="bargeIn" type="checkbox"> 说话可以打断角色</label>
    <label class="checkbox_label"><input data-k="writeBack" type="checkbox"> 通话内容写回聊天记录</label>
    <hr>
    <small>可选：OpenAI 兼容的语音合成接口（/v1/audio/speech）。留空就用浏览器自带的声音。</small>
    <label>TTS 地址 <input class="text_pole" data-k="ttsUrl" type="text" placeholder="http://127.0.0.1:8000/v1/audio/speech"></label>
    <label>TTS Key <input class="text_pole" data-k="ttsKey" type="password"></label>
    <label>TTS 模型 <input class="text_pole" data-k="ttsModel" type="text"></label>
    <label>TTS 音色 <input class="text_pole" data-k="ttsVoice" type="text"></label>
  </div>
</div>`;
}

function fillVoices(select, current) {
  const voices = typeof speechSynthesis !== 'undefined' ? speechSynthesis.getVoices() : [];
  select.textContent = '';
  select.append(new Option('自动（按语言选）', ''));
  for (const v of voices) select.append(new Option(`${v.name} (${v.lang})`, v.name));
  select.value = current || '';
}

function mountSettings() {
  const host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
  if (!host || document.getElementById('phone_call_settings')) return;
  host.insertAdjacentHTML('beforeend', settingsHtml());
  const root = document.getElementById('phone_call_settings');
  const s = settings();
  root.querySelectorAll('[data-k]').forEach((el) => {
    const k = el.dataset.k;
    if (el.type === 'checkbox') el.checked = !!s[k];
    else if (k !== 'voiceName') el.value = s[k];
    el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
      s[k] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? Number(el.value) : el.value;
      ctx().saveSettingsDebounced();
    });
  });
  const vs = root.querySelector('[data-k="voiceName"]');
  fillVoices(vs, s.voiceName);
  if (typeof speechSynthesis !== 'undefined') speechSynthesis.addEventListener?.('voiceschanged', () => fillVoices(vs, s.voiceName));
  root.querySelector('[data-pc="dial"]').addEventListener('click', () => startCall('outgoing'));
  root.querySelector('[data-pc="ring"]').addEventListener('click', () => startCall('incoming'));
}

function mountMenu(tries = 0) {
  const menu = document.getElementById('extensionsMenu');
  if (document.getElementById('phone_call_menu_dial')) return;
  if (!menu) {
    // the wand menu is rendered asynchronously; wait for it a little
    if (tries < 40) setTimeout(() => mountMenu(tries + 1), 250);
    return;
  }
  const item = (id, icon, label, fn) => {
    const el = document.createElement('div');
    el.id = id;
    el.className = 'list-group-item flex-container flexGap5 interactable';
    el.tabIndex = 0;
    el.innerHTML = `<div class="fa-solid ${icon} extensionsMenuExtension"></div><span>${label}</span>`;
    el.addEventListener('click', fn);
    menu.append(el);
  };
  item('phone_call_menu_dial', 'fa-phone', '打给角色', () => startCall('outgoing'));
  item('phone_call_menu_ring', 'fa-phone-volume', '让角色打来', () => startCall('incoming'));
}

function registerCommands() {
  const c = ctx();
  const defs = [
    ['call', '给当前角色打电话', () => startCall('outgoing')],
    ['ring', '让当前角色给你打电话', () => startCall('incoming')],
    ['hangup', '挂断电话', () => ui?.hangup('local')],
  ];
  for (const [name, help, fn] of defs) {
    try {
      if (c.SlashCommandParser?.addCommandObject && c.SlashCommand?.fromProps) {
        c.SlashCommandParser.addCommandObject(c.SlashCommand.fromProps({ name, helpString: help, callback: () => { fn(); return ''; } }));
      } else if (typeof c.registerSlashCommand === 'function') {
        c.registerSlashCommand(name, () => { fn(); return ''; }, [], help, true, true);
      }
    } catch (e) { console.warn('[phone-call] slash command', name, e); }
  }
}

function init() {
  settings();
  mountSettings();
  mountMenu();
  registerCommands();
  window.addEventListener('resize', () => { if (ui && ui.state !== 'idle') applyLayout(); });
  // Optional global hook so other extensions / scripts can trigger calls.
  globalThis.phoneCall = { dial: () => startCall('outgoing'), ring: () => startCall('incoming'), hangup: () => ui?.hangup('local') };
}

if (globalThis.jQuery) globalThis.jQuery(init);
else init();
