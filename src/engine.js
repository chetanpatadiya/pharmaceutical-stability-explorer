/**
 * ICH Q1A(R2) general-case stability exploration logic.
 * Browser/Node-compatible pure functions, no network access.
 * Exploratory decision support, NOT a shelf-life or GMP compliance determination.
 */
export const ENGINE_VERSION = '0.1.0';
export const GUIDELINE = {
  id: 'ICH Q1A(R2)',
  official: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/q1ar2-stability-testing-new-drug-substances-and-products',
  reference: 'https://www.ema.europa.eu/en/documents/scientific-guideline/ich-q-1-r2-stability-testing-new-drug-substances-and-products-step-5_en.pdf',
  draft: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/q1-stability-testing-drug-substances-and-drug-products'
};
export const CONDITIONS = Object.freeze({
  long25: { id: 'long25', label: 'Long-term · 25°C / 60% RH', temp: 25, tempTolerance: 2, rh: 60, rhTolerance: 5, minAtSubmission: 12, kind: 'long-term' },
  long30: { id: 'long30', label: 'Long-term · 30°C / 65% RH', temp: 30, tempTolerance: 2, rh: 65, rhTolerance: 5, minAtSubmission: 12, kind: 'long-term' },
  intermediate: { id: 'intermediate', label: 'Intermediate · 30°C / 65% RH', temp: 30, tempTolerance: 2, rh: 65, rhTolerance: 5, minAtSubmission: 6, kind: 'intermediate' },
  accelerated: { id: 'accelerated', label: 'Accelerated · 40°C / 75% RH', temp: 40, tempTolerance: 2, rh: 75, rhTolerance: 5, minAtSubmission: 6, kind: 'accelerated' }
});
export const ATTR_KINDS = Object.freeze(['assay', 'degradant', 'ph', 'dissolution', 'physical', 'functionality', 'potency', 'other']);
export const MANUAL_FLAGS = Object.freeze(['none', 'reviewer-significant']);
export const REVIEW_STATUSES = Object.freeze(['trigger', 'no-trigger-detected', 'not-evaluable']);
const finiteNumber = n => typeof n === 'number' && Number.isFinite(n);
const isNonempty = s => typeof s === 'string' && s.trim().length > 0;
export const newId = () => globalThis.crypto?.randomUUID?.() ?? `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;

export function getApplicability(study) {
  const notes = [];
  if (study.modality !== 'small-molecule') notes.push('The general-case Q1A(R2) preset is not configured for biologics, vaccines, complex or advanced-therapy products; product-specific guidance is needed.');
  if (study.storage !== 'room') notes.push('Refrigerated, frozen and other storage conditions need different ICH pathways. The room-temperature presets must not be applied.');
  if (study.container === 'semipermeable' && study.aqueous === true && study.productType === 'product') notes.push('Aqueous products in semipermeable containers require special low-RH water-loss studies under Q1A(R2) §2.2.7.3.');
  if (study.container === 'unknown' && study.aqueous === true && study.productType === 'product') notes.push('Container permeability is unknown for an aqueous drug product; confirm it is not semipermeable before using general-case conditions.');
  if (study.productType !== 'product' && study.productType !== 'substance') notes.push('Select drug substance or drug product.');
  if (study.storage === 'room' && !['long25', 'long30'].includes(study.longTerm)) notes.push('A general-case long-term condition must be selected.');
  return { supported: notes.length === 0, notes };
}

export function scheduleFor(condition, durationMonths = 24) {
  if (!CONDITIONS[condition]) throw new Error('Unknown condition');
  if (condition === 'accelerated') return [0, 3, 6];
  if (condition === 'intermediate') return [0, 6, 9, 12];
  const months = [0, 3, 6, 9, 12, 18, 24];
  const duration = Math.max(12, Math.min(120, Math.floor(Number(durationMonths) || 24)));
  for (let m = 36; m <= duration; m += 12) months.push(m);
  return months.filter(m => m <= duration);
}

export function conditionsFor(study) {
  if (!getApplicability(study).supported) return [];
  return study.longTerm === 'long25'
    ? ['long25', 'accelerated', 'intermediate']
    : ['long30', 'accelerated'];
}

export function validateStudy(study) {
  const e = [];
  if (!study || typeof study !== 'object' || Array.isArray(study)) return ['Study must be an object.'];
  if (!isNonempty(study.name) || study.name.length > 160) e.push('Study name must be 1–160 characters.');
  if (!['substance', 'product'].includes(study.productType)) e.push('Invalid product type.');
  if (!['small-molecule', 'biologic', 'complex'].includes(study.modality)) e.push('Invalid modality.');
  if (!['room', 'refrigerated', 'frozen'].includes(study.storage)) e.push('Invalid storage.');
  if (!['long25', 'long30'].includes(study.longTerm)) e.push('Invalid long-term condition.');
  if (!['unknown', 'impermeable', 'semipermeable', 'other'].includes(study.container)) e.push('Invalid container category.');
  if (typeof study.aqueous !== 'boolean') e.push('Aqueous flag must be true or false.');
  if (!Number.isInteger(study.durationMonths) || study.durationMonths < 12 || study.durationMonths > 120) e.push('Duration must be 12–120 months.');
  return e;
}
export function validateAttribute(a) {
  const e = [];
  if (!a || typeof a !== 'object') return ['Attribute must be an object.'];
  if (!isNonempty(a.id) || !isNonempty(a.name) || !isNonempty(a.unit)) e.push('Attribute ID, name and unit are required.');
  if ((a.name || '').length > 100 || (a.unit || '').length > 36) e.push('Attribute name or unit is too long.');
  if (!ATTR_KINDS.includes(a.kind)) e.push('Invalid attribute kind.');
  if (a.lower !== null && !finiteNumber(a.lower)) e.push('Lower specification limit must be numeric or blank.');
  if (a.upper !== null && !finiteNumber(a.upper)) e.push('Upper specification limit must be numeric or blank.');
  if (finiteNumber(a.lower) && finiteNumber(a.upper) && a.lower > a.upper) e.push('Lower limit exceeds upper limit.');
  if (a.kind === 'assay' && a.assayThresholdPct !== undefined && (!finiteNumber(a.assayThresholdPct) || a.assayThresholdPct <= 0 || a.assayThresholdPct > 100)) e.push('Assay screening threshold must be greater than 0 and no greater than 100%.');
  return e;
}
export function validateObservation(o, attrs, allowedConditions = Object.keys(CONDITIONS)) {
  const e = [];
  if (!o || typeof o !== 'object') return ['Observation must be an object.'];
  if (!isNonempty(o.id) || !isNonempty(o.batch) || o.batch.length > 90) e.push('Observation ID and batch (up to 90 characters) are required.');
  if (!allowedConditions.includes(o.condition)) e.push('Observation uses a condition not enabled in the selected study.');
  if (!attrs.some(a => a.id === o.attributeId)) e.push('Observation refers to an undefined attribute.');
  if (!finiteNumber(o.month) || o.month < 0 || o.month > 120) e.push('Month must be a number between 0 and 120.');
  if (!finiteNumber(o.value)) e.push('Result must be a finite number.');
  if (!MANUAL_FLAGS.includes(o.manual)) e.push('Invalid reviewer assessment.');
  if ((o.note || '').length > 500) e.push('Note must be 500 characters or fewer.');
  return e;
}
export function plannedMonths(project, condition) {
  const custom = project.plans?.[condition];
  return custom ? [...custom] : scheduleFor(condition, project.study.durationMonths);
}
export function validatePlan(condition, points, durationMonths = 24) {
  const e=[];
  if(!CONDITIONS[condition])return ['Unrecognized study condition.'];
  if(!Array.isArray(points)||!points.length||points.length>40)return ['Plan must have 1–40 time points.'];
  if(points.some(v=>!finiteNumber(v)||v<0||v>120))e.push('Every time point must be a finite month from 0 to 120.');
  if(new Set(points).size!==points.length)e.push('Duplicate time points are not permitted.');
  if(!points.includes(0))e.push('The time-zero baseline must be included.');
  const duration=condition==='accelerated'?6:condition==='intermediate'?12:durationMonths;
  if(points.some(v=>v>duration))e.push(`Points cannot exceed the study duration (${duration} months).`);
  if(!points.includes(duration))e.push(`Include the planned final time point (${duration} months).`);
  return e;
}
export function validateProject(project) {
  const e = [];
  if (!project || typeof project !== 'object' || Array.isArray(project)) return ['Project must be an object.'];
  if (project.schemaVersion !== 1) e.push('Unsupported schemaVersion; expected 1.');
  e.push(...validateStudy(project.study).map(x => `Study: ${x}`));
  if (!Array.isArray(project.attributes) || project.attributes.length > 100) e.push('Attributes must be an array with at most 100 entries.');
  if (!Array.isArray(project.observations) || project.observations.length > 10000) e.push('Observations must be an array with at most 10,000 entries.');
  if (e.length) return e;
  if(project.plans!==undefined) {
    if(!project.plans || typeof project.plans!=='object' || Array.isArray(project.plans)) e.push('Custom plans must be an object.');
    else for(const [condition,points] of Object.entries(project.plans))e.push(...validatePlan(condition,points,project.study.durationMonths).map(x=>`Plan ${condition}: ${x}`));
  }
  const attrIds = new Set(), attrNames = new Set();
  for (const a of project.attributes) {
    e.push(...validateAttribute(a).map(x => `Attribute ${a?.name || ''}: ${x}`));
    if (attrIds.has(a.id)) e.push(`Duplicate attribute ID: ${a.id}`);
    if (attrNames.has(a.name?.toLowerCase().trim())) e.push(`Duplicate attribute name: ${a.name}`);
    attrIds.add(a.id); attrNames.add(a.name?.toLowerCase().trim());
  }
  const obIds = new Set(), obKeys = new Set();
  const enabled = conditionsFor(project.study).length ? conditionsFor(project.study) : Object.keys(CONDITIONS);
  for (const o of project.observations) {
    e.push(...validateObservation(o, project.attributes, enabled).map(x => `Observation ${o?.id || ''}: ${x}`));
    if (obIds.has(o.id)) e.push(`Duplicate observation ID: ${o.id}`);
    // Distinct replicate measurements are not currently modelled; avoid silent overwrite/averaging.
    const key = JSON.stringify([o.batch, o.condition, o.attributeId, o.month]);
    if (obKeys.has(key)) e.push(`Duplicate batch/condition/attribute/month: ${key}`);
    obIds.add(o.id); obKeys.add(key);
  }
  return e.slice(0, 50);
}

/** Comparison against user-provided product acceptance criteria. Null means unavailable, never pass. */
export function specAssessment(value, attr) {
  if (!finiteNumber(value)) return { status: 'not-evaluable', description: 'Missing numeric result.' };
  if (attr.lower === null && attr.upper === null) return { status: 'not-evaluable', description: 'No acceptance limits supplied.' };
  if (attr.lower !== null && value < attr.lower) return { status: 'out-of-spec', description: `Below user-defined lower limit (${attr.lower} ${attr.unit}).` };
  if (attr.upper !== null && value > attr.upper) return { status: 'out-of-spec', description: `Above user-defined upper limit (${attr.upper} ${attr.unit}).` };
  return { status: 'in-spec', description: 'Within the entered acceptance limits.' };
}

export function assessObservation(project, ob) {
  const attr = project.attributes.find(a => a.id === ob.attributeId);
  if (!attr) return { status: 'not-evaluable', basis: ['Attribute unavailable.'], specStatus: 'not-evaluable', pctChange: null };
  const spec = specAssessment(ob.value, attr);
  const basis = [], active = [], unknown = [];
  const peers = project.observations.filter(x => x.batch === ob.batch && x.condition === ob.condition && x.attributeId === ob.attributeId && x.month === 0);
  const initial = peers.length === 1 ? peers[0] : null;
  let pctChange = null;
  if (ob.manual === 'reviewer-significant') active.push('Reviewer-reported significant change. Requires verification against the approved protocol.');
  if (spec.status === 'out-of-spec') {
    if (project.study.productType === 'substance') active.push('Drug-substance specification failure (Q1A(R2) §2.1.7.1).');
    else if (['degradant','ph','dissolution','physical','functionality','potency','assay'].includes(attr.kind)) active.push('Outside a supplied acceptance criterion; review against applicable Q1A(R2) drug-product significant-change rule (§2.2.7.1).');
    else unknown.push('Out-of-specification for an other-class attribute; applicability of significant-change criterion needs review.');
  } else if (spec.status === 'not-evaluable') unknown.push('Acceptance limit(s) not provided.');
  if (attr.kind === 'assay' && project.study.productType === 'product' && ob.month > 0) {
    if (!initial) unknown.push('No time-zero assay result for this batch and storage condition.');
    else if (initial.value === 0) unknown.push('Zero initial assay value; cannot calculate a relative change.');
    else {
      pctChange = 100 * Math.abs(ob.value - initial.value) / Math.abs(initial.value);
      const threshold = attr.assayThresholdPct ?? 5;
      if (pctChange >= threshold - 1e-10) active.push(`Assay relative change ${pctChange.toFixed(2)}% vs user-selected screening threshold ${threshold}%. Verify assay basis and Q1A(R2) interpretation.`);
      else basis.push(`Assay relative change ${pctChange.toFixed(2)}% below configured screening threshold ${threshold}%.`);
    }
  }
  if (active.length) return { status: 'trigger', basis: active, specStatus: spec.status, pctChange };
  if (unknown.length) return { status: 'not-evaluable', basis: unknown, specStatus: spec.status, pctChange };
  return { status: 'no-trigger-detected', basis: basis.length ? basis : [spec.description], specStatus: spec.status, pctChange };
}

export function assessIntermediate(project) {
  const applicability = getApplicability(project.study);
  if (!applicability.supported) return { status: 'unsupported', headline: 'Outside V0.1 applicability', explanation: applicability.notes.join(' '), evidence: [] };
  if (project.study.longTerm === 'long30') return { status: 'not-separate', headline: 'No separate intermediate condition', explanation: 'Under the Q1A(R2) general case, the selected 30°C/65% RH long-term condition is also the intermediate condition. Review any accelerated significant change separately.', evidence: [] };
  const accel = project.observations.filter(o => o.condition === 'accelerated' && o.month > 0 && o.month <= 6);
  if (!accel.length) return { status: 'insufficient', headline: 'Accelerated evidence not yet evaluable', explanation: 'No accelerated results after time zero within six months. Intermediate testing need cannot be ruled out.', evidence: [] };
  const assessments = accel.map(o => ({ ob: o, result: assessObservation(project, o) }));
  const triggered = assessments.filter(x => x.result.status === 'trigger');
  if (triggered.length) return { status: 'indicated', headline: 'Intermediate evaluation indicated', explanation: 'At least one accelerated result within six months shows a potential significant-change trigger. Under the general case with long-term 25°C/60% RH, Q1A(R2) calls for intermediate testing at 30°C/65% RH (minimum six months data from a 12-month study at initial submission). Confirm results and product-specific applicability.', evidence: triggered.map(x => x.ob.id) };
  const unevaluable = assessments.filter(x => x.result.status === 'not-evaluable');
  if (unevaluable.length) return { status: 'insufficient', headline: 'Intermediate need unresolved', explanation: `${unevaluable.length} accelerated observation(s) cannot be screened due to missing baseline, limits or criteria. Absence of a detected trigger is not proof of absence of significant change.`, evidence: unevaluable.map(x => x.ob.id) };
  // Do not imply that partial 3-month accelerated measurements establish completion of 6-month study.
  const hasSixMonths = accel.some(o => o.month === 6);
  return hasSixMonths
    ? { status: 'not-triggered', headline: 'No trigger detected in supplied results', explanation: 'No potential significant change was detected in the supplied accelerated results. This is only an attribute-level screening summary, not confirmation of full protocol completion or product stability.', evidence: accel.map(x => x.id) }
    : { status: 'insufficient', headline: 'Accelerated study still incomplete', explanation: 'No significant-change trigger was detected in the supplied early accelerated results, but the six-month endpoint is absent. Continue protocol-based evaluation.', evidence: accel.map(x => x.id) };
}

export function summarizeProject(project) {
  const applicability = getApplicability(project.study);
  const evaluated = project.observations.map(o => ({ observation: o, assessment: assessObservation(project, o) }));
  const distinctBatches = [...new Set(project.observations.map(o => o.batch))];
  const counts = {
    total: evaluated.length,
    trigger: evaluated.filter(x => x.assessment.status === 'trigger').length,
    unresolved: evaluated.filter(x => x.assessment.status === 'not-evaluable').length,
    batches: distinctBatches.length,
    attributes: project.attributes.length
  };
  const longObservations = project.observations.filter(o => o.condition === project.study.longTerm);
  const longestLong = longObservations.length ? Math.max(...longObservations.map(o => o.month)) : null;
  const warnings = [];
  if (!applicability.supported) warnings.push(...applicability.notes);
  if (counts.batches < 3) warnings.push('Fewer than three distinct batches are represented. Q1A(R2) normally expects at least three primary batches for the general case; batch suitability is not verified.');
  if (longestLong === null || longestLong < 12) warnings.push('Less than 12 months of long-term observations are present; initial submission minimum coverage is not demonstrated.');
  else warnings.push('Some long-term results extend to 12 months or more; this alone does not confirm complete protocol/batch coverage.');
  if (!counts.total) warnings.push('No observations entered; results are not evaluable.');
  if (counts.unresolved) warnings.push(`${counts.unresolved} observations are not fully evaluable with entered limits and/or assay baselines.`);
  warnings.push('No expiry, retest period, or shelf-life conclusion is calculated. Q1E analysis and scientific review are outside V0.1.');
  return { applicability, counts, longestLong, intermediate: assessIntermediate(project), evaluated, warnings };
}

export function blankProject() {
  return {
    schemaVersion: 1,
    study: { name: 'Untitled stability study', productType: 'product', modality: 'small-molecule', storage: 'room', longTerm: 'long25', container: 'unknown', aqueous: false, durationMonths: 24 },
    attributes: [], observations: [], plans: {}, example: false
  };
}

export function demoProject() {
  const project = blankProject();
  project.study.name = 'Synthetic tablet stability example';
  project.study.container = 'other';
  project.example = true;
  project.attributes = [
    { id: 'assay', name: 'Assay', kind: 'assay', unit: '% label claim', lower: 90, upper: 110, assayThresholdPct: 5 },
    { id: 'imp-a', name: 'Degradation product A', kind: 'degradant', unit: '%', lower: 0, upper: 1.0 }
  ];
  const longAssay = [[100,99.8,99.5,99.1,98.8], [100.4,100.0,99.7,99.3,99.0], [99.7,99.4,99.0,98.7,98.4]];
  const accelAssay = [[100,97.9,94.2], [100.4,98.5,96.0], [99.7,97.2,94.5]];
  const longImp = [[0.12,0.16,0.19,0.24,0.28], [0.10,0.14,0.19,0.21,0.26], [0.14,0.17,0.22,0.26,0.29]];
  const accelImp = [[0.12,0.48,1.12], [0.10,0.42,0.88], [0.14,0.51,1.03]];
  const push = (batch, condition, month, attributeId, value) => project.observations.push({ id:`${batch}-${condition}-${month}-${attributeId}`, batch, condition, month, attributeId, value, manual:'none', note:'Synthetic demonstration — not measured data' });
  for (let b=0;b<3;b++) {
    const batch=`DEMO-B0${b+1}`;
    [0,3,6,9,12].forEach((month,i)=>{ push(batch, 'long25',month,'assay',longAssay[b][i]); push(batch,'long25',month,'imp-a',longImp[b][i]); });
    [0,3,6].forEach((month,i)=>{ push(batch,'accelerated',month,'assay',accelAssay[b][i]); push(batch,'accelerated',month,'imp-a',accelImp[b][i]); });
  }
  return project;
}

/** RFC4180-ish CSV parsing, with quoted fields/newlines and safe field validation. */
export function parseCSV(input) {
  const text = String(input).replace(/^\uFEFF/, '');
  const out = []; let row = [], token = '', quoted = false;
  for (let i=0; i<text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i+1] === '"') { token += '"'; i++; }
      else if (ch === '"') quoted = false;
      else token += ch;
    } else if (ch === '"') { if (token !== '') throw Error('Invalid opening quote in CSV.'); quoted = true; }
    else if (ch === ',') { row.push(token); token=''; }
    else if (ch === '\n' || ch === '\r') { if(ch === '\r' && text[i+1] === '\n') i++; row.push(token); if(row.some(v=>v!==''))out.push(row); row=[]; token=''; }
    else token += ch;
  }
  if (quoted) throw Error('Unterminated CSV quote.');
  row.push(token); if (row.some(v=>v!=='')) out.push(row);
  return out;
}
function csvEscape(x) {
  const s = x == null ? '' : String(x);
  // Prevent spreadsheet formula injection when CSV files are opened in spreadsheet apps.
  const neutral = /^[\t\r\n\s]*[=+@-]/.test(s) && !/^-\d+(\.\d+)?$/.test(s) ? `'${s}` : s;
  return `"${neutral.replaceAll('"','""')}"`;
}
export const CSV_COLUMNS = ['batch','condition','month','attributeId','attributeName','kind','unit','lower','upper','assayThresholdPct','value','reviewerFlag','note'];
export function exportCSV(project) {
  const attrs=new Map(project.attributes.map(a=>[a.id,a]));
  return [CSV_COLUMNS.join(','), ...project.observations.map(o=>{
    const a=attrs.get(o.attributeId);
    return [o.batch,o.condition,o.month,o.attributeId,a?.name,a?.kind,a?.unit,a?.lower,a?.upper,a?.assayThresholdPct,o.value,o.manual,o.note].map(csvEscape).join(',');
  })].join('\r\n') + '\r\n';
}
export function importCSV(project, text) {
  const rows = parseCSV(text);
  if (rows.length<2) throw Error('CSV must contain a header and at least one observation.');
  const cols=rows[0];
  if (cols.some((c,i)=>c!==CSV_COLUMNS[i]) || cols.length!==CSV_COLUMNS.length) throw Error(`CSV header must exactly match: ${CSV_COLUMNS.join(',')}`);
  const p = structuredClone(project); p.attributes=[]; p.observations=[];
  const map=new Map();
  rows.slice(1).forEach((r,i)=>{
    if(r.length!==cols.length)throw Error(`Row ${i+2}: expected ${cols.length} fields, got ${r.length}.`);
    const obj=Object.fromEntries(cols.map((k,j)=>[k,r[j]]));
    if (!map.has(obj.attributeId)) {
      const parseBound=(s,field)=>s.trim()===''?null:toFinite(s,`Row ${i+2} ${field}`);
      const attr={id:obj.attributeId,name:obj.attributeName,kind:obj.kind,unit:obj.unit,lower:parseBound(obj.lower,'lower'),upper:parseBound(obj.upper,'upper')};
      if(obj.assayThresholdPct.trim())attr.assayThresholdPct=toFinite(obj.assayThresholdPct,`Row ${i+2} assay threshold`);
      p.attributes.push(attr); map.set(obj.attributeId, JSON.stringify(attr));
    } else {
      const ref=p.attributes.find(a=>a.id===obj.attributeId);
      const current={id:obj.attributeId,name:obj.attributeName,kind:obj.kind,unit:obj.unit,lower:obj.lower.trim()===''?null:toFinite(obj.lower,'lower'),upper:obj.upper.trim()===''?null:toFinite(obj.upper,'upper')};
      if(obj.assayThresholdPct.trim())current.assayThresholdPct=toFinite(obj.assayThresholdPct,'assay threshold');
      if(JSON.stringify(current)!==JSON.stringify(ref))throw Error(`Row ${i+2}: conflicting definition for attribute ${obj.attributeId}.`);
    }
    p.observations.push({id:`import-${i+1}`, batch:obj.batch,condition:obj.condition,month:toFinite(obj.month,`Row ${i+2} month`),attributeId:obj.attributeId,value:toFinite(obj.value,`Row ${i+2} result`),manual:obj.reviewerFlag||'none',note:obj.note});
  });
  const errors=validateProject(p); if(errors.length)throw Error(`CSV cannot be imported:\n${errors.join('\n')}`);
  p.example=false;
  return p;
}
function toFinite(s,context) {if(String(s).trim()==='')throw Error(`${context} must not be blank.`); const n=Number(s); if(!Number.isFinite(n))throw Error(`${context} must be finite.`);return n;}

export function reportMarkdown(project) {
  const result=summarizeProject(project), s=project.study;
  const lines=[
    `# Pharmaceutical Stability Explorer — Evidence Report`,
    '',`Generated: ${new Date().toISOString()}`,`Rule set: ${GUIDELINE.id} · engine v${ENGINE_VERSION}`,
    `Dataset: ${project.example?'SYNTHETIC DEMONSTRATION':'USER-ENTERED / IMPORTED'} (not independently verified)`,
    '', '## Study',
    `- Name: ${s.name}`, `- Substance/product: ${s.productType}`, `- Modality: ${s.modality}`,
    `- Storage class: ${s.storage}`,`- Selected long-term: ${CONDITIONS[s.longTerm]?.label||s.longTerm}`,
    `- Container: ${s.container}; aqueous: ${s.aqueous?'yes':'no'}`,
    `- In V0.1 applicability: ${result.applicability.supported?'YES':'NO'}`,
    '', '## Planned time points',
    ...conditionsFor(s).map(id=>`- ${CONDITIONS[id].label}: ${plannedMonths(project,id).join(', ')} months${project.plans?.[id]?' (user customized)':''}`),
    '', '## Counts',
    `- Observations: ${result.counts.total}`,`- Batches represented: ${result.counts.batches}`,`- Attributes: ${result.counts.attributes}`,`- Potential significant change triggers: ${result.counts.trigger}`,`- Not evaluable observations: ${result.counts.unresolved}`,
    '', '## Intermediate decision',
    `**${result.intermediate.headline}**: ${result.intermediate.explanation}`,
    `- Traceable observation IDs: ${result.intermediate.evidence.join(', ')||'none'}`,
    '', '## Evidence gaps and limitations',...result.warnings.map(x=>`- ${x}`),
    '', '## Flagged or not-evaluable observations'
  ];
  const filtered=result.evaluated.filter(x=>x.assessment.status!=='no-trigger-detected');
  if(!filtered.length)lines.push('- No flagged rows in supplied data.');
  else filtered.forEach(({observation:o,assessment:a}) => lines.push(`- ${o.id} | ${o.batch} | ${o.condition} | ${o.month}mo | ${project.attributes.find(x=>x.id===o.attributeId)?.name??o.attributeId} = ${o.value}: ${a.status} — ${a.basis.join(' ')}`));
  lines.push('', '## References',`- [ICH Q1A(R2)](${GUIDELINE.official})`,`- [Q1A(R2) reference text](${GUIDELINE.reference})`,'- [ICH Q1E](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/q1e-evaluation-stability-data)',`- [Consolidated ICH Q1 DRAFT — not for implementation](${GUIDELINE.draft})`,'', '**NOT A REGULATORY SUBMISSION, VALIDATED SYSTEM OR ESTABLISHED SHELF LIFE.**');
  return lines.join('\n')+'\n';
}
