import { create } from 'zustand';

/**
 * Whether the "O que há de novo" dialog is open.
 *
 * It lives in a store because the thing that opens it (the bell in the
 * sidebar/header) and the dialog itself sit in different branches of the
 * tree, and the dialog also opens itself once when there is something unread.
 */
interface WhatsNewState {
  isOpen: boolean;
  /** The announcement id already auto-opened this session, so it happens once. */
  autoOpenedId: string | null;
  open: () => void;
  close: () => void;
  markAutoOpened: (id: string) => void;
}

export const useWhatsNewStore = create<WhatsNewState>((set) => ({
  isOpen: false,
  autoOpenedId: null,
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  markAutoOpened: (id) => set({ autoOpenedId: id, isOpen: true }),
}));
