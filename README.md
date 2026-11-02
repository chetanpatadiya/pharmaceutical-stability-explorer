# Pharmaceutical Stability Explorer

**Standalone GitHub Pages application · V0.1.0 · 2026-11-01**

A static, no-dependency, browser-based **ICH Q1A(R2) pharmaceutical stability study explorer** for planning long-term, accelerated and conditional intermediate studies, inspecting measured batch-level trends, and flagging potential significant change. Designed for public, educational exploration and method transparency.

> **Not a validated GxP system. Not a regulatory submission, release specification, shelf-life calculator, retest date, or substitute for an approved protocol.** Do not import confidential pharmaceutical or employer data without authorization. All provided examples are synthetic.

## Features

- ICH Q1A(R2) general-case conditions:
  - Long-term: **25 ± 2°C / 60 ± 5% RH**, or **30 ± 2°C / 65 ± 5% RH**.
  - Accelerated: **40 ± 2°C / 75 ± 5% RH**.
  - Conditional intermediate: **30 ± 2°C / 65 ± 5% RH** for the 25/60 long-term pathway, if accelerated significant change is found.
- Distinguishes **drug substance** (specification failures) from **drug product** (assay, degradant, and other applicable significant-change criteria).
- Product context and applicability gate: prevents automatically applying room-temperature logic to refrigerated/frozen, biologic/complex or aqueous-semi-permeable product situations.
- Editable timepoint plans, measurement input, custom acceptance limits, and multiple batches/attributes.
- Browser-native SVG trend plots of measured observations. No fitted expiry prediction.
- Explicit `trigger` / `no trigger detected` / `not evaluable` assessment statuses.
- Synthetic demo with three fictitious batches and 48 measurements.
- CSV import/export, full-project JSON import/export and Markdown evidence report.
- No login, server-side storage, external APIs, analytics, or runtime dependencies.
- Responsive layout for desktop and phone.
- Node test suite for guideline rules, data validation, CSV and evidence boundaries.

## Quick start: GitHub repository and Pages

1. Create a **public GitHub repository** named `pharmaceutical-stability-explorer` (or another preferred name). Do not add an auto-generated README because this ZIP contains one.
2. Unzip the package locally and upload **the files and folders inside the ZIP to the repository root**, keeping `.github/workflows/pages.yml` and `.nojekyll` intact. Alternatively, commit using Git:

   ```bash
   git init
   git add .
   git commit -m "Release Pharmaceutical Stability Explorer v0.1.0"
   git branch -M main
   git remote add origin https://github.com/<YOUR_USERNAME>/pharmaceutical-stability-explorer.git
   git push -u origin main
   ```

3. GitHub repository → **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Open the **Actions** tab to view `Validate and deploy to GitHub Pages`. The deployment job runs only after the test job passes.
5. Expected URL, if the GitHub user is `chetanpatadiya` and the slug is unchanged, **after successful deployment**:

   `https://chetanpatadiya.github.io/pharmaceutical-stability-explorer/`

**Note:** This URL is expected based on GitHub Pages naming; it is not a verification that the site has been deployed.

## Run locally

The app uses native browser JavaScript modules. Opening `index.html` using a `file://` URL may be blocked by browser cross-origin rules. Start a local web server in this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. No npm install or build is necessary for normal operation.

## Test

Node.js 20 or newer:

```bash
npm test
npm run check
```

Node's built-in test runner is used; **no external JavaScript packages** are required.

## Example first-use workflow

1. Open **Overview** and inspect the preloaded *synthetic* 3-batch dataset; it deliberately includes accelerated significant-change screening flags.
2. Go to **Study design**, select drug product or drug substance and the applicable room-temperature long-term condition, then **Apply study design**. Under the time-point schedule, use **Customize points** for a study-specific plan.
3. Go to **Stability data** to add attributes with user-defined limits and enter observations. The first result for assay should typically be the time-zero result for the **same batch and study condition**.
4. Review **Evaluation** for actual trend visualization, intermediate-study need, and the evidence trace.
5. Export `.json` to save/restore the full session; `.csv` captures attributes and observations; `.md` captures the interpretation summary.

**Data handling:** The application does not persist data between page reloads. Export JSON before closing/refreshing. Imports replace existing data after confirmation. The application keeps data in memory within the browser session, not in the developer's server. Data entered by the user are never sent to this project's server by application code.

## Data models

`src/engine.js` owns product applicability, ICH condition profiles, planned time points, screening logic, deterministic examples, import/export, and report generation. `src/app.js` owns form state, rendering, visualization, and direct file events. `index.html` and `styles.css` implement the responsive UI.

`schemaVersion: 1` JSON project:

```json
{
  "schemaVersion": 1,
  "study": {
    "name": "Example API stability study",
    "productType": "substance",
    "modality": "small-molecule",
    "storage": "room",
    "longTerm": "long25",
    "container": "other",
    "aqueous": false,
    "durationMonths": 24
  },
  "attributes": [],
  "observations": [],
  "plans": {},
  "example": false
}
```

The canonical CSV column order is defined in `src/engine.js` as `CSV_COLUMNS`; exporting CSV produces a valid import template. V0.1 rejects duplicate batch/condition/attribute/time observations rather than silently averaging technical replicates. Supporting replicate modeling is planned for a future version.

## Scope & regulatory limitations

- V0.1 prioritizes conventional *new synthetic-chemical drug substances and products* eligible for the ICH Q1A(R2) **general room-temperature case**. Real world applicability depends on formulation, closure, storage, dossier, region, dosage form, quality attributes, and deviations/exceptions.
- 12 months of long-term, 6 months of accelerated, and (when applicable) 6 months of data from a 12-month intermediate study refer to **minimum coverage at initial submission**, not granted shelf life.
- A 5% change in assay from the initial value is a Q1A(R2) drug-product significant-change concept. The implemented relative change is an explicit, review-required numeric screen, not a claim that every assay format has the same statistical or metrological basis.
- A pH, dissolution, physical or functional property numeric limit can be screened, but the user must confirm the correct method/acceptance rules, including applicable dissolution 12-unit expectations. Other quality attributes may require manual review.
- Incomplete assay baselines, missing specifications, and missing accelerated data generate **not evaluable** output, not a silent pass.
- The default timeline is a **study design template**, and custom schedules should be justified under the relevant protocol. V0.1 does not validate sampling commitments.
- Formal shelf-life inference and extrapolation under **ICH Q1E** are not implemented. Do not use fixed Q10 or time-temperature conversion for pharmaceuticals in this explorer.
- The consolidated ICH Q1 guidance on FDA/EMA pages is **draft, not for implementation** as of this release; refer to current official status if maintaining the application later.

### Primary sources

- [FDA — ICH Q1A(R2), Final (2003)](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/q1ar2-stability-testing-new-drug-substances-and-products)
- [EMA — ICH Q1A(R2) full guideline](https://www.ema.europa.eu/en/documents/scientific-guideline/ich-q-1-r2-stability-testing-new-drug-substances-and-products-step-5_en.pdf) (especially §§2.1.6–2.1.7; 2.2.6–2.2.7)
- [FDA — ICH Q1E evaluation (Final)](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/q1e-evaluation-stability-data)
- [FDA — Consolidated ICH Q1, draft June 2025](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/q1-stability-testing-drug-substances-and-drug-products)

## Engineering files

| File | Purpose |
|---|---|
| `index.html` | UI and accessible semantic markup |
| `styles.css` | Responsive design and print rules |
| `assets/favicon.svg` | Site icon |
| `src/engine.js` | Guideline profiles, algorithms, input validation, report + CSV |
| `src/app.js` | Inputs, session state, charts, event handlers, file downloads |
| `tests/engine.test.js` | Regression tests and representative synthetic cases |
| `.github/workflows/pages.yml` | CI testing and GitHub Pages deployment |
| `PROJECT_CHARTER.md` | Project scope and version roadmap |
| `METHODS_AND_RULES.md` | Formula and logic documentation |
| `TEST_PLAN.md` | Test cases and verification criteria |
| `LICENSE` | MIT license |

## Roadmap

- **V0.1** (this release): condition planning, basic observed-data exploration, rule-based screening, imports/exports.
- **V0.2**: evidence-qualified ICH Q1E trend analysis, batch-poolability review, confidence-bound analysis, guarded extrapolation.
- **V0.3**: temperature-specific and container-specific cases, photostability, in-use studies, bracketing/matrixing.
- **V0.4**: regulated lifecycle workflows and consolidated Q1 transition *after* finalization and regional implementation, with documented verification.

## License

MIT. This repository includes its own original application implementation, not copied regulatory publications. Review authoritative ICH/FDA/EMA text independently.
