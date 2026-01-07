import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  children: ReactNode;
  userName?: string;
  organizationName?: string;
}

export function AppLayout({ children, userName, organizationName }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar userName={userName} organizationName={organizationName} />
      <main className="pl-64">
        <div className="min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}
