# Pitch video — script (3:00) · Challenge 1 · TICKET-013

**Team:** ___ · **First frame:** team name + "Challenge 1 — Find the Real Businesses" · **Language:** English (UI is Dutch)
**Record by 15:45 · uploaded & checked in a private window by 16:15 · form submitted by 16:20.** Form link in docs/challenge.md.

Recording setup: 1440×900 browser window, Chrome, zoom 110%, backend on :8010 + frontend on :5173 with the Schoten data loaded (`make import`). Pre-open tabs: `/straat/Paalstraat`, `/record/0448335384`. Log ONE observation beforehand on a Paalstraat record so the street table already shows a "Hoog / Geen actie" row next to the "Laag / Ter controle" ones.

---

## 0:00–0:30 — The officer's problem (talking head or slide)

> Marleen works for the local economy service of a municipality in the province of Antwerp. Her question is simple: which businesses on this street are actually open? The federal register, the KBO, says roughly 33,000 entries for a town of 20,000 people — dissolved companies still listed, apartment co-owner associations mixed in with bakeries, and new shops missing. Today she cross-checks that by hand in Excel, Google and street visits.
>
> We built a tool that puts the register next to public evidence, tells her what it knows, what it doesn't, and lets her decide.

## 0:30–1:30 — The workflow and the evidence (screen recording, real flow)

1. **Straatoverzicht → Paalstraat** (the jury's worked example, live). Point at the columns: Adres · Onderneming/vestiging · Register · Bewijs van activiteit · Laatste waarneming · Zekerheid · Voorstel.
   > "35 register rows on one street. Red: the register itself says dissolved or the address was struck off. Gray: a *vereniging van mede-eigenaars* — not a business at all. Amber: the register says active but nobody has checked."
2. Click a **ter controle** row → **Detail**. Show *Beoordeling* with the **reasons list**.
   > "Every conclusion is a list of reasons, not a score. No AI — rules the officer can read."
3. Show **Onderneming ↔ vestiging**: an establishment whose parent is elsewhere → "zetel elders / moederonderneming niet in dataset" → click **Haal op via VKBO** → parent appears.
   > "Establishment and legal entity stay linked; the seat can be in another municipality."
4. Right panel — the **minibrowser**: KBO tab (live register page), Kaart & recensies (Google Maps), **Jaarrekeningen** (NBB filings with omzet / winst / VTE, from the National Bank's public data, no key).
   > "She checks the evidence herself; we just bring it to one screen."
5. **Bewijs van activiteit** form: bron = Google Maps, waarneming "openingsuren en recente recensies", conclusie = actief, datum today → save. Status flips to **Actief · Hoog**, reason "Bewijs: …" appears.
6. **Voorstellen** → click **Bevestigen** on one, **Afwijzen** on another.
7. **Goedgekeurde wijzigingen** → "Exporteer CSV".
   > "Nothing leaves the tool until she confirms it."

## 1:30–2:20 — How it was built (architecture slide + quick code/terminal glimpse)

- **Data:** VKBO open data (Digitaal Vlaanderen) — the federal KBO enriched with the Flemish address register. Starter sample: 1,000 Schoten records → SQLite. Registry numbers as text, blanks and placeholder dates cleaned.
- **Backend:** Python / FastAPI. Rule engine: rechtstoestand, ambtshalve doorhaling, adresdoorhaling, rechtsvorm, address-register mismatch, coordinates, contact data, officer evidence → status + zekerheid + reasons. Proposals table with an approval gate; export only *bevestigd*.
- **External evidence, all public, no API keys, no billing:** KBO Public Search (embedded), Google Maps / Street View (embedded or one click), National Bank Balanscentrale via its public consult API — company status, every filed annual account, key figures.
- **Frontend:** React + TypeScript, Dutch UI using the officer's vocabulary.

**Echt vs. gemockt (say this explicitly):**
- Real: register data, rule engine, evidence log, approval + export, KBO embed, NBB figures, VKBO fetch-parent.
- Not done / limited: only 1,000 of Schoten's records loaded (API pagination ready); Google reviews are opened, not scraped; "vestiging ontbreekt op dit adres" (business not in register) is ___ [done / a known gap]; no user accounts; SQLite single-user.

## 2:20–3:00 — Value, limits, reuse

> For Marleen: one street, one screen, dated evidence, her decision. For Tom: he sees *why* — every reason, every source, every date — and can compare public sources before paying a data broker.
>
> Limits: it's a prototype on a sample; evidence is only as good as what the officer records; the register lags the federal KBO by 1–3 days.
>
> Reuse: the data source is a parameter — `KBO_Gemeente = 'Brasschaat'` and the same tool serves the next municipality; the rules are the same across the province. Fresh: re-run the import, parents and status fetched live from VKBO and NBB.
>
> Find the real businesses — and let the officer decide.

---

## Checklist before submitting
- [ ] First frame has team name + challenge number
- [ ] ≤ 3:00, audio clear, UI text readable at 1080p
- [ ] Uploaded to YouTube as **Public** or **Unlisted** (not Private)
- [ ] Opened the link in a private/incognito window — plays without sign-in
- [ ] Google Form submitted (docs/challenge.md) before 16:30 Brussels
