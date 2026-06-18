import { create } from "zustand";

// When a conversation is open on mobile, the Inbox renders it as a full-screen
// immersive view (like WhatsApp). This flag lets AppLayout hide the app header,
// bottom nav and FAB while that view is up, so there's no double header and the
// conversation's own header + composer own the whole screen. Transient (not
// persisted): it always starts false and the Inbox drives it.
interface InboxImmersiveStore {
  immersive: boolean;
  setImmersive: (immersive: boolean) => void;
}

export const useInboxImmersiveStore = create<InboxImmersiveStore>((set) => ({
  immersive: false,
  setImmersive: (immersive) => set({ immersive }),
}));
