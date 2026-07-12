// Global audio playback state — lets a voice message keep playing when the user
// switches conversations. The audio element is a singleton outside React's tree.
import { create } from 'zustand';

interface GlobalAudioState {
  url: string | null;
  messageId: number | null;
  playing: boolean;
  cur: number;
  dur: number;
  speed: number;
  play: (url: string, messageId: number) => void;
  pause: () => void;
  resume: () => void;
  toggle: (url: string, messageId: number) => void;
  setSpeed: (speed: number) => void;
  setProgress: (cur: number, dur: number) => void;
  stop: () => void;
}

let audioEl: HTMLAudioElement | null = null;
function getAudio(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.preload = 'metadata';
    if (typeof window !== 'undefined') {
      (window as unknown as { __globalAudioEl?: HTMLAudioElement }).__globalAudioEl = audioEl;
    }
  }
  return audioEl;
}

export const useGlobalAudio = create<GlobalAudioState>((set, get) => {
  return {
    url: null,
    messageId: null,
    playing: false,
    cur: 0,
    dur: 0,
    speed: 1,

    play: (url, messageId) => {
      const a = getAudio();
      if (get().url !== url) {
        a.src = url;
        a.playbackRate = get().speed;
      }
      a.play().catch(() => {});
      set({ url, messageId, playing: true });
    },

    pause: () => {
      getAudio().pause();
      set({ playing: false });
    },

    resume: () => {
      getAudio().play().catch(() => {});
      set({ playing: true });
    },

    toggle: (url, messageId) => {
      const st = get();
      if (st.url === url && st.playing) {
        get().pause();
      } else if (st.url === url && !st.playing) {
        get().resume();
      } else {
        get().play(url, messageId);
      }
    },

    setSpeed: (speed) => {
      getAudio().playbackRate = speed;
      set({ speed });
    },

    setProgress: (cur, dur) => set({ cur, dur }),

    stop: () => {
      const a = getAudio();
      a.pause();
      a.src = '';
      set({ url: null, messageId: null, playing: false, cur: 0, dur: 0 });
    },
  };
});

// Wire up the audio element events to the store once.
if (typeof window !== 'undefined') {
  const a = getAudio();
  a.addEventListener('timeupdate', () => {
    useGlobalAudio.getState().setProgress(a.currentTime, a.duration || 0);
  });
  a.addEventListener('loadedmetadata', () => {
    useGlobalAudio.getState().setProgress(0, a.duration || 0);
  });
  a.addEventListener('ended', () => {
    useGlobalAudio.getState().stop();
  });
}
