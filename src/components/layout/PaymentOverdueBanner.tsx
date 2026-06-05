import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface PaymentOverdueBannerProps {
  /** Whole days left before access is suspended. */
  daysUntilBlock: number;
  /** When access will be suspended (ISO). Shown in the copy when present. */
  blockAt?: string | null;
  /** Length of the grace window, for the progress bar. */
  totalDays?: number;
}

export function PaymentOverdueBanner({ daysUntilBlock, blockAt, totalDays = 3 }: PaymentOverdueBannerProps) {
  const navigate = useNavigate();
  const elapsed = Math.max(0, totalDays - daysUntilBlock);
  const progress = Math.min(100, Math.round((elapsed / totalDays) * 100));
  const blockDate = blockAt ? new Date(blockAt) : null;
  const daysLabel = `${daysUntilBlock} ${daysUntilBlock === 1 ? 'dia' : 'dias'}`;

  return (
    <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2.5">
      <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap">
        {/* Left: icon + text */}
        <div className="flex items-center gap-2 shrink-0">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-xs font-semibold text-destructive">
            Pagamento em atraso — regulariza em {daysLabel}
            {blockDate && (
              <span className="font-normal">
                {' '}(até {blockDate.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long' })})
              </span>
            )}
            {' '}ou o acesso será suspenso.
          </span>
        </div>

        {/* Center: progress bar */}
        <Progress value={progress} className="h-1.5 flex-1 min-w-[80px] bg-destructive/15 [&>div]:bg-destructive" />

        {/* Right: CTA button */}
        <Button
          variant="destructive"
          size="sm"
          className="h-7 text-xs px-3 shrink-0"
          onClick={() => navigate('/settings?tab=billing')}
        >
          Regularizar
        </Button>
      </div>
    </div>
  );
}
