import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2, Check, X, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Check slug availability with debounce
  useEffect(() => {
    if (slug.length < 2) {
      setIsSlugAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsCheckingSlug(true);
      try {
        const { data, error } = await supabase.rpc('is_slug_available', { _slug: slug });
        if (!error) {
          setIsSlugAvailable(data);
        }
      } catch (e) {
        console.error('Error checking slug:', e);
      } finally {
        setIsCheckingSlug(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [slug]);

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !slug.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('create_organization_for_current_user', {
        _name: name.trim(),
        _slug: slug.trim(),
      });

      if (error) throw error;

      toast.success('Organização criada com sucesso!');
      
      // Force page reload to refresh auth context with new org data
      window.location.href = '/dashboard';
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast.error(error.message || 'Erro ao criar organização');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">SENVIA</span>
          </div>
        </div>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl text-white">Bem-vindo ao SENVIA</CardTitle>
            <CardDescription className="text-slate-400">
              Cria a tua organização para começar a gerir leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Nome da Organização</Label>
                <Input
                  id="name"
                  placeholder="Ex: Minha Empresa"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={isLoading}
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug" className="text-slate-300">Identificador (slug)</Label>
                <div className="relative">
                  <Input
                    id="slug"
                    placeholder="minha-empresa"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    disabled={isLoading}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pr-10"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isCheckingSlug && (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    )}
                    {!isCheckingSlug && isSlugAvailable === true && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {!isCheckingSlug && isSlugAvailable === false && (
                      <X className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">
                  senvia.app/<span className="text-primary">{slug || 'slug'}</span>
                </p>
                {isSlugAvailable === false && (
                  <p className="text-xs text-red-400">Este slug já está em uso</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading || isSlugAvailable === false}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Organização
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
