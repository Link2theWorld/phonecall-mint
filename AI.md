# phone-call-ui — integration guide for AI coding agents

You are integrating **phone-call-ui** into this project. It is a dependency-free Web Component
(`<phone-call>`) that renders a phone / FaceTime-style call screen (incoming call with slide-to-answer,
outgoing "calling…", in-call control bar, captions, typing, call-ended), plus an optional
`createCallSession()` helper that wires it to speech recognition, an LLM reply function and TTS.

License: MIT — free to use in open-source and commercial projects; keep the copyright notice.

Read this whole file before editing. Then follow the steps in order and finish with the checklist.

---

## 0. What to build (ask only if unclear)

Default goal unless the user says otherwise:
1. A button somewhere sensible (chat header, character page, or a floating button) that **calls the current
   character / assistant**, and optionally a way for the character to **ring the user**.
2. Replies come from the project's **existing** LLM / chat backend, using the current conversation as context.
3. Voice: browser TTS by default; use the project's existing TTS if it has one.
4. Each call turn is appended to the project's existing chat history/store if one exists.

If the project has no LLM backend at all, build the UI-only integration (section 3) and tell the user.

## 1. Package facts

```js
import 'phone-call-ui';                                   // registers <phone-call> (side effect)
import { createCallSession } from 'phone-call-ui';        // optional conversation wiring
import 'phone-call-ui/phone-call';                        // element only
```

- ESM only, no dependencies, no CSS file to import (styles live in Shadow DOM).
- SSR-safe to import, but it only works in the browser. Create sessions / call methods only on the client.
- TypeScript types ship with the package (`PhoneCall`, `CallSessionOptions`, `HTMLElementTagNameMap['phone-call']`).

### Element API

Attributes: `name`, `subtitle` (default "语音通话"; e.g. "FaceTime"), `avatar` (image URL), `background`,
`controls` (comma list of `speaker,camera,mute,flip,keypad,end`; **use `speaker,camera,mute,keypad,end`**
so users without a mic can type), `answer-style` (`slide` | `buttons`), `floating` (fixed bottom-right phone),
`fullscreen` (cover viewport — use on mobile), `no-status-bar`, `no-info`, `no-captions`, `ringtone` / `ringback`
(audio URLs; default is a synthesized Canon in D / 450 Hz ringback), `silent`, `no-vibrate`, `ring-volume`,
`max-captions`, `ended-delay`, `active-view` (`full` = default, the avatar/background image fills the in-call
screen like a video call; `avatar` = round avatar with voice rings), `theme` (`diary` = hand-made scrapbook look with
handwritten fonts from Google Fonts; omit for the classic look; `no-webfonts` skips font loading). Read-only `state`: `idle | incoming | outgoing | active | ended`.
The element is `display:none` while `idle`, so it is safe to mount once at the app root.

Methods: `incoming(meta)`, `outgoing(meta)`, `answer()`, `connect()`, `decline()`, `hangup(reason)`, `reset()`,
`caption(text, {who:'them'|'me'|'system', id, partial})`, `clearCaptions()`, `setControl(name,on)`,
`getControl(name)`, `setLevel(0..1)`, `pulse(on)`, `attachAudio(audioElOrStream)`, `labels = {...}` (i18n).
`meta = { name, avatar, subtitle, background }`.

Events (bubble, composed): `pc-statechange`, `pc-answer`, `pc-connect`, `pc-hangup {reason,duration}`,
`pc-ended`, `pc-toggle {control,on}`, `pc-action {control}`, `pc-text {text}`.

Styling: CSS variables on the element — `--pc-height`, `--pc-aspect`, `--pc-radius`, `--pc-font`,
`--pc-backdrop`, `--pc-z`, `--pc-right`, `--pc-bottom`, `--pc-avatar-position`, `--pc-portrait-position`; `::part(phone|backdrop|status-bar|incoming|outgoing|active|ended)`.
Put a `<video>`/`<canvas>` in `slot="media"` to replace the avatar with live visuals.

### Session API

```ts
const session = createCallSession(el, {
  reply(userText, { history, direction, signal }) { /* string | Promise<string> | AsyncIterable<string> */ },
  speak?(text, { signal }) { /* Blob | URL | <audio> | Promise<void>; omit = browser speechSynthesis */ },
  listen: true,          // browser SpeechRecognition (Chrome/Edge/Safari); false = typing only
  lang: 'zh-CN',         // match the app's language
  onTurn(turn) {},       // { role: 'user'|'assistant', text } — persist to the app's chat here
  onEnd({ reason, duration, history }) {},
  onError(err) {},
});
session.dial(meta);  // user calls the character: rings while the first line is generated, then connects
session.ring(meta);  // character calls the user: user slides to answer, character speaks first
session.destroy();   // on unmount
```

`userText === null` means "the call just connected, the character speaks first" — prompt the model accordingly
(`direction === 'incoming'`: the character called; `'outgoing'`: the user called and the character picked up).
Reply text is split into sentences and spoken as it streams; user speech or typing interrupts the character.

## 2. Mount it (pick the project's framework)

Mount **one** `<phone-call>` near the app root (layout/shell), not inside a list or a component that unmounts
during the call. Use `floating` on desktop and `fullscreen no-status-bar` on small screens
(`matchMedia('(max-width: 700px)')`).

### Plain HTML / Vite vanilla
```html
<phone-call id="call" floating controls="speaker,camera,mute,keypad,end"></phone-call>
<script type="module">
  import 'phone-call-ui';
  import { createCallSession } from 'phone-call-ui';
  const el = document.getElementById('call');
  const session = createCallSession(el, { reply: myReply });
  document.querySelector('#call-btn').onclick = () => session.dial({ name: 'Mia', avatar: '/mia.png' });
</script>
```

### React (Vite / CRA / Remix client)
```tsx
import { useEffect, useRef } from 'react';
import type { PhoneCall, CallSession } from 'phone-call-ui';

export function CallLayer({ onReady }: { onReady: (s: CallSession) => void }) {
  const ref = useRef<PhoneCall>(null);
  useEffect(() => {
    let session: CallSession | undefined;
    let cancelled = false;
    import('phone-call-ui').then(({ createCallSession }) => {
      if (cancelled || !ref.current) return;
      session = createCallSession(ref.current, { reply: myReply });
      onReady(session);
    });
    return () => { cancelled = true; session?.destroy(); };   // StrictMode-safe
  }, []);
  return <phone-call ref={ref} floating="" controls="speaker,camera,mute,keypad,end" />;
}
```
TypeScript JSX typing — add once (e.g. `src/phone-call.d.ts`):
```ts
import type { PhoneCall } from 'phone-call-ui';
type PhoneCallProps = React.DetailedHTMLProps<React.HTMLAttributes<PhoneCall>, PhoneCall> & {
  name?: string; subtitle?: string; avatar?: string; background?: string; controls?: string;
  'answer-style'?: 'slide' | 'buttons'; floating?: ''; fullscreen?: ''; 'no-status-bar'?: ''; silent?: '';
};
declare module 'react' { namespace JSX { interface IntrinsicElements { 'phone-call': PhoneCallProps } } }   // React 19
// React 18: declare global { namespace JSX { interface IntrinsicElements { 'phone-call': PhoneCallProps } } }
```
Use `addEventListener` in an effect for `pc-*` events (React 18 does not bind custom events via props).
Pass boolean attributes as `floating=""`, never `floating={true}`.

### Next.js (App Router)
Same component as React, in a file starting with `'use client'`, rendered from the root `layout.tsx`.
Keep the `import('phone-call-ui')` inside `useEffect`. The reply function should call a **Route Handler**
(`app/api/.../route.ts`) that talks to the LLM — never put provider API keys in client code.

### Vue 3 / Vite
`vite.config.ts`: `vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'phone-call' } } })`.
Nuxt: `vue: { compilerOptions: { isCustomElement: (tag) => tag === 'phone-call' } }` in `nuxt.config.ts`,
and wrap in `<ClientOnly>`.
```vue
<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
const el = ref(); let session;
onMounted(async () => {
  const { createCallSession } = await import('phone-call-ui');
  session = createCallSession(el.value, { reply: myReply });
});
onBeforeUnmount(() => session?.destroy());
</script>
<template><phone-call ref="el" floating controls="speaker,camera,mute,keypad,end" /></template>
```

### Svelte / SvelteKit
Import inside `onMount`; `<phone-call bind:this={el} floating controls="..." />`. SvelteKit: client only.

### Angular
Add `CUSTOM_ELEMENTS_SCHEMA` to the component/module, `import 'phone-call-ui'` in `main.ts`,
create the session in `ngAfterViewInit` with `@ViewChild('call') el`.

## 3. Wire the reply to the project's LLM

1. **Find what already exists**: the chat send function / API route / SDK client the app uses, how it builds
   the system prompt (character card / persona), and where messages are stored. Reuse it.
2. Write `reply(userText, { history, direction, signal })`:
   - Context = the app's current conversation + `history` (turns from this call).
   - Add an instruction like: *"You are on a live phone call. Reply only with what {character} says out loud:
     1–3 short spoken sentences, natural, same language as the user. No narration, actions, asterisks or emoji."*
   - `userText === null` → *"The call just connected; {character} speaks first."* (vary by `direction`).
   - Stream if the backend streams (return an async generator of text chunks). Pass `signal` to `fetch`.
3. Never ship provider API keys to the browser. If the app calls the provider directly from the client with a
   user-supplied key (common in roleplay frontends), keep doing what the app already does.

Streaming example for an OpenAI-compatible SSE endpoint behind the app's own route:
```js
async function* myReply(userText, { history, direction, signal }) {
  const res = await fetch('/api/chat', { method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'phone', userText, direction, history, stream: true }) });
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      const delta = JSON.parse(data).choices?.[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
```

## 4. Voice (optional)

- Default: omit `speak` → browser `speechSynthesis` with `lang`.
- Project already has TTS (ElevenLabs, OpenAI `/v1/audio/speech`, GPT-SoVITS, CosyVoice, Azure…) → implement
  `speak(text, { signal })` that calls it **through the app's backend** and returns `await res.blob()`.
- Mic input needs HTTPS (or localhost) and a Chromium/Safari browser; otherwise the session falls back to typing.

## 5. Persist and trigger

- `onTurn(turn)` → append to the app's message store (mark them, e.g. `meta.phoneCall = true`), so the normal
  chat remembers the call.
- Start calls **from a click handler** (browsers block audio/ringtones without a user gesture).
  For "the character calls you", trigger `session.ring()` from a user action, or after a timer only once the
  user has interacted with the page.
- Avatar: use the character's image URL. Portrait images are fine (`--pc-avatar-position` controls the crop).
- Localize `subtitle` and `el.labels = {...}` if the app is not Chinese (labels default to Simplified Chinese).

## 6. Done checklist

- [ ] `npm run build` / typecheck passes; no SSR "HTMLElement is not defined" errors.
- [ ] Clicking the call button shows "calling…", then connects and the character speaks a first line.
- [ ] Typing via the keypad button gets a spoken reply; the hang-up button ends the call and shows "call ended".
- [ ] Turns appear in the app's chat history (if it has one).
- [ ] No API key added to client code; existing features unchanged.
- [ ] Tell the user what you changed, where the call button is, and how to change voice/language.
