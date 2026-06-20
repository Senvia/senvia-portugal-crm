import { create } from "zustand";

// Lets Otto (and its tours) open real configuration modals from anywhere, without
// each modal owning its open state locally. A global host (OttoModalHost) renders
// the right modal for `activeModal`.
export type OttoManagedModal = "whatsapp" | null;

interface ModalStore {
  activeModal: OttoManagedModal;
  params: Record<string, any>;
  openModal: (modal: Exclude<OttoManagedModal, null>, params?: Record<string, any>) => void;
  closeModal: () => void;
}

export const useModalStore = create<ModalStore>((set) => ({
  activeModal: null,
  params: {},
  openModal: (modal, params = {}) => set({ activeModal: modal, params }),
  closeModal: () => set({ activeModal: null, params: {} }),
}));
