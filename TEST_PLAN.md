# Pharmaceutical Stability Explorer — V0.1 Verification Plan
**Version 0.1 | Synthetic data only**

## Test philosophy
Unit tests assess *correct software behavior* of explicitly transcribed guideline conditions and calculations. They do not establish analytical method validation or a validated pharmaceutical stability system.

| ID | Scenario | Expected behavior |
|---|---|---|
| T01 | General room-temperature, long-term 25/60 | Show 25 ±2°C / 60 ±5% RH; long-term timeline |
| T02 | General room-temperature, long-term 30/65 | Show 30 ±2°C / 65 ±5% RH; no distinct intermediate |
| T03 | Accelerated condition | Show 40 ±2°C / 75 ±5% RH and 0/3/6 month template |
| T04 | 25/60 long-term, evaluated significant change at 40/75 in first 6 months | Mark intermediate study indicated |
| T05 | 25/60 long-term, accelerated results not yet available | Mark intermediate trigger not evaluable, not "not needed" |
| T06 | 30/65 long-term with significant accelerated change | No separate 30/65 intermediate created; flag accelerated finding |
| T07 | Drug substance result outside defined assay specification | Flag substance specification failure |
| T08 | Drug product impurity above its defined limit | Flag potential significant change despite assay stability |
| T09 | Missing baseline for assay attribute | Flag insufficient evidence; no divide-by-zero or pass |
| T10 | Missing acceptance limit | Do not infer pass or invent a spec |
| T11 | Imported duplicate conflicting observations | Reject or require explicit reconciliation, retain source IDs |
| T12 | Semipermeable aqueous drug product | Show unsupported-category gate and reference for special conditions |
| T13 | Refrigerated or frozen drug product | Show separate scope gate; do not use 25/60 vs 40/75 room-temperature templates |
| T14 | Multiple batches with different results | Keep values, trends, and assessments batch-specific; no pooling |
| T15 | Upload or entry of NaN, infinite, nonnumeric time or impossible RH | Validate/reject safely; no misleading plotted data |
| T16 | Any result state | No shelf-life expiry or retest date automatically assigned |
| T17 | Degradant and assay have different units | Trend charts and changes remain attribute-specific |
| T18 | PDF/report generated | Contains source, profile version, calculated values, missing-data flags, and evidence limitation |

## Synthetic fixture 1: accelerated significant change
- Drug product, long-term 25/60, acceleration 40/75.
- Assay at t=0 is 100.0 (percent label claim); t=6 is 94.0.
- Reviewer flags a potential significant change in context of defined assay rule.
- Expected: intermediate testing indicated; **no** shelf-life calculation.

## Synthetic fixture 2: no duplicate intermediate
- Drug product, long-term 30/65.
- Accelerated data at t=3 triggers a significant-change assessment.
- Expected: show significant change; do not create another "intermediate 30/65" track.

## Synthetic fixture 3: stability data insufficient
- Drug product, long-term 25/60 with only 0 and 3 month values.
- Accelerated data missing.
- Expected: missing-data warning; no positive declaration of stable shelf life.

## Validation tasks for future V0.2
1. Reproduce ICH Q1E confidence-bound illustrations using independently implemented linear regression.
2. Independent check of 95% one-sided and two-sided mean confidence limit calculations, sample size, degrees of freedom.
3. Single-batch and multi-batch/poolability examples.
4. Compare statistical intersections, show qualified interpretations per Q1E decision tree.
5. Reject invalid model fits and unjustified extrapolation.

## Release evidence log template
- Source standard/version and section:
- Rule/configuration revision:
- Reference example:
- Independently derived expected result:
- Actual result:
- Test pass/fail:
- Reviewer:
- Date:
- Known limitations:
