import {
  ENGINE_VERSION, CONDITIONS, blankProject, demoProject, getApplicability, conditionsFor,
  scheduleFor, plannedMonths, validatePlan, validateStudy, validateAttribute, validateObservation, validateProject,
  assessObservation, summarizeProject, exportCSV, importCSV, reportMarkdown, newId
} from './engine.js';

let project = demoProject();
let activeTab = 'overview';
const $ = id => document.getElementById(id);
const el = (tag, className = '', text = '') => { const x = document.createElement(tag); if (className) x.className = className; x.textContent = text; return x; };
const append = (parent, ...children) => { children.forEach(ch => parent.append(ch)); return parent; };
const clear = node => { node.replaceChildren(); return node; };
function showMessage(message, error = false) {
  const target = $(error ? 'errorBanner' : 'infoBanner'), other = $(error ? 'infoBanner' : 'errorBanner');
  other.hidden = true; target.textContent = String(message); target.hidden = false;
  if(error) target.scrollIntoView({block:'nearest',behavior:'smooth'});
}
function hideMessage() { $('errorBanner').hidden = true; $('infoBanner').hidden = true; }
function setTab(id) {
  if (!['overview','setup','data','assessment','methods'].includes(id)) return;
  activeTab = id;
  document.querySelectorAll('.tab-panel').forEach(x => x.hidden = x.id !== `tab-${id}`);
  document.querySelectorAll('.nav-link').forEach(x => { const active = x.dataset.tab === id; x.classList.toggle('active', active); if(active)x.setAttribute('aria-current','page');else x.removeAttribute('aria-current'); });
  hideMessage();
  if(id==='assessment') renderAssessment();
  if(id==='data') renderData();
  if(id==='setup') renderSetup();
  window.scrollTo({top:0,behavior:'instant'});
}
function studyInput() {
  return {
    name:$('studyName').value.trim(), productType:$('productType').value,
    modality:$('modality').value, storage:$('storage').value,
    longTerm:$('longTerm').value, container:$('containerType').value,
    aqueous:$('aqueous').checked, durationMonths:Number($('duration').value)
  };
}
function renderStudyForm() {
  const s=project.study;
  $('studyName').value=s.name; $('productType').value=s.productType; $('modality').value=s.modality;
  $('storage').value=s.storage; $('longTerm').value=s.longTerm;
  $('containerType').value=s.container; $('aqueous').checked=s.aqueous; $('duration').value=s.durationMonths;
}
function checkStudyChanges(next) {
  const e=validateStudy(next); if(e.length) { showMessage(e.join(' '),true);return; }
  let obs=project.observations;
  const old=project.study.longTerm;
  if (old !== next.longTerm && obs.some(o=>o.condition===old)) {
    if (!window.confirm('Changing the long-term condition will discard observations tied to the old long-term arm. Export the current data first if you need them. Continue?')) {renderStudyForm();return;}
    obs=obs.filter(o=>o.condition!==old);
  }
  const plans={...project.plans};
  if(old!==next.longTerm){delete plans[old]; delete plans[next.longTerm];}
  if(next.durationMonths!==project.study.durationMonths){delete plans.long25;delete plans.long30;}
  project={...project,study:next,observations:obs,plans,example:false};
  hideMessage(); renderAll();showMessage('Study design applied. The data and decision logic now reflect the selected context.');
}
function formatCondition(id) {
  const c=CONDITIONS[id];return c ? `${c.temp}°C ±${c.tempTolerance}°C / ${c.rh}% RH ±${c.rhTolerance}% RH` : id;
}
const monthFormat = n => `${n} mo`;
function statusLabel(status) {return status==='trigger'?'Potential trigger':status==='not-evaluable'?'Not evaluable':'No trigger found';}
function statusPill(status) {return el('span',`status-pill ${status==='trigger'?'flag':status==='not-evaluable'?'unresolved':''}`,statusLabel(status));}
function decisionClass(status) {return ['indicated','unsupported','insufficient'].includes(status)?'warn': ['not-triggered','not-separate'].includes(status)?'neutral':'';}
function decisionCard(decision) {
  const wrapper=el('div',`decision-card ${decisionClass(decision.status)}`);
  append(wrapper,el('div','decision-kicker',decision.status.replaceAll('-',' ').toUpperCase()),el('div','decision-headline',decision.headline),el('p','',decision.explanation));
  if(decision.evidence?.length)append(wrapper,el('p','small-muted',`Supporting row IDs: ${decision.evidence.slice(0,8).join(', ')}${decision.evidence.length>8?' …':''}`));
  return wrapper;
}
function renderOverview() {
  const r=summarizeProject(project);
  $('overviewName').textContent=project.study.name + (project.example?' · Synthetic':'');
  $('sTotal').textContent=r.counts.total;
  $('sBatches').textContent=r.counts.batches;
  $('sTriggers').textContent=r.counts.trigger;
  $('sUnresolved').textContent=r.counts.unresolved;
  const cards=$('conditionCards'); clear(cards);
  const planned=conditionsFor(project.study);
  if(!planned.length) append(cards,el('div','message error','Unsupported product/storage configuration — see Study design for the applicability gate.'));
  else planned.forEach((id,i)=>{
    const c=CONDITIONS[id], row=el('div','condition-row'), ico=el('div','condition-symbol',id==='accelerated'?'A':id==='intermediate'?'I':'L'),name=el('div');
    append(name,el('div','condition-name',c.label),el('div','condition-note',id==='intermediate'?'Conditional study, when triggered':'Temperature and RH tolerances: ±2°C, ±5% RH'));
    append(row,ico,name,el('div','condition-time',`MIN ${c.minAtSubmission} MO`)); append(cards,row);
  });
  clear($('intermediateSummary')).append(decisionCard(r.intermediate));
}
function renderSetup() {
  renderStudyForm();
  const eligibility=getApplicability(project.study), target=$('applicabilityPanel');
  target.className=`message ${eligibility.supported?'info':'error'}`;
  target.textContent=eligibility.supported?'Eligible for V0.1 general-case ICH Q1A(R2) study planning. Actual protocols may differ with product or jurisdiction.':`NOT ELIGIBLE FOR V0.1: ${eligibility.notes.join(' ')}`;
  const target2=clear($('scheduleTables'));
  if(!eligibility.supported) { append(target2,el('p','small-muted','No general-case schedule is generated for this special product/storage category.'));return; }
  for(const id of conditionsFor(project.study)) {
    const c=CONDITIONS[id], row=el('div','schedule-item'),info=el('div'),chips=el('div','time-chips');
    append(info,el('strong','',c.label),el('div','schedule-detail',`${formatCondition(id)} · ${c.minAtSubmission} months minimum data at submission${id==='intermediate'?' when applicable':''}`));
    plannedMonths(project,id).forEach(m=>append(chips,el('span','time-chip',monthFormat(m))));
    const edit=el('button','text-button',project.plans?.[id]?'Edit custom time points':'Customize points');
    edit.type='button';edit.style.marginTop='8px';
    edit.addEventListener('click',()=>{
      const raw=window.prompt('Enter comma-separated time points in months, including 0 and final month. This does not replace the approved protocol.',plannedMonths(project,id).join(', '));
      if(raw===null)return;
      const tokens=raw.split(',').map(v=>v.trim());
      if(tokens.some(v=>!v || !Number.isFinite(Number(v)))){showMessage('Enter only finite numeric months separated by commas.',true);return;}
      const points=tokens.map(Number).sort((a,b)=>a-b);
      const errors=validatePlan(id,points,project.study.durationMonths);
      if(errors.length){showMessage(errors.join(' '),true);return;}
      project.plans={...project.plans,[id]:points};project.example=false;
      renderSetup();showMessage('Custom time points saved to this session and full JSON export. Confirm the schedule against your product-specific protocol.');
    });
    append(info,edit);append(row,info,chips);append(target2,row);
  }
}
function renderAttributeList(){
  const target=clear($('attributeList'));
  if(!project.attributes.length)append(target,el('p','small-muted','No attributes defined. Add an attribute to begin.'));
  project.attributes.forEach(a=>{
    const box=el('div','attribute-item'),detail=el('div'),button=el('button','icon-btn','×');
    append(detail,el('strong','',a.name),el('small','',`${a.kind} · ${a.unit} · Limits ${a.lower??'–'} to ${a.upper??'–'}${a.kind==='assay'?` · ${a.assayThresholdPct??5}% relative assay screen`:''}`));
    button.type='button';button.title=`Remove ${a.name}`;button.setAttribute('aria-label',`Remove ${a.name}`);
    button.addEventListener('click',()=>{
      const count=project.observations.filter(o=>o.attributeId===a.id).length;
      if(count && !window.confirm(`Remove ${a.name} and ${count} associated observations?`))return;
      project.attributes=project.attributes.filter(x=>x.id!==a.id);project.observations=project.observations.filter(x=>x.attributeId!==a.id);project.example=false;renderAll();
    });
    append(box,detail,button);append(target,box);
  });
}
function fillSelect(node, options, keep=true) {
  const previous=keep?node.value:null;clear(node);
  for(const [value,label] of options){const option=el('option','',label);option.value=value;append(node,option);}
  if(keep && options.some(([id])=>id===previous))node.value=previous;
}
function renderData() {
  renderAttributeList();
  const allowed=conditionsFor(project.study);
  fillSelect($('obsCondition'),allowed.map(x=>[x,CONDITIONS[x].label]));
  fillSelect($('obsAttribute'),project.attributes.map(x=>[x.id,x.name]));
  fillSelect($('filterCondition'),[['all','All conditions'],...Object.entries(CONDITIONS).map(([id,c])=>[id,c.label])] );
  fillSelect($('filterAttribute'),[['all','All attributes'],...project.attributes.map(a=>[a.id,a.name])]);
  $('observationForm').querySelector('button[type=submit]').disabled=!allowed.length||!project.attributes.length;
  renderMeasurements();
}
function renderMeasurements() {
  const c=$('filterCondition').value,a=$('filterAttribute').value;
  const rows=project.observations.filter(o=>(c==='all'||o.condition===c)&&(a==='all'||o.attributeId===a));
  $('rowCount').textContent=`${rows.length} MATCHING ROWS`;
  const target=clear($('observationsBody'));
  for(const o of rows.slice(0,300)) {
    const attr=project.attributes.find(x=>x.id===o.attributeId),assessment=assessObservation(project,o),tr=el('tr');
    for(const txt of [o.batch,CONDITIONS[o.condition]?.kind+' · '+formatCondition(o.condition),String(o.month),attr?.name||o.attributeId,`${o.value} ${attr?.unit??''}`]) append(tr,el('td','',txt));
    const status=el('td');append(status,statusPill(assessment.status));append(tr,status);
    const cell=el('td'),del=el('button','icon-btn','×');del.title='Delete measurement';del.setAttribute('aria-label',`Delete measurement ${o.id}`);del.addEventListener('click',()=>{ project.observations=project.observations.filter(x=>x.id!==o.id);project.example=false;renderAll(); });append(cell,del);append(tr,cell);append(target,tr);
  }
  if(!rows.length){const tr=el('tr'),td=el('td','small-muted','No matching measurements.');td.colSpan=7;append(tr,td);append(target,tr);}
}
function renderAssessment() {
  const r=summarizeProject(project);
  const target=$('assessmentNotice');target.className=`message ${r.applicability.supported?'info':'error'}`;
  target.textContent=r.applicability.supported?'These are exploratory screening decisions under the general-case Q1A(R2) rules. A detected change must be confirmed against the applicable protocol, method and quality criteria.':`Screening not applicable: ${r.applicability.notes.join(' ')}`;
  fillSelect($('chartAttribute'),project.attributes.map(a=>[a.id,`${a.name} (${a.unit})`]));
  renderChart();
  clear($('intermediateDetail')).append(decisionCard(r.intermediate));
  const warnings=clear($('warningsList'));
  r.warnings.forEach(w=>append(warnings,el('li','',w)));
  const trace=clear($('assessmentsBody'));
  for(const {observation:o,assessment:a} of r.evaluated.filter(x=>x.assessment.status!=='no-trigger-detected').slice(0,200)){
    const tr=el('tr'),attr=project.attributes.find(z=>z.id===o.attributeId);
    append(tr,el('td','',`${o.batch} · ${o.condition}`),el('td','',`${attr?.name||o.attributeId} · ${o.month} mo`));
    const td=el('td');append(td,statusPill(a.status));append(tr,td,el('td','',a.basis.join(' ')));append(trace,tr);
  }
  if(!trace.childNodes.length){const tr=el('tr'),td=el('td','small-muted','No flagged measurements. Complete the protocol and review all attributes before concluding stability.');td.colSpan=4;append(tr,td);append(trace,tr);}
}
function renderChart() {
  const attr=project.attributes.find(a=>a.id===$('chartAttribute').value),target=clear($('chartArea')),legend=clear($('chartLegend'));
  if(!attr){append(target,el('p','small-muted','Define an attribute to display measured trends.'));return;}
  const rows=project.observations.filter(o=>o.attributeId===attr.id);
  if(!rows.length){append(target,el('p','small-muted','No measurements are available for this attribute.'));return;}
  const grouped=new Map();
  for(const o of rows){const key=`${o.condition} · ${o.batch}`;if(!grouped.has(key)) grouped.set(key,[]);grouped.get(key).push(o);}
  const values=rows.map(o=>o.value),times=rows.map(o=>o.month);
  if(attr.lower!==null) values.push(attr.lower);if(attr.upper!==null)values.push(attr.upper);
  const minVal=Math.min(...values),maxVal=Math.max(...values),pad=Math.max((maxVal-minVal)*.11,Math.abs(maxVal)*.012,.1);
  const ymin=minVal-pad,ymax=maxVal+pad,xmin=0,xmax=Math.max(6,...times);
  const W=850,H=340,L=65,R=24,T=20,B=50;
  const sx=x=>L+(x-xmin)/(xmax-xmin)*(W-L-R),sy=y=>H-B-(y-ymin)/(ymax-ymin)*(H-T-B);
  const svgNS='http://www.w3.org/2000/svg';
  const svg=document.createElementNS(svgNS,'svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',`Measured ${attr.name} over months by batch and condition`);
  function s(tag,attributes={},txt=null){let e=document.createElementNS(svgNS,tag);Object.entries(attributes).forEach(([key,value])=>e.setAttribute(key,String(value)));if(txt!==null)e.textContent=String(txt);svg.appendChild(e);return e;}
  for(let i=0;i<5;i++){
    const value=ymin+(ymax-ymin)*i/4,y=sy(value);
    s('line',{x1:L,y1:y,x2:W-R,y2:y,stroke:'#e0e9ed','stroke-width':1});
    s('text',{x:L-10,y:y+4,'text-anchor':'end',fill:'#6e8490','font-size':11},Number(value.toPrecision(4)));
  }
  for(let m=0;m<=xmax;m+=xmax<=12?3:Math.ceil(xmax/6/3)*3){
    s('text',{x:sx(m),y:H-21,'text-anchor':'middle',fill:'#6e8490','font-size':11},m);
  }
  s('line',{x1:L,y1:H-B,x2:W-R,y2:H-B,stroke:'#7a98a4','stroke-width':1});
  s('text',{x:(W+L-R)/2,y:H-4,'text-anchor':'middle',fill:'#4f6a77','font-size':11},'Elapsed study time (months)');
  s('text',{x:14,y:18,fill:'#4f6a77','font-size':10},attr.unit);
  for(const [limit,name] of [[attr.lower,'Lower'],[attr.upper,'Upper']]) {
    if(limit===null)continue;const y=sy(limit);
    s('line',{x1:L,y1:y,x2:W-R,y2:y,stroke:'#e49874','stroke-dasharray':'5 5','stroke-width':1.5});
    s('text',{x:W-R-4,y:y-5,'text-anchor':'end',fill:'#b96946','font-size':10},`${name} limit`);
  }
  const palette=['#0a8d82','#d37d4a','#647db5','#a35f95','#8a9053','#355d72','#b7676d','#5f9b97'];
  let index=0;
  for(const [key,pts] of grouped.entries()) {
    const color=palette[index++%palette.length], sorted=pts.sort((a,b)=>a.month-b.month);
    if(sorted.length>1)s('polyline',{points:sorted.map(p=>`${sx(p.month).toFixed(2)},${sy(p.value).toFixed(2)}`).join(' '),stroke:color,'stroke-width':2.4,fill:'none','stroke-linecap':'round','stroke-linejoin':'round'});
    sorted.forEach(o=>{
      const c=s('circle',{cx:sx(o.month),cy:sy(o.value),r:4.4,fill:color,stroke:'#fff','stroke-width':1.5});
      const title=document.createElementNS(svgNS,'title');title.textContent=`${key}: ${o.month} mo, ${o.value} ${attr.unit}`;c.appendChild(title);
    });
    const item=el('span','legend-item'),swatch=el('span','legend-swatch');swatch.style.backgroundColor=color;append(item,swatch,el('span','',key));append(legend,item);
  }
  append(target,svg);
}
function renderAll(){renderOverview();renderSetup();renderData();if(activeTab==='assessment')renderAssessment();}
function downloadFile(name,mime,data){
  const blob=new Blob([data],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function filename(ext){const prefix=project.study.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'stability-study';return `${prefix}.${ext}`;}
function addAttribute(event){
  event.preventDefault();hideMessage();
  const name=$('attrName').value.trim(),kind=$('attrKind').value,unit=$('attrUnit').value.trim();
  if(project.attributes.some(a=>a.name.toLowerCase()===name.toLowerCase())){showMessage('Attribute name already exists.',true);return;}
  const attr={id:newId(),name,kind,unit,lower:$('attrLower').value.trim()===''?null:Number($('attrLower').value),upper:$('attrUpper').value.trim()===''?null:Number($('attrUpper').value)};
  if(kind==='assay')attr.assayThresholdPct=5;
  const errors=validateAttribute(attr);if(errors.length){showMessage(errors.join(' '),true);return;}
  project.attributes.push(attr);project.example=false;event.target.reset();renderAll();showMessage(`Added attribute: ${name}. Limits are user-provided, not ICH-default specifications.`);
}
function addObservation(event){
  event.preventDefault();hideMessage();
  const o={id:newId(),batch:$('obsBatch').value.trim(),condition:$('obsCondition').value,attributeId:$('obsAttribute').value,month:Number($('obsMonth').value),value:Number($('obsValue').value),manual:$('obsManual').value,note:$('obsNote').value.trim()};
  if($('obsMonth').value.trim()===''||$('obsValue').value.trim()===''){showMessage('A study month and numeric result are required.',true);return;}
  const errors=validateObservation(o,project.attributes,conditionsFor(project.study));
  if(project.observations.some(x=>x.batch===o.batch&&x.condition===o.condition&&x.attributeId===o.attributeId&&x.month===o.month))errors.push('This batch/condition/attribute/month already has a result. Replicates are not supported in V0.1.');
  if(errors.length){showMessage(errors.join(' '),true);return;}
  project.observations.push(o);project.example=false;renderAll();$('obsValue').value='';$('obsNote').value='';showMessage('Measurement added. Evaluate it in the Observed stability section.');
}
function applyImportedProject(imported,label){
  const errors=validateProject(imported);if(errors.length){showMessage(errors.join('\n'),true);return;}
  if(!window.confirm(`Replace the current study and ${project.observations.length} observations with ${label}? Export your current data first if needed.`))return;
  project=imported;renderAll();showMessage(`Imported ${label}. Review input context and acceptance criteria before interpretation.`);
}
async function readImport(e){
  const file=e.target.files?.[0]; e.target.value='';if(!file)return;
  if(file.size>2_000_000){showMessage('File exceeds the 2 MB import limit. Split the dataset or use a smaller file.',true);return;}
  try {
    const data=await file.text();
    if(file.name.toLowerCase().endsWith('.csv')) applyImportedProject(importCSV(project,data),`CSV (${file.name})`);
    else if(file.name.toLowerCase().endsWith('.json')) applyImportedProject(JSON.parse(data),`JSON (${file.name})`);
    else showMessage('Select a .csv or .json file.',true);
  }catch(error){showMessage(`Import error: ${error.message}`,true);}
}
function init(){
  document.querySelectorAll('.nav-link').forEach(btn=>btn.addEventListener('click',()=>setTab(btn.dataset.tab)));
  document.querySelectorAll('[data-go]').forEach(btn=>btn.addEventListener('click',()=>setTab(btn.dataset.go)));
  $('studyForm').addEventListener('submit',e=>{e.preventDefault();checkStudyChanges(studyInput());});
  $('attributeForm').addEventListener('submit',addAttribute);
  $('observationForm').addEventListener('submit',addObservation);
  $('resetDemo').addEventListener('click',()=>{if(project.observations.length&&!window.confirm('Load the synthetic example and replace this study? Export first if needed.'))return;project=demoProject();renderAll();showMessage('Synthetic demonstration loaded. Data are illustrative only.');});
  $('newProject').addEventListener('click',()=>{if(project.observations.length&&!window.confirm('Start a blank study and discard current measurements? Export first if needed.'))return;project=blankProject();renderAll();showMessage('New study created for the current browser session.');});
  $('filterCondition').addEventListener('change',renderMeasurements);
  $('filterAttribute').addEventListener('change',renderMeasurements);
  $('chartAttribute').addEventListener('change',renderChart);
  $('exportCSV').addEventListener('click',()=>downloadFile(filename('csv'),'text/csv;charset=utf-8',exportCSV(project)));
  $('exportJSON').addEventListener('click',()=>downloadFile(filename('json'),'application/json',JSON.stringify(project,null,2)));
  $('importCSV').addEventListener('click',()=>{ $('fileInput').accept='.csv,text/csv';$('fileInput').click(); });
  $('importJSON').addEventListener('click',()=>{ $('fileInput').accept='.json,application/json';$('fileInput').click(); });
  $('fileInput').addEventListener('change',readImport);
  $('downloadReport').addEventListener('click',()=>downloadFile(filename('report.md'),'text/markdown;charset=utf-8',reportMarkdown(project)));
  renderAll();setTab('overview');
}
init();
