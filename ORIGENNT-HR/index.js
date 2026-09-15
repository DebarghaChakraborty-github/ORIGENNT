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

function dayOfYear(d){
  const start=new Date(d.getFullYear(),0,0);
  return Math.floor((d-start)/864e5)
}

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
  const now=new Date();
  const y=now.getFullYear();
  const cands=[];

  if(rule.rule==='day'){
    for(const dy of[y,y+1]){
      for(let m=0;m<12;m++){
        cands.push(new Date(dy,m,rule.day));
      }
    }
  }else if(rule.rule==='fixed'){
    cands.push(
      new Date(y,rule.month-1,rule.day),
      new Date(y+1,rule.month-1,rule.day)
    );
  }else if(rule.rule==='halfyear'){
    for(const dy of[y,y+1]){
      cands.push(
        new Date(dy,rule.day1.month-1,rule.day1.day),
        new Date(dy,rule.day2.month-1,rule.day2.day)
      );
    }
  }else if(rule.rule==='lastday'){
    for(const dy of[y,y+1]){
      for(let m=0;m<12;m++){
        cands.push(new Date(dy,m+1,0));
      }
    }
  }else{
    return null
  }

  const future=cands
    .filter(d=>d>=new Date(now.toDateString()))
    .sort((a,b)=>a-b);

  return future[0]||null;
}

function complianceStatus(dueDate){
  if(!dueDate)return'ongoing';
  const days=Math.ceil(
    (dueDate-new Date(new Date().toDateString()))/864e5
  );

  if(days<0)return'overdue';
  if(days<=7)return'soon';
  return'ok';
}

function renderCompliance(){
  const target=document.getElementById('complianceTable');

  const rows=COMPLIANCE_RULES.map(r=>{
    const due=nextOccurrence(r);
    return{...r,due,status:complianceStatus(due)};
  });

  state.compliance=rows;

  rows.sort(
    (a,b)=>
      (a.due?a.due:new Date(8640000000000000))-
      (b.due?b.due:new Date(8640000000000000))
  );

  target.innerHTML=`
    <table class="compliance-table">
      <thead>
        <tr>
          <th>Filing</th>
          <th>Category</th>
          <th>Frequency</th>
          <th>Next Due</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(r=>`
          <tr>
            <td>
              <strong>${esc(r.name)}</strong><br>
              <span class="hr-muted">${esc(r.note)}</span>
            </td>
            <td class="comp-cat">${esc(r.cat)}</td>
            <td>${esc(r.freq)}</td>
            <td>${r.due?fmt(r.due):'Ongoing'}</td>
            <td>
              <span class="due-badge ${
                r.status==='overdue'
                  ?'overdue'
                  :r.status==='soon'
                    ?'soon'
                    :'ok'
              }">
                ${
                  r.status==='overdue'
                    ?'Overdue'
                    :r.status==='soon'
                      ?'Due soon'
                      :r.status==='ongoing'
                        ?'Ongoing'
                        :'On track'
                }
              </span>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  refreshTodayStrip();
}

function waComplianceDigest(){
  const due=state.compliance.filter(
    r=>r.status==='overdue'||r.status==='soon'
  );

  const lines=due
    .map(r=>`• ${r.name} — due ${r.due?fmt(r.due):'—'}`)
    .join('\n');

  const text=`ORIGENNT HR — Compliance items needing attention:\n${
    lines||'Nothing due in the next 7 days.'
  }`;

  window.open(
    `https://wa.me/?text=${encodeURIComponent(text)}`,
    '_blank'
  );
}

function buildDailyDigestText(){
  const today=new Date().toLocaleDateString(
    'en-IN',
    {
      weekday:'long',
      day:'2-digit',
      month:'long',
      year:'numeric'
    }
  );

  const tasksToday=state.tasks.filter(
    t=>t.status!=='Done'&&isToday(t.dueDate)
  );

  const overdueTasks=state.tasks.filter(
    t=>
      t.status!=='Done'&&
      t.dueDate&&
      new Date(t.dueDate)<new Date(new Date().toDateString())
  );

  const apptsToday=state.appointments.filter(
    a=>isToday(a.date)
  );

  const kycPending=state.people.filter(
    p=>String(p['KYC Status']||'').toLowerCase()==='pending'
  ).length;

  const compDue=state.compliance.filter(
    r=>r.status==='overdue'||r.status==='soon'
  );

  let t=`*ORIGENNT HR — Daily Digest*\n${today}\n\n`;

  t+=`*Tasks due today:* ${tasksToday.length}\n${
    tasksToday
      .map(x=>`• ${x.title} (${x.assignee||'Unassigned'})`)
      .join('\n')
  }\n\n`;

  t+=`*Overdue tasks:* ${overdueTasks.length}\n${
    overdueTasks
      .map(x=>`• ${x.title} (${x.assignee||'Unassigned'})`)
      .join('\n')
  }\n\n`;

  t+=`*Appointments today:* ${apptsToday.length}\n${
    apptsToday
      .map(x=>`• ${x.title} — ${x.startTime||''}`)
      .join('\n')
  }\n\n`;

  t+=`*Pending KYC:* ${kycPending}\n\n`;

  t+=`*Compliance due (≤7 days):*\n${
    compDue
      .map(x=>`• ${x.name} — ${x.due?fmt(x.due):''}`)
      .join('\n')||'None'
  }\n`;

  return t;
}

const TEMPLATES=[
['Training Certificate','Training'],
['Course Completion Certificate','Training'],
['Training Completion Certificate','Training'],
['Internship Certificate','Internship'],
['Internship Completion Certificate','Internship'],
['Internship Participation Certificate','Internship'],
['Internship Experience Certificate','Internship'],
['Employment Certificate','Employment'],
['Experience Certificate','Employment'],
['Work Experience Certificate','Employment'],
['Service Certificate','Employment'],
['Joining Certificate','Employment'],
['Employment Confirmation Certificate','Employment'],
['Probation Completion Certificate','Employment'],
['Employee Confirmation Letter','Letters'],
['Appointment Letter','Letters'],
['Offer Letter','Letters'],
['Employment Offer Letter','Letters'],
['Internship Offer Letter','Internship'],
['Internship Appointment Letter','Internship'],
['Joining Letter','Letters'],
['Engagement Letter','Letters'],
['Contract Letter','Letters'],
['Assignment Letter','Project'],
['Project Assignment Letter','Project'],
['Project Completion Certificate','Project'],
['Project Participation Certificate','Project'],
['Project Experience Certificate','Project'],
['Achievement Certificate','Recognition'],
['Appreciation Certificate','Recognition'],
['Recognition Certificate','Recognition'],
['Excellence Certificate','Recognition'],
['Merit Certificate','Recognition'],
['Performance Certificate','Performance'],
['Participation Certificate','Certificates'],
['Attendance Certificate','Training'],
['Training Attendance Certificate','Training'],
['Workshop Certificate','Training'],
['Workshop Participation Certificate','Training'],
['Seminar Certificate','Training'],
['Seminar Participation Certificate','Training'],
['Webinar Certificate','Training'],
['Webinar Participation Certificate','Training'],
['Event Participation Certificate','Events'],
['Event Completion Certificate','Events'],
['Bootcamp Certificate','Training'],
['Bootcamp Completion Certificate','Training'],
['Masterclass Certificate','Training'],
['Masterclass Completion Certificate','Training'],
['Course Certificate','Training'],
['Course Participation Certificate','Training'],
['Skill Certificate','Assessment'],
['Skill Assessment Certificate','Assessment'],
['Skill Verification Certificate','Verification'],
['Competency Certificate','Assessment'],
['Competency Assessment Certificate','Assessment'],
['Credential Certificate','Credential'],
['Professional Credential','Credential'],
['Digital Credential','Credential'],
['Credential Verification Letter','Verification'],
['Certificate of Completion','Certificates'],
['Certificate of Achievement','Certificates'],
['Certificate of Recognition','Certificates'],
['Certificate of Participation','Certificates'],
['Certificate of Appreciation','Certificates'],
['Certificate of Merit','Certificates'],
['Certificate of Excellence','Certificates'],
['Certificate of Attendance','Certificates'],
['Letter of Completion','Letters'],
['Letter of Participation','Letters'],
['Letter of Appreciation','Letters'],
['Letter of Recommendation','Letters'],
['Recommendation Letter','Letters'],
['Reference Letter','Letters'],
['Professional Reference Letter','Letters'],
['Experience Letter','Employment'],
['Employment Letter','Employment'],
['Relieving Letter','Exit'],
['Release Letter','Exit'],
['Termination Letter','Exit'],
['Resignation Acceptance Letter','Exit'],
['No Objection Certificate','Exit'],
['NOC','Exit'],
['Salary Certificate','Verification'],
['Salary Verification Letter','Verification'],
['Compensation Certificate','Verification'],
['Income Certificate','Verification'],
['Employment Verification Letter','Verification'],
['Employment Verification Certificate','Verification'],
['Internship Verification Letter','Verification'],
['Internship Verification Certificate','Verification'],
['Training Verification Letter','Verification'],
['Training Verification Certificate','Verification'],
['Document Verification Letter','Verification'],
['Background Verification Letter','Verification'],
['Character Certificate','Verification'],
['Conduct Certificate','Verification'],
['Good Standing Certificate','Verification'],
['Identity Verification Letter','Verification'],
['KYC Confirmation Letter','KYC'],
['KYC Verification Certificate','KYC'],
['Onboarding Completion Certificate','Onboarding'],
['Onboarding Confirmation Letter','Onboarding'],
['Offboarding Confirmation Letter','Exit'],
['Exit Clearance Certificate','Exit'],
['Full and Final Settlement Letter','Exit'],
['Policy Acknowledgement','Compliance'],
['NDA / Confidentiality Agreement','Compliance'],
['Declaration Form','Compliance'],
['Undertaking','Compliance'],
['Consent Form','Compliance'],
['Authorization Letter','Letters'],
['Acknowledgement Letter','Letters'],
['Confirmation Letter','Letters'],
['Approval Letter','Letters'],
['Acceptance Letter','Letters'],
['Appointment Confirmation','Employment'],
['Registration Confirmation','Confirmation'],
['Enrollment Confirmation','Confirmation'],
['Training Enrollment Confirmation','Training'],
['Course Enrollment Confirmation','Training'],
['Service Order Confirmation','Client'],
['Service Completion Certificate','Client'],
['Service Delivery Certificate','Client'],
['Service Engagement Letter','Client'],
['Consulting Engagement Letter','Client'],
['Consulting Completion Certificate','Client'],
['Advisory Engagement Letter','Client'],
['Advisory Completion Certificate','Client'],
['Project Engagement Letter','Client'],
['Project Closure Certificate','Client'],
['Client Completion Certificate','Client'],
['Client Appreciation Certificate','Client'],
['Client Recommendation Letter','Client'],
['Client Reference Letter','Client'],
['Client Verification Letter','Client'],
['B2B Service Certificate','Client'],
['B2B Completion Certificate','Client'],
['B2C Service Certificate','Client'],
['B2C Completion Certificate','Client'],
['Career Service Certificate','Career Services'],
['Career Counselling Completion Certificate','Career Services'],
['Resume Service Completion Certificate','Career Services'],
['LinkedIn Optimization Completion Certificate','Career Services'],
['Interview Preparation Completion Certificate','Career Services'],
['Career Assessment Certificate','Career Services'],
['Placement Assistance Certificate','Career Services'],
['Recruitment Service Completion Certificate','Recruitment'],
['Recruitment Engagement Letter','Recruitment'],
['Candidate Assessment Report','Reports'],
['Candidate Evaluation Report','Reports'],
['Training Assessment Report','Reports'],
['Training Completion Report','Reports'],
['Performance Evaluation Report','Reports'],
['Skill Assessment Report','Reports'],
['Service Completion Report','Reports'],
['Project Completion Report','Reports'],
['Consulting Report','Reports'],
['Advisory Report','Reports'],
['Assessment Report','Reports'],
['Verification Report','Reports'],
['Audit Report','Compliance'],
['Compliance Certificate','Compliance'],
['Compliance Confirmation Letter','Compliance'],
['Compliance Verification Certificate','Compliance'],
['Quality Certificate','Compliance'],
['Quality Assurance Certificate','Compliance'],
['Custom Certificate','Custom'],
['Custom Letter','Custom'],
['Custom Formal Document','Custom'],
['Other','Custom']
];

/* ---------- helpers ---------- */
function toast(message){
  const el=document.getElementById('hrToast');
  el.textContent=message;
  el.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast=setTimeout(
    ()=>el.classList.remove('show'),
    2800
  )
}

function esc(v){
  return String(v??'').replace(
    /[&<>"']/g,
    c=>({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[c])
  )
}

function initials(name){
  return (name||'Employee')
    .split(' ')
    .slice(0,2)
    .map(x=>x[0]||'')
    .join('')
    .toUpperCase()
}

function fmt(v){
  if(!v)return'—';
  const d=new Date(v);
  return Number.isNaN(d.getTime())
    ?String(v)
    :d.toLocaleDateString(
      'en-IN',
      {
        day:'2-digit',
        month:'short',
        year:'numeric'
      }
    )
}

function fmtDateTime(v){
  if(!v)return'—';
  const d=new Date(v);
  return Number.isNaN(d.getTime())
    ?String(v)
    :d.toLocaleString(
      'en-IN',
      {
        day:'2-digit',
        month:'short',
        year:'numeric',
        hour:'2-digit',
        minute:'2-digit'
      }
    )
}

function isToday(v){
  if(!v)return false;
  const d=new Date(v);
  const t=new Date();

  return d.getFullYear()===t.getFullYear()&&
    d.getMonth()===t.getMonth()&&
    d.getDate()===t.getDate()
}

function waLink(mobile,message){
  const digits=String(mobile||'').replace(/[^\d]/g,'');
  if(!digits)return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

function gcalLink(appt){
  const pad=n=>String(n).padStart(2,'0');

  const start=new Date(
    `${appt.date}T${appt.startTime||'09:00'}`
  );

  const end=appt.endTime
    ?new Date(`${appt.date}T${appt.endTime}`)
    :new Date(start.getTime()+60*60*1000);

  const fmt2=d=>
    `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;

  const params=new URLSearchParams({
    action:'TEMPLATE',
    text:appt.title||'Appointment',
    dates:`${fmt2(start)}/${fmt2(end)}`,
    details:appt.notes||'',
    location:appt.location||''
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

async function apiGet(action,params={}){
  const q=new URLSearchParams({
    action,
    ...params
  });

  const res=await fetch(
    `${HR_BACKEND_URL}?${q.toString()}`,
    {
      credentials:'include',
      headers:{
        Accept:'application/json'
      },
      cache:'no-store'
    }
  );

  let body=null;

  try{
    body=await res.json()
  }catch(e){}

  if(!res.ok){
    const message=
      body&&body.error
        ?body.error
        :`Backend returned ${res.status}`;

    throw new Error(message)
  }

  return body||{}
}

/* ---------- view switching ---------- */
function showView(view){
  document.querySelectorAll('[id^="view-"]')
    .forEach(el=>el.classList.add('hr-hidden'));

  const t=document.getElementById('view-'+view);

  if(t)t.classList.remove('hr-hidden');

  document.querySelectorAll('.hr-nav button[data-view]')
    .forEach(
      b=>b.classList.toggle(
        'active',
        b.dataset.view===view
      )
    );

  state.currentView=view;

  if(view==='dashboard')loadPeople();
  if(view==='activity')loadRecentActivity();
  if(view==='people')loadPeople();
  if(view==='tasks')loadTasks();
  if(view==='training')loadTraining();
  if(view==='mpr')loadMpr();
  if(view==='appointments')loadAppointments();
  if(view==='compliance')renderCompliance();
  if(view==='analytics')renderAnalytics();
}

document.querySelectorAll('[data-view-link]')
  .forEach(
    el=>
      el.addEventListener(
        'click',
        ()=>showView(el.dataset.viewLink)
      )
  );

function setGreeting(){
  const now=new Date();

  document.getElementById('heroDay').textContent=
    now.toLocaleDateString(
      'en-IN',
      {
        weekday:'long',
        day:'2-digit',
        month:'long',
        year:'numeric'
      }
    );

  const h=now.getHours();
  const name=(state.userName||'').split(' ')[0];
  const base=
    h<12
      ?'Good morning'
      :h<17
        ?'Good afternoon'
        :'Good evening';

  document.getElementById('todayGreet').textContent=
    name?`${base}, ${name}`:base;

  renderDailyQuote();
}

function refreshTodayStrip(){
  document.getElementById('todayTasksDue').textContent=
    state.tasks.filter(
      t=>t.status!=='Done'&&isToday(t.dueDate)
    ).length;

  document.getElementById('todayAppointments').textContent=
    state.appointments.filter(
      a=>isToday(a.date)
    ).length;

  document.getElementById('todayPendingKyc').textContent=
    state.people.filter(
      p=>String(p['KYC Status']||'').toLowerCase()==='pending'
    ).length;

  const month=new Date().toISOString().slice(0,7);

  document.getElementById('todayMprDue').textContent=
    state.mpr.filter(
      m=>m.month===month&&m.status!=='Approved'
    ).length;

  const overdueTasks=state.tasks.filter(
    t=>
      t.status!=='Done'&&
      t.dueDate&&
      new Date(t.dueDate)<new Date(new Date().toDateString())
  );

  document.getElementById('metricOverdueTasks').textContent=
    overdueTasks.length;

  const compDue=(state.compliance||[]).filter(
    r=>r.status==='overdue'||r.status==='soon'
  );

  const compOverdue=(state.compliance||[]).filter(
    r=>r.status==='overdue'
  );

  const elTCD=document.getElementById('todayComplianceDue');

  if(elTCD)elTCD.textContent=compDue.length;

  const elMCO=document.getElementById('metricComplianceOverdue');

  if(elMCO)elMCO.textContent=compOverdue.length;

  const interns=state.people.filter(
    p=>
      String(p['Employment Type']||'').toLowerCase()==='intern'&&
      String(p['Employment Status']||'').toLowerCase()==='active'
  );

  const elIQ=document.getElementById('metricInternsQuick');

  if(elIQ)elIQ.textContent=interns.length;

  const elHH=document.getElementById('heroHeadcount');

  if(elHH)elHH.textContent=state.people.length;

  const elHC=document.getElementById('heroCompliance');

  if(elHC)elHC.textContent=COMPLIANCE_RULES.length;

  const elHD=document.getElementById('heroDocs');

  if(elHD)elHD.textContent=TEMPLATES.length+'+';
}

/* ---------- dashboard metrics ---------- */
function updateMetrics(people){
  const active=people.filter(
    p=>String(p['Employment Status']||'').toLowerCase()==='active'
  ).length;

  const interns=people.filter(
    p=>String(p['Employment Type']||'').toLowerCase()==='intern'
  ).length;

  const kyc=people.filter(
    p=>String(p['KYC Status']||'').toLowerCase()==='pending'
  ).length;

  const notice=people.filter(
    p=>String(p['Employment Status']||'').toLowerCase()==='on notice'
  ).length;

  const exited=people.filter(
    p=>String(p['Employment Status']||'').toLowerCase()==='exited'
  ).length;

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

  if(!items.length){
    target.innerHTML='<div class="hr-empty">No activity recorded yet.</div>';
    return
  }

  const offset=ACTIVITY_STORE.length;
  ACTIVITY_STORE=ACTIVITY_STORE.concat(items);

  target.innerHTML=`
    <div class="hr-activity-list">
      ${items.map(
        (a,i)=>`
          <div
            class="hr-activity-item"
            data-activity-idx="${offset+i}"
          >
            <div class="hr-dot">&bull;</div>
            <div>
              <strong>${esc(a['Action Type']||a.title||a.type||'Activity')}</strong>
              <span>${esc(a['Description']||a.summary||a.detail||'')}</span>
            </div>
            <div class="hr-date">${fmtDateTime(a['Timestamp']||a.timestamp||a.date)}</div>
          </div>
        `
      ).join('')}
    </div>`;

  target
    .querySelectorAll('[data-activity-idx]')
    .forEach(
      el=>
        el.addEventListener(
          'click',
          ()=>openActivityDetail(
            Number(el.dataset.activityIdx)
          )
        )
    );
}

function openActivityDetail(idx){
  const a=ACTIVITY_STORE[idx];

  if(!a)return;

  const rows=Object
    .entries(a)
    .filter(([k,v])=>v!==''&&v!==undefined)
    .map(
      ([k,v])=>
        `<div class="audit-kv">
          <b>${esc(k)}</b>
          <span>${esc(v)}</span>
        </div>`
    )
    .join('');

  document.getElementById('activityDetailBody').innerHTML=
    rows||'<div class="hr-empty">No further detail on this record.</div>';

  openModal('activityDetailModal');
}

async function loadRecentActivity(){
  try{
    const data=await apiGet(
      'getRecentActivity',
      {limit:25}
    );

    ACTIVITY_STORE=[];

    renderActivities(
      data.activities||[],
      'dashboardActivity'
    );

    renderActivities(
      data.activities||[],
      'activityTable'
    );
  }catch(e){
    document.getElementById('dashboardActivity').innerHTML=
      '<div class="hr-empty">Activity could not be loaded.</div>';

    document.getElementById('activityTable').innerHTML=
      '<div class="hr-empty">Activity could not be loaded.</div>';
  }
}

/* ---------- people ---------- */
async function loadPeople(){
  try{
    const data=await apiGet('listPeople');

    state.people=data.people||data.employees||[];

    updateMetrics(state.people);

    renderPeople(state.people);
  }catch(e){
    document.getElementById('peopleResults').innerHTML=
      `<div class="hr-empty">${esc(e.message||'People could not be loaded.')}</div>`;

    updateMetrics([]);
  }
}

function renderPeople(people){
  const target=document.getElementById('peopleResults');

  const status=document.getElementById('peopleStatus').value.toLowerCase();
  const dept=document.getElementById('peopleDepartment').value.toLowerCase();
  const etype=document.getElementById('peopleEmpType').value.toLowerCase();
  const q=document.getElementById('peopleSearch').value.trim().toLowerCase();

  const filtered=people.filter(e=>{
    const hit=
      !q||
      Object.values(e).some(
        v=>String(v??'').toLowerCase().includes(q)
      );

    const hs=
      !status||
      String(e['Employment Status']||'').toLowerCase()===status;

    const hd=
      !dept||
      String(e['Department']||'').toLowerCase()===dept;

    const het=
      !etype||
      String(e['Employment Type']||'').toLowerCase()===etype;

    return hit&&hs&&hd&&het;
  });

  document.getElementById('peopleCount').textContent=
    `${filtered.length} person${filtered.length===1?'':'s'} shown`;

  if(!filtered.length){
    target.innerHTML=
      '<div class="hr-empty">No matching person record found.</div>';
    return
  }

  target.innerHTML=filtered.map(
    emp=>`
      <div class="hr-result">
        <div class="hr-avatar-sm">
          ${
            emp['Photo URL']
              ?`<img
                  src="${esc(emp['Photo URL'])}"
                  alt="${esc(emp['Full Name']||'Person')} photo"
                  loading="lazy"
                  onerror="this.parentElement.innerHTML='<span>${esc(initials(emp['Full Name']))}</span>'"
                >`
              :`<span>${esc(initials(emp['Full Name']))}</span>`
          }
        </div>

        <div>
          <strong>${esc(emp['Full Name']||'—')}</strong><br>
          <span>${esc(emp['Employee ID']||'—')}</span>
        </div>

        <div>
          <strong>${esc(emp['Designation']||'—')}</strong><br>
          <span>${esc(emp['Department']||'—')}</span>
        </div>

        <div>
          <span>${esc(emp['Reporting Manager']||'—')}</span><br>
          <span>${esc(emp['KYC Status']||'Pending')} KYC</span>
        </div>

        <div>
          <span class="hr-status ${
            String(emp['Employment Status']||'')
              .toLowerCase()
              .includes('exit')
              ?'exit'
              :''
          }">
            ${esc(emp['Employment Status']||'Active')}
          </span><br>
          <button
            class="hr-link-btn"
            type="button"
            data-employee-id="${esc(emp['Employee ID']||'')}"
          >
            Open Record
          </button>
        </div>
      </div>
    `
  ).join('');

  target
    .querySelectorAll('[data-employee-id]')
    .forEach(
      b=>
        b.addEventListener(
          'click',
          ()=>loadProfile(b.dataset.employeeId)
        )
    );
}

/* ---------- profile ---------- */
async function loadProfile(employeeId){
  const section=document.getElementById('employee-record');

  section.classList.remove('hr-hidden');

  document.getElementById('employeeProfile').innerHTML=
    '<div class="hr-empty"><span class="hr-loading">Loading employee record</span></div>';

  try{
    const data=await apiGet(
      'getEmployeeProfile',
      {employeeId}
    );

    state.employee=data.employee||data;

    renderProfile(data);

    section.scrollIntoView({
      behavior:'smooth',
      block:'start'
    });
  }catch(e){
    document.getElementById('employeeProfile').innerHTML=
      '<div class="hr-empty">Employee record could not be loaded.</div>';

    toast('Unable to load employee record.');
  }
}

function renderProfile(data){
  const e=data.employee||data;

  const photo=e['Photo URL']
    ?`<img src="${esc(e['Photo URL'])}" alt="${esc(e['Full Name'])}">`
    :esc(initials(e['Full Name']));

  document.getElementById('employeeProfile').innerHTML=`
    <div class="hr-profile">

      <div class="card hr-profile-main">
        <div class="hr-profile-id">
          <div style="display:flex;gap:14px;align-items:center">
            <div class="hr-avatar-lg">${photo}</div>
            <div>
              <h2 class="hr-name">${esc(e['Full Name']||'—')}</h2>
              <p class="hr-muted">
                ${esc(e['Employee ID']||'—')}
                &middot;
                ${esc(e['Designation']||'—')}
              </p>
            </div>
          </div>

          <span class="hr-status ${
            String(e['Employment Status']||'')
              .toLowerCase()
              .includes('exit')
              ?'exit'
              :''
          }">
            ${esc(e['Employment Status']||'Active')}
          </span>
        </div>

        <div class="hr-data-grid">

          <div class="hr-data">
            <div class="k">Department</div>
            <div class="v">${esc(e['Department']||'—')}</div>
          </div>

          <div class="hr-data">
            <div class="k">Reporting Manager</div>
            <div class="v">${esc(e['Reporting Manager']||'—')}</div>
          </div>

          <div class="hr-data">
            <div class="k">Joining Date</div>
            <div class="v">${fmt(e['Joining Date'])}</div>
          </div>

          <div class="hr-data">
            <div class="k">Employment Type</div>
            <div class="v">${esc(e['Employment Type']||'—')}</div>
          </div>

          <div class="hr-data">
            <div class="k">Work Mode</div>
            <div class="v">${esc(e['Work Mode']||'—')}</div>
          </div>

          <div class="hr-data">
            <div class="k">Work Location</div>
            <div class="v">${esc(e['Work Location']||'—')}</div>
          </div>

          <div class="hr-data">
            <div class="k">Official Email</div>
            <div class="v">${esc(e['Official Email']||'—')}</div>
          </div>

          <div class="hr-data">
            <div class="k">Mobile</div>
            <div class="v">${esc(e['Mobile']||'—')}</div>
          </div>

          <div class="hr-data">
            <div class="k">KYC Status</div>
            <div class="v">${esc(e['KYC Status']||'Pending')}</div>
          </div>

        </div>
      </div>

      <div class="card hr-profile-side">
        <h4>Actions</h4>

        <div class="hr-action-list">

          <button
            type="button"
            onclick="openAddEmployeeWithData()"
          >
            Edit person record
          </button>

          <button
            type="button"
            onclick="document.getElementById('generateEmployee').value='${esc(e['Employee ID']||'')}';showView('generate');loadGeneratePerson()"
          >
            Generate document
          </button>

          <button
            type="button"
            onclick="document.getElementById('documentPerson').value='${esc(e['Employee ID']||'')}';showView('documents');loadPersonDocuments()"
          >
            View documents
          </button>

          ${
            e['Mobile']
              ?`<a
                  class="hr-btn wa"
                  style="text-align:center;text-decoration:none"
                  href="${waLink(
                    e['Mobile'],
                    `Hi ${e['Full Name']||''}, following up from ORIGENNT HR.`
                  )}"
                  target="_blank"
                  rel="noopener"
                >
                  Message on WhatsApp
                </a>`
              :''
          }

        </div>

        ${
          String(e['Employment Type']||'').toLowerCase()==='intern'
            ?`
              <h4 style="margin-top:18px">Intern Track</h4>

              <div
                class="hr-lifecycle"
                style="grid-template-columns:repeat(3,1fr)"
              >
                <div class="hr-stage current">
                  <strong>Assigned</strong>
                  <span>Mentor &amp; project</span>
                </div>

                <div class="hr-stage">
                  <strong>Progress</strong>
                  <span>Milestones</span>
                </div>

                <div class="hr-stage">
                  <strong>Certified</strong>
                  <span>Completion</span>
                </div>
              </div>

              <div
                class="hr-form-grid"
                style="grid-template-columns:1fr;margin-top:12px"
              >
                <div class="hr-form-field">
                  <label>Mentor / Project</label>
                  <input
                    id="internMentorInline"
                    placeholder="Mentor name — project"
                  >
                </div>

                <div class="hr-form-field">
                  <label>Progress Status</label>
                  <select id="internStatusInline">
                    <option>In Progress</option>
                    <option>Evaluation</option>
                    <option>Completed</option>
                    <option>Certified</option>
                  </select>
                </div>

                <div class="hr-form-field">
                  <label>Remarks</label>
                  <textarea
                    id="internRemarksInline"
                    placeholder="Milestone notes"
                  ></textarea>
                </div>

                <button
                  class="hr-btn primary small"
                  type="button"
                  onclick="saveInternInline('${esc(e['Employee ID']||'')}')"
                >
                  Save Intern Update
                </button>
              </div>
            `
            :''
        }

      </div>
    </div>`;
}

async function saveInternInline(employeeId){
  const data={
    employeeId,
    mentorProject:document.getElementById('internMentorInline').value.trim(),
    status:document.getElementById('internStatusInline').value,
    remarks:document.getElementById('internRemarksInline').value.trim()
  };

  try{
    const out=await apiGet(
      'addInternProgress',
      {data:JSON.stringify(data)}
    );

    if(!out.success)throw new Error(
      out.error||'Unable to save'
    );

    toast('Intern progress saved.');

    loadRecentActivity();
  }catch(err){
    toast(
      err.message||
      'Intern progress route connects to the INTERN PROGRESS sheet once deployed.'
    )
  }
}

/* ---------- add / edit person ---------- */
function openModal(id){
  document.getElementById(id).classList.add('open')
}

function closeModal(id){
  document.getElementById(id).classList.remove('open')
}

function previewPhoto(){
  const f=document.getElementById('employeePhoto').files[0];

  const box=document.getElementById('photoPreview');

  document.getElementById('photoName').textContent=
    f?f.name:'No photo selected.';

  if(f){
    const r=new FileReader();

    r.onload=e=>
      box.innerHTML=
        `<img src="${e.target.result}" alt="Profile photo preview">`;

    r.readAsDataURL(f);
  }else{
    box.innerHTML=
      '<div class="hr-photo-placeholder">Profile / KYC Photo<br><small>JPG or PNG</small></div>'
  }
}

function showKycFiles(){
  const files=[
    ...document.getElementById('kycFiles').files
  ];

  document.getElementById('kycFileList').innerHTML=
    files
      .map(
        f=>
          `<div class="hr-file">
            <span>${esc(f.name)}</span>
            <small>${Math.round(f.size/1024)} KB</small>
          </div>`
      )
      .join('')
      ||'';
}

async function submitEmployee(e){
  e.preventDefault();

  const fullName=
    document.getElementById('empFullName').value.trim();

  if(!fullName){
    toast('Full name is required.');
    return
  }

  const data={
    fullName,
    officialEmail:
      document.getElementById('empOfficialEmail').value.trim(),
    personalEmail:
      document.getElementById('empPersonalEmail').value.trim(),
    mobile:
      document.getElementById('empMobile').value.trim(),
    department:
      document.getElementById('empDepartment').value.trim(),
    designation:
      document.getElementById('empDesignation').value.trim(),
    reportingManager:
      document.getElementById('empManager').value.trim(),
    joiningDate:
      document.getElementById('empJoiningDate').value,
    employmentType:
      document.getElementById('empEmploymentType').value,
    workMode:
      document.getElementById('empWorkMode').value,
    workLocation:
      document.getElementById('empWorkLocation').value.trim(),
    employmentStatus:
      document.getElementById('empEmploymentStatus').value,
    kycStatus:
      document.getElementById('empKycStatus').value
  };

  try{
    const out=await apiGet(
      'addEmployee',
      {data:JSON.stringify(data)}
    );

    if(!out.success){
      throw new Error(
        out.error||'Unable to create employee'
      );
    }

    closeModal('addEmployeeModal');

    document.getElementById('addEmployeeForm').reset();

    toast(
      `Person created — ${out.employeeId||'record saved'}`
    );

    await loadPeople();
    await loadRecentActivity();
  }catch(err){
    toast(
      err.message||'Unable to create person record.'
    );
  }
}

function openAddEmployee(){
  state.employee=null;

  document.getElementById('addEmployeeForm').reset();

  openModal('addEmployeeModal');
}

function openAddEmployeeWithData(){
  const e=state.employee;

  if(!e){
    openAddEmployee();
    return
  }

  document.getElementById('empFullName').value=e['Full Name']||'';
  document.getElementById('empOfficialEmail').value=e['Official Email']||'';
  document.getElementById('empPersonalEmail').value=e['Personal Email']||'';
  document.getElementById('empMobile').value=e['Mobile']||'';
  document.getElementById('empDepartment').value=e['Department']||'';
  document.getElementById('empDesignation').value=e['Designation']||'';
  document.getElementById('empManager').value=e['Reporting Manager']||'';
  document.getElementById('empJoiningDate').value=e['Joining Date']||'';
  document.getElementById('empEmploymentType').value=e['Employment Type']||'Full Time';
  document.getElementById('empWorkMode').value=e['Work Mode']||'Office';
  document.getElementById('empWorkLocation').value=e['Work Location']||'';
  document.getElementById('empEmploymentStatus').value=e['Employment Status']||'Active';
  document.getElementById('empKycStatus').value=e['KYC Status']||'Pending';

  openModal('addEmployeeModal');
}

/* ---------- tasks ---------- */
async function loadTasks(){
  const target=document.getElementById('taskBoard');

  target.innerHTML=
    '<div class="hr-empty"><span class="hr-loading">Loading tasks</span></div>';

  try{
    const data=await apiGet('listTasks',{});

    state.tasks=data.tasks||[];

    renderTasks(state.tasks);

    refreshTodayStrip();
  }catch(e){
    target.innerHTML=
      '<div class="hr-empty">Tasks could not be loaded. Connect the backend in HR_BACKEND_URL to enable this.</div>';
  }
}

function renderTasks(tasks){
  const target=document.getElementById('taskBoard');

  const q=
    document.getElementById('taskSearch').value
      .trim()
      .toLowerCase();

  const pr=
    document.getElementById('taskPriorityFilter').value;

  const filtered=tasks.filter(
    t=>
      (
        !q||
        `${t.title} ${t.assignee}`
          .toLowerCase()
          .includes(q)
      )&&
      (!pr||t.priority===pr)
  );

  if(!filtered.length){
    target.innerHTML=
      '<div class="hr-empty">No tasks yet. Use "+ Assign Task" to create the first one.</div>';
    return
  }

  const cols=[
    ['To Do','To Do'],
    ['In Progress','In Progress'],
    ['Done','Done']
  ];

  target.innerHTML=cols.map(
    ([key,label])=>{
      const rows=filtered.filter(
        t=>t.status===key
      );

      return `
        <div class="task-col">
          <div class="task-col-head">
            <strong>${label}</strong>
            <span>${rows.length}</span>
          </div>

          <div class="task-list">
            ${
              rows.length
                ?rows.map(
                  t=>`
                    <div class="task-card">

                      <div class="task-card-top">
                        <strong>${esc(t.title||'Untitled')}</strong>
                        <span class="task-priority ${
                          String(t.priority||'Medium')
                            .toLowerCase()
                        }">
                          ${esc(t.priority||'Medium')}
                        </span>
                      </div>

                      <div class="task-card-meta">
                        <span>${esc(t.assignee||'Unassigned')}</span>
                        <span>${t.dueDate?fmt(t.dueDate):'No due date'}</span>
                      </div>

                      <div class="task-card-actions">
                        ${
                          key!=='To Do'
                            ?`<button type="button" data-task-id="${esc(t.id)}" data-task-status="To Do">To Do</button>`
                            :''
                        }
                        ${
                          key!=='In Progress'
                            ?`<button type="button" data-task-id="${esc(t.id)}" data-task-status="In Progress">In Progress</button>`
                            :''
                        }
                        ${
                          key!=='Done'
                            ?`<button type="button" data-task-id="${esc(t.id)}" data-task-status="Done">Done</button>`
                            :''
                        }
                      </div>

                    </div>`
                ).join('')
                :'<div class="hr-empty">No tasks</div>'
            }
          </div>
        </div>
      `
    }
  ).join('');

  target
    .querySelectorAll('[data-task-id]')
    .forEach(
      btn=>
        btn.addEventListener(
          'click',
          ()=>updateTaskStatus(
            btn.dataset.taskId,
            btn.dataset.taskStatus
          )
        )
    );
}

async function submitTask(e){
  e.preventDefault();

  const data={
    title:document.getElementById('taskTitle').value.trim(),
    details:document.getElementById('taskDetails').value.trim(),
    category:document.getElementById('taskCategory').value,
    type:document.getElementById('taskType').value,
    assignee:document.getElementById('taskAssignee').value.trim(),
    relatedPersonId:document.getElementById('taskPersonId').value.trim(),
    priority:document.getElementById('taskPriority').value,
    dueDate:document.getElementById('taskDueDate').value,
    recurrence:document.getElementById('taskRecurrence').value,
    status:'To Do',
    source:'Manual'
  };

  try{
    const out=await apiGet(
      'addTask',
      {data:JSON.stringify(data)}
    );

    if(!out.success){
      throw new Error(
        out.error||'Unable to create task'
      );
    }

    closeModal('addTaskModal');

    document.getElementById('addTaskForm').reset();

    toast(
      out.duplicate
        ?'Existing task found.'
        :'Task created.'
    );

    loadTasks();
    loadRecentActivity();
  }catch(err){
    toast(err.message||'Unable to create task.');
  }
}

async function updateTaskStatus(taskId,status){
  try{
    const out=await apiGet(
      'updateTaskStatus',
      {
        taskId,
        status
      }
    );

    if(!out.success){
      throw new Error(
        out.error||'Unable to update task'
      );
    }

    toast('Task updated.');

    loadTasks();
    loadRecentActivity();
  }catch(err){
    toast(err.message||'Unable to update task.');
  }
}

/* ---------- training ---------- */
async function loadTraining(){
  try{
    const data=await apiGet('listTraining');

    state.training=data.training||[];

    renderTraining(state.training);
  }catch(e){
    document.getElementById('trainingTable').innerHTML=
      '<div class="hr-empty">Training data could not be loaded.</div>';
  }
}

function renderTraining(items){
  const target=document.getElementById('trainingTable');

  const q=
    document.getElementById('trainingSearch').value
      .trim()
      .toLowerCase();

  const status=
    document.getElementById('trainingStatusFilter').value
      .toLowerCase();

  const filtered=items.filter(
    r=>
      (
        !q||
        Object.values(r).some(
          v=>String(v??'').toLowerCase().includes(q)
        )
      )&&
      (
        !status||
        String(r.status||'').toLowerCase()===status
      )
  );

  if(!filtered.length){
    target.innerHTML=
      '<div class="hr-empty">No training records found.</div>';
    return
  }

  target.innerHTML=`
    <table class="hr-table">
      <thead>
        <tr>
          <th>Training</th>
          <th>Person</th>
          <th>Type</th>
          <th>Provider</th>
          <th>Status</th>
          <th>Start</th>
          <th>Completion</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(
          r=>`
            <tr>
              <td>${esc(r.name||'—')}</td>
              <td>${esc(r.employees||'—')}</td>
              <td>${esc(r.type||'—')}</td>
              <td>${esc(r.provider||'—')}</td>
              <td>${esc(r.status||'—')}</td>
              <td>${fmt(r.startDate)}</td>
              <td>${fmt(r.endDate)}</td>
            </tr>
          `
        ).join('')}
      </tbody>
    </table>`;
}

async function submitTraining(e){
  e.preventDefault();

  const data={
    name:document.getElementById('trainingName').value.trim(),
    employees:document.getElementById('trainingEmployees').value.trim(),
    type:document.getElementById('trainingType').value,
    provider:document.getElementById('trainingProvider').value.trim(),
    startDate:document.getElementById('trainingStartDate').value,
    endDate:document.getElementById('trainingEndDate').value,
    duration:document.getElementById('trainingDuration').value.trim(),
    status:document.getElementById('trainingStatus').value,
    assessmentScore:document.getElementById('trainingScore').value,
    certificationStatus:document.getElementById('trainingCertification').value,
    remarks:document.getElementById('trainingRemarks').value.trim()
  };

  try{
    const out=await apiGet(
      'addTraining',
      {data:JSON.stringify(data)}
    );

    if(!out.success){
      throw new Error(
        out.error||'Unable to create training'
      );
    }

    closeModal('addTrainingModal');

    document.getElementById('addTrainingForm').reset();

    toast('Training record created.');

    loadTraining();
    loadRecentActivity();
  }catch(err){
    toast(
      err.message||'Unable to create training record.'
    );
  }
}

/* ---------- MPR ---------- */
async function loadMpr(){
  try{
    const data=await apiGet('listMpr');

    state.mpr=data.mpr||[];

    renderMpr(state.mpr);

    refreshTodayStrip();
  }catch(e){
    document.getElementById('mprTable').innerHTML=
      '<div class="hr-empty">MPR data could not be loaded.</div>';
  }
}

function renderMpr(items){
  const target=document.getElementById('mprTable');

  const month=
    document.getElementById('mprMonthFilter').value;

  const status=
    document.getElementById('mprStatusFilter').value;

  const filtered=items.filter(
    r=>
      (!month||r.month===month)&&
      (!status||r.status===status)
  );

  if(!filtered.length){
    target.innerHTML=
      '<div class="hr-empty">No MPR records found.</div>';
    return
  }

  target.innerHTML=`
    <table class="hr-table">
      <thead>
        <tr>
          <th>Employee</th>
          <th>Review Period</th>
          <th>Reviewer</th>
          <th>Rating</th>
          <th>KPI</th>
          <th>Overall</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(
          r=>`
            <tr>
              <td>${esc(r.employee||'—')}</td>
              <td>${esc(r.month||'—')}</td>
              <td>${esc(r.reviewer||'—')}</td>
              <td>${esc(r.rating??'—')}</td>
              <td>${esc(r.kpiScore??'—')}</td>
              <td>${esc(r.overallScore??'—')}</td>
              <td>${esc(r.status||'—')}</td>
            </tr>
          `
        ).join('')}
      </tbody>
    </table>`;
}

async function submitMpr(e){
  e.preventDefault();

  const data={
    employee:document.getElementById('mprEmployee').value.trim(),
    month:document.getElementById('mprMonth').value,
    reviewDate:document.getElementById('mprReviewDate').value,
    reviewer:document.getElementById('mprReviewer').value.trim(),
    rating:document.getElementById('mprRating').value,
    kpiScore:document.getElementById('mprKpiScore').value,
    qualityScore:document.getElementById('mprQualityScore').value,
    behaviourScore:document.getElementById('mprBehaviourScore').value,
    overallScore:document.getElementById('mprOverallScore').value,
    achievements:document.getElementById('mprAchievements').value.trim(),
    strengths:document.getElementById('mprStrengths').value.trim(),
    improvements:document.getElementById('mprImprovements').value.trim(),
    targets:document.getElementById('mprTargets').value.trim(),
    reviewerComments:document.getElementById('mprReviewerComments').value.trim(),
    employeeComments:document.getElementById('mprEmployeeComments').value.trim(),
    status:document.getElementById('mprStatus').value
  };

  try{
    const out=await apiGet(
      'addMpr',
      {data:JSON.stringify(data)}
    );

    if(!out.success){
      throw new Error(
        out.error||'Unable to create MPR'
      );
    }

    closeModal('addMprModal');

    document.getElementById('addMprForm').reset();

    toast('MPR created.');

    loadMpr();
    loadRecentActivity();
  }catch(err){
    toast(err.message||'Unable to create MPR.');
  }
}

/* ---------- appointments ---------- */
async function loadAppointments(){
  try{
    const data=await apiGet('listAppointments');

    state.appointments=data.appointments||[];

    renderAppointments(
      state.appointments
    );

    refreshTodayStrip();
  }catch(e){
    document.getElementById('appointmentsTable').innerHTML=
      '<div class="hr-empty">Appointments could not be loaded.</div>';
  }
}

function renderAppointments(items){
  const target=document.getElementById('appointmentsTable');

  if(!items.length){
    target.innerHTML=
      '<div class="hr-empty">No appointments scheduled.</div>';
    return
  }

  const sorted=[...items].sort(
    (a,b)=>
      new Date(
        `${a.date||''}T${a.startTime||'00:00'}`
      )-
      new Date(
        `${b.date||''}T${b.startTime||'00:00'}`
      )
  );

  target.innerHTML=`
    <table class="hr-table">
      <thead>
        <tr>
          <th>Appointment</th>
          <th>Person</th>
          <th>Date</th>
          <th>Time</th>
          <th>With Whom</th>
          <th>Status</th>
          <th>Calendar</th>
        </tr>
      </thead>
      <tbody>
        ${sorted.map(
          r=>`
            <tr>
              <td>${esc(r.title||'—')}</td>
              <td>${esc(r.personName||'—')}</td>
              <td>${fmt(r.date)}</td>
              <td>${esc(r.startTime||'—')} — ${esc(r.endTime||'—')}</td>
              <td>${esc(r.withWhom||'—')}</td>
              <td>${esc(r.status||'—')}</td>
              <td>
                <a
                  class="hr-link-btn"
                  href="${gcalLink(r)}"
                  target="_blank"
                  rel="noopener"
                >
                  Add
                </a>
              </td>
            </tr>
          `
        ).join('')}
      </tbody>
    </table>`;
}

async function submitAppointment(e){
  e.preventDefault();

  const data={
    appointmentType:
      document.getElementById('appointmentType').value,
    personId:
      document.getElementById('appointmentPersonId').value.trim(),
    personName:
      document.getElementById('appointmentPersonName').value.trim(),
    personType:
      document.getElementById('appointmentPersonType').value,
    department:
      document.getElementById('appointmentDepartment').value.trim(),
    withWhom:
      document.getElementById('appointmentWithWhom').value.trim(),
    date:
      document.getElementById('appointmentDate').value,
    startTime:
      document.getElementById('appointmentStartTime').value,
    endTime:
      document.getElementById('appointmentEndTime').value,
    location:
      document.getElementById('appointmentLocation').value.trim(),
    purpose:
      document.getElementById('appointmentPurpose').value.trim(),
    status:
      document.getElementById('appointmentStatus').value,
    remarks:
      document.getElementById('appointmentRemarks').value.trim()
  };

  try{
    const out=await apiGet(
      'addAppointment',
      {data:JSON.stringify(data)}
    );

    if(!out.success){
      throw new Error(
        out.error||'Unable to create appointment'
      );
    }

    closeModal('addAppointmentModal');

    document.getElementById('addAppointmentForm').reset();

    toast('Appointment created.');

    loadAppointments();
    loadRecentActivity();
  }catch(err){
    toast(
      err.message||'Unable to create appointment.'
    );
  }
}

/* ---------- templates / documents ---------- */
function renderTemplates(){
  const target=document.getElementById('templateGrid');

  if(!target)return;

  const q=
    (
      document.getElementById('templateSearch')?.value||
      ''
    )
      .trim()
      .toLowerCase();

  const filtered=TEMPLATES.filter(
    t=>
      !q||
      t[0].toLowerCase().includes(q)||
      t[1].toLowerCase().includes(q)
  );

  target.innerHTML=
    filtered.map(
      t=>`
        <button
          type="button"
          class="template-card ${
            state.selectedTemplate&&
            state.selectedTemplate.name===t[0]
              ?'selected'
              :''
          }"
          data-template-name="${esc(t[0])}"
          data-template-category="${esc(t[1])}"
        >
          <span class="template-name">${esc(t[0])}</span>
          <span class="template-category">${esc(t[1])}</span>
        </button>
      `
    ).join('');

  target
    .querySelectorAll('[data-template-name]')
    .forEach(
      el=>
        el.addEventListener(
          'click',
          ()=>{
            state.selectedTemplate={
              name:el.dataset.templateName,
              category:el.dataset.templateCategory
            };

            renderTemplates();
          }
        )
    );
}

function loadGeneratePerson(){
  const id=
    document.getElementById('generateEmployee').value.trim();

  if(!id){
    toast('Enter an Employee ID first.');
    return
  }

  const person=
    state.people.find(
      p=>String(p['Employee ID'])===String(id)
    );

  if(!person){
    toast('Employee not found.');
    return
  }

  state.generatePerson=person;

  document.getElementById('generatePersonName').textContent=
    person['Full Name']||'—';

  document.getElementById('generatePersonMeta').textContent=
    `${person['Employee ID']||'—'} · ${person['Designation']||'—'}`;

  toast('Person selected.');
}

async function loadPersonDocuments(){
  const employeeId=
    document.getElementById('documentPerson').value.trim();

  if(!employeeId){
    toast('Enter an Employee ID first.');
    return
  }

  const target=document.getElementById('personDocuments');

  target.innerHTML=
    '<div class="hr-empty"><span class="hr-loading">Loading documents</span></div>';

  try{
    const data=await apiGet(
      'listDocuments',
      {employeeId}
    );

    const docs=data.documents||[];

    if(!docs.length){
      target.innerHTML=
        '<div class="hr-empty">No documents found for this person.</div>';
      return
    }

    target.innerHTML=`
      <table class="hr-table">
        <thead>
          <tr>
            <th>Document</th>
            <th>Category</th>
            <th>Status</th>
            <th>Verification</th>
            <th>Uploaded</th>
            <th>File</th>
          </tr>
        </thead>
        <tbody>
          ${docs.map(
            d=>`
              <tr>
                <td>${esc(d['Document Type']||d.documentType||'—')}</td>
                <td>${esc(d['Document Category']||d.category||'—')}</td>
                <td>${esc(d['Document Status']||d.status||'—')}</td>
                <td>${esc(d['Verification Status']||d.verificationStatus||'—')}</td>
                <td>${fmt(d['Upload Date']||d.uploadDate)}</td>
                <td>
                  ${
                    d['Google Drive URL']||d.url
                      ?`<a
                          class="hr-link-btn"
                          href="${esc(d['Google Drive URL']||d.url)}"
                          target="_blank"
                          rel="noopener"
                        >
                          Open
                        </a>`
                      :'—'
                  }
                </td>
              </tr>
            `
          ).join('')}
        </tbody>
      </table>`;
  }catch(e){
    target.innerHTML=
      '<div class="hr-empty">Documents could not be loaded.</div>';
  }
}

/* ---------- analytics ---------- */
function countBy(items,fn){
  return items.reduce(
    (acc,item)=>{
      const k=fn(item)||'Unspecified';
      acc[k]=(acc[k]||0)+1;
      return acc;
    },
    {}
  );
}

function drawChart(id,config){
  const canvas=document.getElementById(id);

  if(!canvas||typeof Chart==='undefined')return;

  if(canvas.__chart)canvas.__chart.destroy();

  canvas.__chart=new Chart(
    canvas.getContext('2d'),
    config
  );
}

function renderAnalytics(){
  const byDept=
    countBy(
      state.people,
      p=>p['Department']
    );

  drawChart(
    'chartDept',
    {
      type:'bar',
      data:{
        labels:Object.keys(byDept),
        datasets:[
          {
            label:'People',
            data:Object.values(byDept),
            backgroundColor:'#C4102A'
          }
        ]
      },
      options:{
        plugins:{
          legend:{
            display:false
          }
        },
        scales:{
          y:{
            beginAtZero:true,
            ticks:{
              precision:0
            }
          }
        }
      }
    }
  );

  const byType=
    countBy(
      state.people,
      p=>p['Employment Type']||'Unspecified'
    );

  drawChart(
    'chartEmpType',
    {
      type:'doughnut',
      data:{
        labels:Object.keys(byType),
        datasets:[
          {
            data:Object.values(byType),
            backgroundColor:[
              '#1B1C1E',
              '#C4102A',
              '#215FA6',
              '#1E7A46',
              '#9A6400'
            ]
          }
        ]
      }
    }
  );

  const byTaskStatus=
    countBy(
      state.tasks,
      t=>t.status||'To Do'
    );

  drawChart(
    'chartTasks',
    {
      type:'bar',
      data:{
        labels:Object.keys(byTaskStatus),
        datasets:[
          {
            label:'Tasks',
            data:Object.values(byTaskStatus),
            backgroundColor:'#215FA6'
          }
        ]
      },
      options:{
        indexAxis:'y',
        plugins:{
          legend:{
            display:false
          }
        },
        scales:{
          x:{
            beginAtZero:true,
            ticks:{
              precision:0
            }
          }
        }
      }
    }
  );

  const byRating=
    countBy(
      state.mpr.filter(m=>m.rating),
      m=>`${m.rating}/5`
    );

  drawChart(
    'chartMpr',
    {
      type:'bar',
      data:{
        labels:Object.keys(byRating),
        datasets:[
          {
            label:'MPRs',
            data:Object.values(byRating),
            backgroundColor:'#1E7A46'
          }
        ]
      },
      options:{
        plugins:{
          legend:{
            display:false
          }
        },
        scales:{
          y:{
            beginAtZero:true,
            ticks:{
              precision:0
            }
          }
        }
      }
    }
  );

  const compRows=
    state.compliance.length
      ?state.compliance
      :COMPLIANCE_RULES.map(
        r=>({
          ...r,
          status:complianceStatus(nextOccurrence(r))
        })
      );

  const byComp=
    countBy(
      compRows,
      r=>
        r.status==='overdue'
          ?'Overdue'
          :r.status==='soon'
            ?'Due soon'
            :r.status==='ongoing'
              ?'Ongoing'
              :'On track'
    );

  drawChart(
    'chartCompliance',
    {
      type:'bar',
      data:{
        labels:Object.keys(byComp),
        datasets:[
          {
            label:'Filings',
            data:Object.values(byComp),
            backgroundColor:[
              '#C4102A',
              '#9A6400',
              '#63666B',
              '#1E7A46'
            ]
          }
        ]
      },
      options:{
        indexAxis:'y',
        plugins:{
          legend:{
            display:false
          }
        },
        scales:{
          x:{
            beginAtZero:true,
            ticks:{
              precision:0
            }
          }
        }
      }
    }
  );
}

/* ---------- authentication + operations boot ---------- */
let operationsBooted=false;

function parseJwt(token){
  try{
    return JSON.parse(
      atob(
        token
          .split('.')[1]
          .replace(/-/g,'+')
          .replace(/_/g,'/')
      )
    )
  }catch(e){
    return null
  }
}

function setAuthGate(visible){
  const gate=document.getElementById('authGate');

  if(gate)gate.style.display=
    visible?'grid':'none';
}

async function getServerSession(){
  try{
    const res=await fetch(
      '/api/auth/session',
      {
        credentials:'include',
        cache:'no-store',
        headers:{
          Accept:'application/json'
        }
      }
    );

    if(!res.ok)return null;

    const body=await res.json();

    if(!body||!body.authenticated)return null;

    state.userName=
      body.user?.name||
      body.name||
      body.user?.email||
      body.email||
      'HR';

    state.userEmail=
      body.user?.email||
      body.email||
      '';

    return body;
  }catch(e){
    return null
  }
}

async function onGoogleSignIn(resp){
  const payload=parseJwt(resp.credential);

  if(!payload||!payload.email){
    toast('Unable to read the Google account.');
    return;
  }

  try{
    const res=await fetch(
      '/api/auth/verify',
      {
        method:'POST',
        credentials:'include',
        headers:{
          'Content-Type':'application/json',
          Accept:'application/json'
        },
        body:JSON.stringify({
          credential:resp.credential
        })
      }
    );

    const body=await res.json().catch(()=>({}));

    if(!res.ok||body.success===false){
      throw new Error(
        body.error||'Sign-in verification failed.'
      )
    }

    state.userName=
      body.name||
      payload.name||
      payload.email;

    state.userEmail=
      body.email||
      payload.email;

    sessionStorage.setItem(
      'origennt_hr_last_user',
      JSON.stringify({
        email:state.userEmail,
        name:state.userName
      })
    );

    setAuthGate(false);

    await bootOperations();
  }catch(e){
    toast(
      e.message||
      'Unable to complete sign-in.'
    );
  }
}

async function signOut(){
  try{
    await fetch(
      '/api/auth/logout',
      {
        method:'POST',
        credentials:'include',
        cache:'no-store'
      }
    )
  }catch(e){}

  sessionStorage.removeItem(
    'origennt_hr_last_user'
  );

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

  inactivityTimer=setTimeout(
    ()=>{
      toast('Session expired due to inactivity.');
      signOut()
    },
    1000*60*20
  )
}

['click','keydown','mousemove']
  .forEach(
    ev=>
      document.addEventListener(
        ev,
        resetInactivityTimer
      )
  );

async function initialiseAccess(){
  const session=await getServerSession();

  if(session){
    setAuthGate(false);

    await bootOperations();

    return;
  }

  setAuthGate(true);

  try{
    if(
      typeof google!=='undefined'&&
      google.accounts
    ){
      google.accounts.id.initialize({
        client_id:GOOGLE_CLIENT_ID,
        callback:onGoogleSignIn
      });

      google.accounts.id.renderButton(
        document.getElementById('gsiBtnHolder'),
        {
          theme:'filled_black',
          size:'large',
          text:'signin_with'
        }
      );
    }
  }catch(e){
    /* GSI unavailable; auth gate remains visible */
  }
}

/* ---------- wiring ---------- */
document.getElementById('peopleSearch')
  .addEventListener(
    'input',
    ()=>renderPeople(state.people)
  );

document.getElementById('peopleStatus')
  .addEventListener(
    'change',
    ()=>renderPeople(state.people)
  );

document.getElementById('peopleDepartment')
  .addEventListener(
    'change',
    ()=>renderPeople(state.people)
  );

document.getElementById('peopleEmpType')
  .addEventListener(
    'change',
    ()=>renderPeople(state.people)
  );

document.getElementById('refreshPeople')
  .addEventListener(
    'click',
    loadPeople
  );

document.getElementById('addEmployeeBtn')
  .addEventListener(
    'click',
    openAddEmployee
  );

document.getElementById('addEmployeeBtn2')
  .addEventListener(
    'click',
    openAddEmployee
  );

document.getElementById('addEmployeeBtn2b')
  .addEventListener(
    'click',
    openAddEmployee
  );

document.getElementById('addEmployeeForm')
  .addEventListener(
    'submit',
    submitEmployee
  );

document.getElementById('employeePhoto')
  .addEventListener(
    'change',
    previewPhoto
  );

document.getElementById('kycFiles')
  .addEventListener(
    'change',
    showKycFiles
  );

document.querySelectorAll('[data-close-modal]')
  .forEach(
    b=>
      b.addEventListener(
        'click',
        ()=>closeModal(
          b.dataset.closeModal
        )
      )
  );

document.getElementById('closeProfile')
  .addEventListener(
    'click',
    ()=>document
      .getElementById('employee-record')
      .classList.add('hr-hidden')
  );

document.getElementById('generateBtn')
  .addEventListener(
    'click',
    ()=>showView('generate')
  );

document.getElementById('loadGenerateEmployee')
  .addEventListener(
    'click',
    loadGeneratePerson
  );

document.getElementById('templateSearch')
  .addEventListener(
    'input',
    renderTemplates
  );

document.getElementById('generateDocumentAction')
  .addEventListener(
    'click',
    ()=>{
      if(!state.generatePerson){
        toast('Select a person first.');
        return
      }

      if(!state.selectedTemplate){
        toast('Select a document template first.');
        return
      }

      toast(
        'Template route is ready to connect to the document-generation backend.'
      )
    }
  );

document.getElementById('loadPersonDocuments')
  .addEventListener(
    'click',
    loadPersonDocuments
  );

document.getElementById('refreshActivity')
  .addEventListener(
    'click',
    loadRecentActivity
  );

document.getElementById('startExitBtn')
  .addEventListener(
    'click',
    ()=>document
      .getElementById('exitEmployeeId')
      .focus()
  );

document.getElementById('saveExitBtn')
  .addEventListener(
    'click',
    ()=>toast(
      'Exit workflow UI is ready; the EMPLOYEE EXIT backend route connects next.'
    )
  );

document.getElementById('addCandidateBtn')
  .addEventListener(
    'click',
    ()=>toast(
      'Candidate creation connects to the CANDIDATES backend module.'
    )
  );

document.getElementById('candidateSearchBtn')
  .addEventListener(
    'click',
    ()=>toast(
      'Candidate search connects to the CANDIDATES backend module.'
    )
  );

document.getElementById('addTaskBtn')
  .addEventListener(
    'click',
    ()=>openModal('addTaskModal')
  );

document.getElementById('addTaskBtnHeader')
  .addEventListener(
    'click',
    ()=>{
      showView('tasks');
      openModal('addTaskModal')
    }
  );

document.getElementById('addTaskForm')
  .addEventListener(
    'submit',
    submitTask
  );

document.getElementById('taskSearch')
  .addEventListener(
    'input',
    ()=>renderTasks(state.tasks)
  );

document.getElementById('taskPriorityFilter')
  .addEventListener(
    'change',
    ()=>renderTasks(state.tasks)
  );

document.getElementById('refreshTasks')
  .addEventListener(
    'click',
    loadTasks
  );

document.getElementById('addTrainingBtn')
  .addEventListener(
    'click',
    ()=>openModal('addTrainingModal')
  );

document.getElementById('addTrainingForm')
  .addEventListener(
    'submit',
    submitTraining
  );

document.getElementById('trainingSearch')
  .addEventListener(
    'input',
    ()=>renderTraining(state.training)
  );

document.getElementById('trainingStatusFilter')
  .addEventListener(
    'change',
    ()=>renderTraining(state.training)
  );

document.getElementById('refreshTraining')
  .addEventListener(
    'click',
    loadTraining
  );

document.getElementById('addMprBtn')
  .addEventListener(
    'click',
    ()=>openModal('addMprModal')
  );

document.getElementById('addMprForm')
  .addEventListener(
    'submit',
    submitMpr
  );

document.getElementById('mprMonthFilter')
  .addEventListener(
    'change',
    ()=>renderMpr(state.mpr)
  );

document.getElementById('mprStatusFilter')
  .addEventListener(
    'change',
    ()=>renderMpr(state.mpr)
  );

document.getElementById('refreshMpr')
  .addEventListener(
    'click',
    loadMpr
  );

document.getElementById('addAppointmentBtn')
  .addEventListener(
    'click',
    ()=>openModal('addAppointmentModal')
  );

document.getElementById('addAppointmentForm')
  .addEventListener(
    'submit',
    submitAppointment
  );

document.getElementById('refreshAppointments')
  .addEventListener(
    'click',
    loadAppointments
  );

document.querySelectorAll('.hr-nav button[data-view]')
  .forEach(
    b=>
      b.addEventListener(
        'click',
        ()=>showView(b.dataset.view)
      )
  );

document.getElementById('signOutBtn')
  .addEventListener(
    'click',
    signOut
  );

document.getElementById('sendWaDigestBtn')
  .addEventListener(
    'click',
    ()=>window.open(
      `https://wa.me/?text=${encodeURIComponent(
        buildDailyDigestText()
      )}`,
      '_blank'
    )
  );

document.getElementById('refreshCompliance')
  .addEventListener(
    'click',
    renderCompliance
  );

document.getElementById('waComplianceBtn')
  .addEventListener(
    'click',
    waComplianceDigest
  );

setGreeting();
renderTemplates();
renderCompliance();

window.addEventListener('load',initialiseAccess);
