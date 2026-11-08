// Ukážkové údaje pre náhľad obrazovky Import SEPA. Import bankového výpisu zatiaľ rieši
// desktopová aplikácia (sepa_processing.py); web na to nemá API.
export interface DemoSepaPayment {
  vs: string;
  payer: string;
  iban: string;
  amount: number;
  date: string;
  matchedMember: string | null;
}

export const demoSepaPayments: DemoSepaPayment[] = [
  {
    vs: "2026003",
    payer: "VARGA MARTIN",
    iban: "SK31 1100 0000 0026 1234 5678",
    amount: 20,
    date: "2026-11-04",
    matchedMember: "Martin Varga",
  },
  {
    vs: "2026011",
    payer: "SOKOL MAREK",
    iban: "SK12 0900 0000 0051 8765 4321",
    amount: 10,
    date: "2026-11-04",
    matchedMember: "Marek Sokol",
  },
  {
    vs: "2026016",
    payer: "LACKOVA SIMONA",
    iban: "SK45 0200 0000 0012 3456 7890",
    amount: 10,
    date: "2026-11-05",
    matchedMember: "Simona Lacková",
  },
  {
    vs: "2026099",
    payer: "NEZNAMY PLATITEL",
    iban: "SK90 1100 0000 0029 9988 7766",
    amount: 20,
    date: "2026-11-06",
    matchedMember: null,
  },
];
