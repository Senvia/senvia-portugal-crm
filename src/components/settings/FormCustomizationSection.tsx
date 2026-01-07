import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Palette, Type, MessageSquare, CheckCircle, Eye, Save } from "lucide-react";
import { useUpdateOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FormSettings, DEFAULT_FORM_SETTINGS } from '@/types';
import { Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { PRODUCTION_URL } from '@/lib/constants';

export function FormCustomizationSection() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const updateOrganization = useUpdateOrganization();

  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<FormSettings>(DEFAULT_FORM_SETTINGS);

  // Fetch current form_settings
  useEffect(() => {
    async function fetchFormSettings() {
      if (!organization?.id) return;

      setIsLoading(true);
      const { data, error } = await supabase
        .from('organizations')
        .select('form_settings')
        .eq('id', organization.id)
        .single();

      if (!error && data?.form_settings) {
        // Merge with defaults to ensure all fields exist
        const fetchedSettings = data.form_settings as unknown as Partial<FormSettings>;
        setSettings({ ...DEFAULT_FORM_SETTINGS, ...fetchedSettings });
      }
      setIsLoading(false);
    }

    fetchFormSettings();
  }, [organization?.id]);

  const handleSave = () => {
    updateOrganization.mutate({ form_settings: settings as unknown as Json });
  };

  const handlePreview = () => {
    if (organization?.public_key) {
      // Use current origin for preview (works in both test and production)
      window.open(`${window.location.origin}/p/${organization.public_key}`, '_blank');
    }
  };

  const updateSetting = <K extends keyof FormSettings>(key: K, value: FormSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateLabel = (key: keyof FormSettings['labels'], value: string) => {
    setSettings(prev => ({
      ...prev,
      labels: { ...prev.labels, [key]: value }
    }));
  };

  const updateSuccessMessage = (key: keyof FormSettings['success_message'], value: string) => {
    setSettings(prev => ({
      ...prev,
      success_message: { ...prev.success_message, [key]: value }
    }));
  };

  const isValidHexColor = (color: string) => /^#[0-9A-Fa-f]{6}$/.test(color);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Personalizar Formulário
        </CardTitle>
        <CardDescription>
          Configure a aparência e os campos do seu formulário público.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Type className="h-4 w-4" />
            VISUAL
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="form-title">Título</Label>
              <Input
                id="form-title"
                value={settings.title}
                onChange={(e) => updateSetting('title', e.target.value)}
                maxLength={100}
                placeholder="Deixe o seu Contacto"
              />
              <p className="text-xs text-muted-foreground">{settings.title.length}/100</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="form-color">Cor Principal</Label>
              <div className="flex gap-2">
                <Input
                  id="form-color"
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => updateSetting('primary_color', e.target.value)}
                  className="w-14 h-10 p-1 cursor-pointer"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => updateSetting('primary_color', e.target.value)}
                  placeholder="#3B82F6"
                  maxLength={7}
                  className={!isValidHexColor(settings.primary_color) ? 'border-destructive' : ''}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-subtitle">Subtítulo</Label>
            <Textarea
              id="form-subtitle"
              value={settings.subtitle}
              onChange={(e) => updateSetting('subtitle', e.target.value)}
              maxLength={200}
              placeholder="Preencha os dados abaixo..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">{settings.subtitle.length}/200</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="form-logo">URL do Logo</Label>
            <Input
              id="form-logo"
              type="url"
              value={settings.logo_url || ''}
              onChange={(e) => updateSetting('logo_url', e.target.value || null)}
              placeholder="https://exemplo.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Deixe vazio para usar o ícone padrão.
            </p>
          </div>
        </div>

        <Separator />

        {/* Field Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            CAMPOS
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label htmlFor="show-message" className="font-medium">Campo de Mensagem</Label>
              <p className="text-sm text-muted-foreground">Permitir que visitantes deixem uma mensagem opcional.</p>
            </div>
            <Switch
              id="show-message"
              checked={settings.show_message_field}
              onCheckedChange={(checked) => updateSetting('show_message_field', checked)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="label-name">Label Nome</Label>
              <Input
                id="label-name"
                value={settings.labels.name}
                onChange={(e) => updateLabel('name', e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label-email">Label Email</Label>
              <Input
                id="label-email"
                value={settings.labels.email}
                onChange={(e) => updateLabel('email', e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label-phone">Label Telemóvel</Label>
              <Input
                id="label-phone"
                value={settings.labels.phone}
                onChange={(e) => updateLabel('phone', e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="label-message">Label Mensagem</Label>
              <Input
                id="label-message"
                value={settings.labels.message}
                onChange={(e) => updateLabel('message', e.target.value)}
                maxLength={50}
                disabled={!settings.show_message_field}
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Message Settings */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CheckCircle className="h-4 w-4" />
            MENSAGENS
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="success-title">Título de Sucesso</Label>
              <Input
                id="success-title"
                value={settings.success_message.title}
                onChange={(e) => updateSuccessMessage('title', e.target.value)}
                maxLength={100}
                placeholder="Obrigado!"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="error-message">Mensagem de Erro</Label>
              <Input
                id="error-message"
                value={settings.error_message}
                onChange={(e) => updateSetting('error_message', e.target.value)}
                maxLength={200}
                placeholder="Não foi possível enviar..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="success-desc">Descrição de Sucesso</Label>
            <Textarea
              id="success-desc"
              value={settings.success_message.description}
              onChange={(e) => updateSuccessMessage('description', e.target.value)}
              maxLength={300}
              rows={2}
              placeholder="Recebemos o seu contacto..."
            />
            <p className="text-xs text-muted-foreground">{settings.success_message.description.length}/300</p>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="mr-2 h-4 w-4" />
            Pré-visualizar
          </Button>
          <Button onClick={handleSave} disabled={updateOrganization.isPending}>
            {updateOrganization.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar Alterações
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
