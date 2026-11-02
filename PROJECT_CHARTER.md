# Pharmaceutical Stability Explorer
## Project Charter — Version 0.1

**Project status:** Proposed / development blueprint (not released or validated)  
**Repository slug:** `pharmaceutical-stability-explorer`  
**Portfolio:** Stability & Shelf-Life Engineering  
**Document version:** 0.1 | 2026-11-01  
**Product type prioritized:** Conventional synthetic chemical drug substances and drug products, general room-temperature case  
**Primary references:** ICH Q1A(R2), ICH Q1E, ICH Q1D; monitor consolidated draft ICH Q1 (Step 3, not implemented)

### 1. Executive purpose
Provide a publicly accessible, privacy-conscious educational engineering explorer for planning, visualizing, and reviewing **long-term (real-time)**, **intermediate**, and **accelerated** pharmaceutical stability studies. The tool should show storage-condition selection, time-point plans, stability-attribute measurements, detection of potential significant changes, and explicit evidence gaps. It is **not** an automated regulatory shelf-life assignment tool.

### 2. Problem statement
Stability programs often require engineers and scientists to reconcile multiple ICH conditions, product classifications, testing intervals, quantitative stability attributes, and exceptions. Existing simple aging calculators may incorrectly imply that accelerated exposure automatically converts into calendar-equivalent shelf life. This product should make the ICH decision pathways intelligible, auditable, and conditional upon product context.

### 3. Regulatory position
- **ICH Q1A(R2)**: effective baseline for the general-case stability study framework, with applicability boundaries.
- **ICH Q1E**: effective baseline for stability-data evaluation, regression, confidence bounds, and scientifically justified extrapolation.
- **ICH Q1D**: bracketing and matrixing (future module).
- **ICH Q1B / Q1C**: photostability and new dosage forms (future modules).
- **ICH Q5C**: biological/biotechnological products (future scope; do not apply general small-molecule defaults blindly).
- **ICH consolidated Q1 draft** (Step 2b published 2025; ICH tracker indicates Step 3 as of 2026-11-01): reference for forward compatibility, **not binding guidance** and not merged into default rules.
- Market/jurisdiction-specific requirements, alternative drug categories, and other stability or pharmacopoeial expectations remain product-dependent.
- ICH Q1F was withdrawn in 2006; do not present it as an active harmonized standard.

### 4. Primary users
CMC/stability scientists; pharmaceutical formulation scientists; packaging/container-closure engineers; quality/regulatory professionals; technical educators.

### 5. Scope of Version 0.1
**IN:**
1. Guided selection: drug substance vs drug product; intended storage; selected long-term condition; package permeability category as a scope flag.
2. General-case room-temperature study templates: long-term, accelerated, and conditional intermediate.
3. Suggested test schedules (editable): long-term 0,3,6,9,12,18,24 and annually thereafter; accelerated 0,3,6; intermediate 0,6,9,12 months.
4. Per-condition tracking of batch, time point, stability attribute, unit, actual result, proposed acceptance criterion, and measured deviations.
5. Rules to flag *potential* Q1A(R2) significant change with source and context.
6. Conditional intermediate-study recommendation only when applicable.
7. Gaps report, evidence-status narrative, downloadable CSV/JSON and readable report.
8. Synthetic worked examples plus minimum unit/regression tests.

**OUT:**
- Guaranteed shelf life or retest period; FDA/EMA compliance certification or automated release decision.
- Automatic 40°C-to-25°C aging factors, unrestricted Arrhenius conversion, or implied expiry from months at accelerated conditions.
- Formal Q1E statistical extrapolation, ANCOVA batch-poolability, confidence-bound expiration estimates (reserved for V0.2).
- Cold-chain, frozen, biologics, vaccines, advanced therapies, water-loss semi-permeable special cases (later versions).
- Photostability, transport excursions, in-use stability, change-control workflows, 21 CFR Part 11 claims (later versions).

### 6. Functional flow
**Step 1: Study context.** Select substance/product, region, intended labeled storage, container-closure class, drug modality, and proposed stability attribute(s).
**Step 2: Applicability gate.** If outside V0.1, provide contextual warning and generic educational reference rather than an unsupported recommendation.
**Step 3: Study builder.** Generate editable time-point templates with exact storage tolerances and a distinction between minimum data at application submission and full planned study duration.
**Step 4: Data input.** Enter or upload batch/time-point/attribute results, applicable specification limits, and any assigned manual significant-change outcome.
**Step 5: Analysis.** Show raw values and plots for each condition and attribute; display difference from baseline and specification status. Use cautious labels for possible significant change.
**Step 6: Rule engine.** Evaluate need for intermediate testing for the *general room-temperature* case; do not trigger a separate intermediate branch when long-term is already 30°C/65% RH.
**Step 7: Evidence report.** Describe what data have and have not demonstrated, missing samples/time points, any data-handling assumptions, and relevant ICH citations.

### 7. Study-condition presets (general case only)
| Study | Temperature (°C) | RH (%) | Example schedule (months) | Minimum at initial submission |
|---|---:|---:|---|---|
| Long-term Option A | 25 ± 2 | 60 ± 5 | 0,3,6,9,12,18,24; annually thereafter | 12 months |
| Long-term Option B | 30 ± 2 | 65 ± 5 | 0,3,6,9,12,18,24; annually thereafter | 12 months |
| Intermediate | 30 ± 2 | 65 ± 5 | 0,6,9,12 | 6 months of a 12-month study, if applicable |
| Accelerated | 40 ± 2 | 75 ± 5 | 0,3,6 | 6 months |

**NOTE:** Calendar values are editable study templates, not universally applicable study plans. For intermediate studies triggered by accelerated significant change, the example four points are from a 12-month intermediate study. Storage conditions and testing requirements for special container systems and product types differ.

### 8. Data entities
`Study`: id, regulationProfile, selectedModality, substanceOrProduct, storageClass, longTermPreset, proposedPeriodMonths, jurisdiction, createdAt, evidenceLevel.  
`Condition`: id, name, temperatureC, toleranceC, relativeHumidityPct, toleranceRhPct, plannedMonths[].  
`Batch`: batchId, scaleCategory, formulationId, strength, containerClosureDescription.  
`Attribute`: attributeId, name, unit, directionality, lowerAcceptanceLimit?, upperAcceptanceLimit?, significantChangeRule?, approvedSpecReference?.  
`Observation`: batchId, conditionId, attributeId, nominalMonth, actualElapsedDays?, value, sampleId?, observationDate?, comment?.  
`Assessment`: ruleId, ruleVersion, status, triggeringObservations[], rationale, manualOverrideReason?, reviewedAt?.

No product names, corporate confidential data, clinical data, or personal health records are required.

### 9. Required screen layout
1. **Study setup** – applicability, substance vs product, storage-condition selection, exact boundaries.
2. **Condition comparison** – three aligned long-term/intermediate/accelerated tracks, with time points and missing data.
3. **Attribute trends** – assay/impurities/pH/etc. vs actual time, plotted separately by condition; acceptance limits visible.
4. **Decision trace** – significant-change evaluation and intermediate-study branch with named regulatory source.
5. **Evidence summary** – observed results vs inference; no unqualified shelf-life claim.
6. **Method and limitations** – guideline version, equations and scope, test coverage, updated date.

### 10. Output examples
- "Six months of accelerated data are present; potential significant change detected for impurity A at month 3."
- "Long-term condition is 25°C/60% RH; intermediate study at 30°C/65% RH is indicated for evaluation under the general-case rule."
- "Long-term condition is 30°C/65% RH; no separate intermediate condition applies under the general-case Q1A(R2) framework."
- "Long-term results currently cover 9 months. This tool cannot support a conclusion that 24 months of shelf life has been established."

### 11. Software architecture and quality requirements
- Browser-based, static-hostable application on GitHub Pages; no mandatory server.
- Content separated into (a) guideline versioned rule data, (b) pure calculation functions, (c) data validation, (d) visualization, and (e) reports.
- Avoid `eval`; deterministic output for identical inputs; JSON round-trips; no mutation of imported raw data.
- Every rule records standard, revision, section, interpretation note, and implementation version.
- Conditions always display units and tolerances; validate impossible months, NaNs, duplicate/conflicting observations, missing baselines, and inconsistent units.
- Keep *measured*, *calculated*, *user-judged*, and *regulatory interpretation* values separate.
- Provide accessible labels, keyboard operation, screen-reader readable charts/tables, responsive mobile layout.
- Synthetic samples only in repository; no proprietary company datasets, logos, or copied guideline tables beyond short necessary facts and citations.
- No cloud upload by default; export/copy/download is user initiated.
- Never describe the app as validated for GMP or regulatory submissions absent documented validation.

### 12. Release criteria for V0.1
- All condition presets verified against source text.
- At least 12 synthetic test cases passing, including all specified boundary/conditional branches.
- Study schedules correct when condition changes; no duplicate intermediate automatically created for 30°C/65% RH long-term.
- No user workflow can display an automatically assigned shelf life.
- Every output includes its own rule trace or source link and evidence limitations.
- Peer review of domain logic and code review of input/output integrity.
- GitHub Pages smoke test logged separately from scientific/methodological validation.

### 13. Roadmap
| Version | Deliverables | Evidence expectation |
|---|---|---|
| V0.1 | ICH study planner + raw trend viewer + significant-change triage + evidence gaps | Rule-by-rule verification against Q1A(R2); synthetic tests |
| V0.2 | Q1E single-batch and multi-batch regression, 95% confidence bounds, batch poolability and qualified extrapolation paths | Statistical reference examples, independent replication |
| V0.3 | Q1D bracketing/matrixing, impermeable/semipermeable, refrigerated/frozen pathways, photostability, excursions and in-use | Product-class regulatory mapping |
| V0.4 | Consolidated ICH Q1 migration when finalized and regionally adopted; biologic/complex product modules; validated report workflow as appropriate | Regulatory delta analysis, expanded independent review |

### 14. Separation from other tools
Medical-device **Accelerated Aging Explorer**: material / package aging, especially ASTM F1980 / ISO 11607 and its assumptions.  
**Pharmaceutical Stability Explorer**: formulation + API/drug-product stability, ICH long-term/intermediate/accelerated protocols and Q1E data analysis.  
Future **Container Closure & Barrier Portfolio** can connect findings (WVTR/OTR, closure systems, container integrity, extractables/leachables) without suggesting those findings alone establish drug-product stability.

### 15. Unresolved decisions
- Does V0.1 start with substance and drug product or prioritize drug product? **Proposed:** both with independent significant-change criteria.
- Will multi-batch CSV import and exploratory plots be included V0.1? **Proposed:** yes.
- Jurisdiction selector: informational only in V0.1; do not claim uniform conditions across all regional climatic zones.
- Packaging feature: limited applicability flag in V0.1; water-loss calculations deferred.
- Regulatory revision tracking: establish a rule change log when revised consolidated Q1 reaches Step 4 and regional implementation.

### 16. Authoritative links
1. FDA, Q1A(R2) (Final): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/q1ar2-stability-testing-new-drug-substances-and-products
2. EMA Q1A(R2) source PDF: https://www.ema.europa.eu/en/documents/scientific-guideline/ich-q-1-r2-stability-testing-new-drug-substances-and-products-step-5_en.pdf
3. FDA, Q1E (Final): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/q1e-evaluation-stability-data
4. EMA Q1E PDF: https://www.ema.europa.eu/en/documents/scientific-guideline/ich-q-1-e-evaluation-stability-data-step-5_en.pdf
5. FDA, Q1D (Final): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/q1d-bracketing-and-matrixing-designs-stability-testing-new-drug-substances-and-products
6. FDA, consolidated Q1 (Draft, not for implementation): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/q1-stability-testing-drug-substances-and-drug-products
7. EMA consolidated Q1 draft: https://www.ema.europa.eu/en/scientific-guidelines/ich-q1-guideline-stability-testing-drug-substances-drug-products
8. ICH quality-guidelines status index: https://www.ich.org/page/quality-guidelines
