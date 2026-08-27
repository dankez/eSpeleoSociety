# eSpeleoSociety

eSpeleoSociety je PyQt desktopovy administracny klient pre spravu clenov, klubov, clenskych poplatkov, eCP ziadosti a elektronickych jaskyniarskych preukazov.

Projekt je momentalne v prechodnom stave: desktop klient stale pristupuje priamo do PostgreSQL a pouziva lokalne zasifrovane secrets. Cielova architektura je hruby administracny klient plus API/OAuth2 backend, ktory ako jediny vidi databazu, Google Cloud a podpisovacie kluce.

## Kde zacat

- [Technicky manual](docs/technical-manual.md) vysvetluje architekturu, databazove tabulky, workflow, konfiguraciu, testy, bezpecnost a roadmapu.
- [API/OAuth2 migration plan](docs/api-oauth2-migration-plan.md) popisuje cielovu backend architekturu.
- [Signed Offline eCP QR](docs/ecp-signing.md) popisuje offline overitelne QR pre eCP.
- [Database Bootstrap](database/README.md) popisuje lokalnu PostgreSQL schemu a migracie.
- [Fix Log](fix.md) sumarizuje doteraz vykonane opravy a aktualny stav.

## Spustenie

```bash
.venv/bin/python main.py
```

Ak neexistuje zasifrovany subor secrets, aplikacia najprv otvori setup dialog pre DB, Google Cloud a eCP podpisovacie nastavenia.

### Google Cloud Storage credentials (nahravanie fotiek/log)

Pole `JSON credentials` v setup dialogu (`setup.py`) prijima **obsah** GCP
service account kluca (JSON subor stiahnuty z Google Cloud Console ->
IAM & Admin -> Service Accounts -> Keys -> Add key -> JSON), nie iba cestu k
nemu. Pouzi tlacidlo **"Import JSON key file..."** a vyber stiahnuty `.json`
subor - jeho obsah sa ulozi priamo v zasifrovanom `secrets.properties`, takze
uz nemoze zmiznut pri prenose na iny pocitac (predosla nezhoda: povodne sa
ukladala iba cesta/nazov suboru, ktory bez fyzickeho .json vedla k
`DefaultCredentialsError` / "credentials file was not found").

Stara forma (cesta k `.json` suboru na disku) stale funguje kvoli spatnej
kompatibilite, ale odporuca sa import obsahu.

## Testy

```bash
PYTHONDONTWRITEBYTECODE=1 .venv/bin/python -m unittest discover -s tests -v
```

PostgreSQL integracny test sa spusti iba vtedy, ked je nastavena premenna `ESPELEO_TEST_DATABASE_URL` na disposable databazu.

## Vyvojarske nastroje

```bash
python3 tools/preflight_check.py          # kontroly prekladov, API kontraktu, migracii, vrstiev a tajomstiev
python3 tools/preview_ecp_card.py         # offline render eCP karty, PDF, QR a overovacej stranky
```

`preview_ecp_card.py` nepotrebuje databazu, Google Cloud, FTP ani nakonfigurovane secrets - podpisovy kluc si vygeneruje jednorazovo, takze sa da vzhlad preukazu iterovat okamzite.

## Agent skills

Repozitar obsahuje skills pre Copilot CLI v `.github/skills/`:

| Skill | Kedy sa pouziva |
|---|---|
| `espeleo-design` | zmeny UI, eCP preukazu, overovacej stranky a wallet passov |
| `espeleo-preflight` | overenie zmien pred commitom, PR a merge |
| `espeleo-migrations` | zmeny databazovej schemy a migracie |
| `espeleo-context` | lacna navigacia v kode (lean-ctx + graphify), setrenie tokenov |
