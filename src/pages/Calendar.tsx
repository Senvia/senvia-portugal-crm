import { AppLayout } from '@/components/layout/AppLayout';
import { CalendarView } from '@/components/calendar/CalendarView';
import { SEO } from '@/components/SEO';
import { useAuth } from '@/contexts/AuthContext';

export default function Calendar() {
  const { profile, organization } = useAuth();

  return (
    <>
      <SEO 
        title="Agenda | Senvia OS" 
        description="Gerencie a sua agenda de eventos e tarefas"
      />
      <AppLayout userName={profile?.full_name} organizationName={organization?.name}>
        <CalendarView />
      </AppLayout>
    </>
  );
}
