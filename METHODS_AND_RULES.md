# Pharmaceutical Stability Explorer — Methods and Rule Specification
**Version 0.1 | 2026-11-01**

## 1. Governing model
**This is an empirical stability study explorer, not a time-temperature conversion calculator.** The baseline source is ICH Q1A(R2). Formal quantitative shelf-life inference belongs to V0.2 under Q1E.

## 2. Measured-change calculations (V0.1)
For attribute `y` and batch `b`, with actual time `t` (months), baseline `y_b,0`:
- `absoluteChange = y_b,t - y_b,0` (in original attribute units)
- `relativeChangePct = 100 * (y_b,t - y_b,0) / y_b,0`, **only** if baseline is non-zero and a relative percentage is scientifically meaningful.
- `withinAcceptance = (lowerBound == null || y >= lowerBound) && (upperBound == null || y <= upperBound)`
- Display flags for `missing baseline`, `missing spec`, `uncertain units`, `incomplete attribute`, and `not evaluable` rather than treating missing data as pass.
- Do not compare values across storage conditions unless expressly labeled exploratory and methodologically justified.

**Assay-specific caution:** Q1A(R2) defines a 5% change in assay from initial value as one of the significant-change triggers for drug products. The implementation must distinguish changes in percentage points from relative percent changes, depending on underlying measurement units and the scientifically validated interpretation. Implement a clear **configurable assay-change evaluator**, record its measurement basis, and require review; never apply `relativeChangePct >= 5` without a documented definition.

## 3. Significant-change rules (general case)
The engine records `SIGNIFICANT_CHANGE`, `NO_SIGNIFICANT_CHANGE_DETECTED`, or `NOT_EVALUABLE`, along with specific evidence.

**Drug substance (API):** Significant change if an applicable specification is not met (Q1A(R2), 2.1.7.1). Do not reuse the drug-product 5% assay trigger indiscriminately.

**Drug product:** Potential significant change includes:
- 5% assay change from initial value, or failure of applicable biological/immunological potency acceptance criteria.
- Degradation product above its acceptance criterion.
- Failure of appearance, physical property, or functionality acceptance criterion, with dosage-form-specific consideration for effects expected under acceleration.
- Applicable pH acceptance failure.
- Applicable dissolution acceptance failure for 12 dosage units.

**Human judgment:** Do not infer product-specific specification from arbitrary defaults. Product-specific acceptance criteria, measurement type, and scientifically justified exceptions must be input or assessed by a reviewer.

## 4. Conditional intermediate pathway
Applicable only to the Q1A(R2) **general room-temperature** framework:
```
if outsideV0_1Scope:
    status = NOT_EVALUABLE
elif longTermCondition == "25C_60RH" and
     acceleratedDataShowsSignificantChangeWithinFirstSixMonths:
    status = INTERMEDIATE_STUDY_INDICATED
elif longTermCondition == "30C_65RH":
    status = NO_DISTINCT_INTERMEDIATE_CONDITION
elif significantChangeAssessmentIsNotEvaluable:
    status = INSUFFICIENT_DATA_TO_DETERMINE
else:
    status = NOT_TRIGGERED_BY_PRESENT_ACCELERATED_DATA
```
This is a triage decision only, not a shelf-life decision.

## 5. Planned-timepoint reminders
- Long-term: commonly every 3 months in Year 1, every 6 months in Year 2, then annually for a proposed period of at least 12 months.
- Accelerated: at least 3 time points including first and last (e.g., 0, 3, 6 months) for a 6-month study.
- Intermediate when indicated: minimum 4 time points (e.g., 0, 6, 9, 12 months) from a 12-month study; normally at least 6 months data at initial submission.
- Do not confuse the "minimum data at submission" with the planned duration of the full stability study or the approved shelf life.

## 6. Shelf-life and extrapolation (V0.2, not to be implemented prematurely)
Suggested exploratory single-batch model for a quantitative attribute:
`y(t) = beta_0 + beta_1 * t + epsilon`.

Point estimate at time `t`:
`yhat(t) = beta0hat + beta1hat * t`.

For x_t = [1, t]^T and regression matrix X:
`SEmean(t) = s * sqrt( x_t^T (X^T X)^(-1) x_t )`

Confidence limit for the **mean** curve:
`one-sided lower 95% = yhat(t) - t_(0.95,df) * SEmean(t)`
`one-sided upper 95% = yhat(t) + t_(0.95,df) * SEmean(t)`
`two-sided 95% bounds = yhat(t) ± t_(0.975,df) * SEmean(t)`.

For a decreasing critical attribute, the relevant lower one-sided 95% mean bound intersects the lower acceptance criterion; for an increasing attribute, the upper 95% mean bound intersects the upper criterion; if direction is unknown, consider both two-sided bounds. **This is not a prediction interval for an individual future batch** and is not by itself a regulatory authorization to set shelf life.

Needed before releasing V0.2:
- Model-form justification, residual diagnostics, duplicate/replicate handling, outliers and missingness.
- Multi-batch poolability checks; if inappropriate to pool, assess individual batches.
- ICH Q1E decision-tree treatment of accelerated/intermediate changes and constrained extrapolation.
- Clear distinction of "model-implied intersection" from "supportable proposed shelf life"; consider all shelf-life attributes and supportive data.
- Independent benchmark against published examples and statistical packages.

**Do not implement** "6 months at 40°C = 24 months at 25°C" or any implicit Q10 rule in this project.

## 7. Packaging context
V0.1 can capture category `impermeable`, `semipermeable`, `unknown` but only the general-room-temperature study templates are currently supported where appropriate. For aqueous drugs in semipermeable containers, evaporation and *low-RH* study conditions are critical and require a separate rule set. A container should not be inferred to be impermeable simply because it is labeled "vial" or "bottle".

## 8. Reproducibility and decision trace
Every output must provide:
- Selected guideline and revision/version;
- Applicability statement and study conditions;
- Input observation identifiers used;
- Calculation version and units;
- Rule ID, source section, and result;
- Statement of missing data or reviewer decisions;
- Warning that the result is exploratory and not a standalone shelf-life assignment.

## 9. Data dictionary/typed interfaces (illustrative)
```ts
type StudyCondition = "long-term-25-60" | "long-term-30-65" | "intermediate-30-65" | "accelerated-40-75";
type EvaluationStatus = "significant-change" | "no-significant-change-detected" | "not-evaluable";
type AttributeType = "assay" | "degradant" | "dissolution" | "ph" | "appearance" | "functionality" | "other";
interface Observation {
  batchId: string;
  condition: StudyCondition;
  nominalMonth: number;
  actualElapsedDays?: number;
  attributeId: string;
  value?: number;
  unit?: string;
  source?: "synthetic" | "user-entered";
}
interface RuleResult {
  ruleId: string;
  ruleVersion: string;
  status: EvaluationStatus | "intermediate-indicated" | "no-distinct-intermediate-condition";
  evidenceIds: string[];
  rationale: string;
}
```

## 10. Source links
ICH Q1A(R2): https://www.ema.europa.eu/en/documents/scientific-guideline/ich-q-1-r2-stability-testing-new-drug-substances-and-products-step-5_en.pdf  
ICH Q1E: https://www.ema.europa.eu/en/documents/scientific-guideline/ich-q-1-e-evaluation-stability-data-step-5_en.pdf  
Consolidated Q1 **draft**: https://www.ema.europa.eu/en/scientific-guidelines/ich-q1-guideline-stability-testing-drug-substances-drug-products
