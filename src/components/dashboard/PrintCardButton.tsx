import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { useCallback, useRef } from "react";

interface PrintCardButtonProps {
  targetRef: React.RefObject<HTMLDivElement>;
}

export function PrintCardButton({ targetRef }: PrintCardButtonProps) {
  const handlePrint = useCallback(() => {
    if (!targetRef.current) return;
    targetRef.current.classList.add("print-target");
    document.body.classList.add("print-single-active");
    window.print();
    document.body.classList.remove("print-single-active");
    targetRef.current.classList.remove("print-target");
  }, [targetRef]);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handlePrint}
      title="Imprimir"
      className="no-print"
    >
      <Printer className="h-3.5 w-3.5" />
    </Button>
  );
}
