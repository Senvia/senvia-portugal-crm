import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  useOrganizationProfiles,
  OrganizationProfile,
  GranularPermissions,
  MODULE_SCHEMA,
  ACTION_LABELS,
  buildDefaultPermissions,
  buildAllPermissions,
} from '@/hooks/useOrganizationProfiles';
import { Shield, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

const BASE_ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  viewer: 'Visualizador',
  salesperson: 'Vendedor',
};

export function ProfilesTab() {
  const { profiles, isLoading, createProfile, updateProfile, deleteProfile } = useOrganizationProfiles();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<OrganizationProfile | null>(null);

  const [name, setName] = useState('');
  const [baseRole, setBaseRole] = useState<string>('salesperson');
  const [permissions, setPermissions] = useState<GranularPermissions>(buildDefaultPermissions('salesperson'));

  const openCreate = () => {
    setEditingProfile(null);
    setName('');
    setBaseRole('salesperson');
    setPermissions(buildDefaultPermissions('salesperson'));
    setIsOpen(true);
  };

  const openEdit = (profile: OrganizationProfile) => {
    setEditingProfile(profile);
    setName(profile.name);
    setBaseRole(profile.base_role);
    setPermissions(profile.module_permissions);
    setIsOpen(true);
  };

  const handleBaseRoleChange = (role: string) => {
    setBaseRole(role);
    if (!editingProfile) {
      setPermissions(buildDefaultPermissions(role));
    }
  };

  const toggleAction = (module: string, subarea: string, action: string) => {
    setPermissions(prev => {
      const mod = prev[module];
      const sub = mod?.subareas?.[subarea] || {};
      const newValue = !sub[action];

      const newSub = { ...sub, [action]: newValue };
      // If disabling view, disable all in subarea
      if (action === 'view' && !newValue) {
        for (const k of Object.keys(newSub)) newSub[k] = false;
      }
      // If enabling a non-view action, enable view
      if (action !== 'view' && newValue) {
        newSub.view = true;
      }

      return {
        ...prev,
        [module]: {
          subareas: { ...mod?.subareas, [subarea]: newSub },
        },
      };
    });
  };

  const setModuleAll = (module: string, value: boolean) => {
    setPermissions(prev => {
      const schema = MODULE_SCHEMA[module];
      if (!schema) return prev;
      const subareas: Record<string, Record<string, boolean>> = {};
      for (const [subKey, subSchema] of Object.entries(schema.subareas)) {
        const actions: Record<string, boolean> = {};
        for (const action of subSchema.actions) actions[action] = value;
        subareas[subKey] = actions;
      }
      return { ...prev, [module]: { subareas } };
    });
  };

  const isModuleAllEnabled = (module: string): boolean => {
    const mod = permissions[module];
    if (!mod?.subareas) return false;
    const schema = MODULE_SCHEMA[module];
    if (!schema) return false;
    for (const [subKey, subSchema] of Object.entries(schema.subareas)) {
      for (const action of subSchema.actions) {
        if (!mod.subareas[subKey]?.[action]) return false;
      }
    }
    return true;
  };

  const isModulePartial = (module: string): boolean => {
    const mod = permissions[module];
    if (!mod?.subareas) return false;
    let hasTrue = false, hasFalse = false;
    const schema = MODULE_SCHEMA[module];
    if (!schema) return false;
    for (const [subKey, subSchema] of Object.entries(schema.subareas)) {
      for (const action of subSchema.actions) {
        if (mod.subareas[subKey]?.[action]) hasTrue = true;
        else hasFalse = true;
      }
    }
    return hasTrue && hasFalse;
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (editingProfile) {
      updateProfile.mutate({ id: editingProfile.id, name: name.trim(), base_role: baseRole, module_permissions: permissions }, {
        onSuccess: () => setIsOpen(false),
      });
    } else {
      createProfile.mutate({ name: name.trim(), base_role: baseRole, module_permissions: permissions }, {
        onSuccess: () => setIsOpen(false),
      });
    }
  };

  const handleDelete = (profile: OrganizationProfile) => {
    if (profile.is_default) return;
    deleteProfile.mutate(profile.id);
  };

  // Count active permissions for a profile badge summary
  const getActiveModules = (perms: GranularPermissions): string[] => {
    return Object.entries(MODULE_SCHEMA)
      .filter(([key]) => {
        const mod = perms[key];
        if (!mod?.subareas) return false;
        return Object.values(mod.subareas).some(sub => Object.values(sub).some(v => v));
      })
      .map(([, schema]) => schema.label);
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-32" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Perfis de Acesso
            </CardTitle>
            <CardDescription>
              Defina perfis com permissões granulares por módulo e sub-área.
            </CardDescription>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Criar Perfil
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {profiles.map(profile => (
              <div key={profile.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{profile.name}</p>
                    {profile.is_default && <Badge variant="outline" className="text-xs">Padrão</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Base: {BASE_ROLE_LABELS[profile.base_role] || profile.base_role}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {getActiveModules(profile.module_permissions).map(label => (
                      <Badge key={label} variant="secondary" className="text-xs">{label}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(profile)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {!profile.is_default && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(profile)} disabled={deleteProfile.isPending}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProfile ? 'Editar Perfil' : 'Criar Perfil'}</DialogTitle>
            <DialogDescription>
              Configure permissões granulares por módulo e sub-área.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome do Perfil</Label>
              <Input placeholder="Ex: Diretor Comercial" value={name} onChange={e => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Role Base</Label>
              <Select value={baseRole} onValueChange={handleBaseRoleChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                  <SelectItem value="salesperson">Vendedor</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Define as políticas de segurança base.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Permissões por Módulo</Label>
              <Accordion type="multiple" className="border rounded-lg">
                {Object.entries(MODULE_SCHEMA).map(([moduleKey, schema]) => {
                  const allEnabled = isModuleAllEnabled(moduleKey);
                  const partial = isModulePartial(moduleKey);

                  return (
                    <AccordionItem key={moduleKey} value={moduleKey} className="border-b last:border-b-0">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="font-medium text-sm">{schema.label}</span>
                          {allEnabled && <Badge variant="secondary" className="text-xs">Tudo</Badge>}
                          {partial && !allEnabled && <Badge variant="outline" className="text-xs">Parcial</Badge>}
                          {!allEnabled && !partial && <Badge variant="outline" className="text-xs text-muted-foreground">Desativado</Badge>}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        <div className="flex gap-2 mb-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setModuleAll(moduleKey, true)}
                          >
                            Tudo
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setModuleAll(moduleKey, false)}
                          >
                            Nada
                          </Button>
                        </div>

                        <div className="space-y-4">
                          {Object.entries(schema.subareas).map(([subKey, subSchema]) => {
                            const subPerms = permissions[moduleKey]?.subareas?.[subKey] || {};
                            return (
                              <div key={subKey} className="space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  {subSchema.label}
                                </p>
                                <div className="flex flex-wrap gap-x-4 gap-y-2">
                                  {subSchema.actions.map(action => (
                                    <label key={action} className="flex items-center gap-1.5 cursor-pointer">
                                      <Checkbox
                                        checked={subPerms[action] ?? false}
                                        onCheckedChange={() => toggleAction(moduleKey, subKey, action)}
                                      />
                                      <span className="text-sm">{ACTION_LABELS[action] || action}</span>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!name.trim() || createProfile.isPending || updateProfile.isPending}>
              {(createProfile.isPending || updateProfile.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingProfile ? 'Guardar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
