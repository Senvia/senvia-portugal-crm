import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { useCreateClient } from "@/hooks/useClients";
import { useClientLabels } from "@/hooks/useClientLabels";
import { useTeamMembers } from "@/hooks/useTeam";
import { CLIENT_STATUS_LABELS, CLIENT_SOURCE_LABELS, ClientStatus } from "@/types/clients";
import { COUNTRIES } from "@/lib/countries";

interface CreateClientModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (clientId: string) => void;
  initialData?: {
    name?: string;
    email?: string;
    phone?: string;
    notes?: string;
    source?: string;
    leadId?: string;
  };
}

export function CreateClientModal({ open, onOpenChange, onCreated, initialData }: CreateClientModalProps) {
  const labels = useClientLabels();
  const { data: teamMembers = [] } = useTeamMembers();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [nif, setNif] = useState("");
  const [status, setStatus] = useState<ClientStatus>("active");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  
  // Address fields
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("PT");

  const createClient = useCreateClient();

  // Pre-fill form when initialData is provided
  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name || "");
      setEmail(initialData.email || "");
      setPhone(initialData.phone || "");
      setNotes(initialData.notes || "");
      setSource(initialData.source || "");
    }
  }, [open, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    createClient.mutate(
      {
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        nif: nif.trim() || undefined,
        status,
        source: source || undefined,
        notes: notes.trim() || undefined,
        address_line1: addressLine1.trim() || undefined,
        address_line2: addressLine2.trim() || undefined,
        city: city.trim() || undefined,
        postal_code: postalCode.trim() || undefined,
        country: country || undefined,
        lead_id: initialData?.leadId || undefined,
        assigned_to: assignedTo || undefined,
      },
      {
        onSuccess: (createdClient) => {
          resetForm();
          onOpenChange(false);
          onCreated?.(createdClient.id);
        },
      }
    );
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setPhone("");
    setCompany("");
    setNif("");
    setStatus("active");
    setSource("");
    setNotes("");
    setAssignedTo("");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setPostalCode("");
    setCountry("PT");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{labels.new}</DialogTitle>
          <DialogDescription>
            Adicione um novo {labels.singular.toLowerCase()} ao seu CRM.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Nome do ${labels.singular.toLowerCase()}`}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.pt"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <PhoneInput
                value={phone}
                onChange={setPhone}
                placeholder="912 345 678"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Empresa</Label>
              <Input
                id="company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Nome da empresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nif">NIF</Label>
              <Input
                id="nif"
                value={nif}
                onChange={(e) => setNif(e.target.value)}
                placeholder="123456789"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ClientStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CLIENT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source">Origem</Label>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CLIENT_SOURCE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="assigned_to">Vendedor Responsável</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Sem responsável atribuído" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Morada</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Input
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Rua, número"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Input
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apartamento, andar (opcional)"
                />
              </div>
              <div className="space-y-2">
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="Código Postal"
                />
              </div>
              <div className="space-y-2">
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="País" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Notas sobre o ${labels.singular.toLowerCase()}...`}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!name.trim() || createClient.isPending}>
              {createClient.isPending ? "A criar..." : `Criar ${labels.singular}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
