import { Kanban, MessageSquare, Receipt, Mail, ShoppingBag, UsersRound, Upload } from "lucide-react";

const MAP: Record<string, React.ElementType> = {
  kanban: Kanban,
  message: MessageSquare,
  receipt: Receipt,
  mail: Mail,
  bag: ShoppingBag,
  users: UsersRound,
  upload: Upload,
};

export function SetupTaskIcon({ icon, className }: { icon: string; className?: string }) {
  const Comp = MAP[icon] ?? Kanban;
  return <Comp className={className} />;
}
