import { useState } from "react";
import { Search, UserMinus, UserPlus, Loader2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useContactListMembers, useRemoveListMember, useAddListMembers, type ContactList } from "@/hooks/useContactLists";
import { useClients } from "@/hooks/useClients";

interface Props {
  list: ContactList | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ListDetailsModal({ list, open, onOpenChange }: Props) {
  const { data: members = [], isLoading } = useContactListMembers(list?.id ?? null);
  const removeMember = useRemoveListMember();
  const addMembers = useAddListMembers();
  const { data: allClients = [] } = useClients();
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  if (!list) return null;

  const memberIds = new Set(members.map(m => m.client_id));
  const availableClients = allClients.filter(c => !memberIds.has(c.id) && c.email);
  const filteredAvailable = availableClients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddSelected = async () => {
    if (selected.length === 0) return;
    await addMembers.mutateAsync({ listId: list.id, clientIds: selected });
    setSelected([]);
    setShowAdd(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {list.name}
          </DialogTitle>
          {list.description && <p className="text-sm text-muted-foreground">{list.description}</p>}
        </DialogHeader>

        <div className="flex items-center justify-between">
          <Badge variant="secondary">{members.length} contacto(s)</Badge>
          <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
            <UserPlus className="h-4 w-4 mr-1" /> Adicionar
          </Button>
        </div>

        {showAdd && (
          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Pesquisar clientes..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <ScrollArea className="max-h-[150px]">
              <div className="space-y-1">
                {filteredAvailable.map(c => (
                  <div key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer" onClick={() => setSelected(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])}>
                    <Checkbox checked={selected.includes(c.id)} />
                    <span className="text-sm font-medium truncate">{c.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{c.email}</span>
                  </div>
                ))}
                {filteredAvailable.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum cliente disponível</p>}
              </div>
            </ScrollArea>
            <Button size="sm" onClick={handleAddSelected} disabled={selected.length === 0 || addMembers.isPending}>
              Adicionar {selected.length} selecionado(s)
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1 max-h-[300px] border rounded-md">
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : members.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Lista vazia</p>
          ) : (
            <div className="p-2 space-y-1">
              {members.map(m => (
                <div key={m.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{m.client?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.client?.email}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeMember.mutate({ listId: list.id, clientId: m.client_id })}>
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
