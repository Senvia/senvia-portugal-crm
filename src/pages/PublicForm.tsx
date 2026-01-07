import { useParams } from "react-router-dom";
import { PublicLeadForm } from "@/components/forms/PublicLeadForm";

export default function PublicForm() {
  const { apiKey } = useParams<{ apiKey: string }>();

  const handleSubmit = async (data: {
    name: string;
    email: string;
    phone: string;
    message?: string;
    gdpr_consent: boolean;
  }) => {
    // This will be connected to Supabase
    console.log("Form submitted for org:", apiKey);
    console.log("Lead data:", data);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 px-4 py-12">
      <div className="mx-auto max-w-md">
        <PublicLeadForm 
          organizationName="Premium Services"
          onSubmit={handleSubmit}
        />

        {/* GDPR Footer */}
        <div className="mt-6 text-center text-xs text-muted-foreground">
          <p className="mb-2">
            Os seus dados estão protegidos em conformidade com o RGPD.
          </p>
          <div className="flex justify-center gap-3">
            <a href="/privacy" className="hover:text-foreground hover:underline">
              Política de Privacidade
            </a>
            <span>•</span>
            <a href="/terms" className="hover:text-foreground hover:underline">
              Termos de Uso
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
