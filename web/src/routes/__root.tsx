import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/admin/app-sidebar";
import { InitialsAvatar } from "@/components/admin/avatar";
import { TokenGate } from "@/components/admin/token-gate";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Stránka sa nenašla</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Stránka, ktorú hľadáte, neexistuje alebo bola presunutá.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Domov
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Stránku sa nepodarilo načítať
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Niečo sa pokazilo. Skúste obnoviť stránku alebo sa vrátiť domov.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Skúsiť znova
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Domov
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { title: "eSpeleoSociety Admin" },
      {
        name: "description",
        content: "Administrácia členov, klubov a eCP Slovenskej speleologickej spoločnosti.",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <HeadContent />
      <TokenGate>
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-card px-3">
                <SidebarTrigger />
                <span className="text-sm font-medium text-muted-foreground">
                  eSpeleoSociety Admin
                </span>
                <div className="ml-auto flex items-center gap-3">
                  <ThemeToggle />
                  <div className="flex items-center gap-2">
                    <InitialsAvatar name="Správca Systému" seed={0} />
                    <div className="hidden text-xs leading-tight sm:block">
                      <div className="font-medium">Správca</div>
                      <div className="text-muted-foreground">Administrátor</div>
                    </div>
                  </div>
                </div>
              </header>
              <main className="mx-auto w-full max-w-[1400px] flex-1 p-4 md:p-6">
                <Outlet />
              </main>
            </div>
          </div>
        </SidebarProvider>
      </TokenGate>
    </QueryClientProvider>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);
  return (
    <button
      onClick={() => setDark(!dark)}
      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label="Prepnúť tmavý režim"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
