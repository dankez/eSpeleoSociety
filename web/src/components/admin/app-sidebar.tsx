import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  CreditCard,
  FileUp,
  LayoutDashboard,
  Mountain,
  Settings,
  Users,
  Building2,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const groups = [
  { label: "Hlavné", items: [{ title: "Prehľad", url: "/", icon: LayoutDashboard }] },
  {
    label: "Evidencia",
    items: [
      { title: "Členovia", url: "/clenovia", icon: Users },
      { title: "Kluby", url: "/kluby", icon: Building2 },
      { title: "eCP žiadosti", url: "/ecp", icon: CreditCard },
    ],
  },
  {
    label: "Financie a komunikácia",
    items: [
      { title: "Import SEPA", url: "/sepa", icon: FileUp },
      { title: "Notifikácie", url: "/notifikacie", icon: Bell },
      { title: "Reporty", url: "/reporty", icon: BarChart3 },
    ],
  },
  { label: "Systém", items: [{ title: "Nastavenia", url: "/nastavenia", icon: Settings }] },
] as const;

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-1 py-1.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded bg-sidebar-primary text-sidebar-primary-foreground">
            <Mountain className="size-4" />
          </span>
          <span className="truncate font-semibold text-sidebar-accent-foreground group-data-[collapsible=icon]:hidden">
            eSpeleoSociety
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
              {g.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={path === item.url} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon strokeWidth={1.75} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
