import { useState, useEffect, useMemo, useRef } from "react";
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

// Declare fbq for TypeScript
declare global {
  interface Window {
    fbq: (...args: unknown[]) => void;
    _fbq: unknown;
  }
}

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
  const [hasSubmitted, setHasSubmitted] = useState(false); // Prevent duplicate submissions
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

  // Inject Meta Pixels - using sessionStorage to persist across React remounts
  useEffect(() => {
    if (!formData?.meta_pixels || !formData?.form_id) return;
    
    const activePixels = formData.meta_pixels.filter(p => p.enabled && p.pixel_id);
    if (activePixels.length === 0) {
      console.log('[Meta Pixel] No active pixels configured');
      return;
    }

    // Use sessionStorage to prevent duplicate initialization (persists across React StrictMode remounts)
    const pixelStorageKey = `pixel_init_${formData.form_id}`;
    if (sessionStorage.getItem(pixelStorageKey)) {
      console.log('[Meta Pixel] Already initialized in this session, skipping');
      return;
    }
    sessionStorage.setItem(pixelStorageKey, 'true');
    
    console.log('[Meta Pixel] Initializing pixels:', activePixels.map(p => p.pixel_id));

    // Inject the base Facebook Pixel code (only once)
    if (!window.fbq) {
      const baseScript = document.createElement('script');
      baseScript.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
      `;
      document.head.appendChild(baseScript);
    }

    // Wait for fbq to be available, then initialize
    const initPixels = () => {
      activePixels.forEach(pixel => {
        if (typeof window.fbq === 'function') {
          window.fbq('init', pixel.pixel_id);
          window.fbq('trackSingle', pixel.pixel_id, 'PageView');
          console.log('[Meta Pixel] PageView tracked for:', pixel.pixel_id);
        }
      });
    };

    // Try immediately, then with delay if not ready
    if (typeof window.fbq === 'function') {
      initPixels();
    } else {
      setTimeout(initPixels, 500);
    }
    // Removed noscript fallback - unnecessary for SPAs and can cause duplicate events
  }, [formData?.meta_pixels, formData?.form_id]);

  // Ref to prevent duplicate tracking within same component lifecycle (React StrictMode)
  const hasTrackedLeadRef = useRef(false);

  // Function to track Lead event - ONLY call after confirmed success with lead_id
  const trackLeadEvent = (leadId: string) => {
    // Triple protection: ref (lifecycle) + sessionStorage (session) + eventID (Facebook dedup)
    if (hasTrackedLeadRef.current) {
      console.log('[Meta Pixel] Lead event already tracked (ref guard), skipping');
      return;
    }

    if (!formData?.meta_pixels || !formData?.form_id) {
      console.log('[Meta Pixel] No pixels or form_id to track Lead event');
      return;
    }

    // Use unique key per lead to allow multiple leads per session (different form submissions)
    const leadStorageKey = `pixel_lead_${formData.form_id}_${leadId}`;
    if (sessionStorage.getItem(leadStorageKey)) {
      console.log('[Meta Pixel] Lead event already tracked in sessionStorage, skipping:', leadId);
      return;
    }
    
    const activePixels = formData.meta_pixels.filter(p => p.enabled && p.pixel_id);
    
    if (typeof window.fbq !== 'function') {
      console.warn('[Meta Pixel] fbq not loaded, cannot track Lead event');
      return;
    }

    // Mark as tracked BEFORE sending to prevent race conditions
    hasTrackedLeadRef.current = true;
    sessionStorage.setItem(leadStorageKey, 'true');

    console.log('[Meta Pixel] Tracking Lead event for lead:', leadId, 'pixels:', activePixels.length);
    
    // Use fbq('track') with eventID for Facebook's automatic server-side deduplication
    activePixels.forEach((pixel) => {
      window.fbq('track', 'Lead', {
        content_name: formData.org_name,
        content_category: 'conversational_form_submission',
      }, { eventID: leadId });
      console.log('[Meta Pixel] Lead event sent for pixel:', pixel.pixel_id, 'eventID:', leadId);
    });
  };

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
    // Prevent duplicate submissions
    if (hasSubmitted || isSubmitting) {
      console.log('[Submit] Already submitted or submitting, ignoring duplicate call');
      return;
    }
    if (!formData) return;

    setHasSubmitted(true); // Mark as submitted IMMEDIATELY to prevent duplicates
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
      const { data, error } = await supabase.functions.invoke("submit-lead", {
        body: leadData,
      });

      if (error) {
        console.error("Error submitting lead:", error);
        // Still show success for UX but don't track pixel
        setIsComplete(true);
        return;
      }

      // Check if backend marked this as a duplicate - do NOT track pixel for duplicates
      if (data?.duplicate === true) {
        console.log('[Meta Pixel] Backend marked as duplicate, NOT tracking Lead event');
        setIsComplete(true);
        return;
      }

      // Only track Lead event AFTER confirmed success AND if we have a lead_id
      if (data?.lead_id) {
        console.log('[Meta Pixel] Lead submitted successfully, tracking event with lead_id:', data.lead_id);
        trackLeadEvent(data.lead_id);
      } else {
        console.warn('[Meta Pixel] No lead_id returned, cannot track with eventID');
      }
      setIsComplete(true);
    } catch (err) {
      console.error("Error:", err);
      setIsComplete(true); // Still show success for UX but don't track pixel
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
