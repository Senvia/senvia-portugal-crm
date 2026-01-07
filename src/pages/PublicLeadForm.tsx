import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PRODUCTION_URL } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { FormSettings, DEFAULT_FORM_SETTINGS, CustomField, migrateFormSettings } from '@/types';

interface Organization {
  id: string;
  name: string;
  form_settings: FormSettings | null;
}

export default function PublicLeadForm() {
  const { public_key } = useParams<{ public_key: string }>();
  const { toast } = useToast();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [settings, setSettings] = useState<FormSettings>(DEFAULT_FORM_SETTINGS);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [gdprConsent, setGdprConsent] = useState(false);
  const [customData, setCustomData] = useState<Record<string, string | number | boolean>>({});

  // UTM parameters detection
  const mapSourceToLabel = (source: string | null): string => {
    if (!source) return 'Direto';
    
    const mapping: Record<string, string> = {
      'facebook': 'Facebook',
      'fb': 'Facebook',
      'instagram': 'Instagram',
      'ig': 'Instagram',
      'google': 'Google',
      'youtube': 'Youtube',
      'linkedin': 'LinkedIn',
      'tiktok': 'TikTok',
      'twitter': 'Twitter',
      'x': 'Twitter',
      'email': 'Email Marketing',
      'newsletter': 'Newsletter',
      'whatsapp': 'WhatsApp',
      'sms': 'SMS',
    };
    
    return mapping[source.toLowerCase()] || source;
  };

  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source');
  const utmMedium = urlParams.get('utm_medium');
  const utmCampaign = urlParams.get('utm_campaign');
  const utmContent = urlParams.get('utm_content');
  const utmTerm = urlParams.get('utm_term');
  const detectedSource = mapSourceToLabel(utmSource);

  // Validate public_key on mount
  useEffect(() => {
    async function validatePublicKey() {
      if (!public_key) {
        setIsValidating(false);
        setIsValid(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('get_public_form_by_key', { _public_key: public_key });

        if (error || !data || data.length === 0) {
          setIsValid(false);
        } else {
          const org = data[0];
          // Migrate old format to new format if needed
          const migratedSettings = migrateFormSettings(org.form_settings || {});
          
          setOrganization({
            id: org.id,
            name: org.name,
            form_settings: migratedSettings,
          });
          setSettings(migratedSettings);
          setIsValid(true);
        }
      } catch {
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    }

    validatePublicKey();
  }, [public_key]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = phone.replace(/\s/g, '');
    
    // Dynamic validation based on field settings
    if (settings.fields.name.visible && settings.fields.name.required) {
      if (!name || name.length < 2) {
        toast({ title: 'Erro', description: `${settings.fields.name.label} deve ter pelo menos 2 caracteres`, variant: 'destructive' });
        return;
      }
    }
    
    if (settings.fields.email.visible && settings.fields.email.required) {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast({ title: 'Erro', description: 'Email inválido', variant: 'destructive' });
        return;
      }
    }
    
    if (settings.fields.phone.visible && settings.fields.phone.required) {
      if (!cleanPhone || cleanPhone.length < 9) {
        toast({ title: 'Erro', description: `${settings.fields.phone.label} é obrigatório`, variant: 'destructive' });
        return;
      }
    }
    
    if (settings.fields.message.visible && settings.fields.message.required) {
      if (!message || message.trim().length < 1) {
        toast({ title: 'Erro', description: `${settings.fields.message.label} é obrigatório`, variant: 'destructive' });
        return;
      }
    }
    
    if (!gdprConsent) {
      toast({ title: 'Erro', description: 'É necessário aceitar a Política de Privacidade', variant: 'destructive' });
      return;
    }

    // Validate required custom fields
    const sortedFields = [...(settings.custom_fields || [])].sort((a, b) => a.order - b.order);
    for (const field of sortedFields) {
      if (field.required && !customData[field.id]) {
        toast({ title: 'Erro', description: `O campo "${field.label}" é obrigatório`, variant: 'destructive' });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        name: name.trim() || null,
        email: email.trim() || null,
        phone: cleanPhone || null,
        gdpr_consent: true,
        public_key,
        source: detectedSource,
        custom_data: {
          ...customData,
          ...(utmSource && { utm_source: utmSource }),
          ...(utmMedium && { utm_medium: utmMedium }),
          ...(utmCampaign && { utm_campaign: utmCampaign }),
          ...(utmContent && { utm_content: utmContent }),
          ...(utmTerm && { utm_term: utmTerm }),
        },
      };

      if (settings.fields.message.visible && message.trim()) {
        body.notes = message;
      }

      const response = await supabase.functions.invoke('submit-lead', { body });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar');
      }

      setIsSuccess(true);
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast({
        title: 'Erro',
        description: settings.error_message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateCustomField = (fieldId: string, value: string | number | boolean) => {
    setCustomData(prev => ({ ...prev, [fieldId]: value }));
  };

  const renderCustomField = (field: CustomField) => {
    switch (field.type) {
      case 'text':
      case 'number':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label} {field.required && '*'}</Label>
            <Input
              id={field.id}
              type={field.type}
              placeholder={field.placeholder}
              value={customData[field.id] as string || ''}
              onChange={(e) => updateCustomField(field.id, field.type === 'number' ? Number(e.target.value) : e.target.value)}
            />
          </div>
        );
      case 'textarea':
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.id}>{field.label} {field.required && '*'}</Label>
            <Textarea
              id={field.id}
              placeholder={field.placeholder}
              value={customData[field.id] as string || ''}
              onChange={(e) => updateCustomField(field.id, e.target.value)}
              rows={3}
            />
          </div>
        );
      case 'select':
        return (
          <div key={field.id} className="space-y-2">
            <Label>{field.label} {field.required && '*'}</Label>
            <Select value={customData[field.id] as string || ''} onValueChange={(v) => updateCustomField(field.id, v)}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      case 'checkbox':
        return (
          <div key={field.id} className="flex items-start space-x-2 pt-2">
            <Checkbox
              id={field.id}
              checked={customData[field.id] as boolean || false}
              onCheckedChange={(checked) => updateCustomField(field.id, checked === true)}
            />
            <Label htmlFor={field.id} className="text-sm text-slate-600 leading-tight cursor-pointer">
              {field.label} {field.required && '*'}
            </Label>
          </div>
        );
      default:
        return null;
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: settings.primary_color }} />
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-slate-900">Formulário Não Encontrado</CardTitle>
            <CardDescription>O link que está a usar é inválido ou expirou.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: `${settings.primary_color}20` }}>
              <CheckCircle className="w-8 h-8" style={{ color: settings.primary_color }} />
            </div>
            <CardTitle className="text-slate-900">{settings.success_message.title}</CardTitle>
            <CardDescription className="text-base">{settings.success_message.description}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const sortedCustomFields = [...(settings.custom_fields || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt={organization?.name || 'Logo'} className="h-12 w-auto object-contain mx-auto mb-4" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.primary_color}dd)` }}>
              <Zap className="w-6 h-6 text-white" />
            </div>
          )}
          <CardTitle className="text-slate-900">{settings.title}</CardTitle>
          <CardDescription>{settings.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Fixed Fields - conditionally rendered */}
            {settings.fields.name.visible && (
              <div className="space-y-2">
                <Label htmlFor="name">
                  {settings.fields.name.label} {settings.fields.name.required && '*'}
                </Label>
                <Input 
                  id="name" 
                  type="text" 
                  placeholder="João Silva" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                />
              </div>
            )}
            
            {settings.fields.phone.visible && (
              <div className="space-y-2">
                <Label htmlFor="phone">
                  {settings.fields.phone.label} {settings.fields.phone.required && '*'}
                </Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="912 345 678" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                />
              </div>
            )}
            
            {settings.fields.email.visible && (
              <div className="space-y-2">
                <Label htmlFor="email">
                  {settings.fields.email.label} {settings.fields.email.required && '*'}
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="joao@exemplo.pt" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                />
              </div>
            )}
            
            {settings.fields.message.visible && (
              <div className="space-y-2">
                <Label htmlFor="message">
                  {settings.fields.message.label} {settings.fields.message.required && '*'}
                </Label>
                <Textarea 
                  id="message" 
                  placeholder="Escreva a sua mensagem..." 
                  value={message} 
                  onChange={(e) => setMessage(e.target.value)} 
                  rows={3} 
                />
              </div>
            )}
            
            {sortedCustomFields.map(renderCustomField)}
            
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox id="gdpr" checked={gdprConsent} onCheckedChange={(checked) => setGdprConsent(checked === true)} />
              <Label htmlFor="gdpr" className="text-sm text-slate-600 leading-tight cursor-pointer">
                Li e aceito a <a href={`${PRODUCTION_URL}/privacy`} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: settings.primary_color }}>Política de Privacidade</a> *
              </Label>
            </div>
            
            <Button type="submit" className="w-full" style={{ backgroundColor: settings.primary_color }} disabled={isSubmitting || !gdprConsent}>
              {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />A enviar...</>) : 'Enviar'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-xs text-slate-400 mt-6">Powered by <span className="font-medium">Senvia</span></p>
    </div>
  );
}