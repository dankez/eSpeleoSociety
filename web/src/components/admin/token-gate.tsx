import { useState } from "react";
import { KeyRound } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setToken, useToken } from "@/lib/auth";

export function TokenGate({ children }: { children: React.ReactNode }) {
  const token = useToken();
  const queryClient = useQueryClient();
  const [value, setValue] = useState("");

  if (token) return <>{children}</>;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    queryClient.clear();
    setToken(trimmed);
    setValue("");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="card-surface w-full max-w-md space-y-4 p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded bg-primary text-primary-foreground">
            <KeyRound className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold">eSpeleoSociety Admin</h1>
            <p className="text-sm text-muted-foreground">Prihlásenie bearer tokenom API</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="api-token">Bearer token</Label>
          <Input
            id="api-token"
            type="password"
            autoComplete="off"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Token sa drží len v pamäti prehliadača a po obnovení stránky sa zadáva znova.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={!value.trim()}>
          Prihlásiť
        </Button>
      </form>
    </div>
  );
}
