import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { PRODUCTION_URL } from '@/lib/constants';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { z } from 'zod';

const leadSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().regex(/^(\+351)?[0-9]{9}$/, 'Formato de telemóvel inválido'),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: 'É necessário aceitar a Política de Privacidade' }),
  }),
});

interface Organization {
  id: string;
  name: string;
}

export default function PublicLeadForm() {
  const { public_key } = useParams<{ public_key: string }>();
  const { toast } = useToast();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
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
          .select('id, name')
          .eq('public_key', public_key)
          .maybeSingle();

        if (error || !data) {
          setIsValid(false);
        } else {
          setOrganization(data);
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

    // Clean phone number
    const cleanPhone = phone.replace(/\s/g, '');
    
    // Validate form
    const result = leadSchema.safeParse({ name, email, phone: cleanPhone, gdprConsent });
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
      const response = await supabase.functions.invoke('submit-lead', {
        body: {
          name,
          email,
          phone: cleanPhone,
          gdpr_consent: true,
          public_key,
          source: 'Formulário Público',
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao enviar');
      }

      setIsSuccess(true);
    } catch (error) {
      console.error('Error submitting lead:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o formulário. Tente novamente.',
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-slate-900">Obrigado!</CardTitle>
            <CardDescription className="text-base">
              Recebemos o seu contacto e entraremos em contacto brevemente.
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
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-slate-900">Deixe o seu Contacto</CardTitle>
          <CardDescription>
            Preencha os dados abaixo e entraremos em contacto consigo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
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
              <Label htmlFor="phone">Telemóvel *</Label>
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
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="joao@exemplo.pt"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="flex items-start space-x-2 pt-2">
              <Checkbox
                id="gdpr"
                checked={gdprConsent}
                onCheckedChange={(checked) => setGdprConsent(checked === true)}
              />
              <Label htmlFor="gdpr" className="text-sm text-slate-600 leading-tight cursor-pointer">
                Li e aceito a{' '}
                <a href={`${PRODUCTION_URL}/privacy`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Política de Privacidade
                </a>
                {' '}*
              </Label>
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
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
