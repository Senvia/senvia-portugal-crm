import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const isValid = useMemo(() => {
    if (!name.trim()) return false;
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
      <DialogContent variant="fullScreen" className="flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b shrink-0">
          <DialogTitle>Editar {labels.singular}</DialogTitle>
          <DialogDescription>
            Atualize as informações do {labels.singular.toLowerCase()}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-3 space-y-4">
                {/* Basic Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    </div>
                  </CardContent>
                </Card>

                {/* Address */}
                {settings.address.visible && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {settings.address.label} {settings.address.required && '*'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                          <Input
                            value={addressLine1}
                            onChange={(e) => setAddressLine1(e.target.value)}
                            placeholder="Rua, número"
                            required={settings.address.required}
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <Input
                            value={addressLine2}
                            onChange={(e) => setAddressLine2(e.target.value)}
                            placeholder="Apartamento, andar (opcional)"
                          />
                        </div>
                        <Input
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="Código Postal"
                        />
                        <Input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Cidade"
                        />
                        <div className="sm:col-span-2">
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
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                {settings.notes.visible && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {settings.notes.label} {settings.notes.required && '*'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        id="edit-notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={`Notas sobre o ${labels.singular.toLowerCase()}...`}
                        rows={4}
                        required={settings.notes.required}
                      />
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Sticky */}
              <div className="lg:col-span-2">
                <div className="lg:sticky lg:top-0 space-y-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Classificação</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>{labels.statusFieldLabel}</Label>
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
                        <Label>Origem</Label>
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

                      <div className="space-y-2">
                        <Label>Vendedor Responsável</Label>
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
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <Button type="submit" disabled={!isValid || updateClient.isPending} className="w-full">
                      {updateClient.isPending ? "A guardar..." : "Guardar Alterações"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                      Cancelar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
