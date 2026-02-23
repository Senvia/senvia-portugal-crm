import { useState } from 'react';
import { ArrowLeft, Plus, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { AutomationsTable } from '@/components/marketing/AutomationsTable';
import { CreateAutomationModal } from '@/components/marketing/CreateAutomationModal';
import { useAutomations } from '@/hooks/useAutomations';
import { Skeleton } from '@/components/ui/skeleton';

export default function Automations() {
  const { automations, isLoading } = useAutomations();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6 p-4 md:p-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/marketing">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Automações
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure emails automáticos baseados em gatilhos
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Nova Automação</span>
          <span className="sm:hidden">Nova</span>
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : (
        <AutomationsTable automations={automations} />
      )}

      <CreateAutomationModal open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
