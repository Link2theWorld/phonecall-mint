// Type definitions for phone-call-ui
// SPDX-License-Identifier: MIT

export type CallState = 'idle' | 'incoming' | 'outgoing' | 'active' | 'ended';
export type ControlName = 'speaker' | 'camera' | 'mute' | 'flip' | 'keypad' | 'end';
export type CaptionWho = 'them' | 'me' | 'system';
export type HangupReason = 'local' | 'remote' | 'missed' | 'declined' | 'cancel' | (string & {});

export interface CallMeta {
  name?: string;
  subtitle?: string;
  avatar?: string;
  background?: string;
}

export interface PhoneCallLabels {
  voiceCall: string;
  slideToAnswer: string;
  accept: string;
  decline: string;
  calling: string;
  cancel: string;
  ended: string;
  declined: string;
  missed: string;
  inputPlaceholder: string;
  send: string;
  speaker: string;
  camera: string;
  mute: string;
  flip: string;
  keypad: string;
  end: string;
}

export interface PhoneCallEventMap {
  'pc-statechange': CustomEvent<{ state: CallState; prev: CallState }>;
  'pc-answer': CustomEvent<Record<string, never>>;
  'pc-connect': CustomEvent<Record<string, never>>;
  'pc-hangup': CustomEvent<{ reason: HangupReason; duration: number }>;
  'pc-ended': CustomEvent<{ reason: HangupReason; duration: number }>;
  'pc-toggle': CustomEvent<{ control: ControlName; on: boolean }>;
  'pc-action': CustomEvent<{ control: ControlName }>;
  'pc-text': CustomEvent<{ text: string }>;
}

export declare class PhoneCall extends HTMLElement {
  readonly state: CallState;
  /** Call duration in ms (0 before connected). */
  readonly duration: number;
  labels: PhoneCallLabels;
  readonly audioContext: AudioContext | null;

  incoming(meta?: CallMeta): this;
  outgoing(meta?: CallMeta): this;
  answer(): void;
  connect(): void;
  decline(): void;
  hangup(reason?: HangupReason): void;
  reset(): void;

  caption(text: string, opts?: { who?: CaptionWho; id?: string; partial?: boolean }): string;
  releaseCaption(id: string): void;
  removeCaption(id: string): void;
  clearCaptions(): void;

  getControl(name: ControlName): boolean | undefined;
  setControl(name: ControlName, on: boolean): void;
  setLevel(level: number): void;
  pulse(on: boolean): void;
  attachAudio(src: HTMLMediaElement | MediaStream): void;
  detachAudio(): void;

  addEventListener<K extends keyof PhoneCallEventMap>(type: K, listener: (this: PhoneCall, ev: PhoneCallEventMap[K]) => any, options?: boolean | AddEventListenerOptions): void;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
  removeEventListener<K extends keyof PhoneCallEventMap>(type: K, listener: (this: PhoneCall, ev: PhoneCallEventMap[K]) => any, options?: boolean | EventListenerOptions): void;
  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void;
}

export interface Turn {
  role: 'user' | 'assistant';
  text: string;
  interrupted?: boolean;
}

export interface ReplyContext {
  history: Turn[];
  /** 'incoming' = the character called the user; 'outgoing' = the user called the character. */
  direction: 'incoming' | 'outgoing';
  signal: AbortSignal;
  ui: PhoneCall;
}

export type ReplyResult = string | Promise<string> | AsyncIterable<string> | Iterable<string>;

export interface SpeakContext {
  signal: AbortSignal;
  lang: string;
  ui: PhoneCall;
}

export interface ListenAdapter {
  start(ctx: { onResult(text: string): void; onInterim(text: string): void; lang: string }): void;
  stop(): void;
}

export interface CallSessionOptions {
  /** Required. userText is null when the character speaks first (call just connected). */
  reply: (userText: string | null, ctx: ReplyContext) => ReplyResult;
  /** Optional TTS. Return audio (Blob / URL / <audio>) or a promise that resolves when speaking is done. Default: speechSynthesis. */
  speak?: ((text: string, ctx: SpeakContext) => Blob | string | HTMLMediaElement | void | Promise<Blob | string | HTMLMediaElement | void>) | null;
  /** true = browser SpeechRecognition, false = typing only, or your own adapter. Default true. */
  listen?: boolean | ListenAdapter;
  lang?: string;
  bargeIn?: boolean;
  voice?: string | SpeechSynthesisVoice | null;
  rate?: number;
  pitch?: number;
  sanitize?: (text: string) => string;
  minRingMs?: number;
  noReplyText?: string;
  onTurn?: (turn: Turn) => void;
  onEnd?: (info: { reason: HangupReason; duration: number; history: Turn[] }) => void;
  onError?: (err: unknown) => void;
}

export interface CallSession {
  readonly history: Turn[];
  ring(meta?: CallMeta): void;
  dial(meta?: CallMeta): Promise<void>;
  say(text: string): Promise<void>;
  userSays(text: string, opts?: { showCaption?: boolean }): void;
  interrupt(): void;
  hangup(reason?: HangupReason): void;
  set(opts: Partial<CallSessionOptions>): void;
  destroy(): void;
}

export declare function createCallSession(ui: PhoneCall, options: CallSessionOptions): CallSession;
export declare function sanitizeForSpeech(text: string): string;
export declare function sentences(source: ReplyResult): AsyncGenerator<string>;

declare global {
  interface HTMLElementTagNameMap {
    'phone-call': PhoneCall;
  }
}
