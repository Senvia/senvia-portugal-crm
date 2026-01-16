import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Check, X } from 'lucide-react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import senviaLogo from "@/assets/senvia-logo.png";

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A palavra-passe deve ter pelo menos 6 caracteres'),
  companyCode: z.string().min(2, 'O código da empresa é obrigatório'),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'A palavra-passe deve ter pelo menos 6 caracteres'),
  confirmPassword: z.string().min(6, 'A palavra-passe deve ter pelo menos 6 caracteres'),
  organizationName: z.string().min(2, 'O nome da empresa deve ter pelo menos 2 caracteres'),
  organizationSlug: z.string()
    .min(2, 'O slug deve ter pelo menos 2 caracteres')
    .max(50, 'O slug deve ter no máximo 50 caracteres')
    .regex(/^[a-z0-9-]+$/, 'O slug só pode conter letras minúsculas, números e hífens'),
  registrationCode: z.string().refine((val) => val === '4330', {
    message: 'Código de registo inválido',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As palavras-passe não coincidem',
  path: ['confirmPassword'],
});

// Helper to generate slug from company name
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Tab state - default to signup if query param is set
  const defaultTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginCompanyCode, setLoginCompanyCode] = useState('');
  
  // Signup form state
  const [signupFullName, setSignupFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [registrationCode, setRegistrationCode] = useState('');
  
  // Slug availability state
  const [isCheckingSlug, setIsCheckingSlug] = useState(false);
  const [isSlugAvailable, setIsSlugAvailable] = useState<boolean | null>(null);

  // Auto-generate slug when organization name changes
  useEffect(() => {
    if (!slugManuallyEdited && organizationName) {
      const generatedSlug = generateSlug(organizationName);
      setOrganizationSlug(generatedSlug);
    }
  }, [organizationName, slugManuallyEdited]);

  // Check slug availability with debounce
  useEffect(() => {
    if (organizationSlug.length < 2) {
      setIsSlugAvailable(null);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsCheckingSlug(true);
      try {
        const { data, error } = await supabase.rpc('is_slug_available', { _slug: organizationSlug });
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
  }, [organizationSlug]);

  // Redirect if already logged in (moved to useEffect)
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Show loading while checking auth or redirecting
  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const companyCode = loginCompanyCode.toLowerCase().trim();
    
    const result = loginSchema.safeParse({ 
      email: loginEmail, 
      password: loginPassword,
      companyCode 
    });
    if (!result.success) {
      toast({
        title: 'Erro de validação',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Verify organization exists
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('id, slug')
        .eq('slug', companyCode)
        .maybeSingle();
      
      if (orgError || !orgData) {
        toast({
          title: 'Código inválido',
          description: 'O código da empresa não existe. Verifique com o administrador.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // 2. Authenticate user
      const { error: authError } = await signIn(loginEmail, loginPassword);

      if (authError) {
        toast({
          title: 'Erro ao iniciar sessão',
          description: authError.message === 'Invalid login credentials' 
            ? 'Email ou palavra-passe incorretos' 
            : authError.message,
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // 3. Get current user and verify membership
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        toast({
          title: 'Erro',
          description: 'Não foi possível obter os dados do utilizador.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // 4. Check if user is member of this organization
      const { data: membership, error: memberError } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('organization_id', orgData.id)
        .eq('is_active', true)
        .maybeSingle();

      if (memberError || !membership) {
        // User is not a member - sign out and show error
        await supabase.auth.signOut();
        toast({
          title: 'Acesso negado',
          description: 'Não tem acesso a esta empresa. Verifique o código ou contacte o administrador.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      // 5. Set active organization and redirect
      localStorage.setItem('senvia_active_organization_id', orgData.id);

      toast({
        title: 'Bem-vindo!',
        description: 'Sessão iniciada com sucesso.',
      });
      
      // Force reload to ensure AuthContext picks up the active org
      window.location.href = '/dashboard';
      
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = signupSchema.safeParse({ 
      fullName: signupFullName, 
      email: signupEmail, 
      password: signupPassword,
      confirmPassword: signupConfirmPassword,
      organizationName,
      organizationSlug,
      registrationCode,
    });
    
    if (!result.success) {
      toast({
        title: 'Erro de validação',
        description: result.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    if (isSlugAvailable === false) {
      toast({
        title: 'Slug indisponível',
        description: 'Este slug já está em uso. Por favor, escolha outro.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // 1. Create the user account
      const redirectUrl = `${window.location.origin}/`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: signupFullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Não foi possível criar o utilizador');

      // Check if email confirmation is required (no session means confirmation needed)
      if (!authData.session) {
        toast({
          title: 'Confirme o seu email',
          description: 'Enviámos um email de confirmação. Confirme o seu email e depois faça login.',
        });
        setActiveTab('login');
        setLoginEmail(signupEmail);
        setIsLoading(false);
        return;
      }

      // 2. Create the organization (this also assigns admin role)
      const { error: orgError } = await supabase.rpc('create_organization_for_current_user', {
        _name: organizationName,
        _slug: organizationSlug,
      });

      if (orgError) {
        // If org creation fails, we should handle it gracefully
        if (orgError.message.includes('Slug already exists')) {
          toast({
            title: 'Slug indisponível',
            description: 'Este slug já está em uso. Por favor, escolha outro.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }
        throw orgError;
      }

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Bem-vindo ao SENVIA. A redirecionar para o dashboard...',
      });

      // Force page reload to ensure AuthContext picks up all data
      window.location.href = '/dashboard';
      
    } catch (error: any) {
      let message = error.message;
      if (error.message.includes('already registered')) {
        message = 'Este email já está registado';
      }
      toast({
        title: 'Erro ao criar conta',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    // Sanitize slug input in real-time
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setOrganizationSlug(sanitized);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src={senviaLogo} alt="SENVIA" className="h-12 w-48 object-contain mx-auto" />
        </div>

        <Card className="border-slate-800 bg-slate-900/50 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-white">Aceder à Plataforma</CardTitle>
            <CardDescription className="text-slate-400">
              Entre na sua conta ou crie uma nova
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                <TabsTrigger value="login" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-primary data-[state=active]:text-white">
                  Registar
                </TabsTrigger>
              </TabsList>
              
              {/* Login Tab */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-company-code" className="text-slate-300">Código da Empresa</Label>
                    <Input
                      id="login-company-code"
                      type="text"
                      placeholder="minha-empresa"
                      value={loginCompanyCode}
                      onChange={(e) => setLoginCompanyCode(e.target.value.toLowerCase())}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 font-mono"
                      required
                    />
                    <p className="text-xs text-slate-500">
                      Código fornecido pelo administrador da empresa
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-slate-300">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-slate-300">Palavra-passe</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => {
                        if (!loginEmail) {
                          toast({
                            title: 'Email necessário',
                            description: 'Insira o seu email para recuperar a palavra-passe.',
                            variant: 'destructive',
                          });
                          return;
                        }
                        supabase.auth.resetPasswordForEmail(loginEmail, {
                          redirectTo: `${window.location.origin}/reset-password`,
                        }).then(({ error }) => {
                          if (error) {
                            toast({
                              title: 'Erro',
                              description: error.message,
                              variant: 'destructive',
                            });
                          } else {
                            toast({
                              title: 'Email enviado',
                              description: 'Verifique o seu email para redefinir a palavra-passe.',
                            });
                          }
                        });
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      Esqueceu a palavra-passe?
                    </button>
                  </div>
                  <Button
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        A entrar...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>
              </TabsContent>

              {/* Signup Tab */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-slate-300">Nome Completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="João Silva"
                      value={signupFullName}
                      onChange={(e) => setSignupFullName(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-slate-300">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-slate-300">Palavra-passe</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password" className="text-slate-300">Confirmar Palavra-passe</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                      required
                    />
                  </div>
                  
                  <div className="border-t border-slate-700 pt-4 mt-4">
                    <p className="text-sm text-slate-400 mb-3">Dados da sua empresa</p>
                    
                    <div className="space-y-2">
                      <Label htmlFor="org-name" className="text-slate-300">Nome da Empresa</Label>
                      <Input
                        id="org-name"
                        type="text"
                        placeholder="Minha Empresa Lda"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                        required
                      />
                    </div>
                    
                    <div className="space-y-2 mt-3">
                      <Label htmlFor="org-slug" className="text-slate-300">
                        Slug (URL da empresa)
                      </Label>
                      <div className="relative">
                        <Input
                          id="org-slug"
                          type="text"
                          placeholder="minha-empresa"
                          value={organizationSlug}
                          onChange={(e) => handleSlugChange(e.target.value)}
                          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 pr-10"
                          required
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
                        senvia.app/<span className="text-primary">{organizationSlug || 'slug'}</span>
                      </p>
                      {isSlugAvailable === false && (
                        <p className="text-xs text-red-400">Este slug já está em uso</p>
                      )}
                    </div>
                    
                    <div className="space-y-2 mt-3">
                      <Label htmlFor="company-code-display" className="text-slate-300">
                        Código da Empresa
                      </Label>
                      <Input
                        id="company-code-display"
                        type="text"
                        value={organizationSlug || ''}
                        readOnly
                        className="bg-slate-800/50 border-slate-700 text-slate-300 font-mono cursor-not-allowed"
                      />
                      <p className="text-xs text-amber-400">
                        ⚠️ Anote este código — será necessário para fazer login
                      </p>
                    </div>
                    
                    <div className="space-y-2 mt-3">
                      <Label htmlFor="registration-code" className="text-slate-300">
                        Código de Registo
                      </Label>
                      <Input
                        id="registration-code"
                        type="text"
                        placeholder="Insira o código"
                        value={registrationCode}
                        onChange={(e) => setRegistrationCode(e.target.value)}
                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                        required
                      />
                      <p className="text-xs text-slate-500">
                        Precisa de um código para se registar. Contacte-nos para obter o seu.
                      </p>
                    </div>
                  </div>

                  <Button
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90"
                    disabled={isLoading || isSlugAvailable === false}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        A criar conta...
                      </>
                    ) : (
                      'Criar Conta'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}