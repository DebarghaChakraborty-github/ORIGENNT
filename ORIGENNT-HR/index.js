/* Point this at your deployed Apps Script Web App exec URL (see the companion
   Code.gs + SETUP.md). Until then, network calls below fail gracefully and
   the UI stays usable for layout/testing. */
const HR_BACKEND_URL='/api/hr';
const GOOGLE_CLIENT_ID='576893667298-kj24mmsvo88id0pp5r1teu256rc1mla4.apps.googleusercontent.com';

const state={currentView:'dashboard',employee:null,people:[],tasks:[],training:[],mpr:[],appointments:[],compliance:[],selectedTemplate:null,generatePerson:null};

/* ---------- daily quote (deterministic — same quote all day, changes at midnight) ---------- */
const QUOTES=[
 ["Discipline is the bridge between goals and accomplishment.","Jim Rohn"],
 ["Quality is not an act, it is a habit.","Aristotle"],
 ["What gets measured gets managed.","Peter Drucker"],
 ["The way to get started is to quit talking and begin doing.","Walt Disney"],
 ["Excellence is never an accident; it is the result of high intention and sincere effort.","Aristotle"],
 ["Culture eats strategy for breakfast.","Peter Drucker"],
 ["Small disciplines repeated with consistency lead to great achievements.","John C. Maxwell"],
 ["Trust is built with consistency.","Lincoln Chafee"],
 ["People rarely succeed unless they have fun in what they are doing.","Dale Carnegie"],
 ["Efficiency is doing things right; effectiveness is doing the right things.","Peter Drucker"],
 ["The strength of the team is each individual member.","Phil Jackson"],
 ["Good process brings good results.","W. Edwards Deming"],
 ["It is not the strongest that survive, but the most adaptable to change.","Charles Darwin"],
 ["Do the hard jobs first. The easy jobs will take care of themselves.","Dale Carnegie"],
 ["A goal without a plan is just a wish.","Antoine de Saint-Exupéry"],
 ["Compliance is not a cost centre; it is the cost of staying in business.","Anonymous"],
 ["Details create the big picture.","Sanford I. Weill"],
 ["Systems run the business and people run the systems.","Michael Gerber"],
 ["You cannot manage what you do not measure.","W. Edwards Deming"],
 ["Well done is better than well said.","Benjamin Franklin"]
];
function dayOfYear(d){const start=new Date(d.getFullYear(),0,0);return Math.floor((d-start)/864e5)}
function renderDailyQuote(){
  const idx=dayOfYear(new Date())%QUOTES.length;
  document.getElementById('dailyQuote').textContent=`"${QUOTES[idx][0]}"`;
  document.getElementById('dailyQuoteAuthor').textContent=`— ${QUOTES[idx][1]}`;
}

/* ---------- compliance calendar (central-government statutory obligations) ---------- */
const COMPLIANCE_RULES=[
 {name:'EPF — ECR filing & payment',cat:'EPFO',freq:'Monthly',rule:'day',day:15,note:'Electronic Challan-cum-Return for the previous wage month, filed on the EPFO Unified Portal.'},
 {name:'ESIC — Contribution payment',cat:'ESIC',freq:'Monthly',rule:'day',day:15,note:'Employee State Insurance contribution challan for the previous wage month.'},
 {name:'TDS on salary — deposit',cat:'Income Tax',freq:'Monthly',rule:'day',day:7,note:'Tax deducted at source on salary (Sec 192) deposited by the 7th of the following month.'},
 {name:'TDS return — Form 138 (formerly 24Q), Q1',cat:'Income Tax',freq:'Quarterly',rule:'fixed',month:7,day:31,note:'Salary TDS quarterly statement for Apr–Jun.'},
 {name:'TDS return — Form 138, Q2',cat:'Income Tax',freq:'Quarterly',rule:'fixed',month:10,day:31,note:'Salary TDS quarterly statement for Jul–Sep.'},
 {name:'TDS return — Form 138, Q3',cat:'Income Tax',freq:'Quarterly',rule:'fixed',month:1,day:31,note:'Salary TDS quarterly statement for Oct–Dec.'},
 {name:'TDS return — Form 138, Q4 + Form 16 issuance',cat:'Income Tax',freq:'Quarterly',rule:'fixed',month:5,day:31,note:'Salary TDS quarterly statement for Jan–Mar; annual salary certificate (Form 16/Form 130) to employees by 15 June.'},
 {name:'EPF Annual Return — Form 3A / Form 6A',cat:'EPFO',freq:'Annual',rule:'fixed',month:4,day:30,note:'Consolidated annual PF statement for the financial year just ended.'},
 {name:'ESIC Half-Yearly Return',cat:'ESIC',freq:'Half-yearly',rule:'halfyear',day1:{month:5,day:11},day2:{month:11,day:11},note:'Half-yearly contribution return — periods Apr–Sep and Oct–Mar.'},
 {name:'Professional Tax — Odisha monthly payment',cat:'State PT',freq:'Monthly',rule:'lastday',note:'Odisha PT deducted from employees remitted by the last day of the month.'},
 {name:'Professional Tax — Annual enrolment renewal',cat:'State PT',freq:'Annual',rule:'fixed',month:4,day:30,note:'Employer PT enrolment renewal / annual return.'},
 {name:'POSH — Annual Report (Internal Committee)',cat:'POSH',freq:'Annual',rule:'fixed',month:1,day:31,note:'Annual report on sexual harassment complaints to the employer/District Officer under the POSH Act.'},
 {name:'Payment of Bonus — Bonus Act',cat:'Labour',freq:'Annual',rule:'fixed',month:11,day:30,note:'Statutory bonus to be paid within 8 months of the close of the accounting year.'},
 {name:'Shops & Establishment — Registration renewal',cat:'State Labour',freq:'Annual',rule:'fixed',month:3,day:31,note:'Renew Odisha Shops & Commercial Establishments registration ahead of expiry — confirm exact renewal date against the certificate issued.'},
 {name:'ROC — AOC-4 (Financial Statements)',cat:'MCA/ROC',freq:'Annual',rule:'fixed',month:10,day:30,note:'File financial statements within 30 days of AGM (assumes AGM by 30 Sep for FY ending 31 Mar).'},
 {name:'ROC — MGT-7A (Annual Return, small company)',cat:'MCA/ROC',freq:'Annual',rule:'fixed',month:11,day:29,note:'File annual return within 60 days of AGM.'},
 {name:'Gratuity — Payment on eligibility',cat:'Labour',freq:'As triggered',rule:'ongoing',note:'Payable within 30 days of it becoming due (resignation/retirement/termination after 5 years\' service).'},
];
function nextOccurrence(rule){
  const now=new Date();const y=now.getFullYear();
  const cands=[];
  if(rule.rule==='day'){
    for(const dy of[y,y+1])for(let m=0;m<12;m++)cands.push(new Date(dy,m,rule.day));
  }else if(rule.rule==='fixed'){
    cands.push(new Date(y,rule.month-1,rule.day),new Date(y+1,rule.month-1,rule.day));
  }else if(rule.rule==='halfyear'){
    for(const dy of[y,y+1]){cands.push(new Date(dy,rule.day1.month-1,rule.day1.day));cands.push(new Date(dy,rule.day2.month-1,rule.day2.day))}
  }else if(rule.rule==='lastday'){
    for(const dy of[y,y+1])for(let m=0;m<12;m++)cands.push(new Date(dy,m+1,0));
  }else{return null}
  const future=cands.filter(d=>d>=new Date(now.toDateString())).sort((a,b)=>a-b);
  return future[0]||null;
}
function complianceStatus(dueDate){
  if(!dueDate)return'ongoing';
  const days=Math.ceil((dueDate-new Date(new Date().toDateString()))/864e5);
  if(days<0)return'overdue';if(days<=7)return'soon';return'ok';
}
function renderCompliance(){
  const target=document.getElementById('complianceTable');
  const rows=COMPLIANCE_RULES.map(r=>{
    const due=nextOccurrence(r);
    return{...r,due,status:complianceStatus(due)};
  });
  state.compliance=rows;
  rows.sort((a,b)=>(a.due?a.due:new Date(8640000000000000))-(b.due?b.due:new Date(8640000000000000)));
  target.innerHTML=`<table class="compliance-table"><thead><tr><th>Filing</th><th>Category</th><th>Frequency</th><th>Next Due</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${esc(r.name)}</strong><br><span class="hr-muted">${esc(r.note)}</span></td><td class="comp-cat">${esc(r.cat)}</td><td>${esc(r.freq)}</td><td>${r.due?fmt(r.due):'Ongoing'}</td><td><span class="due-badge ${r.status==='overdue'?'overdue':r.status==='soon'?'soon':'ok'}">${r.status==='overdue'?'Overdue':r.status==='soon'?'Due soon':r.status==='ongoing'?'Ongoing':'On track'}</span></td></tr>`).join('')}</tbody></table>`;
  refreshTodayStrip();
}
function waComplianceDigest(){
  const due=state.compliance.filter(r=>r.status==='overdue'||r.status==='soon');
  const lines=due.map(r=>`• ${r.name} — due ${r.due?fmt(r.due):'—'}`).join('\n');
  const text=`ORIGENNT HR — Compliance items needing attention:\n${lines||'Nothing due in the next 7 days.'}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank');
}
function buildDailyDigestText(){
  const today=new Date().toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const tasksToday=state.tasks.filter(t=>t.status!=='Done'&&isToday(t.dueDate));
  const overdueTasks=state.tasks.filter(t=>t.status!=='Done'&&t.dueDate&&new Date(t.dueDate)<new Date(new Date().toDateString()));
  const apptsToday=state.appointments.filter(a=>isToday(a.date));
  const kycPending=state.people.filter(p=>String(p['KYC Status']||'').toLowerCase()==='pending').length;
  const compDue=state.compliance.filter(r=>r.status==='overdue'||r.status==='soon');
  let t=`*ORIGENNT HR — Daily Digest*\n${today}\n\n`;
  t+=`*Tasks due today:* ${tasksToday.length}\n${tasksToday.map(x=>`• ${x.title} (${x.assignee||'Unassigned'})`).join('\n')}\n\n`;
  t+=`*Overdue tasks:* ${overdueTasks.length}\n${overdueTasks.map(x=>`• ${x.title} (${x.assignee||'Unassigned'})`).join('\n')}\n\n`;
  t+=`*Appointments today:* ${apptsToday.length}\n${apptsToday.map(x=>`• ${x.title} — ${x.startTime||''}`).join('\n')}\n\n`;
  t+=`*Pending KYC:* ${kycPending}\n\n`;
  t+=`*Compliance due (≤7 days):*\n${compDue.map(x=>`• ${x.name} — ${x.due?fmt(x.due):''}`).join('\n')||'None'}\n`;
  return t;
}

const TEMPLATES=[
['Training Certificate','Training'],['Course Completion Certificate','Training'],['Training Completion Certificate','Training'],['Internship Certificate','Internship'],['Internship Completion Certificate','Internship'],['Internship Participation Certificate','Internship'],['Internship Experience Certificate','Internship'],['Employment Certificate','Employment'],['Experience Certificate','Employment'],['Work Experience Certificate','Employment'],['Service Certificate','Employment'],['Joining Certificate','Employment'],['Employment Confirmation Certificate','Employment'],['Probation Completion Certificate','Employment'],['Employee Confirmation Letter','Letters'],['Appointment Letter','Letters'],['Offer Letter','Letters'],['Employment Offer Letter','Letters'],['Internship Offer Letter','Internship'],['Internship Appointment Letter','Internship'],['Joining Letter','Letters'],['Engagement Letter','Letters'],['Contract Letter','Letters'],['Assignment Letter','Project'],['Project Assignment Letter','Project'],['Project Completion Certificate','Project'],['Project Participation Certificate','Project'],['Project Experience Certificate','Project'],['Achievement Certificate','Recognition'],['Appreciation Certificate','Recognition'],['Recognition Certificate','Recognition'],['Excellence Certificate','Recognition'],['Merit Certificate','Recognition'],['Performance Certificate','Performance'],['Participation Certificate','Certificates'],['Attendance Certificate','Training'],['Training Attendance Certificate','Training'],['Workshop Certificate','Training'],['Workshop Participation Certificate','Training'],['Seminar Certificate','Training'],['Seminar Participation Certificate','Training'],['Webinar Certificate','Training'],['Webinar Participation Certificate','Training'],['Event Participation Certificate','Events'],['Event Completion Certificate','Events'],['Bootcamp Certificate','Training'],['Bootcamp Completion Certificate','Training'],['Masterclass Certificate','Training'],['Masterclass Completion Certificate','Training'],['Course Certificate','Training'],['Course Participation Certificate','Training'],['Skill Certificate','Assessment'],['Skill Assessment Certificate','Assessment'],['Skill Verification Certificate','Verification'],['Competency Certificate','Assessment'],['Competency Assessment Certificate','Assessment'],['Credential Certificate','Credential'],['Professional Credential','Credential'],['Digital Credential','Credential'],['Credential Verification Letter','Verification'],['Certificate of Completion','Certificates'],['Certificate of Achievement','Certificates'],['Certificate of Recognition','Certificates'],['Certificate of Participation','Certificates'],['Certificate of Appreciation','Certificates'],['Certificate of Merit','Certificates'],['Certificate of Excellence','Certificates'],['Certificate of Attendance','Certificates'],['Letter of Completion','Letters'],['Letter of Participation','Letters'],['Letter of Appreciation','Letters'],['Letter of Recommendation','Letters'],['Recommendation Letter','Letters'],['Reference Letter','Letters'],['Professional Reference Letter','Letters'],['Experience Letter','Employment'],['Employment Letter','Employment'],['Relieving Letter','Exit'],['Release Letter','Exit'],['Termination Letter','Exit'],['Resignation Acceptance Letter','Exit'],['No Objection Certificate','Exit'],['NOC','Exit'],['Salary Certificate','Verification'],['Salary Verification Letter','Verification'],['Compensation Certificate','Verification'],['Income Certificate','Verification'],['Employment Verification Letter','Verification'],['Employment Verification Certificate','Verification'],['Internship Verification Letter','Verification'],['Internship Verification Certificate','Verification'],['Training Verification Letter','Verification'],['Training Verification Certificate','Verification'],['Document Verification Letter','Verification'],['Background Verification Letter','Verification'],['Character Certificate','Verification'],['Conduct Certificate','Verification'],['Good Standing Certificate','Verification'],['Identity Verification Letter','Verification'],['KYC Confirmation Letter','KYC'],['KYC Verification Certificate','KYC'],['Onboarding Completion Certificate','Onboarding'],['Onboarding Confirmation Letter','Onboarding'],['Offboarding Confirmation Letter','Exit'],['Exit Clearance Certificate','Exit'],['Full and Final Settlement Letter','Exit'],['Policy Acknowledgement','Compliance'],['NDA / Confidentiality Agreement','Compliance'],['Declaration Form','Compliance'],['Undertaking','Compliance'],['Consent Form','Compliance'],['Authorization Letter','Letters'],['Acknowledgement Letter','Letters'],['Confirmation Letter','Letters'],['Approval Letter','Letters'],['Acceptance Letter','Letters'],['Appointment Confirmation','Employment'],['Registration Confirmation','Confirmation'],['Enrollment Confirmation','Confirmation'],['Training Enrollment Confirmation','Training'],['Course Enrollment Confirmation','Training'],['Service Order Confirmation','Client'],['Service Completion Certificate','Client'],['Service Delivery Certificate','Client'],['Service Engagement Letter','Client'],['Consulting Engagement Letter','Client'],['Consulting Completion Certificate','Client'],['Advisory Engagement Letter','Client'],['Advisory Completion Certificate','Client'],['Project Engagement Letter','Client'],['Project Closure Certificate','Client'],['Client Completion Certificate','Client'],['Client Appreciation Certificate','Client'],['Client Recommendation Letter','Client'],['Client Reference Letter','Client'],['Client Verification Letter','Client'],['B2B Service Certificate','Client'],['B2B Completion Certificate','Client'],['B2C Service Certificate','Client'],['B2C Completion Certificate','Client'],['Career Service Certificate','Career Services'],['Career Counselling Completion Certificate','Career Services'],['Resume Service Completion Certificate','Career Services'],['LinkedIn Optimization Completion Certificate','Career Services'],['Interview Preparation Completion Certificate','Career Services'],['Career Assessment Certificate','Career Services'],['Placement Assistance Certificate','Career Services'],['Recruitment Service Completion Certificate','Recruitment'],['Recruitment Engagement Letter','Recruitment'],['Candidate Assessment Report','Reports'],['Candidate Evaluation Report','Reports'],['Training Assessment Report','Reports'],['Training Completion Report','Reports'],['Performance Evaluation Report','Reports'],['Skill Assessment Report','Reports'],['Service Completion Report','Reports'],['Project Completion Report','Reports'],['Consulting Report','Reports'],['Advisory Report','Reports'],['Assessment Report','Reports'],['Verification Report','Reports'],['Audit Report','Compliance'],['Compliance Certificate','Compliance'],['Compliance Confirmation Letter','Compliance'],['Compliance Verification Certificate','Compliance'],['Quality Certificate','Compliance'],['Quality Assurance Certificate','Compliance'],['Custom Certificate','Custom'],['Custom Letter','Custom'],['Custom Formal Document','Custom'],['Other','Custom']
];

/* ---------- helpers ---------- */
function toast(message){const el=document.getElementById('hrToast');el.textContent=message;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),2800)}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function initials(name){return (name||'Employee').split(' ').slice(0,2).map(x=>x[0]||'').join('').toUpperCase()}
function fmt(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}
function fmtDateTime(v){if(!v)return'—';const d=new Date(v);return Number.isNaN(d.getTime())?String(v):d.toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
function isToday(v){if(!v)return false;const d=new Date(v);const t=new Date();return d.getFullYear()===t.getFullYear()&&d.getMonth()===t.getMonth()&&d.getDate()===t.getDate()}
function waLink(mobile,message){const digits=String(mobile||'').replace(/[^\d]/g,'');if(!digits)return null;return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`}
function gcalLink(appt){const pad=n=>String(n).padStart(2,'0');const start=new Date(`${appt.date}T${appt.startTime||'09:00'}`);const end=appt.endTime?new Date(`${appt.date}T${appt.endTime}`):new Date(start.getTime()+60*60*1000);const fmt2=d=>`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;const params=new URLSearchParams({action:'TEMPLATE',text:appt.title||'Appointment',dates:`${fmt2(start)}/${fmt2(end)}`,details:appt.notes||'',location:appt.location||''});return `https://calendar.google.com/calendar/render?${params.toString()}`}
async function apiGet(action,params={}){
  const q=new URLSearchParams({action,...params});
  const res=await fetch(`${HR_BACKEND_URL}?${q.toString()}`,{
    credentials:'include',
    headers:{Accept:'application/json'},
    cache:'no-store'
  });
  let body=null;
  try{body=await res.json()}catch(e){}
  if(!res.ok){
    const message=body&&body.error?body.error:`Backend returned ${res.status}`;
    throw new Error(message)
  }
  return body||{}
}

/* ---------- view switching ---------- */
function showView(view){
  document.querySelectorAll('[id^="view-"]').forEach(el=>el.classList.add('hr-hidden'));
  const t=document.getElementById('view-'+view);if(t)t.classList.remove('hr-hidden');
  document.querySelectorAll('.hr-nav button[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  state.currentView=view;
  if(view==='dashboard'||view==='activity')  if(view==='people')  if(view==='tasks')  if(view==='training')loadTraining();
  if(view==='mpr')  if(view==='appointments')  if(view==='compliance')  if(view==='analytics')renderAnalytics();
}
document.querySelectorAll('[data-view-link]').forEach(el=>el.addEventListener('click',()=>showView(el.dataset.viewLink)));

function setGreeting(){
  const now=new Date();
  document.getElementById('heroDay').textContent=now.toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  const h=now.getHours();
  const name=(state.userName||'').split(' ')[0];
  const base=h<12?'Good morning':h<17?'Good afternoon':'Good evening';
  document.getElementById('todayGreet').textContent=name?`${base}, ${name}`:base;
  renderDailyQuote();
}
function refreshTodayStrip(){
  document.getElementById('todayTasksDue').textContent=state.tasks.filter(t=>t.status!=='Done'&&isToday(t.dueDate)).length;
  document.getElementById('todayAppointments').textContent=state.appointments.filter(a=>isToday(a.date)).length;
  document.getElementById('todayPendingKyc').textContent=state.people.filter(p=>String(p['KYC Status']||'').toLowerCase()==='pending').length;
  const month=new Date().toISOString().slice(0,7);
  document.getElementById('todayMprDue').textContent=state.mpr.filter(m=>m.month===month&&m.status!=='Approved').length;
  const overdueTasks=state.tasks.filter(t=>t.status!=='Done'&&t.dueDate&&new Date(t.dueDate)<new Date(new Date().toDateString()));
  document.getElementById('metricOverdueTasks').textContent=overdueTasks.length;
  const compDue=(state.compliance||[]).filter(r=>r.status==='overdue'||r.status==='soon');
  const compOverdue=(state.compliance||[]).filter(r=>r.status==='overdue');
  const elTCD=document.getElementById('todayComplianceDue');if(elTCD)elTCD.textContent=compDue.length;
  const elMCO=document.getElementById('metricComplianceOverdue');if(elMCO)elMCO.textContent=compOverdue.length;
  const interns=state.people.filter(p=>String(p['Employment Type']||'').toLowerCase()==='intern'&&String(p['Employment Status']||'').toLowerCase()==='active');
  const elIQ=document.getElementById('metricInternsQuick');if(elIQ)elIQ.textContent=interns.length;
  const elHH=document.getElementById('heroHeadcount');if(elHH)elHH.textContent=state.people.length;
  const elHC=document.getElementById('heroCompliance');if(elHC)elHC.textContent=COMPLIANCE_RULES.length;
  const elHD=document.getElementById('heroDocs');if(elHD)elHD.textContent=TEMPLATES.length+'+';
}

/* ---------- dashboard metrics ---------- */
function updateMetrics(people){
  const active=people.filter(p=>String(p['Employment Status']||'').toLowerCase()==='active').length;
  const interns=people.filter(p=>String(p['Employment Type']||'').toLowerCase()==='intern').length;
  const kyc=people.filter(p=>String(p['KYC Status']||'').toLowerCase()==='pending').length;
  const notice=people.filter(p=>String(p['Employment Status']||'').toLowerCase()==='on notice').length;
  const exited=people.filter(p=>String(p['Employment Status']||'').toLowerCase()==='exited').length;
  document.getElementById('metricPeople').textContent=people.length;
  document.getElementById('metricActive').textContent=active;
  document.getElementById('metricInterns').textContent=interns;
  document.getElementById('metricKyc').textContent=kyc;
  document.getElementById('metricExited').textContent=exited;
  document.getElementById('dashActive').textContent=active;
  document.getElementById('dashKyc').textContent=kyc;
  document.getElementById('dashNotice').textContent=notice;
  document.getElementById('dashExited').textContent=exited;
  refreshTodayStrip();
}

/* ---------- activity ---------- */
let ACTIVITY_STORE=[];
function renderActivities(items,targetId){
  const target=document.getElementById(targetId);
  if(!items.length){target.innerHTML='<div class="hr-empty">No activity recorded yet.</div>';return}
  const offset=ACTIVITY_STORE.length;
  ACTIVITY_STORE=ACTIVITY_STORE.concat(items);
  target.innerHTML=`<div class="hr-activity-list">${items.map((a,i)=>`<div class="hr-activity-item" data-activity-idx="${offset+i}"><div class="hr-dot">&bull;</div><div><strong>${esc(a['Action Type']||a.title||a.type||'Activity')}</strong><span>${esc(a['Description']||a.summary||a.detail||'')}</span></div><div class="hr-date">${fmtDateTime(a['Timestamp']||a.timestamp||a.date)}</div></div>`).join('')}</div>`;
  target.querySelectorAll('[data-activity-idx]').forEach(el=>el.addEventListener('click',()=>openActivityDetail(Number(el.dataset.activityIdx))));
}
function openActivityDetail(idx){
  const a=ACTIVITY_STORE[idx];if(!a)return;
  const rows=Object.entries(a).filter(([k,v])=>v!==''&&v!==undefined).map(([k,v])=>`<div class="audit-kv"><b>${esc(k)}</b><span>${esc(v)}</span></div>`).join('');
  document.getElementById('activityDetailBody').innerHTML=rows||'<div class="hr-empty">No further detail on this record.</div>';
  openModal('activityDetailModal');
}
async function loadRecentActivity(){
  try{
    const data=await apiGet('getRecentActivity',{limit:25});
    ACTIVITY_STORE=[];
    renderActivities(data.activities||[],'dashboardActivity');
    renderActivities(data.activities||[],'activityTable');
  }catch(e){
    document.getElementById('dashboardActivity').innerHTML='<div class="hr-empty">Activity could not be loaded. Connect the backend in HR_BACKEND_URL to enable this.</div>';
    document.getElementById('activityTable').innerHTML='<div class="hr-empty">Activity could not be loaded. Connect the backend in HR_BACKEND_URL to enable this.</div>';
  }
}

/* ---------- people ---------- */
async function loadPeople(){
  const target=document.getElementById('peopleResults');
  target.innerHTML='<div class="hr-empty"><span class="hr-loading">Loading people register</span></div>';
  try{
    const data=await apiGet('searchEmployees',{q:'ORI-EMP-'});
    state.people=data.results||[];
    renderPeople(state.people);
    updateMetrics(state.people);
  }catch(e){
    target.innerHTML='<div class="hr-empty">People register could not be loaded. Connect the backend in HR_BACKEND_URL to enable this.</div>';
  }
}
function renderPeople(people){
  const target=document.getElementById('peopleResults');
  const status=document.getElementById('peopleStatus').value.toLowerCase();
  const dept=document.getElementById('peopleDepartment').value.toLowerCase();
  const etype=document.getElementById('peopleEmpType').value.toLowerCase();
  const q=document.getElementById('peopleSearch').value.trim().toLowerCase();
  const filtered=people.filter(e=>{
    const hit=!q||Object.values(e).some(v=>String(v??'').toLowerCase().includes(q));
    const hs=!status||String(e['Employment Status']||'').toLowerCase()===status;
    const hd=!dept||String(e['Department']||'').toLowerCase()===dept;
    const het=!etype||String(e['Employment Type']||'').toLowerCase()===etype;
    return hit&&hs&&hd&&het;
  });
  document.getElementById('peopleCount').textContent=`${filtered.length} person${filtered.length===1?'':'s'} shown`;
  if(!filtered.length){target.innerHTML='<div class="hr-empty">No matching person record found.</div>';return}
  target.innerHTML=filtered.map(emp=>`<div class="hr-result"><div class="hr-avatar-sm">${emp['Photo URL']?`<img src="${esc(emp['Photo URL'])}" alt="${esc(emp['Full Name']||'Person')} photo" loading="lazy" onerror="this.parentElement.innerHTML='<span>${esc(initials(emp['Full Name']))}</span>'">`:`<span>${esc(initials(emp['Full Name']))}</span>`}</div><div><strong>${esc(emp['Full Name']||'—')}</strong><br><span>${esc(emp['Employee ID']||'—')}</span></div><div><strong>${esc(emp['Designation']||'—')}</strong><br><span>${esc(emp['Department']||'—')}</span></div><div><span>${esc(emp['Reporting Manager']||'—')}</span><br><span>${esc(emp['KYC Status']||'Pending')} KYC</span></div><div><span class="hr-status ${String(emp['Employment Status']||'').toLowerCase().includes('exit')?'exit':''}">${esc(emp['Employment Status']||'Active')}</span><br><button class="hr-link-btn" type="button" data-employee-id="${esc(emp['Employee ID']||'')}">Open Record</button></div></div>`).join('');
  target.querySelectorAll('[data-employee-id]').forEach(b=>b.addEventListener('click',()=>loadProfile(b.dataset.employeeId)));
}

/* ---------- profile ---------- */
async function loadProfile(employeeId){
  const section=document.getElementById('employee-record');
  section.classList.remove('hr-hidden');
  document.getElementById('employeeProfile').innerHTML='<div class="hr-empty"><span class="hr-loading">Loading employee record</span></div>';
  try{
    const data=await apiGet('getEmployeeProfile',{employeeId});
    state.employee=data.employee||data;
    renderProfile(data);
    section.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){
    document.getElementById('employeeProfile').innerHTML='<div class="hr-empty">Employee record could not be loaded.</div>';
    toast('Unable to load employee record.');
  }
}
function renderProfile(data){
  const e=data.employee||data;
  const photo=e['Photo URL']?`<img src="${esc(e['Photo URL'])}" alt="${esc(e['Full Name'])}">`:esc(initials(e['Full Name']));
  document.getElementById('employeeProfile').innerHTML=`
  <div class="hr-profile">
    <div class="card hr-profile-main">
      <div class="hr-profile-id"><div style="display:flex;gap:14px;align-items:center"><div class="hr-avatar-lg">${photo}</div><div><h2 class="hr-name">${esc(e['Full Name']||'—')}</h2><p class="hr-muted">${esc(e['Employee ID']||'—')} &middot; ${esc(e['Designation']||'—')}</p></div></div><span class="hr-status ${String(e['Employment Status']||'').toLowerCase().includes('exit')?'exit':''}">${esc(e['Employment Status']||'Active')}</span></div>
      <div class="hr-data-grid">
        <div class="hr-data"><div class="k">Department</div><div class="v">${esc(e['Department']||'—')}</div></div>
        <div class="hr-data"><div class="k">Reporting Manager</div><div class="v">${esc(e['Reporting Manager']||'—')}</div></div>
        <div class="hr-data"><div class="k">Joining Date</div><div class="v">${fmt(e['Joining Date'])}</div></div>
        <div class="hr-data"><div class="k">Employment Type</div><div class="v">${esc(e['Employment Type']||'—')}</div></div>
        <div class="hr-data"><div class="k">Work Mode</div><div class="v">${esc(e['Work Mode']||'—')}</div></div>
        <div class="hr-data"><div class="k">Work Location</div><div class="v">${esc(e['Work Location']||'—')}</div></div>
        <div class="hr-data"><div class="k">Official Email</div><div class="v">${esc(e['Official Email']||'—')}</div></div>
        <div class="hr-data"><div class="k">Mobile</div><div class="v">${esc(e['Mobile']||'—')}</div></div>
        <div class="hr-data"><div class="k">KYC Status</div><div class="v">${esc(e['KYC Status']||'Pending')}</div></div>
      </div>
    </div>
    <div class="card hr-profile-side">
      <h4>Actions</h4>
      <div class="hr-action-list">
        <button type="button" onclick="openAddEmployeeWithData()">Edit person record</button>
        <button type="button" onclick="document.getElementById('generateEmployee').value='${esc(e['Employee ID']||'')}';showView('generate');loadGeneratePerson()">Generate document</button>
        <button type="button" onclick="document.getElementById('documentPerson').value='${esc(e['Employee ID']||'')}';showView('documents');loadPersonDocuments()">View documents</button>
        ${e['Mobile']?`<a class="hr-btn wa" style="text-align:center;text-decoration:none" href="${waLink(e['Mobile'],`Hi ${e['Full Name']||''}, following up from ORIGENNT HR.`)}" target="_blank" rel="noopener">Message on WhatsApp</a>`:''}
      </div>
      ${String(e['Employment Type']||'').toLowerCase()==='intern'?`
      <h4 style="margin-top:18px">Intern Track</h4>
      <div class="hr-lifecycle" style="grid-template-columns:repeat(3,1fr)">
        <div class="hr-stage current"><strong>Assigned</strong><span>Mentor &amp; project</span></div>
        <div class="hr-stage"><strong>Progress</strong><span>Milestones</span></div>
        <div class="hr-stage"><strong>Certified</strong><span>Completion</span></div>
      </div>
      <div class="hr-form-grid" style="grid-template-columns:1fr;margin-top:12px">
        <div class="hr-form-field"><label>Mentor / Project</label><input id="internMentorInline" placeholder="Mentor name — project"></div>
        <div class="hr-form-field"><label>Progress Status</label><select id="internStatusInline"><option>In Progress</option><option>Evaluation</option><option>Completed</option><option>Certified</option></select></div>
        <div class="hr-form-field"><label>Remarks</label><textarea id="internRemarksInline" placeholder="Milestone notes"></textarea></div>
        <button class="hr-btn primary small" type="button" onclick="saveInternInline('${esc(e['Employee ID']||'')}')">Save Intern Update</button>
      </div>`:''}
    </div>
  </div>`;
}
async function saveInternInline(employeeId){
  const data={employeeId,mentorProject:document.getElementById('internMentorInline').value.trim(),status:document.getElementById('internStatusInline').value,remarks:document.getElementById('internRemarksInline').value.trim()};
  try{
    const out=await apiGet('addInternProgress',{data:JSON.stringify(data)});
    if(!out.success)throw new Error(out.error||'Unable to save');
    toast('Intern progress saved.');loadRecentActivity();
  }catch(err){toast(err.message||'Intern progress route connects to the INTERN PROGRESS sheet once deployed.')}
}

/* ---------- add / edit person ---------- */
function openModal(id){document.getElementById(id).classList.add('open')}
function closeModal(id){document.getElementById(id).classList.remove('open')}
function previewPhoto(){const f=document.getElementById('employeePhoto').files[0];const box=document.getElementById('photoPreview');document.getElementById('photoName').textContent=f?f.name:'No photo selected.';if(f){const r=new FileReader();r.onload=e=>box.innerHTML=`<img src="${e.target.result}" alt="Profile photo preview">`;r.readAsDataURL(f)}else box.innerHTML='<div class="hr-photo-placeholder">Profile / KYC Photo<br><small>JPG or PNG</small></div>'}
function showKycFiles(){const files=[...document.getElementById('kycFiles').files];document.getElementById('kycFileList').innerHTML=files.map(f=>`<div class="hr-file"><span>${esc(f.name)}</span><small>${Math.round(f.size/1024)} KB</small></div>`).join('')||''}
async function submitEmployee(e){
  e.preventDefault();
  const fullName=document.getElementById('empFullName').value.trim();
  if(!fullName){toast('Full name is required.');return}
  const data={fullName,officialEmail:document.getElementById('empOfficialEmail').value.trim(),personalEmail:document.getElementById('empPersonalEmail').value.trim(),mobile:document.getElementById('empMobile').value.trim(),department:document.getElementById('empDepartment').value.trim(),designation:document.getElementById('empDesignation').value.trim(),reportingManager:document.getElementById('empManager').value.trim(),joiningDate:document.getElementById('empJoiningDate').value,employmentType:document.getElementById('empEmploymentType').value,workMode:document.getElementById('empWorkMode').value,workLocation:document.getElementById('empWorkLocation').value.trim(),employmentStatus:document.getElementById('empEmploymentStatus').value,kycStatus:document.getElementById('empKycStatus').value};
  try{
    const out=await apiGet('addEmployee',{data:JSON.stringify(data)});
    if(!out.success)throw new Error(out.error||'Unable to create employee');
    closeModal('addEmployeeModal');
    document.getElementById('addEmployeeForm').reset();
    document.getElementById('photoPreview').innerHTML='<div class="hr-photo-placeholder">Profile / KYC Photo<br><small>JPG or PNG</small></div>';
    document.getElementById('kycFileList').innerHTML='';
    document.getElementById('photoName').textContent='No photo selected.';
    toast(`Person record ${out.employeeId} created.`);
    await loadPeople();showView('people');
  }catch(err){toast(err.message||'Unable to create person record.')}
}
function renderTemplates(){
  const q=document.getElementById('templateSearch').value.trim().toLowerCase();
  const list=TEMPLATES.filter(([n,c])=>!q||n.toLowerCase().includes(q)||c.toLowerCase().includes(q));
  document.getElementById('templateList').innerHTML=list.map(([n,c])=>`<button type="button" class="hr-template ${state.selectedTemplate&&state.selectedTemplate.name===n?'active':''}" data-template="${esc(n)}" data-category="${esc(c)}"><strong>${esc(n)}</strong><span>${esc(c)}</span></button>`).join('');
  document.querySelectorAll('[data-template]').forEach(b=>b.addEventListener('click',()=>{state.selectedTemplate={name:b.dataset.template,category:b.dataset.category};renderTemplates();document.getElementById('genDocMeta').textContent=state.selectedTemplate.name;document.getElementById('genCategoryMeta').textContent=state.selectedTemplate.category}));
}
function renderGeneratePerson(){
  const p=state.generatePerson;
  if(!p){document.getElementById('generatePerson').innerHTML='<div class="hr-empty">Select a person before choosing a document.</div>';document.getElementById('genPersonMeta').textContent='Not selected';return}
  document.getElementById('generatePerson').innerHTML=`<div class="card" style="padding:15px"><strong>${esc(p.name)}</strong><div class="hr-muted" style="margin-top:5px">${esc(p.id)} &middot; ${esc(p.designation||'')}</div></div>`;
  document.getElementById('genPersonMeta').textContent=`${p.name} (${p.id})`;
}
async function loadGeneratePerson(){
  const q=document.getElementById('generateEmployee').value.trim();
  if(!q){toast('Enter an Employee ID or name.');return}
  try{
    const data=await apiGet('searchEmployees',{q});
    const first=(data.results||[])[0];
    if(!first){document.getElementById('generatePerson').innerHTML='<div class="hr-empty">Person not found.</div>';return}
    state.generatePerson={id:first['Employee ID'],name:first['Full Name'],designation:first['Designation']||''};
    renderGeneratePerson();
  }catch(e){toast('Unable to search employee register.')}
}
function resetAddForm(){document.getElementById('addEmployeeForm').reset();document.getElementById('empWorkLocation').value='Bhubaneswar';document.getElementById('photoPreview').innerHTML='<div class="hr-photo-placeholder">Profile / KYC Photo<br><small>JPG or PNG</small></div>';document.getElementById('photoName').textContent='No photo selected.';document.getElementById('kycFileList').innerHTML=''}
function openAddEmployee(){resetAddForm();openModal('addEmployeeModal')}
function openAddEmployeeWithData(){
  openAddEmployee();
  if(state.employee){
    const e=state.employee;
    document.getElementById('empFullName').value=e['Full Name']||'';
    document.getElementById('empOfficialEmail').value=e['Official Email']||'';
    document.getElementById('empPersonalEmail').value=e['Personal Email']||'';
    document.getElementById('empMobile').value=e['Mobile']||'';
    document.getElementById('empDepartment').value=e['Department']||'';
    document.getElementById('empDesignation').value=e['Designation']||'';
    document.getElementById('empManager').value=e['Reporting Manager']||'';
    document.getElementById('empJoiningDate').value=e['Joining Date']?new Date(e['Joining Date']).toISOString().slice(0,10):'';
    document.getElementById('empEmploymentType').value=e['Employment Type']||'Full Time';
    document.getElementById('empWorkMode').value=e['Work Mode']||'Office';
    document.getElementById('empWorkLocation').value=e['Work Location']||'Bhubaneswar';
    document.getElementById('empEmploymentStatus').value=e['Employment Status']||'Active';
    document.getElementById('empKycStatus').value=e['KYC Status']||'Pending';
  }
}
function renderDocumentsEmpty(){document.getElementById('documentsTable').innerHTML='<div class="hr-empty">Select an employee or intern to load the associated documents.</div>'}
async function loadPersonDocuments(){
  const q=document.getElementById('documentPerson').value.trim();
  if(!q){toast('Enter an Employee ID or person name.');return}
  try{
    const data=await apiGet('searchEmployees',{q});
    const first=(data.results||[])[0];
    if(!first){document.getElementById('documentsTable').innerHTML='<div class="hr-empty">Person not found.</div>';return}
    const profile=await apiGet('getEmployeeProfile',{employeeId:first['Employee ID']});
    const docs=profile.documents||[];
    document.getElementById('documentsTable').innerHTML=docs.length?`<div class="hr-filter-line"><div class="count">${docs.length} document(s) for ${esc(first['Full Name'])}</div></div><table class="hr-doc-table"><thead><tr><th>Type</th><th>Category</th><th>File</th><th>Status</th><th>Verification</th><th>Action</th></tr></thead><tbody>${docs.map(d=>`<tr><td>${esc(d['Document Type']||'—')}</td><td>${esc(d['Document Category']||'—')}</td><td>${esc(d['File Name']||'—')}</td><td>${esc(d['Document Status']||'—')}</td><td>${esc(d['Verification Status']||'—')}</td><td>${d['Google Drive URL']?`<a href="${esc(d['Google Drive URL'])}" target="_blank" rel="noopener">Open</a>`:'—'}</td></tr>`).join('')}</tbody></table>`:'<div class="hr-empty">No documents are recorded for this person.</div>';
  }catch(e){toast('Unable to load documents.')}
}

/* ---------- tasks ---------- */
async function loadTasks(){
  const target=document.getElementById('taskBoard');
  target.innerHTML='<div class="hr-empty"><span class="hr-loading">Loading tasks</span></div>';
  try{
    const data=await apiGet('listTasks',{});
    state.tasks=data.tasks||[];
    renderTasks(state.tasks);
    refreshTodayStrip();
  }catch(e){
    target.innerHTML='<div class="hr-empty">Tasks could not be loaded. Connect the backend in HR_BACKEND_URL to enable this.</div>';
  }
}
function renderTasks(tasks){
  const target=document.getElementById('taskBoard');
  const q=document.getElementById('taskSearch').value.trim().toLowerCase();
  const pr=document.getElementById('taskPriorityFilter').value;
  const filtered=tasks.filter(t=>(!q||`${t.title} ${t.assignee}`.toLowerCase().includes(q))&&(!pr||t.priority===pr));
  if(!filtered.length){target.innerHTML='<div class="hr-empty">No tasks yet. Use "+ Assign Task" to create the first one.</div>';return}
  const cols=[['To Do','To Do'],['In Progress','In Progress'],['Done','Done']];
  target.innerHTML=cols.map(([label,key])=>{
    const items=filtered.filter(t=>(t.status||'To Do')===key);
    return `<div class="hr-task-col"><h4>${esc(label)}<span>${items.length}</span></h4>${items.map(t=>{
      const overdue=key!=='Done'&&t.dueDate&&new Date(t.dueDate)<new Date(new Date().toDateString());
      const wa=waLink(t.mobile,`Hi ${t.assignee||''}, reminder from ORIGENNT HR: "${t.title}"${t.dueDate?` is due ${fmt(t.dueDate)}`:''}.`);
      return `<div class="hr-task-card">
        <div style="display:flex;justify-content:space-between;gap:8px"><strong>${esc(t.title)}</strong><span class="hr-priority ${esc(t.priority||'Medium')}">${esc(t.priority||'Medium')}</span></div>
        ${t.details?`<p>${esc(t.details)}</p>`:''}
        <div class="hr-task-meta ${overdue?'overdue':''}"><span class="who">${esc(t.assignee||'Unassigned')}</span><span class="due">${t.dueDate?`Due ${fmt(t.dueDate)}`:'No due date'}</span></div>
        <div class="hr-task-actions">
          <select data-task-id="${esc(t.id)}" class="task-status-select">
            <option value="To Do" ${key==='To Do'?'selected':''}>To Do</option>
            <option value="In Progress" ${key==='In Progress'?'selected':''}>In Progress</option>
            <option value="Done" ${key==='Done'?'selected':''}>Done</option>
          </select>
          ${wa?`<a class="hr-btn small wa" href="${wa}" target="_blank" rel="noopener">Remind on WhatsApp</a>`:''}
        </div>
      </div>`;
    }).join('')||'<div class="hr-empty" style="padding:14px">Nothing here.</div>'}</div>`;
  }).join('');
  target.querySelectorAll('.task-status-select').forEach(sel=>sel.addEventListener('change',()=>updateTaskStatus(sel.dataset.taskId,sel.value)));
}
async function updateTaskStatus(id,status){
  try{
    const out=await apiGet('updateTaskStatus',{id,status});
    if(!out.success)throw new Error(out.error||'Unable to update task');
    toast('Task updated.');
    await loadTasks();
  }catch(e){toast(e.message||'Unable to update task.')}
}
async function submitTask(e){
  e.preventDefault();
  const title=document.getElementById('taskTitle').value.trim();
  if(!title){toast('Task title is required.');return}
  const data={title,details:document.getElementById('taskDetails').value.trim(),assignee:document.getElementById('taskAssignee').value.trim(),mobile:document.getElementById('taskAssigneeMobile').value.trim(),priority:document.getElementById('taskPriority').value,dueDate:document.getElementById('taskDueDate').value,status:'To Do'};
  try{
    const out=await apiGet('addTask',{data:JSON.stringify(data)});
    if(!out.success)throw new Error(out.error||'Unable to create task');
    closeModal('addTaskModal');document.getElementById('addTaskForm').reset();
    toast('Task assigned.');
    await loadTasks();showView('tasks');
    loadRecentActivity();
  }catch(err){toast(err.message||'Unable to assign task.')}
}

/* ---------- training ---------- */
async function loadTraining(){
  const target=document.getElementById('trainingTable');
  target.innerHTML='<div class="hr-empty"><span class="hr-loading">Loading training records</span></div>';
  try{
    const data=await apiGet('listTraining',{});
    state.training=data.training||[];
    renderTraining(state.training);
  }catch(e){
    target.innerHTML='<div class="hr-empty">Training records could not be loaded. Connect the backend in HR_BACKEND_URL to enable this.</div>';
  }
}
function renderTraining(list){
  const target=document.getElementById('trainingTable');
  const q=document.getElementById('trainingSearch').value.trim().toLowerCase();
  const status=document.getElementById('trainingStatusFilter').value;
  const filtered=list.filter(t=>(!q||`${t.name} ${t.employees}`.toLowerCase().includes(q))&&(!status||t.status===status));
  if(!filtered.length){target.innerHTML='<div class="hr-empty">No training records yet. Use "+ Log Training" to add one.</div>';return}
  target.innerHTML=`<table class="hr-reg-table"><thead><tr><th>Programme</th><th>Type</th><th>Employee(s)</th><th>Dates</th><th>Status</th><th>Certificate</th></tr></thead><tbody>${filtered.map(t=>`<tr><td><strong>${esc(t.name)}</strong><br><span class="hr-muted">${esc(t.provider||'—')}</span></td><td>${esc(t.type||'—')}</td><td>${esc(t.employees||'—')}</td><td>${fmt(t.startDate)} &rarr; ${fmt(t.endDate)}</td><td><span class="hr-status ${t.status==='Completed'?'':t.status==='Lapsed'?'exit':'pending'}">${esc(t.status||'Scheduled')}</span></td><td>${t.certLink?`<a href="${esc(t.certLink)}" target="_blank" rel="noopener">Open</a>`:'—'}</td></tr>`).join('')}</tbody></table>`;
}
async function submitTraining(e){
  e.preventDefault();
  const name=document.getElementById('trainingName').value.trim();
  const employees=document.getElementById('trainingEmployees').value.trim();
  if(!name||!employees){toast('Programme name and employees are required.');return}
  const data={name,type:document.getElementById('trainingType').value,provider:document.getElementById('trainingProvider').value.trim(),employees,status:document.getElementById('trainingStatus').value,startDate:document.getElementById('trainingStart').value,endDate:document.getElementById('trainingEnd').value,certLink:document.getElementById('trainingCertLink').value.trim()};
  try{
    const out=await apiGet('addTraining',{data:JSON.stringify(data)});
    if(!out.success)throw new Error(out.error||'Unable to save training record');
    closeModal('addTrainingModal');document.getElementById('addTrainingForm').reset();
    toast('Training record saved.');
    await loadTraining();showView('training');
    loadRecentActivity();
  }catch(err){toast(err.message||'Unable to save training record.')}
}

/* ---------- MPR ---------- */
async function loadMpr(){
  const target=document.getElementById('mprTable');
  target.innerHTML='<div class="hr-empty"><span class="hr-loading">Loading MPRs</span></div>';
  try{
    const data=await apiGet('listMpr',{});
    state.mpr=data.mpr||[];
    renderMpr(state.mpr);
    refreshTodayStrip();
  }catch(e){
    target.innerHTML='<div class="hr-empty">MPRs could not be loaded. Connect the backend in HR_BACKEND_URL to enable this.</div>';
  }
}
function renderMpr(list){
  const target=document.getElementById('mprTable');
  const month=document.getElementById('mprMonthFilter').value;
  const status=document.getElementById('mprStatusFilter').value;
  const filtered=list.filter(m=>(!month||m.month===month)&&(!status||m.status===status));
  if(!filtered.length){target.innerHTML='<div class="hr-empty">No MPRs logged yet. Use "+ Log MPR" to compile the first one.</div>';return}
  target.innerHTML=`<table class="hr-reg-table"><thead><tr><th>Employee</th><th>Month</th><th>Achievements</th><th>Rating</th><th>Status</th></tr></thead><tbody>${filtered.map(m=>`<tr><td><strong>${esc(m.employee)}</strong></td><td>${esc(m.month)}</td><td>${esc((m.achievements||'').slice(0,120))}${(m.achievements||'').length>120?'…':''}</td><td>${m.rating?`${esc(m.rating)}/5`:'—'}</td><td><span class="hr-status ${m.status==='Approved'?'':m.status==='Draft'?'pending':'info'}">${esc(m.status||'Draft')}</span></td></tr>`).join('')}</tbody></table>`;
}
async function submitMpr(e){
  e.preventDefault();
  const employee=document.getElementById('mprEmployee').value.trim();
  const month=document.getElementById('mprMonth').value;
  const achievements=document.getElementById('mprAchievements').value.trim();
  if(!employee||!month||!achievements){toast('Employee, month and achievements are required.');return}
  const data={employee,month,achievements,targets:document.getElementById('mprTargets').value.trim(),rating:document.getElementById('mprRating').value,status:document.getElementById('mprStatus').value};
  try{
    const out=await apiGet('addMpr',{data:JSON.stringify(data)});
    if(!out.success)throw new Error(out.error||'Unable to save MPR');
    closeModal('addMprModal');document.getElementById('addMprForm').reset();
    toast('MPR saved.');
    await loadMpr();showView('mpr');
    loadRecentActivity();
  }catch(err){toast(err.message||'Unable to save MPR.')}
}

/* ---------- appointments ---------- */
async function loadAppointments(){
  const target=document.getElementById('appointmentsTable');
  target.innerHTML='<div class="hr-empty"><span class="hr-loading">Loading appointments</span></div>';
  try{
    const data=await apiGet('listAppointments',{});
    state.appointments=data.appointments||[];
    renderAppointments(state.appointments);
    refreshTodayStrip();
  }catch(e){
    target.innerHTML='<div class="hr-empty">Appointments could not be loaded. Connect the backend in HR_BACKEND_URL to enable this.</div>';
  }
}
function renderAppointments(list){
  const target=document.getElementById('appointmentsTable');
  if(!list.length){target.innerHTML='<div class="hr-empty">No appointments booked yet. Use "+ Book Appointment" to add one.</div>';return}
  const sorted=[...list].sort((a,b)=>new Date(`${a.date}T${a.startTime||'00:00'}`)-new Date(`${b.date}T${b.startTime||'00:00'}`));
  target.innerHTML=`<table class="hr-reg-table"><thead><tr><th>Title</th><th>With</th><th>Type</th><th>When</th><th>Calendar</th></tr></thead><tbody>${sorted.map(a=>`<tr><td><strong>${esc(a.title)}</strong>${a.location?`<br><span class="hr-muted">${esc(a.location)}</span>`:''}</td><td>${esc(a.with||'—')}</td><td>${esc(a.type||'—')}</td><td>${fmt(a.date)} &middot; ${esc(a.startTime||'')}${a.endTime?`&ndash;${esc(a.endTime)}`:''}</td><td><a href="${gcalLink(a)}" target="_blank" rel="noopener">Add to Google Calendar</a></td></tr>`).join('')}</tbody></table>`;
}
async function submitAppointment(e){
  e.preventDefault();
  const title=document.getElementById('apptTitle').value.trim();
  const date=document.getElementById('apptDate').value;
  const startTime=document.getElementById('apptStart').value;
  if(!title||!date||!startTime){toast('Title, date and start time are required.');return}
  const data={title,with:document.getElementById('apptWith').value.trim(),type:document.getElementById('apptType').value,date,startTime,endTime:document.getElementById('apptEnd').value,location:document.getElementById('apptLocation').value.trim(),notes:document.getElementById('apptNotes').value.trim()};
  try{
    const out=await apiGet('bookAppointment',{data:JSON.stringify(data)});
    if(!out.success)throw new Error(out.error||'Unable to book appointment');
    closeModal('addAppointmentModal');document.getElementById('addAppointmentForm').reset();
    toast(out.calendarEventUrl?'Appointment booked and added to Google Calendar.':'Appointment saved.');
    await loadAppointments();showView('appointments');
    loadRecentActivity();
  }catch(err){
    toast('Backend not connected — saving locally isn\'t possible yet. Use "Add to Google Calendar" on the appointment once listed, or connect HR_BACKEND_URL.');
  }
}

/* ---------- analytics ---------- */
const CHART_INSTANCES={};
function drawChart(id,config){
  if(typeof Chart==='undefined'){setTimeout(()=>drawChart(id,config),250);return}
  const el=document.getElementById(id);if(!el)return;
  if(CHART_INSTANCES[id])CHART_INSTANCES[id].destroy();
  CHART_INSTANCES[id]=new Chart(el,config);
}
function countBy(list,fn){const m={};list.forEach(x=>{const k=fn(x)||'—';m[k]=(m[k]||0)+1});return m}
function renderAnalytics(){
  const byDept=countBy(state.people,p=>p['Department']);
  drawChart('chartDept',{type:'bar',data:{labels:Object.keys(byDept),datasets:[{label:'People',data:Object.values(byDept),backgroundColor:'#C4102A'}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});

  const byType=countBy(state.people,p=>p['Employment Type']||'Unspecified');
  drawChart('chartEmpType',{type:'doughnut',data:{labels:Object.keys(byType),datasets:[{data:Object.values(byType),backgroundColor:['#1B1C1E','#C4102A','#215FA6','#1E7A46','#9A6400']}]}});

  const byTaskStatus=countBy(state.tasks,t=>t.status||'To Do');
  drawChart('chartTasks',{type:'bar',data:{labels:Object.keys(byTaskStatus),datasets:[{label:'Tasks',data:Object.values(byTaskStatus),backgroundColor:'#215FA6'}]},options:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{precision:0}}}}});

  const byRating=countBy(state.mpr.filter(m=>m.rating),m=>`${m.rating}/5`);
  drawChart('chartMpr',{type:'bar',data:{labels:Object.keys(byRating),datasets:[{label:'MPRs',data:Object.values(byRating),backgroundColor:'#1E7A46'}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}});

  const compRows=state.compliance.length?state.compliance:COMPLIANCE_RULES.map(r=>({...r,status:complianceStatus(nextOccurrence(r))}));
  const byComp=countBy(compRows,r=>r.status==='overdue'?'Overdue':r.status==='soon'?'Due soon':r.status==='ongoing'?'Ongoing':'On track');
  drawChart('chartCompliance',{type:'bar',data:{labels:Object.keys(byComp),datasets:[{label:'Filings',data:Object.values(byComp),backgroundColor:['#C4102A','#9A6400','#63666B','#1E7A46']}]},options:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{precision:0}}}}});
}

/* ---------- authentication + operations boot ---------- */
const AUTH_ALLOWED_DOMAIN='origennt.com';
let operationsBooted=false;

function parseJwt(token){
  try{return JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))}
  catch(e){return null}
}

function setAuthGate(visible){
  const gate=document.getElementById('authGate');
  if(gate)gate.style.display=visible?'grid':'none';
}

async function getServerSession(){
  try{
    const res=await fetch('/api/auth/session',{credentials:'include',cache:'no-store',headers:{Accept:'application/json'}});
    if(!res.ok)return null;
    const body=await res.json();
    if(!body||!body.authenticated)return null;
    state.userName=body.user?.name||body.name||body.user?.email||body.email||'HR';
    state.userEmail=body.user?.email||body.email||'';
    return body;
  }catch(e){return null}
}

async function onGoogleSignIn(resp){
  const payload=parseJwt(resp.credential);
  if(!payload||!payload.email||!String(payload.email).toLowerCase().endsWith('@'+AUTH_ALLOWED_DOMAIN)){
    toast('This Google account is not authorised for ORIGENNT HR.');
    return;
  }
  try{
    const res=await fetch('/api/auth/verify',{
      method:'POST',
      credentials:'include',
      headers:{'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({credential:resp.credential})
    });
    const body=await res.json().catch(()=>({}));
    if(!res.ok||body.success===false){
      throw new Error(body.error||'Sign-in verification failed.')
    }
    state.userName=body.name||payload.name||payload.email;
    state.userEmail=body.email||payload.email;
    sessionStorage.setItem('origennt_hr_last_user',JSON.stringify({email:state.userEmail,name:state.userName}));
    setAuthGate(false);
    await bootOperations();
  }catch(e){
    toast(e.message||'Unable to complete sign-in.');
  }
}

async function signOut(){
  try{await fetch('/api/auth/logout',{method:'POST',credentials:'include',cache:'no-store'})}catch(e){}
  sessionStorage.removeItem('origennt_hr_last_user');
  location.reload();
}

async function bootOperations(){
  if(operationsBooted)return;
  operationsBooted=true;
      renderCompliance();
  await Promise.allSettled([
    loadPeople(),
    loadRecentActivity(),
    loadTasks(),
    loadMpr(),
    loadAppointments()
  ]);
}

let inactivityTimer;
function resetInactivityTimer(){
  clearTimeout(inactivityTimer);
  inactivityTimer=setTimeout(()=>{toast('Session expired due to inactivity.');signOut()},1000*60*20)
}
['click','keydown','mousemove'].forEach(ev=>document.addEventListener(ev,resetInactivityTimer));

async function initialiseAccess(){
  const session=await getServerSession();
  if(session){
    setAuthGate(false);
    await bootOperations();
    return;
  }
  setAuthGate(true);
  try{
    if(typeof google!=='undefined'&&google.accounts){
      google.accounts.id.initialize({client_id:GOOGLE_CLIENT_ID,callback:onGoogleSignIn});
      google.accounts.id.renderButton(document.getElementById('gsiBtnHolder'),{theme:'filled_black',size:'large',text:'signin_with'});
    }
  }catch(e){/* GSI unavailable; auth gate remains visible */}
}
/* ---------- wiring ---------- */
document.getElementById('peopleSearch').addEventListener('input',()=>renderPeople(state.people));
document.getElementById('peopleStatus').addEventListener('change',()=>renderPeople(state.people));
document.getElementById('peopleDepartment').addEventListener('change',()=>renderPeople(state.people));
document.getElementById('peopleEmpType').addEventListener('change',()=>renderPeople(state.people));
document.getElementById('refreshPeople').addEventListener('click',loadPeople);

document.getElementById('addEmployeeBtn').addEventListener('click',openAddEmployee);
document.getElementById('addEmployeeBtn2').addEventListener('click',openAddEmployee);
document.getElementById('addEmployeeBtn2b').addEventListener('click',openAddEmployee);
document.getElementById('addEmployeeForm').addEventListener('submit',submitEmployee);
document.getElementById('employeePhoto').addEventListener('change',previewPhoto);
document.getElementById('kycFiles').addEventListener('change',showKycFiles);
document.querySelectorAll('[data-close-modal]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.closeModal)));
document.getElementById('closeProfile').addEventListener('click',()=>document.getElementById('employee-record').classList.add('hr-hidden'));

document.getElementById('generateBtn').addEventListener('click',()=>showView('generate'));
document.getElementById('loadGenerateEmployee').addEventListener('click',loadGeneratePerson);
document.getElementById('templateSearch').addEventListener('input',renderTemplates);
document.getElementById('generateDocumentAction').addEventListener('click',()=>{if(!state.generatePerson){toast('Select a person first.');return}if(!state.selectedTemplate){toast('Select a document template first.');return}toast('Template route is ready to connect to the document-generation backend.')});

document.getElementById('loadPersonDocuments').addEventListener('click',loadPersonDocuments);
document.getElementById('refreshActivity').addEventListener('click',loadRecentActivity);
document.getElementById('startExitBtn').addEventListener('click',()=>document.getElementById('exitEmployeeId').focus());
document.getElementById('saveExitBtn').addEventListener('click',()=>toast('Exit workflow UI is ready; the EMPLOYEE EXIT backend route connects next.'));
document.getElementById('addCandidateBtn').addEventListener('click',()=>toast('Candidate creation connects to the CANDIDATES backend module.'));
document.getElementById('candidateSearchBtn').addEventListener('click',()=>toast('Candidate search connects to the CANDIDATES backend module.'));

document.getElementById('addTaskBtn').addEventListener('click',()=>openModal('addTaskModal'));
document.getElementById('addTaskBtnHeader').addEventListener('click',()=>{showView('tasks');openModal('addTaskModal')});
document.getElementById('addTaskForm').addEventListener('submit',submitTask);
document.getElementById('taskSearch').addEventListener('input',()=>renderTasks(state.tasks));
document.getElementById('taskPriorityFilter').addEventListener('change',()=>renderTasks(state.tasks));
document.getElementById('refreshTasks').addEventListener('click',loadTasks);

document.getElementById('addTrainingBtn').addEventListener('click',()=>openModal('addTrainingModal'));
document.getElementById('addTrainingForm').addEventListener('submit',submitTraining);
document.getElementById('trainingSearch').addEventListener('input',()=>renderTraining(state.training));
document.getElementById('trainingStatusFilter').addEventListener('change',()=>renderTraining(state.training));
document.getElementById('refreshTraining').addEventListener('click',loadTraining);

document.getElementById('addMprBtn').addEventListener('click',()=>openModal('addMprModal'));
document.getElementById('addMprForm').addEventListener('submit',submitMpr);
document.getElementById('mprMonthFilter').addEventListener('change',()=>renderMpr(state.mpr));
document.getElementById('mprStatusFilter').addEventListener('change',()=>renderMpr(state.mpr));
document.getElementById('refreshMpr').addEventListener('click',loadMpr);

document.getElementById('addAppointmentBtn').addEventListener('click',()=>openModal('addAppointmentModal'));
document.getElementById('addAppointmentForm').addEventListener('submit',submitAppointment);
document.getElementById('refreshAppointments').addEventListener('click',loadAppointments);

document.querySelectorAll('.hr-nav button[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.getElementById('signOutBtn').addEventListener('click',signOut);
document.getElementById('sendWaDigestBtn').addEventListener('click',()=>window.open(`https://wa.me/?text=${encodeURIComponent(buildDailyDigestText())}`,'_blank'));
document.getElementById('refreshCompliance').addEventListener('click',renderCompliance);
document.getElementById('waComplianceBtn').addEventListener('click',waComplianceDigest);

setGreeting();
renderTemplates();
renderCompliance();
loadPeople();
loadRecentActivity();
loadTasks();
loadMpr();
loadAppointments();

window.addEventListener('load',initialiseAccess);
