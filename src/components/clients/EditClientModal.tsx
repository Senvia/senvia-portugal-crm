import { useState, useEffect, useMemo } from "react";
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
import { useUpdateClient } from "@/hooks/useClients";
import { useClientLabels } from "@/hooks/useClientLabels";
import { useTeamMembers } from "@/hooks/useTeam";
import { useClientFieldsSettings } from "@/hooks/useClientFieldsSettings";
import { CrmClient, CLIENT_STATUS_LABELS, CLIENT_SOURCE_LABELS, ClientStatus, DEFAULT_CLIENT_FIELDS_SETTINGS } from "@/types/clients";
import { COUNTRIES } from "@/lib/countries";

interface EditClientModalProps {
  client: CrmClient | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditClientModal({ client, open, onOpenChange }: EditClientModalProps) {
  const labels = useClientLabels();
  const { data: teamMembers = [] } = useTeamMembers();
  const { data: fieldSettings } = useClientFieldsSettings();
  
  // Use default settings if not loaded yet
  const settings = fieldSettings || DEFAULT_CLIENT_FIELDS_SETTINGS;
  
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

  const updateClient = useUpdateClient();

  useEffect(() => {
    if (client) {
      setName(client.name);
      setEmail(client.email || "");
      setPhone(client.phone || "");
      setCompany(client.company || "");
      setNif(client.nif || "");
      setStatus(client.status);
      setSource(client.source || "");
      setNotes(client.notes || "");
      setAssignedTo(client.assigned_to || "");
      setAddressLine1(client.address_line1 || "");
      setAddressLine2(client.address_line2 || "");
      setCity(client.city || "");
      setPostalCode(client.postal_code || "");
      setCountry(client.country || "PT");
    }
  }, [client]);

  // Validate required fields
  const isValid = useMemo(() => {
    // Name is always required
    if (!name.trim()) return false;
    
    // Check other required fields
    if (settings.email.visible && settings.email.required && !email.trim()) return false;
    if (settings.phone.visible && settings.phone.required && !phone.trim()) return false;
    if (settings.company.visible && settings.company.required && !company.trim()) return false;
    if (settings.nif.visible && settings.nif.required && !nif.trim()) return false;
    if (settings.address.visible && settings.address.required && !addressLine1.trim()) return false;
    if (settings.notes.visible && settings.notes.required && !notes.trim()) return false;
    
    return true;
  }, [name, email, phone, company, nif, addressLine1, notes, settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!client || !isValid) return;

    updateClient.mutate(
      {
        id: client.id,
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        company: company.trim() || null,
        nif: nif.trim() || null,
        status,
        source: source || null,
        notes: notes.trim() || null,
        address_line1: addressLine1.trim() || null,
        address_line2: addressLine2.trim() || null,
        city: city.trim() || null,
        postal_code: postalCode.trim() || null,
        country: country || null,
        assigned_to: assignedTo || null,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {labels.singular}</DialogTitle>
          <DialogDescription>
            Atualize as informações do {labels.singular.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name - Always visible */}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-name">{settings.name.label} *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Nome do ${labels.singular.toLowerCase()}`}
                required
              />
            </div>

            {/* Email */}
            {settings.email.visible && (
              <div className="space-y-2">
                <Label htmlFor="edit-email">
                  {settings.email.label} {settings.email.required && '*'}
                </Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.pt"
                  required={settings.email.required}
                />
              </div>
            )}

            {/* Phone */}
            {settings.phone.visible && (
              <div className="space-y-2">
                <Label htmlFor="edit-phone">
                  {settings.phone.label} {settings.phone.required && '*'}
                </Label>
                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  placeholder="912 345 678"
                />
              </div>
            )}

            {/* Company */}
            {settings.company.visible && (
              <div className="space-y-2">
                <Label htmlFor="edit-company">
                  {settings.company.label} {settings.company.required && '*'}
                </Label>
                <Input
                  id="edit-company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nome da empresa"
                  required={settings.company.required}
                />
              </div>
            )}

            {/* NIF */}
            {settings.nif.visible && (
              <div className="space-y-2">
                <Label htmlFor="edit-nif">
                  {settings.nif.label} {settings.nif.required && '*'}
                </Label>
                <Input
                  id="edit-nif"
                  value={nif}
                  onChange={(e) => setNif(e.target.value)}
                  placeholder="123456789"
                  required={settings.nif.required}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-status">{labels.statusFieldLabel}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ClientStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{labels.statusActive}</SelectItem>
                  <SelectItem value="inactive">{labels.statusInactive}</SelectItem>
                  <SelectItem value="vip">{labels.statusVip}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-source">Origem</Label>
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
              <Label htmlFor="edit-assigned_to">Vendedor Responsável</Label>
              <Select 
                value={assignedTo || "none"} 
                onValueChange={(v) => setAssignedTo(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem responsável atribuído" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem responsável</SelectItem>
                  {teamMembers
                    .filter((member) => member.user_id)
                    .map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id}>
                        {member.full_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Address Section */}
          {settings.address.visible && (
            <div className="space-y-3 pt-2">
              <Label className="text-sm font-medium">
                {settings.address.label} {settings.address.required && '*'}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Input
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    placeholder="Rua, número"
                    required={settings.address.required}
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
          )}

          {/* Notes */}
          {settings.notes.visible && (
            <div className="space-y-2">
              <Label htmlFor="edit-notes">
                {settings.notes.label} {settings.notes.required && '*'}
              </Label>
              <Textarea
                id="edit-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={`Notas sobre o ${labels.singular.toLowerCase()}...`}
                rows={3}
                required={settings.notes.required}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid || updateClient.isPending}>
              {updateClient.isPending ? "A guardar..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
