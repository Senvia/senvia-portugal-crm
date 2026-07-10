import { create } from "zustand";
import type { DateRange } from "react-day-picker";
import type { InboxConversation, InboxMessage, OutgoingAttachment } from "@/hooks/useChatwootInbox";

interface PendingBubble {
  key: string;
  conversationId: number;
  content: string;
  at: number;
  sent?: boolean;
  failed?: boolean;
  retry?: import("@/hooks/useChatwootInbox").SendMessageVars;
  previewUrl?: string;
  previewKind?: OutgoingAttachment["kind"];
}

interface InboxStore {
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;

  search: string;
  setSearch: (s: string) => void;

  tab: "all" | "unread" | "waiting" | "mine" | "archived";
  setTab: (t: InboxStore["tab"]) => void;

  caixaFilter: number | null;
  setCaixaFilter: (id: number | null) => void;

  draft: string;
  setDraft: (d: string) => void;

  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;

  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;

  replyTo: { waId: string; content: string; outgoing: boolean } | null;
  setReplyTo: (r: InboxStore["replyTo"]) => void;

  highlightedWaId: string | null;
  setHighlightedWaId: (id: string | null) => void;

  pending: PendingBubble[];
  setPending: (updater: (prev: PendingBubble[]) => PendingBubble[]) => void;

  outAttachments: Array<{ file: File; kind: OutgoingAttachment["kind"] }>;
  setOutAttachments: (updater: (prev: InboxStore["outAttachments"]) => InboxStore["outAttachments"]) => void;

  recording: boolean;
  setRecording: (r: boolean) => void;

  pendingVoice: { blob: Blob; url: string } | null;
  setPendingVoice: (v: InboxStore["pendingVoice"]) => void;

  plusOpen: boolean;
  setPlusOpen: (open: boolean) => void;

  signing: boolean;
  setSigning: (s: boolean) => void;

  threadSearchOpen: boolean;
  setThreadSearchOpen: (open: boolean) => void;

  threadSearchQuery: string;
  setThreadSearchQuery: (q: string) => void;

  olderByConv: Record<number, InboxMessage[]>;
  setOlderByConv: (updater: (prev: Record<number, InboxMessage[]>) => Record<number, InboxMessage[]>) => void;

  loadingOlder: boolean;
  setLoadingOlder: (b: boolean) => void;

  noMoreOlder: Record<number, boolean>;
  setNoMoreOlder: (updater: (prev: Record<number, boolean>) => Record<number, boolean>) => void;

  deletedIds: Set<number>;
  setDeletedIds: (updater: (prev: Set<number>) => Set<number>) => void;

  farFromBottom: boolean;
  setFarFromBottom: (b: boolean) => void;

  newArrivedCount: number;
  setNewArrivedCount: (updater: (prev: number) => number) => void;
}

export const useInboxStore = create<InboxStore>((set) => ({
  selectedId: null,
  setSelectedId: (selectedId) => set({ selectedId }),

  search: "",
  setSearch: (search) => set({ search }),

  tab: "all",
  setTab: (tab) => set({ tab }),

  caixaFilter: null,
  setCaixaFilter: (caixaFilter) => set({ caixaFilter }),

  draft: "",
  setDraft: (draft) => set({ draft }),

  panelOpen: typeof window !== "undefined" && localStorage.getItem("inbox-panel-v1") !== "0",
  setPanelOpen: (panelOpen) => set({ panelOpen }),

  sheetOpen: false,
  setSheetOpen: (sheetOpen) => set({ sheetOpen }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),

  shortcutsOpen: false,
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),

  replyTo: null,
  setReplyTo: (replyTo) => set({ replyTo }),

  highlightedWaId: null,
  setHighlightedWaId: (highlightedWaId) => set({ highlightedWaId }),

  pending: [],
  setPending: (updater) => set((state) => ({ pending: updater(state.pending) })),

  outAttachments: [],
  setOutAttachments: (updater) => set((state) => ({ outAttachments: updater(state.outAttachments) })),

  recording: false,
  setRecording: (recording) => set({ recording }),

  pendingVoice: null,
  setPendingVoice: (pendingVoice) => set({ pendingVoice }),

  plusOpen: false,
  setPlusOpen: (plusOpen) => set({ plusOpen }),

  signing: typeof window !== "undefined" && localStorage.getItem("inbox-signature-v1") === "1",
  setSigning: (signing) => set({ signing }),

  threadSearchOpen: false,
  setThreadSearchOpen: (threadSearchOpen) => set({ threadSearchOpen }),

  threadSearchQuery: "",
  setThreadSearchQuery: (threadSearchQuery) => set({ threadSearchQuery }),

  olderByConv: {},
  setOlderByConv: (updater) => set((state) => ({ olderByConv: updater(state.olderByConv) })),

  loadingOlder: false,
  setLoadingOlder: (loadingOlder) => set({ loadingOlder }),

  noMoreOlder: {},
  setNoMoreOlder: (updater) => set((state) => ({ noMoreOlder: updater(state.noMoreOlder) })),

  deletedIds: new Set(),
  setDeletedIds: (updater) => set((state) => ({ deletedIds: updater(state.deletedIds) })),

  farFromBottom: false,
  setFarFromBottom: (farFromBottom) => set({ farFromBottom }),

  newArrivedCount: 0,
  setNewArrivedCount: (updater) => set((state) => ({ newArrivedCount: updater(state.newArrivedCount) })),
}));
