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
import { useOrganizationProfiles, OrganizationProfile, ModulePermissions, MODULE_LABELS, DEFAULT_ADMIN_PERMISSIONS, DEFAULT_VIEWER_PERMISSIONS } from '@/hooks/useOrganizationProfiles';
import { Shield, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

const BASE_ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  viewer: 'Visualizador',
  salesperson: 'Vendedor',
};

const DEFAULT_SALES_PERMISSIONS: ModulePermissions = {
  leads: { view: true, edit: true, delete: false },
  clients: { view: true, edit: true, delete: false },
  proposals: { view: true, edit: true, delete: false },
  sales: { view: true, edit: true, delete: false },
  finance: { view: false, edit: false, delete: false },
  calendar: { view: true, edit: true, delete: false },
  marketing: { view: false, edit: false, delete: false },
  ecommerce: { view: false, edit: false, delete: false },
  settings: { view: false, edit: false, delete: false },
};

function getDefaultPermissions(role: string): ModulePermissions {
  if (role === 'admin') return { ...DEFAULT_ADMIN_PERMISSIONS };
  if (role === 'viewer') return { ...DEFAULT_VIEWER_PERMISSIONS };
  return { ...DEFAULT_SALES_PERMISSIONS };
}

export function ProfilesTab() {
  const { profiles, isLoading, createProfile, updateProfile, deleteProfile } = useOrganizationProfiles();
  const [isOpen, setIsOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<OrganizationProfile | null>(null);
  
  const [name, setName] = useState('');
  const [baseRole, setBaseRole] = useState<string>('salesperson');
  const [permissions, setPermissions] = useState<ModulePermissions>(getDefaultPermissions('salesperson'));

  const openCreate = () => {
    setEditingProfile(null);
    setName('');
    setBaseRole('salesperson');
    setPermissions(getDefaultPermissions('salesperson'));
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
      setPermissions(getDefaultPermissions(role));
    }
  };

  const togglePermission = (module: keyof ModulePermissions, action: 'view' | 'edit' | 'delete') => {
    setPermissions(prev => {
      const current = prev[module];
      const newValue = !current[action];
      
      // If disabling view, disable edit and delete too
      if (action === 'view' && !newValue) {
        return { ...prev, [module]: { view: false, edit: false, delete: false } };
      }
      // If enabling edit or delete, enable view too
      if ((action === 'edit' || action === 'delete') && newValue) {
        return { ...prev, [module]: { ...current, [action]: true, view: true } };
      }
      
      return { ...prev, [module]: { ...current, [action]: newValue } };
    });
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
              Defina perfis com permissões personalizadas por módulo.
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
                    {(Object.keys(MODULE_LABELS) as (keyof ModulePermissions)[]).map(mod => {
                      const perm = profile.module_permissions[mod];
                      if (!perm?.view) return null;
                      return (
                        <Badge key={mod} variant="secondary" className="text-xs">
                          {MODULE_LABELS[mod]}
                          {perm.edit && ' ✎'}
                          {perm.delete && ' ✕'}
                        </Badge>
                      );
                    })}
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
              Configure o nome, role base e permissões por módulo.
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
                Define as políticas de segurança base na base de dados.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Permissões por Módulo</Label>
              <div className="border rounded-lg overflow-hidden">
                <div className="grid grid-cols-4 gap-0 bg-muted px-4 py-2 text-xs font-medium text-muted-foreground">
                  <span>Módulo</span>
                  <span className="text-center">Ver</span>
                  <span className="text-center">Editar</span>
                  <span className="text-center">Eliminar</span>
                </div>
                {(Object.keys(MODULE_LABELS) as (keyof ModulePermissions)[]).map(mod => (
                  <div key={mod} className="grid grid-cols-4 gap-0 px-4 py-3 border-t items-center">
                    <span className="text-sm font-medium">{MODULE_LABELS[mod]}</span>
                    {(['view', 'edit', 'delete'] as const).map(action => (
                      <div key={action} className="flex justify-center">
                        <Checkbox
                          checked={permissions[mod]?.[action] ?? false}
                          onCheckedChange={() => togglePermission(mod, action)}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
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
