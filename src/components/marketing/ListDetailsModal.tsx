import { useState } from "react";
import { Search, UserMinus, UserPlus, Loader2, Users, Pencil, Check, X, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useContactListMembers, useRemoveListMember, useAddListMembers, useUpdateContactList, type ContactList } from "@/hooks/useContactLists";
import { useClients, useUpdateClient } from "@/hooks/useClients";
import { normalizeString } from "@/lib/utils";

interface Props {
  list: ContactList | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ListDetailsModal({ list, open, onOpenChange }: Props) {
  const { data: members = [], isLoading } = useContactListMembers(list?.id ?? null);
  const removeMember = useRemoveListMember();
  const addMembers = useAddListMembers();
  const updateList = useUpdateContactList();
  const updateClient = useUpdateClient();
  const { data: allClients = [] } = useClients();

  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  // List editing state
  const [editingList, setEditingList] = useState(false);
  const [listName, setListName] = useState("");
  const [listDesc, setListDesc] = useState("");

  // Contact editing state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", whatsapp: "" });

  if (!list) return null;

  const memberIds = new Set(members.map(m => m.client_id));
  const availableClients = allClients.filter(c => !memberIds.has(c.id) && c.email);
  const filteredAvailable = availableClients.filter(c => {
    if (!search) return true;
    const q = normalizeString(search);
    return normalizeString(c.name).includes(q) || normalizeString(c.email || '').includes(q) || normalizeString(c.phone || '').includes(q);
  });

  const filteredMembers = members.filter(m => {
    if (!memberSearch) return true;
    const q = normalizeString(memberSearch);
    return normalizeString(m.client?.name || '').includes(q) || normalizeString(m.client?.email || '').includes(q) || normalizeString(m.client?.phone || '').includes(q);
  });

  const handleAddSelected = async () => {
    if (selected.length === 0) return;
    await addMembers.mutateAsync({ listId: list.id, clientIds: selected });
    setSelected([]);
    setShowAdd(false);
  };

  const startEditList = () => {
    setEditingList(true);
    setListName(list.name);
    setListDesc(list.description || "");
  };

  const saveList = async () => {
    await updateList.mutateAsync({ id: list.id, name: listName, description: listDesc || undefined });
    setEditingList(false);
  };

  const startEditMember = (m: typeof members[0]) => {
    setEditingMemberId(m.client_id);
    setEditForm({
      name: m.client?.name || "",
      email: m.client?.email || "",
      phone: m.client?.phone || "",
      whatsapp: (m.client as any)?.whatsapp || "",
    });
  };

  const saveEditMember = async () => {
    if (!editingMemberId) return;
    await updateClient.mutateAsync({
      id: editingMemberId,
      name: editForm.name,
      email: editForm.email || undefined,
      phone: editForm.phone || undefined,
      whatsapp: editForm.whatsapp || undefined,
    } as any);
    setEditingMemberId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullScreen" className="flex flex-col p-0">
        <div className="p-6 pb-0 max-w-3xl mx-auto w-full">
          <DialogHeader>
            {editingList ? (
              <div className="space-y-2">
                <Input
                  value={listName}
                  onChange={e => setListName(e.target.value)}
                  placeholder="Nome da lista"
                  className="text-lg font-semibold"
                />
                <Textarea
                  value={listDesc}
                  onChange={e => setListDesc(e.target.value)}
                  placeholder="Descrição (opcional)"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveList} disabled={!listName.trim() || updateList.isPending}>
                    <Check className="h-4 w-4 mr-1" /> Guardar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingList(false)}>
                    <X className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {list.name}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={startEditList}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </DialogTitle>
                {list.description && <p className="text-sm text-muted-foreground mt-1">{list.description}</p>}
              </div>
            )}
          </DialogHeader>

          <div className="flex items-center justify-between mt-4">
            <Badge variant="secondary">{members.length} contacto(s)</Badge>
            <Button size="sm" variant="outline" onClick={() => setShowAdd(!showAdd)}>
              <UserPlus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>

          {showAdd && (
            <div className="border rounded-lg p-3 space-y-2 bg-muted/30 mt-4">
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

          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar membros por nome, email ou telefone..." value={memberSearch} onChange={e => setMemberSearch(e.target.value)} className="pl-10" />
          </div>
        </div>

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="max-w-3xl mx-auto w-full">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : filteredMembers.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">{memberSearch ? "Nenhum resultado encontrado" : "Lista vazia"}</p>
            ) : (
              <div className="space-y-1">
                {filteredMembers.map(m => (
                  <div key={m.id} className="border rounded-lg p-3 hover:bg-muted/50">
                    {editingMemberId === m.client_id ? (
                      <div className="space-y-2">
                        <Input
                          value={editForm.name}
                          onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Nome"
                        />
                        <Input
                          type="email"
                          value={editForm.email}
                          onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Email"
                        />
                        <Input
                          value={editForm.phone}
                          onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="Telefone"
                        />
                        <Input
                          value={editForm.whatsapp}
                          onChange={e => setEditForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                          placeholder="+351 9XX XXX XXX (WhatsApp)"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={saveEditMember} disabled={!editForm.name.trim() || updateClient.isPending}>
                            <Check className="h-4 w-4 mr-1" /> Guardar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingMemberId(null)}>
                            <X className="h-4 w-4 mr-1" /> Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.client?.name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            <p className="text-xs text-muted-foreground truncate">{m.client?.email}</p>
                            {m.client?.phone && <p className="text-xs text-muted-foreground truncate">{m.client.phone}</p>}
                            {(m.client as any)?.whatsapp && (
                              <p className="text-xs text-green-600 flex items-center gap-0.5 truncate">
                                <MessageCircle className="h-3 w-3" />
                                {(m.client as any).whatsapp}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEditMember(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => removeMember.mutate({ listId: list.id, clientId: m.client_id })}>
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
