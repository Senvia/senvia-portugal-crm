import { useState } from 'react';
import { useTeamMembers, usePendingInvites, useCreateInvite, useCancelInvite, useResendInvite, PendingInvite } from '@/hooks/useTeam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Copy, X, Check, Clock, Loader2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  viewer: 'Visualizador',
  super_admin: 'Super Admin',
};

const ROLE_VARIANTS: Record<string, 'default' | 'secondary' | 'outline'> = {
  admin: 'default',
  viewer: 'secondary',
  super_admin: 'default',
};

export function TeamTab() {
  const { data: members, isLoading: loadingMembers } = useTeamMembers();
  const { data: invites, isLoading: loadingInvites } = usePendingInvites();
  const createInvite = useCreateInvite();
  const cancelInvite = useCancelInvite();
  const resendInvite = useResendInvite();
  const { toast } = useToast();

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'viewer'>('viewer');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);

  const handleCreateInvite = async () => {
    if (!inviteEmail.trim()) return;

    createInvite.mutate(
      { email: inviteEmail, role: inviteRole },
      {
        onSuccess: (data) => {
          const link = `${window.location.origin}/invite/${data.token}`;
          setGeneratedLink(link);
        },
      }
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: 'Copiado!', description: 'Link copiado para a área de transferência.' });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyInviteLink = (invite: PendingInvite) => {
    const link = `${window.location.origin}/invite/${invite.token}`;
    navigator.clipboard.writeText(link);
    setCopiedInviteId(invite.id);
    toast({ title: 'Link copiado!', description: 'Link de convite copiado para a área de transferência.' });
    setTimeout(() => setCopiedInviteId(null), 2000);
  };

  const handleResendInvite = (invite: PendingInvite) => {
    resendInvite.mutate(invite.id);
  };

  const handleCloseDialog = () => {
    setIsInviteOpen(false);
    setInviteEmail('');
    setInviteRole('viewer');
    setGeneratedLink(null);
    setCopied(false);
  };

  const handleCancelInvite = (invite: PendingInvite) => {
    cancelInvite.mutate(invite.id);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membros da Equipa
            </CardTitle>
            <CardDescription>
              Gerencie os utilizadores da sua organização.
            </CardDescription>
          </div>
          <Dialog open={isInviteOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsInviteOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Convidar Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              {!generatedLink ? (
                <>
                  <DialogHeader>
                    <DialogTitle>Convidar Novo Membro</DialogTitle>
                    <DialogDescription>
                      Gere um link de convite para adicionar um novo membro à sua organização.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="invite-email">Email</Label>
                      <Input
                        id="invite-email"
                        type="email"
                        placeholder="email@exemplo.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label>Perfil</Label>
                      <RadioGroup value={inviteRole} onValueChange={(v) => setInviteRole(v as 'admin' | 'viewer')}>
                        <div className="flex items-start space-x-3 rounded-lg border p-3">
                          <RadioGroupItem value="admin" id="role-admin" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="role-admin" className="font-medium cursor-pointer">
                              Administrador
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Pode editar tudo: leads, definições e equipa.
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-3 rounded-lg border p-3">
                          <RadioGroupItem value="viewer" id="role-viewer" className="mt-1" />
                          <div className="flex-1">
                            <Label htmlFor="role-viewer" className="font-medium cursor-pointer">
                              Visualizador
                            </Label>
                            <p className="text-sm text-muted-foreground">
                              Só pode ver leads e mudar estados. Não pode eliminar nem aceder a definições.
                            </p>
                          </div>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={handleCloseDialog}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={handleCreateInvite}
                      disabled={!inviteEmail.trim() || createInvite.isPending}
                    >
                      {createInvite.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Gerar Link de Convite
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-success">
                      <Check className="h-5 w-5" />
                      Link de Convite Gerado!
                    </DialogTitle>
                    <DialogDescription>
                      Copie este link e envie-o por WhatsApp ou email ao novo membro.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex gap-2">
                      <Input value={generatedLink} readOnly className="font-mono text-sm" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedLink)}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      Este link expira em 7 dias.
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCloseDialog}>Fechar</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loadingMembers ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members?.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name}</TableCell>
                    <TableCell>
                      <Badge variant={ROLE_VARIANTS[member.role] || 'secondary'}>
                        {ROLE_LABELS[member.role] || member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-success border-success">
                        Ativo
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {(!members || members.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Nenhum membro encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {(invites && invites.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Convites Pendentes ({invites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingInvites ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow key={invite.id}>
                      <TableCell className="font-medium">{invite.email}</TableCell>
                      <TableCell>
                        <Badge variant={ROLE_VARIANTS[invite.role] || 'secondary'}>
                          {ROLE_LABELS[invite.role] || invite.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(invite.expires_at), { 
                          addSuffix: true, 
                          locale: pt 
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => copyInviteLink(invite)}
                            title="Copiar link de convite"
                          >
                            {copiedInviteId === invite.id ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleResendInvite(invite)}
                            disabled={resendInvite.isPending}
                            title="Reenviar convite (renova expiração)"
                          >
                            <RefreshCw className={`h-4 w-4 ${resendInvite.isPending ? 'animate-spin' : ''}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleCancelInvite(invite)}
                            disabled={cancelInvite.isPending}
                            title="Cancelar convite"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
