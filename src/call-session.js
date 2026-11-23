/*!
 * call-session — wires a <phone-call> element to speech-in, a reply generator and speech-out.
 * Copyright (c) 2026 phonecall-mint contributors
 * SPDX-License-Identifier: MIT
 *
 * Everything is pluggable:
 *   reply(text, ctx)  -> string | Promise<string> | AsyncIterable<string>   (required; your LLM)
 *   speak(text, ctx)  -> Blob | URL string | HTMLAudioElement | Promise<void>  (optional; default: browser speechSynthesis)
 *   listen            -> true (browser SpeechRecognition) | false (typing only) | custom { start, stop } adapter
 */

const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

/** Strip roleplay markup that should not be read aloud. */
export function sanitizeForSpeech(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\*[^*\n]*\*/g, ' ')            // *actions*
    .replace(/（[^）]*）|\([^)\n]*\)/g, ' ') // (stage directions)
    .replace(/\[[^\]\n]*\]/g, ' ')
    .replace(/[_~`#>|]/g, '')
    .replace(/\p{Extended_Pictographic}️?/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Turn a stream of text chunks into sentence-sized pieces for TTS. */
export async function* sentences(source) {
  let buf = '';
  const cut = () => {
    // sentence enders, optionally followed by closing quotes/brackets
    const re = /[。！？!?…~～\n]+["”’』」）)]*|\.(?=\s|$)["”’)]*/g;
    let last = -1;
    let m;
    while ((m = re.exec(buf))) last = m.index + m[0].length;
    if (last === -1 && buf.length > 80) {
      const c = Math.max(buf.lastIndexOf('，'), buf.lastIndexOf(','), buf.lastIndexOf('、'));
      if (c > 20) last = c + 1;
    }
    if (last === -1) return null;
    const out = buf.slice(0, last);
    buf = buf.slice(last);
    return out;
  };
  for await (const chunk of toIterable(source)) {
    buf += chunk;
    let s;
    while ((s = cut())) if (s.trim()) yield s.trim();
  }
  if (buf.trim()) yield buf.trim();
}

async function* toIterable(x) {
  x = await x;
  if (x == null) return;
  if (typeof x === 'string') { yield x; return; }
  if (x[Symbol.asyncIterator] || x[Symbol.iterator]) { for await (const c of x) yield String(c ?? ''); return; }
  yield String(x);
}

const sleep = (ms, signal) => new Promise((res) => {
  const t = setTimeout(res, ms);
  signal?.addEventListener('abort', () => { clearTimeout(t); res(); }, { once: true });
});

/**
 * @param {HTMLElement} ui  a <phone-call> element
 * @param {object} options
 */
export function createCallSession(ui, options = {}) {
  const o = {
    lang: 'zh-CN',
    reply: null,
    speak: null,
    listen: true,
    bargeIn: true,          // user speech interrupts the character
    voice: null,            // speechSynthesis voice name (or a SpeechSynthesisVoice)
    rate: 1,
    pitch: 1,
    sanitize: sanitizeForSpeech,
    minRingMs: 2200,        // how long "calling…" rings before they pick up
    noReplyText: '对方没有回应',
    onTurn: null,           // (turn: {role:'user'|'assistant', text}) => void
    onEnd: null,            // ({ reason, duration, history }) => void
    onError: (e) => console.warn('[phone-call]', e),
    ...options,
  };
  if (typeof o.reply !== 'function') throw new Error('createCallSession: options.reply(text, ctx) is required');

  const history = [];
  let direction = 'incoming';
  let turnAbort = null;      // AbortController for the current character turn
  let rec = null;
  let recWanted = false;
  let audio = null;
  let destroyed = false;
  const offs = [];

  const live = () => ui.state === 'active';
  const volume = () => (ui.getControl('speaker') === false ? 0.45 : 1);

  /* ---------- speech out ---------- */

  function stopSpeech() {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    ui.pulse(false);
  }

  function pickVoice() {
    if (typeof speechSynthesis === 'undefined') return null;
    if (o.voice && typeof o.voice === 'object') return o.voice;
    const voices = speechSynthesis.getVoices();
    if (o.voice) { const v = voices.find((x) => x.name === o.voice); if (v) return v; }
    const lang = o.lang.toLowerCase();
    return voices.find((v) => v.lang.toLowerCase() === lang)
      || voices.find((v) => v.lang.toLowerCase().startsWith(lang.split('-')[0])) || null;
  }

  function browserSpeak(text, signal) {
    return new Promise((resolve) => {
      if (typeof speechSynthesis === 'undefined') { resolve(); return; }
      const u = new SpeechSynthesisUtterance(text);
      u.lang = o.lang;
      const v = pickVoice();
      if (v) u.voice = v;
      u.rate = o.rate;
      u.pitch = o.pitch;
      u.volume = volume();
      const done = () => { ui.pulse(false); resolve(); };
      u.onend = done;
      u.onerror = done;
      signal.addEventListener('abort', () => { speechSynthesis.cancel(); done(); }, { once: true });
      ui.pulse(true);
      speechSynthesis.speak(u);
    });
  }

  function playAudio(src, signal) {
    return new Promise((resolve) => {
      if (!audio) {
        audio = new Audio();
        audio.crossOrigin = 'anonymous';
        try { ui.attachAudio(audio); } catch { /* metering is optional */ }
      }
      let url = null;
      if (src instanceof Blob) url = src = URL.createObjectURL(src);
      const done = () => { audio.onended = audio.onerror = null; if (url) URL.revokeObjectURL(url); resolve(); };
      audio.onended = done;
      audio.onerror = done;
      signal.addEventListener('abort', () => { audio.pause(); done(); }, { once: true });
      audio.volume = volume();
      audio.src = src;
      ui.audioContext?.resume?.();
      audio.play().catch((e) => { o.onError(e); done(); });
    });
  }

  async function say(text, signal) {
    const clean = o.sanitize(text);
    if (!clean || signal.aborted) return;
    if (!o.speak) return browserSpeak(clean, signal);
    const res = await o.speak(clean, { signal, lang: o.lang, ui });
    if (signal.aborted || res == null) return;
    if (res instanceof HTMLMediaElement) {
      if (!res.paused && !res.ended) {
        await new Promise((r) => { res.addEventListener('ended', r, { once: true }); signal.addEventListener('abort', () => { res.pause(); r(); }, { once: true }); });
      } else {
        await playAudio(res.currentSrc || res.src, signal);
      }
      return;
    }
    if (res instanceof Blob || typeof res === 'string') await playAudio(res, signal);
  }

  /* ---------- turns ---------- */

  function interrupt() {
    if (turnAbort) { turnAbort.abort(); turnAbort = null; }
    stopSpeech();
  }

  async function characterTurn(userText, { prefetched } = {}) {
    interrupt();
    const ac = new AbortController();
    turnAbort = ac;
    const { signal } = ac;
    const capId = `turn-${Date.now()}`;
    let spoken = '';
    try {
      const source = prefetched ?? o.reply(userText, { history: history.slice(), direction, signal, ui });
      for await (const s of sentences(source)) {
        if (signal.aborted || !live()) break;
        const shown = o.sanitize(s) || s;
        spoken += (spoken ? ' ' : '') + shown;
        ui.caption(spoken, { who: 'them', id: capId });
        await say(s, signal);
      }
    } catch (e) {
      if (!signal.aborted) o.onError(e);
    } finally {
      ui.releaseCaption(capId);
      if (turnAbort === ac) turnAbort = null;
      if (!spoken && !signal.aborted && live()) ui.caption(o.noReplyText, { who: 'system' });
      if (spoken) {
        const turn = { role: 'assistant', text: spoken, interrupted: signal.aborted };
        history.push(turn);
        try { o.onTurn?.(turn); } catch (e) { o.onError(e); }
      }
    }
  }

  /** Feed one user utterance (from speech or typing). */
  function userSays(text, { showCaption = true } = {}) {
    text = String(text || '').trim();
    if (!text || !live()) return;
    interrupt();
    if (showCaption) ui.caption(text, { who: 'me' });
    const turn = { role: 'user', text };
    history.push(turn);
    try { o.onTurn?.(turn); } catch (e) { o.onError(e); }
    characterTurn(text);
  }

  /* ---------- speech in ---------- */

  function startListening() {
    if (!o.listen || destroyed) return;
    if (ui.getControl('mute')) return;
    recWanted = true;
    if (typeof o.listen === 'object') { o.listen.start?.({ onResult, onInterim, lang: o.lang }); return; }
    if (!SR) {
      ui.caption('这个浏览器不支持语音识别，请打字', { who: 'system' });
      ui.setControl('keypad', true);
      return;
    }
    if (rec) return;
    rec = new SR();
    rec.lang = o.lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0].transcript.trim();
        if (r.isFinal) onResult(t); else onInterim(t);
      }
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        recWanted = false;
        ui.caption('没有麦克风权限，已切换到打字', { who: 'system' });
        ui.setControl('keypad', true);
      }
    };
    rec.onend = () => {
      rec = null;
      // Chrome stops after silence; keep listening while the call is live
      if (recWanted && live() && !destroyed) setTimeout(startListening, 250);
    };
    try { rec.start(); } catch (e) { rec = null; o.onError(e); }
  }

  function stopListening() {
    recWanted = false;
    if (typeof o.listen === 'object') { o.listen.stop?.(); return; }
    if (rec) { try { rec.abort(); } catch { /* ignore */ } rec = null; }
    ui.removeCaption('interim');
  }

  function onInterim(t) {
    if (!t || !live()) return;
    if (o.bargeIn && turnAbort && t.length >= 2) interrupt();
    ui.caption(t, { who: 'me', id: 'interim', partial: true });
  }

  function onResult(t) {
    if (!live()) return;
    if (!t) { ui.removeCaption('interim'); return; }
    ui.caption(t, { who: 'me', id: 'interim' });
    ui.releaseCaption('interim');
    userSays(t, { showCaption: false });
  }

  /* ---------- wiring ---------- */

  const on = (ev, fn) => { ui.addEventListener(ev, fn); offs.push(() => ui.removeEventListener(ev, fn)); };

  on('pc-answer', () => {
    startListening();
    characterTurn(null);
  });
  on('pc-connect', () => startListening());
  on('pc-text', (e) => userSays(e.detail.text));
  on('pc-toggle', (e) => {
    const { control, on: isOn } = e.detail;
    if (control === 'mute') { if (isOn) stopListening(); else startListening(); }
    if (control === 'speaker') {
      if (audio) audio.volume = volume();
    }
  });
  on('pc-hangup', (e) => {
    interrupt();
    stopListening();
    try { o.onEnd?.({ ...e.detail, history: history.slice() }); } catch (err) { o.onError(err); }
  });

  /* ---------- public ---------- */

  return {
    history,

    /** The character calls you. meta: { name, avatar, subtitle, background } */
    ring(meta = {}) {
      direction = 'incoming';
      history.length = 0;
      ui.incoming(meta);
    },

    /** You call the character: rings while the first line is generated, then they pick up. */
    async dial(meta = {}) {
      direction = 'outgoing';
      history.length = 0;
      ui.outgoing(meta);
      const ac = new AbortController();
      const stop = () => ac.abort();
      ui.addEventListener('pc-hangup', stop, { once: true });
      try {
        const [first] = await Promise.all([
          (async () => {
            let text = '';
            for await (const c of toIterable(o.reply(null, { history: [], direction, signal: ac.signal, ui }))) text += c;
            return text;
          })(),
          sleep(o.minRingMs, ac.signal),
        ]);
        if (ac.signal.aborted || ui.state !== 'outgoing') return;
        ui.connect();
        characterTurn(null, { prefetched: first });
      } catch (e) {
        if (!ac.signal.aborted) { o.onError(e); ui.hangup('remote'); }
      } finally {
        ui.removeEventListener('pc-hangup', stop);
      }
    },

    /** Make the character say something right now (e.g. from your own script). */
    say: (text) => characterTurn(null, { prefetched: text }),
    userSays,
    interrupt,
    hangup: (reason = 'local') => ui.hangup(reason),
    set(opts) { Object.assign(o, opts); if (rec && opts.lang) rec.lang = opts.lang; },
    destroy() {
      destroyed = true;
      interrupt();
      stopListening();
      offs.forEach((f) => f());
      if (audio) { audio.pause(); audio = null; }
    },
  };
}

export default createCallSession;
