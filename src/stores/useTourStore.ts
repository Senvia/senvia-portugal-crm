import { create } from "zustand";

// Drives the spotlight/coachmark tour. Tours are DETERMINISTIC: their steps live
// in a code registry (src/components/otto/tours.ts). Otto only chooses WHICH tour
// to launch (via a [tour:id] token), it never invents the steps — that is what
// keeps the arrow pointing at the right element.
interface TourStore {
  tourId: string | null;
  step: number;
  start: (tourId: string) => void;
  setStep: (step: number) => void;
  next: () => void;
  prev: () => void;
  stop: () => void;
}

export const useTourStore = create<TourStore>((set) => ({
  tourId: null,
  step: 0,
  start: (tourId) => set({ tourId, step: 0 }),
  setStep: (step) => set({ step }),
  next: () => set((s) => ({ step: s.step + 1 })),
  prev: () => set((s) => ({ step: Math.max(0, s.step - 1) })),
  stop: () => set({ tourId: null, step: 0 }),
}));
