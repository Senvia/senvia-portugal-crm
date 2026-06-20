import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useApplyNicheTemplate } from '@/hooks/usePipelineStages';
import { NICHE_TEMPLATES, NicheType } from '@/lib/pipeline-templates';
import { Building2, Heart, Hammer, Wifi, ShoppingCart, Home, Loader2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ICON_MAP: Record<string, React.ElementType> = {
  Building2, Heart, Hammer, Wifi, ShoppingCart, Home,
};

// Minimal first-step wizard: pick the business niche -> create the pipeline, then
// hand off. Everything else (WhatsApp, faturação, equipa, leads) is guided by Otto
// right after, so this stays a single, fast, essential screen.
export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
  const { organization } = useAuth();
  const applyTemplate = useApplyNicheTemplate();

  const [selectedNiche, setSelectedNiche] = useState<NicheType | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleSelectNiche = async (niche: NicheType) => {
    if (!organization?.id) return;
    setSelectedNiche(niche);
    setIsApplying(true);
    try {
      await applyTemplate.mutateAsync({
        organizationId: organization.id,
        niche,
        migrateLeads: false,
      });
      // Pipeline created — hand off to Otto for the rest of the setup.
      onComplete();
    } catch (e) {
      console.error('Error applying template:', e);
      setIsApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 sm:px-8 py-4 border-b border-border" style={{ paddingTop: 'calc(clamp(20px, env(safe-area-inset-top, 0px), 50px) + 1rem)' }}>
        <Sparkles className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold text-foreground">Senvia OS</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto px-4 sm:px-8 py-8"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              Qual é o seu tipo de negócio?
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Vamos configurar o seu pipeline de vendas com as etapas ideais. Depois o Otto ajuda-o a ligar o resto.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {NICHE_TEMPLATES.map((template) => {
              const IconComp = ICON_MAP[template.icon] || Building2;
              const isSelected = selectedNiche === template.id;
              return (
                <button
                  key={template.id}
                  onClick={() => handleSelectNiche(template.id)}
                  disabled={isApplying}
                  className={`relative text-left p-5 rounded-xl border transition-all duration-200 ${
                    isSelected
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-border bg-card hover:border-muted-foreground hover:bg-muted'
                  } ${isApplying ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {isApplying && isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <IconComp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{template.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {template.stages.slice(0, 5).map((stage) => (
                      <Badge
                        key={stage.key}
                        variant="outline"
                        className="text-[10px] px-1.5 py-0"
                        style={{ borderColor: stage.color, color: stage.color }}
                      >
                        {stage.name}
                      </Badge>
                    ))}
                    {template.stages.length > 5 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground">
                        +{template.stages.length - 5}
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
