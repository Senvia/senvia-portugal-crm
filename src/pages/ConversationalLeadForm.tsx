import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProgressBar } from "@/components/conversational/ProgressBar";
import { AIAvatar } from "@/components/conversational/AIAvatar";
import { StepContainer } from "@/components/conversational/StepContainer";
import { WelcomeStep } from "@/components/conversational/steps/WelcomeStep";
import { DynamicStep } from "@/components/conversational/steps/DynamicStep";
import { SuccessScreen } from "@/components/conversational/SuccessScreen";
import { FormSettings, migrateFormSettings, CustomField } from "@/types";

interface OrganizationData {
  id: string;
  name: string;
  form_settings: FormSettings;
}

interface StepConfig {
  type: 'welcome' | 'field';
  key: string;
  label: string;
  required: boolean;
  fieldType?: 'name' | 'email' | 'phone' | 'message' | 'custom';
  customFieldType?: CustomField['type'];
  options?: string[];
  placeholder?: string;
}

const ConversationalLeadForm = () => {
  const { public_key } = useParams<{ public_key: string }>();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

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

        const migratedSettings = migrateFormSettings(data[0].form_settings as Partial<FormSettings>);

        setOrganization({
          id: data[0].id,
          name: data[0].name,
          form_settings: migratedSettings,
        });
      } catch (err) {
        setError("Erro ao carregar formulário.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganization();
  }, [public_key]);

  // Generate steps from form settings
  const steps = useMemo<StepConfig[]>(() => {
    if (!organization?.form_settings) return [];

    const settings = organization.form_settings;
    const stepList: StepConfig[] = [];

    // Step 1: Welcome (always first, includes name if visible)
    const nameVisible = settings.fields.name.visible;
    stepList.push({
      type: 'welcome',
      key: 'welcome',
      label: nameVisible ? settings.fields.name.label : '',
      required: nameVisible ? settings.fields.name.required : false,
    });

    // Add visible fixed fields (except name which is in welcome)
    if (settings.fields.email.visible) {
      stepList.push({
        type: 'field',
        key: 'email',
        label: settings.fields.email.label,
        required: settings.fields.email.required,
        fieldType: 'email',
      });
    }

    if (settings.fields.phone.visible) {
      stepList.push({
        type: 'field',
        key: 'phone',
        label: settings.fields.phone.label,
        required: settings.fields.phone.required,
        fieldType: 'phone',
      });
    }

    if (settings.fields.message.visible) {
      stepList.push({
        type: 'field',
        key: 'message',
        label: settings.fields.message.label,
        required: settings.fields.message.required,
        fieldType: 'message',
      });
    }

    // Add custom fields
    settings.custom_fields.forEach((field) => {
      stepList.push({
        type: 'field',
        key: field.id,
        label: field.label,
        required: field.required,
        fieldType: 'custom',
        customFieldType: field.type,
        options: field.options,
        placeholder: field.placeholder,
      });
    });

    return stepList;
  }, [organization?.form_settings]);

  const totalSteps = steps.length;

  const handleStepComplete = async (key: string, value: string) => {
    const newFormData = { ...formData, [key]: value };
    setFormData(newFormData);

    const isLastStep = currentStep === totalSteps - 1;

    if (isLastStep) {
      // Submit the form
      await submitForm(newFormData);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const submitForm = async (data: Record<string, string>) => {
    if (!organization) return;

    setIsSubmitting(true);

    const settings = organization.form_settings;

    // Build custom_data from custom fields
    const customData: Record<string, string> = {};
    settings.custom_fields.forEach((field) => {
      if (data[field.id]) {
        customData[field.label] = data[field.id];
      }
    });

    const leadData = {
      name: data.welcome || data.name || "Lead Conversacional",
      email: data.email || `lead.${Date.now()}@conversational.form`,
      phone: data.phone || "",
      source: "conversational_form",
      public_key: public_key,
      custom_data: customData,
      gdpr_consent: true,
      automation_enabled: true,
    };

    // Log for n8n webhook integration
    console.log("Lead Conversacional:", leadData);

    try {
      const { error } = await supabase.functions.invoke("submit-lead", {
        body: leadData,
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
    if (isComplete && organization) {
      return (
        <SuccessScreen
          userName={getFirstName(formData.welcome || formData.name)}
          title={organization.form_settings.success_message.title}
          description={organization.form_settings.success_message.description}
        />
      );
    }

    const step = steps[currentStep];
    if (!step || !organization) return null;

    const settings = organization.form_settings;

    if (step.type === 'welcome') {
      return (
        <WelcomeStep
          onNext={(name) => handleStepComplete('welcome', name)}
          title={settings.title}
          subtitle={settings.subtitle}
          nameLabel={settings.fields.name.label}
          showNameField={settings.fields.name.visible}
        />
      );
    }

    // Dynamic field step
    const isLastStep = currentStep === totalSteps - 1;

    return (
      <DynamicStep
        field={{
          type: step.fieldType === 'custom' ? 'custom' : step.fieldType!,
          key: step.key,
          label: step.label,
          required: step.required,
          fieldType: step.customFieldType,
          options: step.options,
          placeholder: step.placeholder,
        }}
        userName={getFirstName(formData.welcome || formData.name)}
        onNext={(value) => handleStepComplete(step.key, value)}
        isSubmitting={isSubmitting}
        submitButtonText={settings.submit_button_text}
        isLastStep={isLastStep}
      />
    );
  };

  const primaryColor = organization?.form_settings?.primary_color;

  // Helper to extract first name
  const getFirstName = (fullName?: string) => {
    if (!fullName) return '';
    return fullName.trim().split(' ')[0];
  };

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
          {!isComplete && totalSteps > 0 && (
            <div className="px-6 pt-6">
              <ProgressBar currentStep={currentStep + 1} totalSteps={totalSteps} />
            </div>
          )}

          {/* Content */}
          <div className="p-6 md:p-8">
            {/* AI Avatar / Logo */}
            <div className="flex justify-center mb-8">
              <AIAvatar 
                primaryColor={primaryColor} 
                logoUrl={organization?.form_settings?.logo_url}
              />
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
