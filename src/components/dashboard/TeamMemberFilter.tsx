import { useTeamMembers } from "@/hooks/useTeam";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";

interface TeamMemberFilterProps {
  className?: string;
}

export function TeamMemberFilter({ className }: TeamMemberFilterProps) {
  const { canFilterByTeam, selectedMemberId, setSelectedMemberId } = useTeamFilter();
  const { data: members = [] } = useTeamMembers();

  if (!canFilterByTeam) return null;

  return (
    <Select 
      value={selectedMemberId || "all"} 
      onValueChange={(v) => setSelectedMemberId(v === "all" ? null : v)}
    >
      <SelectTrigger className={className || "w-[180px]"}>
        <Users className="h-4 w-4 mr-2 shrink-0" />
        <SelectValue placeholder="Todos os membros" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os membros</SelectItem>
        {members.map((m) => (
          <SelectItem key={m.id} value={m.user_id}>
            {m.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
