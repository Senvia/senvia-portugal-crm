import { type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PortalTotalLinkFilters } from "./PortalTotalLinkFilters";
import { portalTotalLinkSections } from "./portalTotalLinkConfig";

export function PortalTotalLinkLayout({ children }: { children: ReactNode }) {
  const location = useLocation();

  const currentSection =
    portalTotalLinkSections.find(
      (section) => location.pathname === section.path || location.pathname.startsWith(`${section.path}/`),
    ) ?? portalTotalLinkSections[0];

  const ActionIcon = currentSection.action?.icon;

  return (
    <div className="space-y-6 p-4 pb-24 md:p-6 md:pb-6 lg:p-8">
      <section className="space-y-4">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm md:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Portal Total Link</h1>
              <p className="max-w-3xl text-sm text-muted-foreground md:text-base">{currentSection.description}</p>
            </div>

            {currentSection.action ? (
              <Button type="button" className="w-full sm:w-auto">
                {ActionIcon ? <ActionIcon className="h-4 w-4" /> : null}
                {currentSection.action.label}
              </Button>
            ) : null}
          </div>

          <div className="mt-5 overflow-x-auto">
            <nav className="flex min-w-max gap-2 rounded-2xl border border-border bg-muted/30 p-1.5">
              {portalTotalLinkSections.map((section) => (
                <NavLink
                  key={section.key}
                  to={section.path}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                    )
                  }
                >
                  {section.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        <PortalTotalLinkFilters />
      </section>

      {children}
    </div>
  );
}
