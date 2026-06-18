import { create } from "zustand";

// Lets the Inbox tell AppLayout to hide mobile chrome. Two levels:
// - `hideNav`: the whole Inbox on mobile hides the bottom nav (it eats space and
//   the messaging UI wants the full height; the app header's burger still gives a
//   way out). True for the list AND the conversation.
// - `immersive`: a conversation is open → full-screen view, also hide the app
//   header and FAB so the conversation owns the whole screen (no double header).
// Transient (not persisted): always starts false, the Inbox drives both.
interface InboxImmersiveStore {
  immersive: boolean;
  hideNav: boolean;
  setImmersive: (immersive: boolean) => void;
  setHideNav: (hideNav: boolean) => void;
}

export const useInboxImmersiveStore = create<InboxImmersiveStore>((set) => ({
  immersive: false,
  hideNav: false,
  setImmersive: (immersive) => set({ immersive }),
  setHideNav: (hideNav) => set({ hideNav }),
}));
