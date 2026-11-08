import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, Card } from "@/components/admin/page-header";
import { DemoNotice } from "@/components/admin/query-state";

export const Route = createFileRoute("/nastavenia")({
  head: () => ({
    meta: [
      { title: "Nastavenia · eSpeleoSociety Admin" },
      {
        name: "description",
        content: "Prehľad nastavení databázy, Google Wallet, SMTP a logovania.",
      },
    ],
  }),
  component: SettingsPage,
});

// Zámerne len popisky bez hodnôt: tajomstvá (heslá, kľúče) spravuje desktopový Secrets Setup
// a web ich nesmie zobrazovať ani meniť.
type Field = [label: string, secret?: boolean];
const sections: { id: string; label: string; fields: Field[] }[] = [
  {
    id: "db",
    label: "Databáza",
    fields: [["Hostiteľ"], ["Port"], ["Názov databázy"], ["Používateľ"], ["Heslo", true]],
  },
  {
    id: "wallet",
    label: "Google Wallet",
    fields: [
      ["Issuer ID"],
      ["Google Cloud projekt"],
      ["Bucket"],
      ["Prihlasovacie údaje (JSON)", true],
    ],
  },
  {
    id: "smtp",
    label: "E-mail (SMTP)",
    fields: [["SMTP server"], ["Port"], ["Používateľ"], ["Heslo", true]],
  },
  {
    id: "log",
    label: "Logovanie",
    fields: [["Úroveň logovania"]],
  },
];

function SettingsPage() {
  return (
    <>
      <PageHeader title="Nastavenia" pretitle="Systém" />
      <DemoNotice>
        Nastavenia obsahujú tajomstvá a spravuje ich desktopová aplikácia (Secrets Setup). Táto
        obrazovka je len náhľadom rozloženia a žiadne hodnoty nezobrazuje ani neukladá.
      </DemoNotice>
      <Tabs defaultValue="db">
        <TabsList>
          {sections.map((s) => (
            <TabsTrigger key={s.id} value={s.id}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {sections.map((s) => (
          <TabsContent key={s.id} value={s.id}>
            <Card title={s.label}>
              <div className="grid gap-4 p-4 sm:grid-cols-2">
                {s.fields.map(([label, secret]) => (
                  <div key={label} className="space-y-1.5">
                    <Label htmlFor={s.id + label}>{label}</Label>
                    <Input
                      id={s.id + label}
                      type={secret ? "password" : "text"}
                      disabled
                      placeholder={secret ? "••••••••" : "—"}
                      autoComplete="off"
                    />
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
