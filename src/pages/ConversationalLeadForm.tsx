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
import { FormSettings, migrateFormSettings, CustomField, MetaPixel } from "@/types";

interface FormData {
  form_id: string;
  form_name: string;
  form_settings: FormSettings;
  org_id: string;
  org_name: string;
  org_slug: string;
  meta_pixels: MetaPixel[];
  public_key?: string;
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

// UTM source mapping
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

const ConversationalLeadForm = () => {
  const { slug, formSlug } = useParams<{ slug: string; formSlug?: string }>();
  const [currentStep, setCurrentStep] = useState(0);

  // UTM parameters detection
  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source');
  const utmMedium = urlParams.get('utm_medium');
  const utmCampaign = urlParams.get('utm_campaign');
  const detectedSource = mapSourceToLabel(utmSource);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepData, setStepData] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchForm = async () => {
      if (!slug) {
        setError("Formulário não encontrado.");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch form by slugs using new RPC function
        const { data, error } = await supabase
          .rpc("get_form_by_slugs", { 
            _org_slug: slug,
            _form_slug: formSlug || null  // null = default form
          });

        if (error || !data || data.length === 0) {
          setError("Formulário não encontrado.");
          setIsLoading(false);
          return;
        }

        const formResult = data[0];
        const migratedSettings = migrateFormSettings(formResult.form_settings as Partial<FormSettings>);

        setFormData({
          form_id: formResult.form_id,
          form_name: formResult.form_name,
          form_settings: migratedSettings,
          org_id: formResult.org_id,
          org_name: formResult.org_name,
          org_slug: formResult.org_slug,
          meta_pixels: Array.isArray(formResult.meta_pixels) ? formResult.meta_pixels as unknown as MetaPixel[] : [],
          public_key: formResult.public_key,
        });
      } catch (err) {
        setError("Erro ao carregar formulário.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchForm();
  }, [slug, formSlug]);

  // Generate steps from form settings
  const steps = useMemo<StepConfig[]>(() => {
    if (!formData?.form_settings) return [];

    const settings = formData.form_settings;
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
  }, [formData?.form_settings]);

  const totalSteps = steps.length;

  const handleStepComplete = async (key: string, value: string) => {
    const newStepData = { ...stepData, [key]: value };
    setStepData(newStepData);

    const isLastStep = currentStep === totalSteps - 1;

    if (isLastStep) {
      // Submit the form
      await submitForm(newStepData);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const submitForm = async (data: Record<string, string>) => {
    if (!formData) return;

    setIsSubmitting(true);

    const settings = formData.form_settings;

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
      source: detectedSource,
      public_key: formData.public_key,
      form_id: formData.form_id,  // Include form_id for form-specific settings
      custom_data: {
        ...customData,
        ...(utmSource && { utm_source: utmSource }),
        ...(utmMedium && { utm_medium: utmMedium }),
        ...(utmCampaign && { utm_campaign: utmCampaign }),
        form_type: 'conversational',
      },
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
    if (isComplete && formData) {
      return (
        <SuccessScreen
          userName={getFirstName(stepData.welcome || stepData.name)}
          title={formData.form_settings.success_message.title}
          description={formData.form_settings.success_message.description}
        />
      );
    }

    const step = steps[currentStep];
    if (!step || !formData) return null;

    const settings = formData.form_settings;

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

    // Show name only on the first step after welcome (step 1)
    const isFirstStepAfterWelcome = currentStep === 1;

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
        userName={getFirstName(stepData.welcome || stepData.name)}
        showUserName={isFirstStepAfterWelcome}
        onNext={(value) => handleStepComplete(step.key, value)}
        isSubmitting={isSubmitting}
        submitButtonText={settings.submit_button_text}
        isLastStep={isLastStep}
      />
    );
  };

  const primaryColor = formData?.form_settings?.primary_color;

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
                logoUrl={formData?.form_settings?.logo_url}
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
