import { SEO } from "@/components/SEO";
import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { HeroSection } from "@/components/landing/HeroSection";
import { SocialProofBar } from "@/components/landing/SocialProofBar";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSteps } from "@/components/landing/SolutionSteps";
import { DemoShowcase } from "@/components/landing/DemoShowcase";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { AISection } from "@/components/landing/AISection";
import { NichesSection } from "@/components/landing/NichesSection";
import { ResultsSection } from "@/components/landing/ResultsSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { PricingSection } from "@/components/landing/PricingSection";
import { ComparisonTable } from "@/components/landing/ComparisonTable";
import { TrustSection } from "@/components/landing/TrustSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function Landing() {
  return (
    <>
      <SEO
        canonical="/"
        title="Senvia OS — CRM com IA e WhatsApp para Empresas em Portugal"
        description="Leads atendidos em segundos com automação WhatsApp e IA. CRM desenhado para clínicas, imobiliárias e construção. Teste grátis 14 dias."
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
        <AnnouncementBar />
        <LandingHeader />
        <HeroSection />
        <SocialProofBar />
        <ProblemSection />
        <SolutionSteps />
        <DemoShowcase />
        <FeaturesGrid />
        <AISection />
        <NichesSection />
        <ResultsSection />
        <TestimonialsSection />
        <PricingSection />
        <ComparisonTable />
        <TrustSection />
        <FAQSection />
        <FinalCTA />
        <LandingFooter />
      </div>
    </>
  );
}
