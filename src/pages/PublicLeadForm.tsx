import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PRODUCTION_URL } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { z } from 'zod';
import { FormSettings, DEFAULT_FORM_SETTINGS } from '@/types';

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
          .from('organizations')
          .select('id, name, form_settings')
          .eq('public_key', public_key)
          .maybeSingle();

        if (error || !data) {
          setIsValid(false);
        } else {
          setOrganization({
            id: data.id,
            name: data.name,
            form_settings: data.form_settings as unknown as FormSettings | null,
          });
          // Merge with defaults
          if (data.form_settings) {
            const fetchedSettings = data.form_settings as unknown as Partial<FormSettings>;
            setSettings({ ...DEFAULT_FORM_SETTINGS, ...fetchedSettings });
          }
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

  // Dynamic schema based on settings
  const getSchema = () => {
    const baseSchema = {
      name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
      email: z.string().email('Email inválido'),
      phone: z.string().regex(/^(\+351)?[0-9]{9}$/, 'Formato de telemóvel inválido'),
      gdprConsent: z.literal(true, {
        errorMap: () => ({ message: 'É necessário aceitar a Política de Privacidade' }),
      }),
    };

    if (settings.show_message_field) {
      return z.object({
        ...baseSchema,
        message: z.string().optional(),
      });
    }

    return z.object(baseSchema);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clean phone number
    const cleanPhone = phone.replace(/\s/g, '');
    
    // Validate form
    const formData = settings.show_message_field 
      ? { name, email, phone: cleanPhone, message, gdprConsent }
      : { name, email, phone: cleanPhone, gdprConsent };
    
    const result = getSchema().safeParse(formData);
    if (!result.success) {
      toast({
        title: 'Erro de validação',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        name,
        email,
        phone: cleanPhone,
        gdpr_consent: true,
        public_key,
        source: 'Formulário Público',
      };

      if (settings.show_message_field && message.trim()) {
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

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: settings.primary_color }} />
      </div>
    );
  }

  // Invalid public_key
  if (!isValid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-slate-900">Formulário Não Encontrado</CardTitle>
            <CardDescription>
              O link que está a usar é inválido ou expirou.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${settings.primary_color}20` }}
            >
              <CheckCircle className="w-8 h-8" style={{ color: settings.primary_color }} />
            </div>
            <CardTitle className="text-slate-900">{settings.success_message.title}</CardTitle>
            <CardDescription className="text-base">
              {settings.success_message.description}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Form
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {settings.logo_url ? (
            <img 
              src={settings.logo_url} 
              alt={organization?.name || 'Logo'}
              className="h-12 w-auto object-contain mx-auto mb-4"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ 
                background: `linear-gradient(135deg, ${settings.primary_color}, ${settings.primary_color}dd)` 
              }}
            >
              <Zap className="w-6 h-6 text-white" />
            </div>
          )}
          <CardTitle className="text-slate-900">{settings.title}</CardTitle>
          <CardDescription>{settings.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{settings.labels.name} *</Label>
              <Input
                id="name"
                type="text"
                placeholder="João Silva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">{settings.labels.phone} *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="912 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">{settings.labels.email} *</Label>
              <Input
                id="email"
                type="email"
                placeholder="joao@exemplo.pt"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {settings.show_message_field && (
              <div className="space-y-2">
                <Label htmlFor="message">{settings.labels.message}</Label>
                <Textarea
                  id="message"
                  placeholder="Escreva a sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="gdpr"
                checked={gdprConsent}
                onCheckedChange={(checked) => setGdprConsent(checked === true)}
              />
              <Label htmlFor="gdpr" className="text-sm text-slate-600 leading-tight cursor-pointer">
                Li e aceito a{' '}
                <a href={`${PRODUCTION_URL}/privacy`} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: settings.primary_color }}>
                  Política de Privacidade
                </a>
                {' '}*
              </Label>
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              style={{ backgroundColor: settings.primary_color }}
              disabled={isSubmitting || !gdprConsent}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  A enviar...
                </>
              ) : (
                'Enviar'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      <p className="text-xs text-slate-400 mt-6">
        Powered by <span className="font-medium">Senvia</span>
      </p>
    </div>
  );
}
