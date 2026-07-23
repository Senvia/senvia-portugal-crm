import { Check, CheckCheck, X } from "lucide-react";

export function ListStatusTicks({ status }: { status: string | null }) {
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 shrink-0 text-sky-500" />;
  if (status === "delivered") return <CheckCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
  if (status === "failed") return <X className="h-3.5 w-3.5 shrink-0 text-destructive" />;
  return <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
}
