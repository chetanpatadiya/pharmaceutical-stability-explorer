import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONDITIONS, blankProject, demoProject, getApplicability, conditionsFor, scheduleFor,
  validateProject, validateObservation, assessObservation, assessIntermediate, summarizeProject,
  exportCSV, importCSV, parseCSV, reportMarkdown
} from '../src/engine.js';

const clone = obj => structuredClone(obj);
const add = (p,{ id='custom',batch='B01',condition='accelerated',month=6,attributeId='assay',value=93,manual='none' }={})=>{
  const o={ id,batch,condition,month,attributeId,value,manual,note:'' };p.observations.push(o);return o;
};
const base = () => {
  const p=blankProject();p.attributes=[
    {id:'assay',name:'Assay',kind:'assay',unit:'% label claim',lower:90,upper:110,assayThresholdPct:5},
    {id:'impurity',name:'Degradation A',kind:'degradant',unit:'%',lower:0,upper:1}
  ];return p;
};

test('ICH general condition values and minimum submission data',()=>{
  assert.deepEqual(Object.values(CONDITIONS).map(c=>[c.temp,c.rh,c.minAtSubmission]),[[25,60,12],[30,65,12],[30,65,6],[40,75,6]]);
  for(const c of Object.values(CONDITIONS))assert.equal(c.tempTolerance,2);
});
test('Q1A general-case scheduled points',()=>{
  assert.deepEqual(scheduleFor('long25',24),[0,3,6,9,12,18,24]);
  assert.deepEqual(scheduleFor('long30',36),[0,3,6,9,12,18,24,36]);
  assert.deepEqual(scheduleFor('accelerated'),[0,3,6]);
  assert.deepEqual(scheduleFor('intermediate'),[0,6,9,12]);
});
test('30/65 long-term does not create duplicate intermediate study',()=>{
  const p=demoProject();p.study.longTerm='long30';
  p.observations=p.observations.filter(o=>o.condition!=='long25');
  assert.deepEqual(conditionsFor(p.study),['long30','accelerated']);
  assert.equal(assessIntermediate(p).status,'not-separate');
});
test('25/60 long-term includes conditional intermediate pathway',()=>{
  const p=blankProject();assert.deepEqual(conditionsFor(p.study),['long25','accelerated','intermediate']);
});
test('drug product 5% relative assay change flags significant-change screening',()=>{
  const p=base();add(p,{id:'zero',month:0,value:100});const x=add(p,{id:'six',month:6,value:94});
  const result=assessObservation(p,x);assert.equal(result.status,'trigger');assert.equal(result.pctChange,6);
  assert.equal(assessIntermediate(p).status,'indicated');
});
test('assay exactly 5% triggers; 4.9% does not',()=>{
  const p=base();add(p,{id:'baseline',month:0,value:100});
  const x=add(p,{id:'exact',month:3,value:95});
  assert.equal(assessObservation(p,x).status,'trigger');
  x.value=95.1;assert.equal(assessObservation(p,x).status,'no-trigger-detected');
});
test('drug substance does not inappropriately apply drug product 5% assay rule',()=>{
  const p=base();p.study.productType='substance';add(p,{id:'base',month:0,value:100});
  const x=add(p,{id:'six',month:6,value:94});
  assert.equal(assessObservation(p,x).status,'no-trigger-detected'); // within its entered specification
  x.value=89;assert.equal(assessObservation(p,x).status,'trigger');
});
test('drug product impurity exceeds product-specific criterion',()=>{
  const p=base();const x=add(p,{id:'imp',attributeId:'impurity',value:1.2});
  assert.equal(assessObservation(p,x).status,'trigger');
});
test('missing assay baseline cannot be marked as no-change',()=>{
  const p=base();const x=add(p,{id:'one',value:99});
  assert.equal(assessObservation(p,x).status,'not-evaluable');
  assert.equal(assessIntermediate(p).status,'insufficient');
});
test('missing specs are not silently treated as passing',()=>{
  const p=base();p.attributes[1].lower=null;p.attributes[1].upper=null;
  const x=add(p,{attributeId:'impurity',value:3});
  assert.equal(assessObservation(p,x).status,'not-evaluable');
});
test('accelerated study with no results cannot rule out intermediate',()=>{
  const p=base();assert.equal(assessIntermediate(p).status,'insufficient');
});
test('only partial accelerated results do not establish 6-month completion',()=>{
  const p=base();add(p,{id:'z',month:0,value:100});add(p,{id:'m3',month:3,value:98});
  assert.equal(assessIntermediate(p).status,'insufficient');
});
test('at least one 6-month result without full attributes is only a partial screening',()=>{
  const p=base();add(p,{id:'z',month:0,value:100});add(p,{id:'m6',month:6,value:99});
  assert.equal(assessIntermediate(p).status,'not-triggered');
  assert.match(assessIntermediate(p).explanation,/not confirmation/i);
});
test('manual reviewer assessment creates traceable trigger',()=>{
  const p=base();const x=add(p,{id:'manual',value:99,manual:'reviewer-significant'});
  assert.equal(assessObservation(p,x).status,'trigger');
});
test('biologics, refrigerated and semipermeable aqueous drug product are gated',()=>{
  const p=base();p.study.modality='biologic';assert.equal(getApplicability(p.study).supported,false);
  p.study.modality='small-molecule';p.study.storage='refrigerated';assert.equal(getApplicability(p.study).supported,false);
  p.study.storage='room';p.study.container='semipermeable';p.study.aqueous=true;assert.equal(getApplicability(p.study).supported,false);
  assert.deepEqual(conditionsFor(p.study),[]);
  assert.equal(assessIntermediate(p).status,'unsupported');
});
test('aqueous API semipermeable flag is not indiscriminately treated as drug product',()=>{
  const p=base();p.study.productType='substance';p.study.container='semipermeable';p.study.aqueous=true;
  assert.equal(getApplicability(p.study).supported,true);
});
test('reject invalid values and duplicate same-time observations',()=>{
  const p=base();add(p,{id:'x',month:0,value:100});add(p,{id:'y',month:0,value:101});
  assert.ok(validateProject(p).some(x=>x.includes('Duplicate batch/condition/attribute/month')));
  const invalid=clone(p.observations[0]);invalid.value=Number.NaN;
  assert.ok(validateObservation(invalid,p.attributes,conditionsFor(p.study)).length);
});
test('demo is valid and produces intermediate recommendation',()=>{
  const p=demoProject();assert.deepEqual(validateProject(p),[]);
  const summary=summarizeProject(p);
  assert.equal(summary.counts.batches,3);assert.equal(summary.counts.total,48);
  assert.equal(summary.intermediate.status,'indicated');
  assert.ok(summary.counts.trigger>0);
});
test('CSV parser handles quoted commas, quotes and multiline note',()=>{
  const rows=parseCSV('a,b\r\n"X, Y","hello ""friend""\nmore"\r\n');
  assert.deepEqual(rows,[['a','b'],['X, Y','hello "friend"\nmore']]);
});
test('CSV round trip preserves attributes observations without trusting unsupported inputs',()=>{
  const p=demoProject(),text=exportCSV(p),restored=importCSV(p,text);
  assert.deepEqual(validateProject(restored),[]);
  assert.equal(restored.observations.length,p.observations.length);
  assert.equal(restored.attributes.length,2);
  assert.equal(restored.example,false);
  assert.equal(restored.observations.find(o=>o.batch==='DEMO-B01'&&o.month===6&&o.condition==='accelerated'&&o.attributeId==='assay').value,94.2);
});
test('CSV import rejects conflicting attribute definitions',()=>{
  const p=base(),a=add(p,{id:'z',month:0,value:100}),b=add(p,{id:'m',month:6,value:98});
  const csv=exportCSV(p).split('\r\n');
  csv[2]=csv[2].replace('"110"','"111"');
  assert.throws(()=>importCSV(p,csv.join('\r\n')),/conflicting definition/i);
});
test('report explicitly disclaims shelf-life assignment',()=>{
  const report=reportMarkdown(demoProject());
  assert.match(report,/NOT A REGULATORY SUBMISSION/i);
  assert.match(report,/No expiry, retest period, or shelf-life conclusion/i);
  assert.match(report,/ICH Q1A\(R2\)/);
});
test('blank study has zero observations and no pretended evidence',()=>{
  const r=summarizeProject(blankProject());assert.equal(r.counts.total,0);
  assert.equal(r.intermediate.status,'insufficient');
  assert.ok(r.warnings.some(x=>/No observations/.test(x)));
});

test('custom study time points validate, store and appear in report',async()=>{
  const {plannedMonths,validatePlan}=await import('../src/engine.js');
  const p=base();p.plans={accelerated:[0,1,3,6]};
  assert.deepEqual(plannedMonths(p,'accelerated'),[0,1,3,6]);
  assert.deepEqual(validatePlan('accelerated',[0,1,3,6]),[]);
  assert.ok(validatePlan('accelerated',[0,2,2,6]).length);
  assert.ok(validatePlan('accelerated',[0,3]).length);
  assert.deepEqual(validateProject(p),[]);
  assert.match(reportMarkdown(p),/0, 1, 3, 6 months \(user customized\)/);
});

test('aqueous drug product with unknown container permeability is not presumed general-case',()=>{
  const p=base();p.study.aqueous=true;p.study.container='unknown';
  assert.equal(getApplicability(p.study).supported,false);
});
