import senviaLogoMobile from "@/assets/senvia-logo-mobile.png";

interface MobileHeaderProps {
  onMenuToggle?: () => void;
  isMenuOpen?: boolean;
  organizationName?: string;
}

export function MobileHeader({
  organizationName = "Senvia OS"
}: MobileHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border safe-top">
      <div className="h-14 flex items-center justify-center px-4">
        <img 
          alt="SENVIA" 
          className="h-8 w-32 object-contain" 
          src="/lovable-uploads/7d06b8aa-41ca-4a96-a4b1-699608629148.png" 
        />
      </div>
    </header>
  );
}