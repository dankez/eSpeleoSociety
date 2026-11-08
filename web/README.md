# eSpeleo web

Webové administračné rozhranie eSpeleoSociety (Vite + React + TypeScript SPA, TanStack Router a Query,
Tailwind v4, vzhľad v štýle Tabler). Je to čisto klientska aplikácia bez SSR, ktorá komunikuje
s Python backendom cez `/api/v1`.

## Čo je napojené na API

| Obrazovka | Zdroj dát | Stav |
|---|---|---|
| Prehľad | `GET /stats`, `GET /ecp-requests` | len čítanie |
| Členovia | `GET /members` (filtre klub, status, poplatok, hľadanie), `GET /members/{id}` | len čítanie |
| Kluby | `GET /clubs` | len čítanie |
| eCP žiadosti | `GET /ecp-requests` | len čítanie, schvaľovanie zatiaľ rieši desktopová aplikácia |
| Notifikácie | `GET /notifications` | len čítanie |
| Reporty | `GET /stats` | len čítanie |
| Import SEPA | ukážkové dáta (`src/lib/demo-sepa.ts`) | náhľad, import rieši desktop |
| Nastavenia | žiadne | náhľad rozloženia, tajomstvá spravuje desktop |

Web zámerne nič nezapisuje. Tlačidlá, ktoré by vyžadovali zápis (schváliť, importovať, nový člen),
sú neaktívne a majú vysvetlenie. Dátum narodenia a eCP hash API nevracia, takže ich web nezobrazuje.

## Prihlásenie

Pri otvorení sa zadáva bearer token API (JWT s rolou `admin` alebo `club_president`). Token sa drží
len v pamäti prehliadača a po obnovení stránky sa zadáva znova. Plnohodnotné OAuth2 prihlásenie
popisuje `docs/api-oauth2-migration-plan.md`.

## Požiadavky

- Node.js 20+ (vyvíjané na Node 24)
- npm 10+

## Inštalácia

```bash
cd web
npm install
```

Za firemným proxy treba pred inštaláciou nastaviť `HTTPS_PROXY`.

## Vývoj

1. Spustite Python backend na `127.0.0.1:8080`. Vo vývojovom režime treba nastaviť
   `ESPELEO_ENV=development` a `ESPELEO_API_JWT_SECRET`:

   ```bash
   ESPELEO_ENV=development ESPELEO_API_JWT_SECRET=<tajomstvo> python backend/dev_server.py
   ```

2. V adresári `web/` spustite vývojový server (port 5173):

   ```bash
   npm run dev
   ```

Požiadavky na `/api/*` Vite preposiela na `http://127.0.0.1:8080` (pozri `vite.config.ts`).
Aplikácia je dostupná na <http://localhost:5173>.

## Build

```bash
npm run build     # výstup v web/dist
npm run preview   # lokálny náhľad produkčného buildu
```

Build je statický. Pri nasadení treba `/api` obslúžiť z rovnakého pôvodu (reverzný proxy), pretože
backend nevracia CORS hlavičky, a nastaviť CSP, napríklad
`default-src 'self'; connect-src 'self'; frame-ancestors 'none'`. Písmo Inter je súčasťou balíka,
aplikácia nevolá žiadnu tretiu stranu.

## Testy a kontroly

```bash
npm test          # vitest run
npm run typecheck # tsc --noEmit
npm run lint      # eslint
```

## Štruktúra

- `src/routes/` – súborové routovanie (`@tanstack/react-router`); `src/routeTree.gen.ts` sa generuje automaticky pluginom
- `src/components/admin/` – aplikačné komponenty (tabuľka, KPI karta, hlavička stránky, stavy načítania a chýb)
- `src/components/ui/` – základné UI komponenty (shadcn/Radix)
- `src/lib/api.ts` – klient API (bearer token, validácia odpovedí cez zod, kurzorová paginácia)
- `src/lib/schemas.ts` – tvary odpovedí zodpovedajúce `backend/serializers.py` a `docs/api/openapi.yaml`
- `src/lib/queries.ts` – dotazy TanStack Query
