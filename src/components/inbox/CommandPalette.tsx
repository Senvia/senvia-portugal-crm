import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  MessageSquare,
  Archive,
  ArchiveRestore,
  MailOpen,
  UserPlus,
  Settings,
  Plus,
  UserCog,
  Tag,
  FileDown,
  Clock,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { InboxConversation } from "@/hooks/useChatwootInbox";

export interface CommandPaletteAction {
  label: string;
  description?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversations: InboxConversation[];
  onOpenConversation: (id: number) => void;
  onNewConversation: () => void;
  onArchiveCurrent: () => void;
  onMarkCurrentRead: () => void;
  onAssignCurrent: () => void;
  onManageLabels: () => void;
  onExportConversation: () => void;
  onGoToSettings: () => void;
  currentConversationId?: number | null;
}

export function CommandPalette({
  open,
  onOpenChange,
  conversations,
  onOpenConversation,
  onNewConversation,
  onArchiveCurrent,
  onMarkCurrentRead,
  onAssignCurrent,
  onManageLabels,
  onExportConversation,
  onGoToSettings,
  currentConversationId,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  // Reset query when opening
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  // Filter conversations by name/phone
  const filteredConversations = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return conversations
      .filter(
        (c) =>
          c.contact_name?.toLowerCase().includes(q) ||
          c.contact_phone?.replace(/\D/g, "").includes(q.replace(/\D/g, "")),
      )
      .slice(0, 8);
  }, [conversations, query]);

  const hasCurrent = currentConversationId != null;

  const closeAndRun = (fn: () => void) => {
    onOpenChange(false);
    setTimeout(fn, 50);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-xl" style={{ maxWidth: "560px" }}>
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <Command shouldFilter={false} className="rounded-lg">
          <CommandInput
            placeholder="Procurar conversas, contactos ou executar ações..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>
              {query.trim() ? "Nada encontrado." : "Escreve para procurar..."}
            </CommandEmpty>

            {/* Quick actions — always visible */}
            <CommandGroup heading="Ações rápidas">
              <CommandItem onSelect={() => closeAndRun(onNewConversation)}>
                <Plus className="mr-2 h-4 w-4 text-primary" />
                <span>Nova conversa</span>
              </CommandItem>
              {hasCurrent && (
                <>
                  <CommandItem onSelect={() => closeAndRun(onArchiveCurrent)}>
                    <Archive className="mr-2 h-4 w-4 text-amber-500" />
                    <span>Arquivar conversa atual</span>
                  </CommandItem>
                  <CommandItem onSelect={() => closeAndRun(onMarkCurrentRead)}>
                    <MailOpen className="mr-2 h-4 w-4 text-blue-500" />
                    <span>Marcar como lida</span>
                  </CommandItem>
                  <CommandItem onSelect={() => closeAndRun(onAssignCurrent)}>
                    <UserCog className="mr-2 h-4 w-4 text-violet-500" />
                    <span>Atribuir a...</span>
                  </CommandItem>
                  <CommandItem onSelect={() => closeAndRun(onManageLabels)}>
                    <Tag className="mr-2 h-4 w-4 text-emerald-500" />
                    <span>Gerir etiquetas</span>
                  </CommandItem>
                  <CommandItem onSelect={() => closeAndRun(onExportConversation)}>
                    <FileDown className="mr-2 h-4 w-4 text-slate-500" />
                    <span>Exportar conversa</span>
                  </CommandItem>
                </>
              )}
              <CommandItem onSelect={() => closeAndRun(() => navigate("/settings"))}>
                <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Ir para definições</span>
              </CommandItem>
            </CommandGroup>

            {/* Conversation search results */}
            {filteredConversations.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Conversas">
                  {filteredConversations.map((c) => (
                    <CommandItem
                      key={c.id}
                      onSelect={() => closeAndRun(() => onOpenConversation(c.id))}
                    >
                      <MessageSquare className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.contact_name}</p>
                        {c.contact_phone && (
                          <p className="truncate text-xs text-muted-foreground">
                            {c.contact_phone}
                          </p>
                        )}
                      </div>
                      {c.unread_count > 0 && (
                        <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-green-600 px-1.5 text-[10px] font-semibold text-white">
                          {c.unread_count}
                        </span>
                      )}
                      {c.id === currentConversationId && (
                        <ArrowRight className="ml-2 h-3 w-3 shrink-0 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
