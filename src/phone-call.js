/*!
 * <phone-call> — an embeddable phone / FaceTime-style call UI as a Web Component.
 * Copyright (c) 2026 phonecall-mint contributors
 * SPDX-License-Identifier: MIT — see the LICENSE file.
 */

const DEFAULT_LABELS = {
  voiceCall: '语音通话',
  slideToAnswer: '滑动接听',
  accept: '接听',
  decline: '拒绝',
  calling: '正在呼叫…',
  cancel: '取消',
  ended: '通话结束',
  declined: '已拒绝',
  missed: '未接来电',
  inputPlaceholder: '输入要说的话…',
  send: '发送',
  speaker: '扬声器',
  camera: '摄像头',
  mute: '静音',
  flip: '翻转镜头',
  keypad: '打字',
  end: '挂断',
};

const DEFAULT_CONTROLS = 'speaker,camera,mute,flip,end';

const svg = (body, fill = false) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" ${fill ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'}>${body}</svg>`;

const ICONS = {
  phone: svg('<path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/>', true),
  speaker: svg('<path d="M3.5 9.2v5.6h3.8l4.7 3.9V5.3L7.3 9.2z" fill="currentColor" stroke="none"/><path d="M15.5 9.3a3.8 3.8 0 0 1 0 5.4"/><path d="M18.2 6.8a7.4 7.4 0 0 1 0 10.4"/>'),
  camera: svg('<rect x="2.5" y="6.5" width="12.5" height="11" rx="2.2" fill="currentColor" stroke="none"/><path d="M16.2 10.6 21.5 7.4v9.2l-5.3-3.2z" fill="currentColor" stroke="none"/>'),
  mute: svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21"/><path d="M4 3.5l16 17"/>'),
  flip: svg('<path d="M4.5 8h2.6l1.6-2.2h6.6L16.9 8h2.6a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-8A1.5 1.5 0 0 1 4.5 8z"/><path d="M9 13.2a3 3 0 0 1 5.1-1.9"/><path d="M14.4 9.6v1.9h-1.9"/><path d="M15 14.2a3 3 0 0 1-5.1 1.9"/><path d="M9.6 17.8v-1.9h1.9"/>'),
  keypad: svg('<circle cx="6" cy="5" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="18" cy="5" r="1.6"/><circle cx="6" cy="11" r="1.6"/><circle cx="12" cy="11" r="1.6"/><circle cx="18" cy="11" r="1.6"/><circle cx="6" cy="17" r="1.6"/><circle cx="12" cy="17" r="1.6"/><circle cx="18" cy="17" r="1.6"/>', true),
  end: svg('<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>'),
  send: svg('<path d="M12 19V5"/><path d="M6 11l6-6 6 6"/>'),
  signal: svg('<rect x="2" y="15" width="3.2" height="5" rx=".8"/><rect x="7.2" y="11.5" width="3.2" height="8.5" rx=".8"/><rect x="12.4" y="8" width="3.2" height="12" rx=".8"/><rect x="17.6" y="4.5" width="3.2" height="15.5" rx=".8"/>', true),
  wifi: svg('<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.8 12.5a9.2 9.2 0 0 1 12.4 0"/><path d="M9.1 16a4.4 4.4 0 0 1 5.8 0"/><circle cx="12" cy="19.2" r="1.3" fill="currentColor" stroke="none"/>'),
  battery: '<svg viewBox="0 0 30 14" aria-hidden="true"><rect x=".75" y=".75" width="25" height="12.5" rx="3.6" fill="none" stroke="currentColor" stroke-opacity=".4" stroke-width="1.5"/><rect x="2.6" y="2.6" width="21.3" height="8.8" rx="2.2" fill="currentColor"/><path d="M27.6 4.8v4.4c.9-.3 1.6-1.1 1.6-2.2s-.7-1.9-1.6-2.2z" fill="currentColor" fill-opacity=".45"/></svg>',
};

const CONTROL_DEFS = {
  speaker: { icon: 'speaker', toggle: true, on: true },
  camera: { icon: 'camera', toggle: true, on: true },
  mute: { icon: 'mute', toggle: true, on: false },
  flip: { icon: 'flip', toggle: false },
  keypad: { icon: 'keypad', toggle: true, on: false },
  end: { icon: 'end', danger: true },
};

const CSS = /* css */ `
:host {
  all: initial;
  display: block;
  position: relative;
  height: var(--pc-height, min(780px, calc(100dvh - 32px)));
  aspect-ratio: var(--pc-aspect, 375 / 812);
  font-family: var(--pc-font, -apple-system, BlinkMacSystemFont, "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", system-ui, sans-serif);
  color: #fff;
  -webkit-font-smoothing: antialiased;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}
:host([state="idle"]) { display: none; }
:host([floating]) {
  position: fixed;
  right: var(--pc-right, 24px);
  bottom: var(--pc-bottom, 24px);
  z-index: var(--pc-z, 2147483000);
}
:host([fullscreen]) {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100dvh;
  aspect-ratio: auto;
  z-index: var(--pc-z, 2147483000);
}
*, *::before, *::after { box-sizing: border-box; }
button { font: inherit; color: inherit; border: 0; background: none; padding: 0; margin: 0; cursor: pointer; }
button:focus-visible, input:focus-visible { outline: 2px solid rgba(255,255,255,.9); outline-offset: 3px; }
svg { width: 100%; height: 100%; display: block; }

.phone {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: var(--pc-radius, 46px);
  background: #1c1c1e;
  container-type: size;
  box-shadow: var(--pc-shadow, 0 30px 80px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.06));
  isolation: isolate;
  --lvl: 0;
}
:host([fullscreen]) .phone { border-radius: 0; box-shadow: none; }

/* ---------- background ---------- */
.bg { position: absolute; inset: 0; z-index: 0; background: var(--pc-backdrop, linear-gradient(165deg, #6d7a72 0%, #3a403d 55%, #1f2321 100%)); }
.bg img { position: absolute; inset: -8%; width: 116%; height: 116%; object-fit: cover; filter: blur(7cqw) saturate(1.15) brightness(.78); opacity: 0; transition: opacity .4s; }
.bg img.ok { opacity: 1; }
.media { position: absolute; inset: 0; z-index: 1; transition: filter .45s, transform .45s; }
.media ::slotted(*) { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
:host([state="incoming"]) .media, :host([state="outgoing"]) .media { filter: blur(7cqw) brightness(.8); transform: scale(1.12); }
.shade { position: absolute; inset: 0; z-index: 2; pointer-events: none; background: linear-gradient(180deg, rgba(0,0,0,.32) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 62%, rgba(0,0,0,.42) 100%); }

/* ---------- status bar ---------- */
.status { position: absolute; z-index: 20; top: 0; left: 0; right: 0; height: 13cqw; padding: 2.2cqw 7.5cqw 0; display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 4.3cqw; letter-spacing: -.01em; font-variant-numeric: tabular-nums; pointer-events: none; }
.status .icons { display: flex; align-items: center; gap: 1.6cqw; }
.status .i-signal { width: 4.6cqw; height: 4.6cqw; }
.status .i-wifi { width: 4.6cqw; height: 4.6cqw; }
.status .i-battery { width: 7cqw; height: 3.4cqw; }
:host([no-status-bar]) .status { display: none; }

/* ---------- screens ---------- */
.screen { position: absolute; inset: 0; z-index: 10; opacity: 0; visibility: hidden; transition: opacity .35s ease, visibility 0s linear .35s; }
:host([state="incoming"]) .s-incoming,
:host([state="outgoing"]) .s-outgoing,
:host([state="active"]) .s-active,
:host([state="ended"]) .s-active { opacity: 1; visibility: visible; transition: opacity .35s ease; }

.caller { position: absolute; left: 6cqw; right: 6cqw; top: 33cqw; text-align: center; text-shadow: 0 1px 12px rgba(0,0,0,.25); }
.caller .name { font-size: 12.6cqw; font-weight: 300; line-height: 1.12; letter-spacing: -.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.caller .sub { margin-top: 1.6cqw; font-size: 6.6cqw; font-weight: 400; opacity: .92; }

/* slide to answer */
.slide { position: absolute; left: 50%; bottom: max(calc(17% - 9.5cqw), 8cqw); width: 74cqw; height: 19.5cqw; transform: translateX(-50%); border-radius: 999px; background: rgba(255,255,255,.26); -webkit-backdrop-filter: blur(18px) saturate(1.4); backdrop-filter: blur(18px) saturate(1.4); touch-action: none; }
.slide .hint { position: absolute; inset: 0 0 0 19cqw; display: flex; align-items: center; justify-content: center; font-size: 5.6cqw; font-weight: 400; letter-spacing: .02em; color: transparent; background: linear-gradient(100deg, rgba(255,255,255,.55) 35%, #fff 50%, rgba(255,255,255,.55) 65%) 0 0 / 300% 100% no-repeat; -webkit-background-clip: text; background-clip: text; animation: shimmer 2.4s linear infinite; pointer-events: none; transition: opacity .15s; }
@keyframes shimmer { from { background-position: 100% 0; } to { background-position: -50% 0; } }
.slide .knob { position: absolute; left: 1.6cqw; top: 1.6cqw; width: 16.3cqw; height: 16.3cqw; border-radius: 50%; background: #fff; color: #34c759; display: grid; place-items: center; box-shadow: 0 2px 10px rgba(0,0,0,.18); transition: transform .35s cubic-bezier(.2,.9,.3,1.2); touch-action: none; cursor: grab; }
.slide .knob:active { cursor: grabbing; }
.slide .knob svg { width: 8.4cqw; height: 8.4cqw; }
.slide .knob.nudge { animation: nudge .6s ease; }
@keyframes nudge { 30% { transform: translateX(6cqw); } 60% { transform: translateX(0); } 80% { transform: translateX(2cqw); } }

/* two-button answer style */
.answer-buttons { position: absolute; left: 0; right: 0; bottom: max(calc(14% - 9cqw), 8cqw); display: none; justify-content: space-around; padding: 0 10cqw; }
:host([answer-style="buttons"]) .answer-buttons { display: flex; }
:host([answer-style="buttons"]) .slide { display: none; }
.ab { display: flex; flex-direction: column; align-items: center; gap: 2.4cqw; font-size: 4cqw; }
.round { width: 19cqw; height: 19cqw; border-radius: 50%; display: grid; place-items: center; transition: transform .12s, filter .12s; }
.round:active { transform: scale(.94); filter: brightness(.9); }
.round svg { width: 9cqw; height: 9cqw; }
.round.green { background: #34c759; }
.round.red { background: #eb4e3d; }
.round.red .rot { transform: rotate(135deg); }

/* outgoing */
.s-outgoing .avatar-wrap { top: 58%; }
.s-outgoing .end-wrap { position: absolute; left: 0; right: 0; bottom: max(calc(14% - 9cqw), 8cqw); display: flex; justify-content: center; }

/* ---------- avatar with voice rings ---------- */
.avatar-wrap { position: absolute; left: 50%; top: 47%; width: 40cqw; aspect-ratio: 1; transform: translate(-50%, -50%); transition: opacity .3s; }
.ring { position: absolute; inset: 0; border-radius: 50%; background: rgba(255,255,255,.16); transform: scale(calc(1 + var(--lvl) * .32)); transition: transform 90ms linear; }
.ring.r2 { background: rgba(255,255,255,.08); transform: scale(calc(1 + var(--lvl) * .62)); }
.avatar { position: absolute; inset: 0; border-radius: 50%; overflow: hidden; background: linear-gradient(145deg, #9aa6a0, #5d6863); display: grid; place-items: center; font-size: 17cqw; font-weight: 300; box-shadow: 0 8px 30px rgba(0,0,0,.25); }
.avatar img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: var(--pc-avatar-position, 50% 24%); opacity: 0; transition: opacity .3s; }
.avatar img.ok { opacity: 1; }
.phone.has-media .s-active .avatar-wrap { opacity: 0; pointer-events: none; }

/* ---------- in-call: the character fills the screen (default) ---------- */
:host(:not([active-view="avatar"])) .s-active .avatar-wrap { display: none; }
:host(:not([active-view="avatar"])[state="active"]) .bg img,
:host(:not([active-view="avatar"])[state="ended"]) .bg img {
  filter: none;
  object-position: var(--pc-portrait-position, 50% 28%);
  transform: scale(calc(1 + var(--lvl) * .018));
}
.bg img { transition: opacity .4s, filter .7s ease, transform .12s linear; }
:host(:not([active-view="avatar"])[state="active"]) .shade {
  background: linear-gradient(180deg, rgba(0,0,0,.5) 0%, rgba(0,0,0,.18) 22%, rgba(0,0,0,0) 38%, rgba(0,0,0,0) 58%, rgba(0,0,0,.5) 100%);
}

/* ---------- theme: diary (hand-made scrapbook look) ---------- */
:host([theme="diary"]) {
  --d-sky: #e6eff8; --d-sky-photo: #cfdff0; --d-sky-deep: #2f6fb5; --d-lilac: #b9b4e0;
  --d-paper: #ffffff; --d-ink: #1b2738; --d-ink-muted: #40516a;
  --d-blossom: #b83a73; --d-blossom-deep: #7a2149; --d-note: #fbe3ee;
  --d-shadow: 0 6px 14px rgba(27,39,56,.16);
  --d-hand: "Long Cang", "STKaiti", "KaiTi", cursive;
  --d-script: "Caveat", "Long Cang", cursive;
  --d-sans: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;
  font-family: var(--pc-font, var(--d-sans));
}
:host([theme="diary"]) .bg { background: var(--pc-backdrop, linear-gradient(170deg, var(--d-sky) 0%, var(--d-sky-photo) 55%, var(--d-lilac) 100%)); }
:host([theme="diary"]) .caller .name { font-family: var(--d-hand); font-weight: 400; font-size: 15cqw; text-shadow: 0 2px 14px rgba(27,39,56,.35); }
:host([theme="diary"]) .caller .sub {
  display: inline-block; margin-top: 3cqw; padding: .6cqw 3.8cqw; border-radius: 30px;
  background: var(--d-blossom); color: #fff; font-family: var(--d-script), var(--d-sans); font-weight: 600; font-size: 5.4cqw;
  transform: rotate(-3deg); box-shadow: var(--d-shadow); text-shadow: none; opacity: 1;
}
:host([theme="diary"]) .slide .hint { font-family: var(--d-hand); font-size: 6.6cqw; letter-spacing: .06em; }
:host([theme="diary"]) .slide .knob { color: var(--d-blossom); }
:host([theme="diary"]) .round.red, :host([theme="diary"]) .ctl.danger { background: var(--d-blossom); }
:host([theme="diary"]) .ab { font-family: var(--d-hand); font-size: 5cqw; }
:host([theme="diary"]) .ctl { background: rgba(27,39,56,.6); }
:host([theme="diary"]) .ctl.on { background: rgba(255,255,255,.92); color: var(--d-ink); }
:host([theme="diary"]) .info .iname { font-family: var(--d-hand); font-weight: 400; font-size: 7.6cqw; text-shadow: 0 1px 10px rgba(27,39,56,.6); }
:host([theme="diary"]) .info .timer {
  display: inline-block; margin-top: 1cqw; padding: 0 3cqw; border-radius: 30px; opacity: 1;
  background: rgba(255,255,255,.92); color: var(--d-blossom); font-family: var(--d-script); font-weight: 600; font-size: 5.6cqw;
  transform: rotate(2deg); box-shadow: var(--d-shadow); text-shadow: none;
}
:host([theme="diary"]) .line {
  position: relative; background: var(--d-paper); color: var(--d-ink); border-radius: 6px;
  -webkit-backdrop-filter: none; backdrop-filter: none; box-shadow: var(--d-shadow);
  font-weight: 500; font-size: 4.2cqw; transform: rotate(-1.2deg);
}
:host([theme="diary"]) .line:nth-child(even) { transform: rotate(1.4deg); }
:host([theme="diary"]) .line.me { background: var(--d-note); color: var(--d-blossom-deep); }
:host([theme="diary"]) .line.them::before,
:host([theme="diary"]) .line.me::before {
  content: ""; position: absolute; top: -1.4cqw; width: 11cqw; height: 3cqw;
  background: rgba(184,58,115,.38); transform: rotate(-5deg);
}
:host([theme="diary"]) .line.them::before { left: 5cqw; }
:host([theme="diary"]) .line.me::before { right: 5cqw; background: rgba(47,111,181,.38); transform: rotate(4deg); }
:host([theme="diary"]) .line.system { background: transparent; box-shadow: none; transform: none; color: #fff; font-family: var(--d-hand); font-weight: 400; font-size: 5cqw; }
:host([theme="diary"]) .line.old { opacity: .7; }
:host([theme="diary"]) .compose input { background: rgba(255,255,255,.94); color: var(--d-ink); -webkit-backdrop-filter: none; backdrop-filter: none; box-shadow: var(--d-shadow); }
:host([theme="diary"]) .compose input::placeholder { color: var(--d-ink-muted); }
:host([theme="diary"]) .compose .send { background: var(--d-blossom); }
:host([theme="diary"]) .ended { background: rgba(230,239,248,.72); color: var(--d-ink); }
:host([theme="diary"]) .ended .t1 { font-family: var(--d-hand); font-weight: 400; font-size: 10cqw; }
:host([theme="diary"]) .ended .t2 { font-family: var(--d-script); font-weight: 600; font-size: 8cqw; color: var(--d-blossom); opacity: 1; }

/* ---------- active call ---------- */
.controls { position: absolute; z-index: 5; top: 24.6cqw; left: 0; right: 0; display: flex; justify-content: space-between; padding: 0 5cqw; }
.ctl { width: 15.4cqw; height: 15.4cqw; border-radius: 50%; display: grid; place-items: center; color: #fff; background: rgba(36,36,38,.72); -webkit-backdrop-filter: blur(16px) saturate(1.3); backdrop-filter: blur(16px) saturate(1.3); transition: background .18s, color .18s, transform .12s; }
.ctl svg { width: 7cqw; height: 7cqw; }
.ctl:active { transform: scale(.93); }
.ctl.on { background: rgba(242,242,247,.86); color: #1c1c1e; }
.ctl.danger { background: #e5534b; color: #fff; }
.ctl.danger svg { width: 6.4cqw; height: 6.4cqw; }

.info { position: absolute; z-index: 4; top: 44cqw; left: 0; right: 0; text-align: center; text-shadow: 0 1px 10px rgba(0,0,0,.35); pointer-events: none; }
.info .iname { font-size: 5.4cqw; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 8cqw; }
.info .timer { margin-top: .6cqw; font-size: 4.2cqw; opacity: .85; font-variant-numeric: tabular-nums; }
:host([no-info]) .info { display: none; }

.captions { position: absolute; z-index: 4; left: 4.5cqw; right: 4.5cqw; bottom: 7cqw; display: flex; flex-direction: column; gap: 1.8cqw; pointer-events: none; transition: bottom .25s ease; }
:host([no-captions]) .captions { display: none; }
.line { align-self: flex-start; max-width: 86%; padding: 2.2cqw 3.6cqw; border-radius: 4.4cqw; font-size: 4.4cqw; line-height: 1.45; background: rgba(0,0,0,.42); -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); word-break: break-word; animation: rise .25s ease; transition: opacity .3s; }
.line.me { align-self: flex-end; background: rgba(255,255,255,.24); }
.line.system { align-self: center; background: transparent; -webkit-backdrop-filter: none; backdrop-filter: none; font-size: 3.6cqw; opacity: .8; text-shadow: 0 1px 8px rgba(0,0,0,.5); }
.line.partial { opacity: .65; }
.line.old { opacity: .55; }
@keyframes rise { from { opacity: 0; transform: translateY(2cqw); } }

.compose { position: absolute; z-index: 6; left: 4cqw; right: 4cqw; bottom: 5cqw; display: flex; gap: 2.4cqw; align-items: center; opacity: 0; transform: translateY(4cqw); pointer-events: none; transition: opacity .2s, transform .2s; }
:host([composing]) .compose { opacity: 1; transform: none; pointer-events: auto; }
:host([composing]) .captions { bottom: 22cqw; }
.compose input { flex: 1; min-width: 0; height: 12cqw; padding: 0 4.5cqw; border: 0; border-radius: 999px; font: inherit; font-size: 4.3cqw; color: #fff; background: rgba(255,255,255,.22); -webkit-backdrop-filter: blur(16px); backdrop-filter: blur(16px); user-select: text; -webkit-user-select: text; }
.compose input::placeholder { color: rgba(255,255,255,.65); }
.compose .send { width: 12cqw; height: 12cqw; flex: none; border-radius: 50%; background: #34c759; display: grid; place-items: center; }
.compose .send svg { width: 6cqw; height: 6cqw; }

/* ---------- ended ---------- */
.ended { position: absolute; inset: 0; z-index: 30; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.6cqw; background: rgba(10,10,12,.55); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); opacity: 0; visibility: hidden; transition: opacity .3s, visibility 0s linear .3s; }
:host([state="ended"]) .ended { opacity: 1; visibility: visible; transition: opacity .3s; }
.ended .t1 { font-size: 6cqw; font-weight: 500; }
.ended .t2 { font-size: 4.4cqw; opacity: .75; font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  .slide .hint { animation: none; color: #fff; }
  .ring { transition: none; }
}
`;

const HTML = /* html */ `
<div class="phone" part="phone">
  <div class="bg" part="backdrop"><img class="bg-img" alt="" draggable="false"></div>
  <div class="media"><slot name="media"></slot></div>
  <div class="shade"></div>

  <div class="status" part="status-bar">
    <span class="clock"></span>
    <span class="icons"><span class="i-signal">${ICONS.signal}</span><span class="i-wifi">${ICONS.wifi}</span><span class="i-battery">${ICONS.battery}</span></span>
  </div>

  <section class="screen s-incoming" part="incoming">
    <div class="caller"><div class="name"></div><div class="sub"></div></div>
    <div class="slide">
      <span class="hint"></span>
      <button class="knob" type="button">${ICONS.phone}</button>
    </div>
    <div class="answer-buttons">
      <div class="ab"><button class="round red decline" type="button"><span class="rot" style="width:9cqw;height:9cqw;display:block">${ICONS.phone}</span></button><span class="l-decline"></span></div>
      <div class="ab"><button class="round green accept" type="button">${ICONS.phone}</button><span class="l-accept"></span></div>
    </div>
  </section>

  <section class="screen s-outgoing" part="outgoing">
    <div class="caller"><div class="name"></div><div class="sub sub-out"></div></div>
    <div class="avatar-wrap"><div class="ring r2"></div><div class="ring"></div><div class="avatar"><span class="initial"></span><img alt="" draggable="false"></div></div>
    <div class="end-wrap"><div class="ab"><button class="round red cancel" type="button"><span class="rot" style="width:9cqw;height:9cqw;display:block">${ICONS.phone}</span></button><span class="l-cancel"></span></div></div>
  </section>

  <section class="screen s-active" part="active">
    <div class="avatar-wrap"><div class="ring r2"></div><div class="ring"></div><div class="avatar"><span class="initial"></span><img alt="" draggable="false"></div></div>
    <div class="controls" role="toolbar"></div>
    <div class="info"><div class="iname"></div><div class="timer">00:00</div></div>
    <div class="captions" aria-live="polite"></div>
    <form class="compose" autocomplete="off">
      <input type="text" enterkeyhint="send">
      <button class="send" type="submit">${ICONS.send}</button>
    </form>
  </section>

  <div class="ended" part="ended"><div class="t1"></div><div class="t2"></div></div>
</div>
`;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmt = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

// SSR-safe: importing this file on the server (Next.js, Nuxt, SvelteKit…) must not throw.
const Base = typeof HTMLElement === 'undefined' ? class {} : HTMLElement;

export class PhoneCall extends Base {
  static get observedAttributes() {
    return ['name', 'subtitle', 'avatar', 'background', 'controls', 'status-time', 'max-captions', 'theme'];
  }

  constructor() {
    super();
    this._labels = { ...DEFAULT_LABELS };
    this._controls = {};
    this._controlsKey = '';
    this._capMap = new Map();
    this._startedAt = 0;
    this._endedAt = 0;
    this._tick = null;
    this._clockTimer = null;
    this._endTimer = null;
    this._ring = null;
    this._pulseRaf = 0;
    this._meter = null;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CSS}</style>${HTML}`;
    this._q = (s) => root.querySelector(s);
    this._qa = (s) => root.querySelectorAll(s);
    this._phone = this._q('.phone');
    this._bindEvents();
  }

  connectedCallback() {
    if (!this.hasAttribute('state')) this.setAttribute('state', 'idle');
    this._render();
    this._updateClock();
    this._clockTimer = setInterval(() => this._updateClock(), 10000);
  }

  disconnectedCallback() {
    clearInterval(this._clockTimer);
    clearInterval(this._tick);
    clearTimeout(this._endTimer);
    this._stopRing();
    this.pulse(false);
    this.detachAudio();
  }

  attributeChangedCallback() {
    if (this.isConnected) this._render();
  }

  /* ================= public API ================= */

  /** idle | incoming | outgoing | active | ended */
  get state() { return this.getAttribute('state') || 'idle'; }

  /** Call duration in ms (0 before the call is connected). */
  get duration() {
    if (!this._startedAt) return 0;
    return (this._endedAt || Date.now()) - this._startedAt;
  }

  get labels() { return { ...this._labels }; }
  set labels(obj) { Object.assign(this._labels, obj || {}); this._render(); }

  /** Show the incoming-call screen. opts: { name, subtitle, avatar, background } */
  incoming(opts = {}) {
    this._prepare(opts);
    this._resetSlide();
    this._setState('incoming');
    this._startRing('incoming');
    return this;
  }

  /** Show the "calling…" screen (you are calling them). Call connect() when they pick up. */
  outgoing(opts = {}) {
    this._prepare(opts);
    this._setState('outgoing');
    this._startRing('outgoing');
    return this;
  }

  /** Answer an incoming call (same as sliding / tapping accept). */
  answer() {
    if (this.state !== 'incoming') return;
    this._stopRing();
    this._beginActive();
    this._emit('answer');
  }

  /** The other side picked up an outgoing call. */
  connect() {
    if (this.state !== 'outgoing') return;
    this._stopRing();
    this._beginActive();
    this._emit('connect');
  }

  /** Decline an incoming call. */
  decline() {
    if (this.state !== 'incoming') return;
    this._end('declined');
  }

  /**
   * End the call from any live state.
   * reason: 'local' (you hung up), 'remote' (they hung up), 'missed', 'declined', 'cancel', or your own string.
   */
  hangup(reason = 'local') {
    const s = this.state;
    if (s === 'incoming' && reason === 'local') reason = 'declined';
    if (s === 'outgoing' && reason === 'local') reason = 'cancel';
    if (s === 'incoming' || s === 'outgoing' || s === 'active') this._end(reason);
  }

  /** Hide immediately, skipping the "call ended" overlay. */
  reset() {
    this._stopRing();
    clearInterval(this._tick);
    clearTimeout(this._endTimer);
    this.pulse(false);
    this.setLevel(0);
    this._setState('idle');
  }

  /**
   * Show a caption line. who: 'them' | 'me' | 'system'.
   * Pass the same id again to update a line in place (e.g. streaming or interim speech).
   * Returns the line id.
   */
  caption(text, { who = 'them', id, partial = false } = {}) {
    const box = this._q('.captions');
    let el = id != null ? this._capMap.get(id) : null;
    if (!el || !el.isConnected) {
      el = document.createElement('div');
      box.append(el);
      if (id == null) id = `c${Math.random().toString(36).slice(2, 9)}`;
      this._capMap.set(id, el);
    }
    el.className = `line ${who}${partial ? ' partial' : ''}`;
    el.textContent = text;
    const max = Number(this.getAttribute('max-captions')) || 3;
    const lines = [...box.children];
    lines.forEach((l, i) => l.classList.toggle('old', i < lines.length - 1));
    while (box.children.length > max) {
      const first = box.firstElementChild;
      for (const [k, v] of this._capMap) if (v === first) this._capMap.delete(k);
      first.remove();
    }
    return id;
  }

  /** Forget a caption id so the next caption() with that id starts a new line. */
  releaseCaption(id) { this._capMap.delete(id); }

  removeCaption(id) {
    const el = this._capMap.get(id);
    if (el) el.remove();
    this._capMap.delete(id);
  }

  clearCaptions() {
    this._q('.captions').textContent = '';
    this._capMap.clear();
  }

  /** Read a control's on/off state. */
  getControl(name) {
    const def = CONTROL_DEFS[name];
    if (!def) return undefined;
    return name in this._controls ? this._controls[name] : !!def.on;
  }

  /** Set a toggle control (speaker / camera / mute / keypad) without emitting an event. */
  setControl(name, on) {
    if (!CONTROL_DEFS[name] || !CONTROL_DEFS[name].toggle) return;
    this._controls[name] = !!on;
    const btn = this._q(`.ctl[data-k="${name}"]`);
    if (btn) {
      btn.classList.toggle('on', !!on);
      btn.setAttribute('aria-pressed', String(!!on));
    }
    if (name === 'keypad') {
      this.toggleAttribute('composing', !!on);
      if (on) setTimeout(() => this._q('.compose input').focus(), 60);
    }
  }

  /** Voice level of the other side, 0..1 — drives the rings around the avatar. */
  setLevel(v) {
    this._phone.style.setProperty('--lvl', clamp(Number(v) || 0, 0, 1).toFixed(3));
  }

  /** Fake a talking level (for TTS engines that don't expose audio, e.g. speechSynthesis). */
  pulse(on) {
    cancelAnimationFrame(this._pulseRaf);
    this._pulseRaf = 0;
    if (!on) { this.setLevel(0); return; }
    const t0 = performance.now();
    const step = (t) => {
      const x = (t - t0) / 1000;
      const v = 0.35 + 0.25 * Math.sin(x * 9.1) * Math.sin(x * 3.7) + 0.2 * Math.abs(Math.sin(x * 13.3));
      this.setLevel(v);
      this._pulseRaf = requestAnimationFrame(step);
    };
    this._pulseRaf = requestAnimationFrame(step);
  }

  /**
   * Drive the avatar rings from real audio. src: HTMLMediaElement or MediaStream.
   * Note: cross-origin media must be served with CORS (and the element needs crossOrigin set),
   * otherwise the browser mutes it once it is routed through Web Audio.
   */
  attachAudio(src) {
    this.detachAudio();
    const ctx = this._audioCtx();
    if (!ctx) return;
    let node;
    if (typeof MediaStream !== 'undefined' && src instanceof MediaStream) {
      node = ctx.createMediaStreamSource(src);
    } else {
      node = src.__pcSource || (src.__pcSource = ctx.createMediaElementSource(src));
      try { node.connect(ctx.destination); } catch { /* already connected */ }
    }
    const an = ctx.createAnalyser();
    an.fftSize = 512;
    node.connect(an);
    const buf = new Uint8Array(an.fftSize);
    let smooth = 0;
    const loop = () => {
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) { const d = (buf[i] - 128) / 128; sum += d * d; }
      const rms = Math.sqrt(sum / buf.length);
      smooth = smooth * 0.6 + Math.min(1, rms * 4) * 0.4;
      this.setLevel(smooth);
      this._meter.raf = requestAnimationFrame(loop);
    };
    this._meter = { node, an, raf: requestAnimationFrame(loop), isStream: !(node.mediaElement) };
    ctx.resume?.();
  }

  detachAudio() {
    if (!this._meter) return;
    cancelAnimationFrame(this._meter.raf);
    try { this._meter.node.disconnect(this._meter.an); } catch { /* ignore */ }
    this._meter = null;
    this.setLevel(0);
  }

  /** Shared AudioContext (created lazily). */
  get audioContext() { return this._audioCtx(); }

  /* ================= internals ================= */

  _emit(name, detail = {}) {
    this.dispatchEvent(new CustomEvent(`pc-${name}`, { detail, bubbles: true, composed: true }));
  }

  _setState(s) {
    const prev = this.state;
    if (prev === s) return;
    this.setAttribute('state', s);
    this._emit('statechange', { state: s, prev });
  }

  _prepare(opts) {
    clearTimeout(this._endTimer);
    clearInterval(this._tick);
    for (const k of ['name', 'subtitle', 'avatar', 'background']) {
      if (opts[k] != null) this.setAttribute(k, opts[k]);
    }
    this._startedAt = 0;
    this._endedAt = 0;
    this.clearCaptions();
    this.toggleAttribute('composing', false);
    this._controls = {};
    this._controlsKey = '';
    this._render();
  }

  _beginActive() {
    this._startedAt = Date.now();
    this._endedAt = 0;
    this._q('.timer').textContent = '00:00';
    clearInterval(this._tick);
    this._tick = setInterval(() => { this._q('.timer').textContent = fmt(this.duration); }, 500);
    this._setState('active');
  }

  _end(reason) {
    this._stopRing();
    clearInterval(this._tick);
    this.pulse(false);
    this.detachAudio();
    if (this._startedAt) this._endedAt = Date.now();
    const duration = this.duration;
    const L = this._labels;
    const title = { declined: L.declined, missed: L.missed }[reason] || L.ended;
    this._q('.ended .t1').textContent = title;
    this._q('.ended .t2').textContent = this._startedAt ? fmt(duration) : '';
    this.toggleAttribute('composing', false);
    this._setState('ended');
    this._emit('hangup', { reason, duration });
    clearTimeout(this._endTimer);
    this._endTimer = setTimeout(() => {
      if (this.state !== 'ended') return;
      this._setState('idle');
      this._emit('ended', { reason, duration });
    }, Number(this.getAttribute('ended-delay')) || 1600);
  }

  _render() {
    const L = this._labels;
    const name = this.getAttribute('name') || '';
    const subtitle = this.getAttribute('subtitle') ?? L.voiceCall;
    this._qa('.caller .name').forEach((e) => { e.textContent = name; });
    this._q('.s-incoming .sub').textContent = subtitle;
    this._q('.s-outgoing .sub').textContent = L.calling;
    this._q('.iname').textContent = name;
    this._qa('.initial').forEach((e) => { e.textContent = [...name.trim()][0] || ''; });

    const avatar = this.getAttribute('avatar') || '';
    const background = this.getAttribute('background') || avatar;
    this._setImg(this._q('.bg-img'), background);
    this._qa('.avatar img').forEach((img) => this._setImg(img, avatar));

    this._q('.slide .hint').textContent = L.slideToAnswer;
    this._q('.slide .knob').setAttribute('aria-label', L.slideToAnswer);
    this._q('.l-accept').textContent = L.accept;
    this._q('.l-decline').textContent = L.decline;
    this._q('.accept').setAttribute('aria-label', L.accept);
    this._q('.decline').setAttribute('aria-label', L.decline);
    this._q('.l-cancel').textContent = L.cancel;
    this._q('.cancel').setAttribute('aria-label', L.cancel);
    this._q('.compose input').placeholder = L.inputPlaceholder;
    this._q('.compose .send').setAttribute('aria-label', L.send);

    const key = `${this.getAttribute('controls') || DEFAULT_CONTROLS}|${Object.values(L).join()}`;
    if (key !== this._controlsKey) { this._controlsKey = key; this._renderControls(); }
    this._updateClock();
    this._loadThemeFonts();
  }

  /** The diary theme uses three Google-hosted faces; add `no-webfonts` to skip loading them. */
  _loadThemeFonts() {
    if (this.getAttribute('theme') !== 'diary' || this.hasAttribute('no-webfonts')) return;
    if (document.querySelector('link[data-phone-call-fonts]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Long+Cang&family=Noto+Sans+SC:wght@400;500&display=swap';
    link.dataset.phoneCallFonts = '';
    document.head.append(link);
  }

  _setImg(img, src) {
    if ((img.getAttribute('src') || '') === src) return;
    img.classList.remove('ok');
    if (!src) { img.removeAttribute('src'); return; }
    img.onload = () => img.classList.add('ok');
    img.onerror = () => img.classList.remove('ok');
    img.src = src;
  }

  _renderControls() {
    const bar = this._q('.controls');
    bar.textContent = '';
    const list = (this.getAttribute('controls') || DEFAULT_CONTROLS)
      .split(',').map((s) => s.trim()).filter((k) => CONTROL_DEFS[k]);
    for (const k of list) {
      const def = CONTROL_DEFS[k];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'ctl';
      b.dataset.k = k;
      b.setAttribute('aria-label', this._labels[k] || k);
      b.title = this._labels[k] || k;
      b.innerHTML = ICONS[def.icon];
      if (def.danger) b.classList.add('danger');
      if (def.toggle) {
        const on = this.getControl(k);
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
      }
      bar.append(b);
    }
    this.toggleAttribute('composing', list.includes('keypad') && this.getControl('keypad'));
  }

  _updateClock() {
    const fixed = this.getAttribute('status-time');
    const d = new Date();
    this._q('.clock').textContent = fixed || `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  _bindEvents() {
    // media slot -> hide avatar when the host provides a video/canvas/Live2D/etc.
    const slot = this._q('slot[name="media"]');
    slot.addEventListener('slotchange', () => {
      this._phone.classList.toggle('has-media', slot.assignedElements().length > 0);
    });

    // control bar
    this._q('.controls').addEventListener('click', (e) => {
      const b = e.target.closest('.ctl');
      if (!b) return;
      const k = b.dataset.k;
      const def = CONTROL_DEFS[k];
      if (k === 'end') { this.hangup('local'); return; }
      if (def.toggle) {
        const on = !this.getControl(k);
        this.setControl(k, on);
        this._emit('toggle', { control: k, on });
      } else {
        this._emit('action', { control: k });
      }
    });

    // buttons
    this._q('.accept').addEventListener('click', () => this.answer());
    this._q('.decline').addEventListener('click', () => this.decline());
    this._q('.cancel').addEventListener('click', () => this.hangup('cancel'));

    // compose
    const form = this._q('.compose');
    const input = this._q('.compose input');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      this._emit('text', { text });
    });
    // keep host page hotkeys (e.g. SillyTavern's) from eating keystrokes
    input.addEventListener('keydown', (e) => e.stopPropagation());

    // slide to answer
    const knob = this._q('.slide .knob');
    const track = this._q('.slide');
    const hint = this._q('.slide .hint');
    let drag = null;
    const maxX = () => track.clientWidth - knob.offsetWidth - knob.offsetLeft * 2;
    knob.addEventListener('pointerdown', (e) => {
      if (this.state !== 'incoming') return;
      drag = { x0: e.clientX, dx: 0, max: maxX(), moved: false };
      knob.setPointerCapture(e.pointerId);
      knob.style.transition = 'none';
      knob.classList.remove('nudge');
    });
    knob.addEventListener('pointermove', (e) => {
      if (!drag) return;
      drag.dx = clamp(e.clientX - drag.x0, 0, drag.max);
      if (drag.dx > 3) drag.moved = true;
      knob.style.transform = `translateX(${drag.dx}px)`;
      hint.style.opacity = String(clamp(1 - (drag.dx / drag.max) * 1.8, 0, 1));
    });
    const release = () => {
      if (!drag) return;
      const { dx, max, moved } = drag;
      drag = null;
      knob.style.transition = '';
      if (dx >= max * 0.8) {
        knob.style.transform = `translateX(${max}px)`;
        hint.style.opacity = '0';
        setTimeout(() => this.answer(), 140);
      } else {
        knob.style.transform = '';
        hint.style.opacity = '';
        if (!moved) { void knob.offsetWidth; knob.classList.add('nudge'); }
      }
    };
    knob.addEventListener('pointerup', release);
    knob.addEventListener('pointercancel', release);
    knob.addEventListener('animationend', () => knob.classList.remove('nudge'));
    // keyboard: Enter / Space on the knob answers
    knob.addEventListener('click', (e) => { if (e.detail === 0) this.answer(); });
  }

  _resetSlide() {
    const knob = this._q('.slide .knob');
    knob.style.transition = 'none';
    knob.style.transform = '';
    this._q('.slide .hint').style.opacity = '';
    void knob.offsetWidth;
    knob.style.transition = '';
  }

  _audioCtx() {
    if (this._actx) return this._actx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    this._actx = new AC();
    return this._actx;
  }

  _startRing(kind) {
    this._stopRing();
    if (kind === 'incoming' && !this.hasAttribute('no-vibrate') && navigator.vibrate) {
      const buzz = () => navigator.vibrate([400, 180, 400]);
      buzz();
      this._ring = { vib: setInterval(buzz, 2600) };
    }
    if (this.hasAttribute('silent')) return;
    const volume = clamp(Number(this.getAttribute('ring-volume') || 0.5), 0, 1);
    // your own audio file: <phone-call ringtone="ring.mp3" ringback="tuu.mp3">
    const custom = this.getAttribute(kind === 'incoming' ? 'ringtone' : 'ringback');
    if (custom) {
      const el = new Audio(custom);
      el.loop = true;
      el.volume = volume;
      el.play().catch(() => {});
      this._ring = { ...(this._ring || {}), el };
      return;
    }
    const ctx = this._audioCtx();
    if (!ctx) return;
    ctx.resume?.().catch(() => {});
    const out = ctx.createGain();
    out.gain.value = volume;
    out.connect(ctx.destination);

    const tone = (freq, at, dur, type = 'sine', peak = 0.5) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
      o.connect(g).connect(out);
      o.start(at);
      o.stop(at + dur + 0.05);
    };

    let play;
    let every;
    if (kind === 'incoming') {
      // Pachelbel's Canon in D (public domain), synthesized as a music box — no bundled audio.
      // bass: D A Bm F#m G D G A, top line: F# E D C# B A B C#
      const hz = (m) => 440 * 2 ** ((m - 69) / 12);
      const beat = 0.5;
      const bass = [62, 57, 59, 54, 55, 50, 55, 57];
      const top = [78, 76, 74, 73, 71, 69, 71, 73];
      const chords = [[66, 69], [64, 69], [66, 71], [66, 69], [67, 71], [66, 69], [67, 71], [64, 69]];
      const box = (m, at, dur, peak) => {
        tone(hz(m), at, dur, 'sine', peak);
        tone(hz(m) * 2, at, dur * 0.45, 'sine', peak * 0.22);
        tone(hz(m) * 3, at, dur * 0.2, 'sine', peak * 0.06);
      };
      play = () => {
        const t = ctx.currentTime + 0.03;
        for (let i = 0; i < 8; i++) {
          const at = t + i * beat;
          box(top[i], at, 1.3, 0.34);
          tone(hz(bass[i]), at, 0.9, 'sine', 0.2);
          chords[i].forEach((m, j) => box(m, at + beat * (0.5 + j * 0.12), 0.6, 0.07));
        }
      };
      every = 8 * beat * 1000 + 500;
    } else {
      // ringback: 450 Hz, 1s on / 4s off
      play = () => {
        const t = ctx.currentTime + 0.03;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 450;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.03);
        g.gain.setValueAtTime(0.18, t + 0.97);
        g.gain.linearRampToValueAtTime(0.0001, t + 1);
        o.connect(g).connect(out);
        o.start(t);
        o.stop(t + 1.05);
      };
      every = 5000;
    }
    play();
    this._ring = { ...(this._ring || {}), out, timer: setInterval(play, every) };
  }

  _stopRing() {
    if (!this._ring) return;
    clearInterval(this._ring.timer);
    clearInterval(this._ring.vib);
    if (this._ring.vib && navigator.vibrate) navigator.vibrate(0);
    if (this._ring.el) { this._ring.el.pause(); this._ring.el.removeAttribute('src'); }
    if (this._ring.out) {
      const ctx = this._actx;
      try {
        this._ring.out.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
        const out = this._ring.out;
        setTimeout(() => out.disconnect(), 200);
      } catch { /* ignore */ }
    }
    this._ring = null;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('phone-call')) {
  customElements.define('phone-call', PhoneCall);
}

export default PhoneCall;
