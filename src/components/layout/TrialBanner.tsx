import { Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface TrialBannerProps {
  daysRemaining: number;
}

export function TrialBanner({ daysRemaining }: TrialBannerProps) {
  const navigate = useNavigate();

  return (
    <div
      className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/15 transition-colors"
      onClick={() => navigate('/settings?tab=billing')}
    >
      <Clock className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs font-medium text-primary">
        Período de teste: {daysRemaining} {daysRemaining === 1 ? 'dia restante' : 'dias restantes'}
      </span>
      <span className="text-xs text-primary/70 hidden sm:inline">· Escolher plano</span>
    </div>
  );
}
