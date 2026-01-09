import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import senviaLogoMobile from "@/assets/senvia-logo-mobile.png";
interface MobileHeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
  organizationName?: string;
}
export function MobileHeader({
  onMenuToggle,
  isMenuOpen,
  organizationName = "Senvia OS"
}: MobileHeaderProps) {
  return <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border safe-top">
      <div className="h-14 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img alt="SENVIA" className="h-8 w-32 object-contain" src="/lovable-uploads/7d06b8aa-41ca-4a96-a4b1-699608629148.png" />
        </div>

        <Button variant="ghost" size="icon" onClick={onMenuToggle} className="h-9 w-9">
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
    </header>;
}