import { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  ResizableHandle, 
  ResizablePanel, 
  ResizablePanelGroup 
} from "@/components/ui/resizable";
import { 
  Loader2, 
  Palette, 
  MessageSquare, 
  CheckCircle, 
  ExternalLink, 
  Save,
  Sparkles,
  ImageIcon,
  LayoutList
} from "lucide-react";
import { useUpdateOrganization } from '@/hooks/useOrganization';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FormSettings, DEFAULT_FORM_SETTINGS, migrateFormSettings } from '@/types';
import { Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { FormPreview } from './FormPreview';
import { LogoUploader } from './LogoUploader';
import { CustomFieldsEditor } from './CustomFieldsEditor';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#0EA5E9', // Sky
];

export function FormCustomizationSection() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const updateOrganization = useUpdateOrganization();

  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<FormSettings>(DEFAULT_FORM_SETTINGS);
  const [showSuccessPreview, setShowSuccessPreview] = useState(false);

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
        // Migrate old format to new format if needed
        const migratedSettings = migrateFormSettings(data.form_settings);
        setSettings(migratedSettings);
      }
      setIsLoading(false);
    }

    fetchFormSettings();
  }, [organization?.id]);

  const handleSave = () => {
    updateOrganization.mutate(
      { form_settings: settings as unknown as Json },
      {
        onSuccess: () => {
          toast({
            title: "Alterações guardadas",
            description: "O formulário foi atualizado com sucesso.",
          });
        }
      }
    );
  };

  const handlePreview = () => {
    if (!organization?.public_key) {
      toast({
        title: "Erro",
        description: "Não foi possível obter o link do formulário.",
        variant: "destructive",
      });
      return;
    }
    const url = `${window.location.origin}/p/${organization.public_key}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const updateSetting = <K extends keyof FormSettings>(key: K, value: FormSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
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
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-12rem)] min-h-[600px]">
      <ResizablePanelGroup direction="horizontal" className="h-full rounded-xl border bg-background">
        {/* Editor Panel */}
        <ResizablePanel defaultSize={50} minSize={30} maxSize={70}>
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold">Editor de Formulário</h2>
                <p className="text-sm text-muted-foreground">
                  Personalize a aparência e comportamento
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handlePreview}
                  disabled={!organization?.public_key}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir
                </Button>
                <Button size="sm" onClick={handleSave} disabled={updateOrganization.isPending}>
                  {updateOrganization.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar
                </Button>
              </div>
            </div>

            {/* Accordion Sections */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <Accordion type="multiple" defaultValue={["appearance", "fields", "messages"]} className="space-y-3 sm:space-y-4">
                
                {/* Appearance Section */}
                <AccordionItem value="appearance" className="border rounded-xl px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Palette className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <span className="font-medium">Aparência</span>
                        <p className="text-xs text-muted-foreground font-normal">
                          Título, subtítulo, logo e cores
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-2 space-y-5">
                    {/* Title */}
                    <div className="space-y-2">
                      <Label htmlFor="form-title" className="flex items-center gap-2 text-sm">
                        Título do Formulário
                      </Label>
                      <Input
                        id="form-title"
                        value={settings.title}
                        onChange={(e) => updateSetting('title', e.target.value)}
                        maxLength={100}
                        placeholder="Contacte-nos"
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground text-right">{settings.title.length}/100</p>
                    </div>

                    {/* Subtitle */}
                    <div className="space-y-2">
                      <Label htmlFor="form-subtitle" className="flex items-center gap-2 text-sm">
                        Subtítulo
                      </Label>
                      <Textarea
                        id="form-subtitle"
                        value={settings.subtitle}
                        onChange={(e) => updateSetting('subtitle', e.target.value)}
                        maxLength={200}
                        placeholder="Preencha o formulário e entraremos em contacto"
                        rows={2}
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground text-right">{settings.subtitle.length}/200</p>
                    </div>

                    {/* Logo Upload */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-sm">
                        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        Logo
                      </Label>
                      <LogoUploader
                        value={settings.logo_url}
                        onChange={(url) => updateSetting('logo_url', url)}
                      />
                    </div>

                    {/* Primary Color */}
                    <div className="space-y-3">
                      <Label className="flex items-center gap-2 text-sm">
                        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                        Cor Principal
                      </Label>
                      
                      {/* Color Presets */}
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            className={cn(
                              "h-8 w-8 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary",
                              settings.primary_color.toLowerCase() === color.toLowerCase() && "ring-2 ring-offset-2 ring-primary scale-110"
                            )}
                            style={{ backgroundColor: color }}
                            onClick={() => updateSetting('primary_color', color)}
                            title={color}
                          />
                        ))}
                      </div>

                      {/* Custom Color Input */}
                      <div className="flex gap-3 items-center">
                        <div 
                          className="h-11 w-11 rounded-lg border-2 flex-shrink-0 transition-colors"
                          style={{ 
                            backgroundColor: settings.primary_color,
                            borderColor: isValidHexColor(settings.primary_color) ? settings.primary_color : 'hsl(var(--destructive))'
                          }}
                        />
                        <Input
                          value={settings.primary_color}
                          onChange={(e) => updateSetting('primary_color', e.target.value)}
                          placeholder="#3B82F6"
                          maxLength={7}
                          className={cn(
                            "h-11 font-mono uppercase",
                            !isValidHexColor(settings.primary_color) && 'border-destructive focus-visible:ring-destructive'
                          )}
                        />
                      </div>
                      {!isValidHexColor(settings.primary_color) && (
                        <p className="text-xs text-destructive">Formato inválido. Use #RRGGBB</p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Fields Section */}
                <AccordionItem value="fields" className="border rounded-xl px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                        <LayoutList className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="text-left">
                        <span className="font-medium">Campos</span>
                        <p className="text-xs text-muted-foreground font-normal">
                          Labels, campos fixos e personalizados
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-2">
                    <CustomFieldsEditor 
                      settings={settings} 
                      onUpdateSettings={setSettings} 
                    />
                  </AccordionContent>
                </AccordionItem>

                {/* Messages Section */}
                <AccordionItem value="messages" className="border rounded-xl px-4">
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                        <CheckCircle className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="text-left">
                        <span className="font-medium">Mensagens</span>
                        <p className="text-xs text-muted-foreground font-normal">
                          Textos de sucesso e erro
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pt-2 space-y-5">
                    {/* Success Title */}
                    <div className="space-y-2">
                      <Label htmlFor="success-title" className="text-sm">Título de Sucesso</Label>
                      <Input
                        id="success-title"
                        value={settings.success_message.title}
                        onChange={(e) => updateSuccessMessage('title', e.target.value)}
                        maxLength={100}
                        placeholder="Obrigado!"
                        className="h-11"
                      />
                    </div>

                    {/* Success Description */}
                    <div className="space-y-2">
                      <Label htmlFor="success-desc" className="text-sm">Descrição de Sucesso</Label>
                      <Textarea
                        id="success-desc"
                        value={settings.success_message.description}
                        onChange={(e) => updateSuccessMessage('description', e.target.value)}
                        maxLength={300}
                        rows={2}
                        placeholder="Recebemos o seu contacto e entraremos em contacto brevemente."
                        className="resize-none"
                      />
                      <p className="text-xs text-muted-foreground text-right">
                        {settings.success_message.description.length}/300
                      </p>
                    </div>

                    {/* Error Message */}
                    <div className="space-y-2">
                      <Label htmlFor="error-message" className="text-sm">Mensagem de Erro</Label>
                      <Input
                        id="error-message"
                        value={settings.error_message}
                        onChange={(e) => updateSetting('error_message', e.target.value)}
                        maxLength={200}
                        placeholder="Não foi possível enviar. Tente novamente."
                        className="h-11"
                      />
                    </div>

                    {/* Preview Success Toggle */}
                    <div className="flex items-center gap-3 pt-2">
                      <Switch
                        id="preview-success"
                        checked={showSuccessPreview}
                        onCheckedChange={setShowSuccessPreview}
                      />
                      <Label htmlFor="preview-success" className="text-sm cursor-pointer">
                        Ver preview da mensagem de sucesso
                      </Label>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Preview Panel */}
        <ResizablePanel defaultSize={50} minSize={30} maxSize={70}>
          <div className="flex h-full flex-col bg-muted/30">
            {/* Preview Header */}
            <div className="flex items-center justify-between border-b bg-background px-6 py-4">
              <div>
                <h3 className="text-sm font-medium">Preview</h3>
                <p className="text-xs text-muted-foreground">
                  As alterações são refletidas em tempo real
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-muted-foreground">Live</span>
              </div>
            </div>

            {/* Preview Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
              <div className="mx-auto w-full max-w-lg xl:max-w-xl">
                <FormPreview settings={settings} showSuccess={showSuccessPreview} />
              </div>
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
