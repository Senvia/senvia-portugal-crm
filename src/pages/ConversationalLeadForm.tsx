import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProgressBar } from "@/components/conversational/ProgressBar";
import { AIAvatar } from "@/components/conversational/AIAvatar";
import { StepContainer } from "@/components/conversational/StepContainer";
import { WelcomeStep } from "@/components/conversational/steps/WelcomeStep";
import { NicheStep } from "@/components/conversational/steps/NicheStep";
import { VolumeStep } from "@/components/conversational/steps/VolumeStep";
import { ContactStep } from "@/components/conversational/steps/ContactStep";
import { SuccessScreen } from "@/components/conversational/SuccessScreen";

interface FormData {
  name: string;
  niche: string;
  volume: string;
  phone: string;
}

interface OrganizationData {
  id: string;
  name: string;
  form_settings?: {
    primary_color?: string;
  } | null;
}

const TOTAL_STEPS = 4;

const ConversationalLeadForm = () => {
  const { public_key } = useParams<{ public_key: string }>();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    name: "",
    niche: "",
    volume: "",
    phone: "",
  });

  useEffect(() => {
    const fetchOrganization = async () => {
      if (!public_key) {
        setError("Formulário não encontrado.");
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc("get_public_form_by_key", { _public_key: public_key });

        if (error || !data || data.length === 0) {
          setError("Formulário não encontrado.");
          setIsLoading(false);
          return;
        }

        setOrganization({
          id: data[0].id,
          name: data[0].name,
          form_settings: data[0].form_settings as OrganizationData['form_settings'],
        });
      } catch (err) {
        setError("Erro ao carregar formulário.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganization();
  }, [public_key]);

  const handleNameSubmit = (name: string) => {
    setFormData((prev) => ({ ...prev, name }));
    setCurrentStep(2);
  };

  const handleNicheSubmit = (niche: string) => {
    setFormData((prev) => ({ ...prev, niche }));
    setCurrentStep(3);
  };

  const handleVolumeSubmit = (volume: string) => {
    setFormData((prev) => ({ ...prev, volume }));
    setCurrentStep(4);
  };

  const handleContactSubmit = async (phone: string) => {
    setFormData((prev) => ({ ...prev, phone }));
    setIsSubmitting(true);

    const leadData = {
      ...formData,
      phone,
      source: "conversational_form",
      organization_id: organization?.id,
      timestamp: new Date().toISOString(),
    };

    // Log for n8n webhook integration
    console.log("Lead Conversacional:", leadData);

    try {
      // Submit to edge function
      const { error } = await supabase.functions.invoke("submit-lead", {
        body: {
          name: formData.name,
          email: `${formData.name.toLowerCase().replace(/\s+/g, ".")}@lead.conversational`,
          phone,
          source: "conversational_form",
          organization_id: organization?.id,
          custom_data: {
            niche: formData.niche,
            volume: formData.volume,
          },
          gdpr_consent: true,
          automation_enabled: true,
        },
      });

      if (error) {
        console.error("Error submitting lead:", error);
      }

      setIsComplete(true);
    } catch (err) {
      console.error("Error:", err);
      setIsComplete(true); // Still show success for UX
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    if (isComplete) {
      return <SuccessScreen userName={formData.name} />;
    }

    switch (currentStep) {
      case 1:
        return (
          <WelcomeStep 
            onNext={handleNameSubmit} 
            organizationName={organization?.name}
          />
        );
      case 2:
        return <NicheStep userName={formData.name} onNext={handleNicheSubmit} />;
      case 3:
        return <VolumeStep onNext={handleVolumeSubmit} />;
      case 4:
        return <ContactStep onNext={handleContactSubmit} isSubmitting={isSubmitting} />;
      default:
        return null;
    }
  };

  const primaryColor = organization?.form_settings?.primary_color;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent p-4">
        <div className="text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">{error}</h1>
          <p className="text-muted-foreground">
            Verifique se o link está correto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50/50 dark:bg-transparent p-4">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Card Container */}
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-xl border border-border/50 overflow-hidden">
          {/* Progress Bar */}
          {!isComplete && (
            <div className="px-6 pt-6">
              <ProgressBar currentStep={currentStep} totalSteps={TOTAL_STEPS} />
            </div>
          )}

          {/* Content */}
          <div className="p-6 md:p-8">
            {/* AI Avatar */}
            <div className="flex justify-center mb-8">
              <AIAvatar primaryColor={primaryColor} />
            </div>

            {/* Step Content */}
            <StepContainer stepKey={isComplete ? 99 : currentStep}>
              {renderStep()}
            </StepContainer>
          </div>
        </div>

        {/* Branding */}
        <motion.p 
          className="text-center text-xs text-muted-foreground mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Powered by Senvia OS
        </motion.p>
      </motion.div>
    </div>
  );
};

export default ConversationalLeadForm;
