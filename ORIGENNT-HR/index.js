/* ORIGENNT HR — People Operations Frontend */

const HR_BACKEND_URL='/api/hr';
const GOOGLE_CLIENT_ID='576893667298-kj24mmsvo88id0pp5r1teu256rc1mla4.apps.googleusercontent.com';

const state={
  currentView:'dashboard',
  employee:null,
  people:[],
  tasks:[],
  training:[],
  mpr:[],
  appointments:[],
  compliance:[],
  selectedTemplate:null,
  generatePerson:null,
  userName:'',
  userEmail:'',
  userRole:'hr'
};

/* ---------- daily quote ---------- */

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
  return Math.floor((d-start)/864e5);
}

function renderDailyQuote(){
  const idx=dayOfYear(new Date())%QUOTES.length;

  const quote=document.getElementById('dailyQuote');
  const author=document.getElementById('dailyQuoteAuthor');

  if(quote)quote.textContent=`"${QUOTES[idx][0]}"`;
  if(author)author.textContent=`— ${QUOTES[idx][1]}`;
}

/* ---------- compliance ---------- */

const COMPLIANCE_RULES=[
  {
    name:'EPF — ECR filing & payment',
    cat:'EPFO',
    freq:'Monthly',
    rule:'day',
    day:15,
    note:'Electronic Challan-cum-Return for the previous wage month, filed on the EPFO Unified Portal.'
  },
  {
    name:'ESIC — Contribution payment',
    cat:'ESIC',
    freq:'Monthly',
    rule:'day',
    day:15,
    note:'Employee State Insurance contribution challan for the previous wage month.'
  },
  {
    name:'TDS on salary — deposit',
    cat:'Income Tax',
    freq:'Monthly',
    rule:'day',
    day:7,
    note:'Tax deducted at source on salary deposited by the 7th of the following month.'
  },
  {
    name:'TDS return — Q1',
    cat:'Income Tax',
    freq:'Quarterly',
    rule:'fixed',
    month:7,
    day:31,
    note:'Salary TDS quarterly statement for Apr–Jun.'
  },
  {
    name:'TDS return — Q2',
    cat:'Income Tax',
    freq:'Quarterly',
    rule:'fixed',
    month:10,
    day:31,
    note:'Salary TDS quarterly statement for Jul–Sep.'
  },
  {
    name:'TDS return — Q3',
    cat:'Income Tax',
    freq:'Quarterly',
    rule:'fixed',
    month:1,
    day:31,
    note:'Salary TDS quarterly statement for Oct–Dec.'
  },
  {
    name:'TDS return — Q4 + Form 16 issuance',
    cat:'Income Tax',
    freq:'Quarterly',
    rule:'fixed',
    month:5,
    day:31,
    note:'Salary TDS quarterly statement for Jan–Mar.'
  },
  {
    name:'EPF Annual Return',
    cat:'EPFO',
    freq:'Annual',
    rule:'fixed',
    month:4,
    day:30,
    note:'Consolidated annual PF statement for the financial year just ended.'
  },
  {
    name:'ESIC Half-Yearly Return',
    cat:'ESIC',
    freq:'Half-yearly',
    rule:'halfyear',
    day1:{month:5,day:11},
    day2:{month:11,day:11},
    note:'Half-yearly contribution return.'
  },
  {
    name:'Professional Tax — Odisha monthly payment',
    cat:'State PT',
    freq:'Monthly',
    rule:'lastday',
    note:'Odisha PT deducted from employees remitted by the last day of the month.'
  },
  {
    name:'Professional Tax — Annual renewal',
    cat:'State PT',
    freq:'Annual',
    rule:'fixed',
    month:4,
    day:30,
    note:'Employer PT enrolment renewal / annual return.'
  },
  {
    name:'POSH — Annual Report',
    cat:'POSH',
    freq:'Annual',
    rule:'fixed',
    month:1,
    day:31,
    note:'Annual report under the POSH framework.'
  },
  {
    name:'Payment of Bonus',
    cat:'Labour',
    freq:'Annual',
    rule:'fixed',
    month:11,
    day:30,
    note:'Statutory bonus compliance.'
  },
  {
    name:'Shops & Establishment — Registration renewal',
    cat:'State Labour',
    freq:'Annual',
    rule:'fixed',
    month:3,
    day:31,
    note:'Confirm exact renewal date against the certificate issued.'
  },
  {
    name:'ROC — AOC-4',
    cat:'MCA/ROC',
    freq:'Annual',
    rule:'fixed',
    month:10,
    day:30,
    note:'Financial statements filing.'
  },
  {
    name:'ROC — MGT-7A',
    cat:'MCA/ROC',
    freq:'Annual',
    rule:'fixed',
    month:11,
    day:29,
    note:'Annual return filing.'
  },
  {
    name:'Gratuity — Payment on eligibility',
    cat:'Labour',
    freq:'As triggered',
    rule:'ongoing',
    note:'Triggered statutory payment.'
  }
];

function nextOccurrence(rule){
  const now=new Date();
  const y=now.getFullYear();
  const cands=[];

  if(rule.rule==='day'){
    for(const year of [y,y+1]){
      for(let month=0;month<12;month++){
        cands.push(new Date(year,month,rule.day));
      }
    }
  }else if(rule.rule==='fixed'){
    cands.push(
      new Date(y,rule.month-1,rule.day),
      new Date(y+1,rule.month-1,rule.day)
    );
  }else if(rule.rule==='halfyear'){
    for(const year of [y,y+1]){
      cands.push(
        new Date(year,rule.day1.month-1,rule.day1.day),
        new Date(year,rule.day2.month-1,rule.day2.day)
      );
    }
  }else if(rule.rule==='lastday'){
    for(const year of [y,y+1]){
      for(let month=0;month<12;month++){
        cands.push(new Date(year,month+1,0));
      }
    }
  }else{
    return null;
  }

  const startOfToday=new Date(now.toDateString());

  return cands
    .filter(d=>d>=startOfToday)
    .sort((a,b)=>a-b)[0]||null;
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

  if(!target)return;

  const rows=COMPLIANCE_RULES.map(rule=>{
    const due=nextOccurrence(rule);

    return{
      ...rule,
      due,
      status:complianceStatus(due)
    };
  });

  state.compliance=rows;

  rows.sort(
    (a,b)=>
      (a.due||new Date(8640000000000000))-
      (b.due||new Date(8640000000000000))
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
    </table>
  `;

  refreshTodayStrip();
}

function waComplianceDigest(){
  const due=state.compliance.filter(
    r=>r.status==='overdue'||r.status==='soon'
  );

  const lines=due
    .map(r=>`• ${r.name} — due ${r.due?fmt(r.due):'—'}`)
    .join('\n');

  const text=
    `ORIGENNT HR — Compliance items needing attention:\n${
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

  let text=`*ORIGENNT HR — Daily Digest*\n${today}\n\n`;

  text+=`*Tasks due today:* ${tasksToday.length}\n${
    tasksToday
      .map(x=>`• ${x.title} (${x.assignee||'Unassigned'})`)
      .join('\n')
  }\n\n`;

  text+=`*Overdue tasks:* ${overdueTasks.length}\n${
    overdueTasks
      .map(x=>`• ${x.title} (${x.assignee||'Unassigned'})`)
      .join('\n')
  }\n\n`;

  text+=`*Appointments today:* ${apptsToday.length}\n${
    apptsToday
      .map(x=>`• ${x.title} — ${x.startTime||''}`)
      .join('\n')
  }\n\n`;

  text+=`*Pending KYC:* ${kycPending}\n\n`;

  text+=`*Compliance due (≤7 days):*\n${
    compDue
      .map(x=>`• ${x.name} — ${x.due?fmt(x.due):''}`)
      .join('\n')||'None'
  }\n`;

  return text;
}

/* ---------- templates ---------- */

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
function renderTemplates(){
  const target=document.getElementById('templateList');

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
  const input=document.getElementById('generateEmployee');

  if(!input){
    toast('Generate person field is unavailable.');
    return;
  }

  const id=input.value.trim();

  if(!id){
    toast('Enter an Employee ID first.');
    return;
  }

  const person=state.people.find(
    p=>String(p['Employee ID'])===String(id)
  );

  if(!person){
    toast('Employee not found.');
    return;
  }

  state.generatePerson=person;

  const name=document.getElementById('generatePersonName');
  const meta=document.getElementById('generatePersonMeta');

  if(name){
    name.textContent=person['Full Name']||'—';
  }

  if(meta){
    meta.textContent=
      `${person['Employee ID']||'—'} · ${person['Designation']||'—'}`;
  }

  toast('Person selected.');
}

/* ---------- helpers ---------- */

function toast(message){
  const el=document.getElementById('hrToast');

  if(!el){
    console.log(message);
    return;
  }

  el.textContent=message;
  el.classList.add('show');

  clearTimeout(window.__toast);

  window.__toast=setTimeout(
    ()=>el.classList.remove('show'),
    2800
  );
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
  );
}

function initials(name){
  return (name||'Employee')
    .split(' ')
    .slice(0,2)
    .map(x=>x[0]||'')
    .join('')
    .toUpperCase();
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
    );
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
    );
}

function isToday(v){
  if(!v)return false;

  const d=new Date(v);
  const t=new Date();

  return(
    d.getFullYear()===t.getFullYear()&&
    d.getMonth()===t.getMonth()&&
    d.getDate()===t.getDate()
  );
}

function waLink(mobile,message){
  const digits=String(mobile||'').replace(/[^\d]/g,'');

  if(!digits)return null;

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
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

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
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
    body=await res.json();
  }catch(e){}

  if(!res.ok){
    const message=
      body&&body.error
        ?body.error
        :`Backend returned ${res.status}`;

    throw new Error(message);
  }

  return body||{};
}

/* ---------- view switching ---------- */

function showView(view){
  document
    .querySelectorAll('[id^="view-"]')
    .forEach(el=>el.classList.add('hr-hidden'));

  const target=document.getElementById(`view-${view}`);

  if(target){
    target.classList.remove('hr-hidden');
  }

  document
    .querySelectorAll('.hr-nav button[data-view]')
    .forEach(
      button=>
        button.classList.toggle(
          'active',
          button.dataset.view===view
        )
    );

  state.currentView=view;

  if(view==='dashboard'){
    loadPeople();
  }else if(view==='activity'){
    loadRecentActivity();
  }else if(view==='people'){
    loadPeople();
  }else if(view==='tasks'){
    loadTasks();
  }else if(view==='training'){
    loadTraining();
  }else if(view==='mpr'){
    loadMpr();
  }else if(view==='appointments'){
    loadAppointments();
  }else if(view==='compliance'){
    renderCompliance();
  }else if(view==='analytics'){
    renderAnalytics();
  }
}

function wireViewLinks(){
  document
    .querySelectorAll('[data-view-link]')
    .forEach(
      el=>
        el.addEventListener(
          'click',
          ()=>showView(el.dataset.viewLink)
        )
    );
}

function setGreeting(){
  const now=new Date();

  const day=document.getElementById('heroDay');

  if(day){
    day.textContent=now.toLocaleDateString(
      'en-IN',
      {
        weekday:'long',
        day:'2-digit',
        month:'long',
        year:'numeric'
      }
    );
  }

  const h=now.getHours();

  const name=(state.userName||'')
    .split(' ')[0];

  const base=
    h<12
      ?'Good morning'
      :h<17
        ?'Good afternoon'
        :'Good evening';

  const greet=document.getElementById('todayGreet');

  if(greet){
    greet.textContent=
      name
        ?`${base}, ${name}`
        :base;
  }

  renderDailyQuote();
}

function refreshTodayStrip(){
  const dueToday=state.tasks.filter(
    t=>t.status!=='Done'&&isToday(t.dueDate)
  ).length;

  const appointmentsToday=state.appointments.filter(
    a=>isToday(a.date)
  ).length;

  const pendingKyc=state.people.filter(
    p=>
      String(p['KYC Status']||'')
        .toLowerCase()==='pending'
  ).length;

  const month=new Date()
    .toISOString()
    .slice(0,7);

  const mprDue=state.mpr.filter(
    m=>
      m.month===month&&
      m.status!=='Approved'
  ).length;

  const overdueTasks=state.tasks.filter(
    t=>
      t.status!=='Done'&&
      t.dueDate&&
      new Date(t.dueDate)<
        new Date(new Date().toDateString())
  ).length;

  const compDue=state.compliance.filter(
    r=>r.status==='overdue'||r.status==='soon'
  ).length;

  const compOverdue=state.compliance.filter(
    r=>r.status==='overdue'
  ).length;

  const interns=state.people.filter(
    p=>
      String(p['Employment Type']||'')
        .toLowerCase()==='intern'&&
      String(p['Employment Status']||'')
        .toLowerCase()==='active'
  ).length;

  const set=(id,value)=>{
    const el=document.getElementById(id);

    if(el)el.textContent=value;
  };

  set('todayTasksDue',dueToday);
  set('todayAppointments',appointmentsToday);
  set('todayPendingKyc',pendingKyc);
  set('todayMprDue',mprDue);
  set('metricOverdueTasks',overdueTasks);
  set('todayComplianceDue',compDue);
  set('metricComplianceOverdue',compOverdue);
  set('metricInternsQuick',interns);
  set('heroHeadcount',state.people.length);
  set('heroCompliance',COMPLIANCE_RULES.length);
  set('heroDocs',`${TEMPLATES.length}+`);
}

/* ---------- metrics ---------- */

function updateMetrics(people){
  const active=people.filter(
    p=>
      String(p['Employment Status']||'')
        .toLowerCase()==='active'
  ).length;

  const interns=people.filter(
    p=>
      String(p['Employment Type']||'')
        .toLowerCase()==='intern'
  ).length;

  const kyc=people.filter(
    p=>
      String(p['KYC Status']||'')
        .toLowerCase()==='pending'
  ).length;

  const notice=people.filter(
    p=>
      String(p['Employment Status']||'')
        .toLowerCase()==='on notice'
  ).length;

  const exited=people.filter(
    p=>
      String(p['Employment Status']||'')
        .toLowerCase()==='exited'
  ).length;

  const set=(id,value)=>{
    const el=document.getElementById(id);

    if(el)el.textContent=value;
  };

  set('metricPeople',people.length);
  set('metricActive',active);
  set('metricInterns',interns);
  set('metricKyc',kyc);
  set('metricExited',exited);

  set('dashActive',active);
  set('dashKyc',kyc);
  set('dashNotice',notice);
  set('dashExited',exited);

  refreshTodayStrip();
}

/* ---------- activity ---------- */

let ACTIVITY_STORE=[];

function renderActivities(items,targetId){
  const target=document.getElementById(targetId);

  if(!target)return;

  if(!items.length){
    target.innerHTML=
      '<div class="hr-empty">No activity recorded yet.</div>';
    return;
  }

  const offset=ACTIVITY_STORE.length;

  ACTIVITY_STORE=
    ACTIVITY_STORE.concat(items);

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
              <strong>
                ${esc(
                  a['Action Type']||
                  a.title||
                  a.type||
                  'Activity'
                )}
              </strong>
              <span>
                ${esc(
                  a['Description']||
                  a.summary||
                  a.detail||
                  ''
                )}
              </span>
            </div>
            <div class="hr-date">
              ${fmtDateTime(
                a['Timestamp']||
                a.timestamp||
                a.date
              )}
            </div>
          </div>
        `
      ).join('')}
    </div>
  `;

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
  const activity=ACTIVITY_STORE[idx];

  if(!activity)return;

  const rows=Object
    .entries(activity)
    .filter(
      ([key,value])=>
        value!==''&&
        value!==undefined
    )
    .map(
      ([key,value])=>`
        <div class="audit-kv">
          <b>${esc(key)}</b>
          <span>${esc(value)}</span>
        </div>
      `
    )
    .join('');

  const body=document.getElementById(
    'activityDetailBody'
  );

  if(body){
    body.innerHTML=
      rows||
      '<div class="hr-empty">No further detail on this record.</div>';
  }

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
  }catch(error){
    const dashboard=
      document.getElementById(
        'dashboardActivity'
      );

    const activity=
      document.getElementById(
        'activityTable'
      );

    if(dashboard){
      dashboard.innerHTML=
        '<div class="hr-empty">Activity could not be loaded.</div>';
    }

    if(activity){
      activity.innerHTML=
        '<div class="hr-empty">Activity could not be loaded.</div>';
    }
  }
}

/* ---------- people ---------- */

async function loadPeople(){
  const target=
    document.getElementById(
      'peopleResults'
    );

  if(target){
    target.innerHTML=
      '<div class="hr-empty"><span class="hr-loading">Loading people register</span></div>';
  }

  try{
    const data=await apiGet(
      'searchEmployees',
      {q:'ORI-EMP-'}
    );

    state.people=data.results||[];

    renderPeople(state.people);
    updateMetrics(state.people);
  }catch(error){
    if(target){
      target.innerHTML=
        '<div class="hr-empty">People register could not be loaded.</div>';
    }
  }
}

function renderPeople(people){
  const target=
    document.getElementById(
      'peopleResults'
    );

  if(!target)return;

  const status=
    (
      document.getElementById(
        'peopleStatus'
      )?.value||
      ''
    ).toLowerCase();

  const dept=
    (
      document.getElementById(
        'peopleDepartment'
      )?.value||
      ''
    ).toLowerCase();

  const etype=
    (
      document.getElementById(
        'peopleEmpType'
      )?.value||
      ''
    ).toLowerCase();

  const q=
    (
      document.getElementById(
        'peopleSearch'
      )?.value||
      ''
    ).trim().toLowerCase();

  const filtered=people.filter(
    employee=>{
      const hit=
        !q||
        Object.values(employee)
          .some(
            value=>
              String(value??'')
                .toLowerCase()
                .includes(q)
          );

      const hs=
        !status||
        String(
          employee['Employment Status']||''
        ).toLowerCase()===status;

      const hd=
        !dept||
        String(
          employee['Department']||''
        ).toLowerCase()===dept;

      const het=
        !etype||
        String(
          employee['Employment Type']||''
        ).toLowerCase()===etype;

      return hit&&hs&&hd&&het;
    }
  );

  const count=
    document.getElementById(
      'peopleCount'
    );

  if(count){
    count.textContent=
      `${filtered.length} person${
        filtered.length===1?'':'s'
      } shown`;
  }

  if(!filtered.length){
    target.innerHTML=
      '<div class="hr-empty">No matching person record found.</div>';
    return;
  }

  target.innerHTML=
    filtered.map(
      employee=>`
        <div class="hr-result">

          <div class="hr-avatar-sm">
            ${
              employee['Photo URL']
                ?`
                  <img
                    src="${esc(employee['Photo URL'])}"
                    alt="${esc(
                      employee['Full Name']||
                      'Person'
                    )} photo"
                    loading="lazy"
                    onerror="this.parentElement.innerHTML='<span>${esc(
                      initials(
                        employee['Full Name']
                      )
                    )}</span>'"
                  >
                `
                :`
                  <span>
                    ${esc(
                      initials(
                        employee['Full Name']
                      )
                    )}
                  </span>
                `
            }
          </div>

          <div>
            <strong>
              ${esc(
                employee['Full Name']||
                '—'
              )}
            </strong><br>
            <span>
              ${esc(
                employee['Employee ID']||
                '—'
              )}
            </span>
          </div>

          <div>
            <strong>
              ${esc(
                employee['Designation']||
                '—'
              )}
            </strong><br>
            <span>
              ${esc(
                employee['Department']||
                '—'
              )}
            </span>
          </div>

          <div>
            <span>
              ${esc(
                employee['Reporting Manager']||
                '—'
              )}
            </span><br>
            <span>
              ${esc(
                employee['KYC Status']||
                'Pending'
              )} KYC
            </span>
          </div>

          <div>
            <span class="hr-status ${
              String(
                employee['Employment Status']||
                ''
              )
                .toLowerCase()
                .includes('exit')
                ?'exit'
                :''
            }">
              ${esc(
                employee['Employment Status']||
                'Active'
              )}
            </span><br>

            <button
              class="hr-link-btn"
              type="button"
              data-employee-id="${esc(
                employee['Employee ID']||
                ''
              )}"
            >
              Open Record
            </button>
          </div>

        </div>
      `
    ).join('');

  target
    .querySelectorAll(
      '[data-employee-id]'
    )
    .forEach(
      button=>
        button.addEventListener(
          'click',
          ()=>loadProfile(
            button.dataset.employeeId
          )
        )
    );
}

/* ---------- profile ---------- */

async function loadProfile(employeeId){
  const section=
    document.getElementById(
      'employee-record'
    );

  if(section){
    section.classList.remove(
      'hr-hidden'
    );
  }

  const target=
    document.getElementById(
      'employeeProfile'
    );

  if(target){
    target.innerHTML=
      '<div class="hr-empty"><span class="hr-loading">Loading employee record</span></div>';
  }

  try{
    const data=await apiGet(
      'getEmployeeProfile',
      {employeeId}
    );

    state.employee=
      data.employee||
      data;

    renderProfile(data);

    section?.scrollIntoView({
      behavior:'smooth',
      block:'start'
    });
  }catch(error){
    if(target){
      target.innerHTML=
        '<div class="hr-empty">Employee record could not be loaded.</div>';
    }

    toast(
      'Unable to load employee record.'
    );
  }
}

function renderProfile(data){
  const employee=
    data.employee||
    data;

  const photo=
    employee['Photo URL']
      ?`
        <img
          src="${esc(
            employee['Photo URL']
          )}"
          alt="${esc(
            employee['Full Name']
          )}"
        >
      `
      :esc(
        initials(
          employee['Full Name']
        )
      );

  const target=
    document.getElementById(
      'employeeProfile'
    );

  if(!target)return;

  target.innerHTML=`
    <div class="hr-profile">

      <div class="card hr-profile-main">

        <div class="hr-profile-id">

          <div
            style="display:flex;gap:14px;align-items:center"
          >
            <div class="hr-avatar-lg">
              ${photo}
            </div>

            <div>
              <h2 class="hr-name">
                ${esc(
                  employee['Full Name']||
                  '—'
                )}
              </h2>

              <p class="hr-muted">
                ${esc(
                  employee['Employee ID']||
                  '—'
                )}
                &middot;
                ${esc(
                  employee['Designation']||
                  '—'
                )}
              </p>
            </div>
          </div>

          <span
            class="hr-status ${
              String(
                employee['Employment Status']||
                ''
              )
                .toLowerCase()
                .includes('exit')
                ?'exit'
                :''
            }"
          >
            ${esc(
              employee['Employment Status']||
              'Active'
            )}
          </span>

        </div>

        <div class="hr-data-grid">

          <div class="hr-data">
            <div class="k">Department</div>
            <div class="v">
              ${esc(
                employee['Department']||
                '—'
              )}
            </div>
          </div>

          <div class="hr-data">
            <div class="k">Reporting Manager</div>
            <div class="v">
              ${esc(
                employee['Reporting Manager']||
                '—'
              )}
            </div>
          </div>

          <div class="hr-data">
            <div class="k">Joining Date</div>
            <div class="v">
              ${fmt(
                employee['Joining Date']
              )}
            </div>
          </div>

          <div class="hr-data">
            <div class="k">Employment Type</div>
            <div class="v">
              ${esc(
                employee['Employment Type']||
                '—'
              )}
            </div>
          </div>

          <div class="hr-data">
            <div class="k">Work Mode</div>
            <div class="v">
              ${esc(
                employee['Work Mode']||
                '—'
              )}
            </div>
          </div>

          <div class="hr-data">
            <div class="k">Work Location</div>
            <div class="v">
              ${esc(
                employee['Work Location']||
                '—'
              )}
            </div>
          </div>

          <div class="hr-data">
            <div class="k">Official Email</div>
            <div class="v">
              ${esc(
                employee['Official Email']||
                '—'
              )}
            </div>
          </div>

          <div class="hr-data">
            <div class="k">Mobile</div>
            <div class="v">
              ${esc(
                employee['Mobile']||
                '—'
              )}
            </div>
          </div>

          <div class="hr-data">
            <div class="k">KYC Status</div>
            <div class="v">
              ${esc(
                employee['KYC Status']||
                'Pending'
              )}
            </div>
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
            onclick="document.getElementById('generateEmployee').value='${esc(
              employee['Employee ID']||
              ''
            )}';showView('generate');loadGeneratePerson()"
          >
            Generate document
          </button>

          <button
            type="button"
            onclick="document.getElementById('documentPerson').value='${esc(
              employee['Employee ID']||
              ''
            )}';showView('documents');loadPersonDocuments()"
          >
            View documents
          </button>

          ${
            employee['Mobile']
              ?`
                <a
                  class="hr-btn wa"
                  style="text-align:center;text-decoration:none"
                  href="${waLink(
                    employee['Mobile'],
                    `Hi ${
                      employee['Full Name']||
                      ''
                    }, following up from ORIGENNT HR.`
                  )}"
                  target="_blank"
                  rel="noopener"
                >
                  Message on WhatsApp
                </a>
              `
              :''
          }

        </div>

        ${
          String(
            employee['Employment Type']||
            ''
          ).toLowerCase()==='intern'
            ?`
              <h4 style="margin-top:18px">
                Intern Track
              </h4>

              <div
                class="hr-lifecycle"
                style="grid-template-columns:repeat(3,1fr)"
              >
                <div class="hr-stage current">
                  <strong>Assigned</strong>
                  <span>
                    Mentor &amp; project
                  </span>
                </div>

                <div class="hr-stage">
                  <strong>Progress</strong>
                  <span>
                    Milestones
                  </span>
                </div>

                <div class="hr-stage">
                  <strong>Certified</strong>
                  <span>
                    Completion
                  </span>
                </div>
              </div>

              <div
                class="hr-form-grid"
                style="grid-template-columns:1fr;margin-top:12px"
              >

                <div class="hr-form-field">
                  <label>
                    Mentor / Project
                  </label>

                  <input
                    id="internMentorInline"
                    placeholder="Mentor name — project"
                  >
                </div>

                <div class="hr-form-field">
                  <label>
                    Progress Status
                  </label>

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
                  onclick="saveInternInline('${esc(
                    employee['Employee ID']||
                    ''
                  )}')"
                >
                  Save Intern Update
                </button>

              </div>
            `
            :''
        }

      </div>

    </div>
  `;
}

async function saveInternInline(employeeId){
  const mentor=
    document.getElementById(
      'internMentorInline'
    )?.value.trim()||'';

  const status=
    document.getElementById(
      'internStatusInline'
    )?.value||'In Progress';

  const remarks=
    document.getElementById(
      'internRemarksInline'
    )?.value.trim()||'';

  try{
    const out=await apiGet(
      'addInternProgress',
      {
        data:JSON.stringify({
          employeeId,
          mentorProject:mentor,
          status,
          remarks
        })
      }
    );

    if(!out.success){
      throw new Error(
        out.error||
        'Unable to save'
      );
    }

    toast(
      'Intern progress saved.'
    );

    loadRecentActivity();
  }catch(error){
    toast(
      error.message||
      'Unable to save intern progress.'
    );
  }
}

/* ---------- modal helpers ---------- */

function openModal(id){
  const el=document.getElementById(id);

  if(el){
    el.classList.add('open');
  }
}

function closeModal(id){
  const el=document.getElementById(id);

  if(el){
    el.classList.remove('open');
  }
}

/* ---------- employee form ---------- */

function resetAddForm(){
  const form=
    document.getElementById(
      'addEmployeeForm'
    );

  form?.reset();

  const location=
    document.getElementById(
      'empWorkLocation'
    );

  if(location){
    location.value='Bhubaneswar';
  }

  const preview=
    document.getElementById(
      'photoPreview'
    );

  if(preview){
    preview.innerHTML=
      '<div class="hr-photo-placeholder">Profile / KYC Photo<br><small>JPG or PNG</small></div>';
  }

  const photoName=
    document.getElementById(
      'photoName'
    );

  if(photoName){
    photoName.textContent=
      'No photo selected.';
  }

  const kyc=
    document.getElementById(
      'kycFileList'
    );

  if(kyc){
    kyc.innerHTML='';
  }
}

function previewPhoto(){
  const input=
    document.getElementById(
      'employeePhoto'
    );

  if(!input)return;

  const file=
    input.files?.[0];

  const preview=
    document.getElementById(
      'photoPreview'
    );

  const name=
    document.getElementById(
      'photoName'
    );

  if(name){
    name.textContent=
      file
        ?file.name
        :'No photo selected.';
  }

  if(!preview)return;

  if(!file){
    preview.innerHTML=
      '<div class="hr-photo-placeholder">Profile / KYC Photo<br><small>JPG or PNG</small></div>';
    return;
  }

  const reader=
    new FileReader();

  reader.onload=event=>{
    preview.innerHTML=
      `<img src="${event.target.result}" alt="Profile photo preview">`;
  };

  reader.readAsDataURL(file);
}

function showKycFiles(){
  const input=
    document.getElementById(
      'kycFiles'
    );

  const target=
    document.getElementById(
      'kycFileList'
    );

  if(!input||!target)return;

  const files=[
    ...(input.files||[])
  ];

  target.innerHTML=
    files.map(
      file=>`
        <div class="hr-file">
          <span>${esc(file.name)}</span>
          <small>
            ${Math.round(file.size/1024)} KB
          </small>
        </div>
      `
    ).join('');
}

async function submitEmployee(event){
  event.preventDefault();

  const fullName=
    document.getElementById(
      'empFullName'
    )?.value.trim();

  if(!fullName){
    toast(
      'Full name is required.'
    );
    return;
  }

  const data={
    fullName,
    officialEmail:
      document.getElementById(
        'empOfficialEmail'
      )?.value.trim()||'',

    personalEmail:
      document.getElementById(
        'empPersonalEmail'
      )?.value.trim()||'',

    mobile:
      document.getElementById(
        'empMobile'
      )?.value.trim()||'',

    department:
      document.getElementById(
        'empDepartment'
      )?.value.trim()||'',

    designation:
      document.getElementById(
        'empDesignation'
      )?.value.trim()||'',

    reportingManager:
      document.getElementById(
        'empManager'
      )?.value.trim()||'',

    joiningDate:
      document.getElementById(
        'empJoiningDate'
      )?.value||'',

    employmentType:
      document.getElementById(
        'empEmploymentType'
      )?.value||'Full Time',

    workMode:
      document.getElementById(
        'empWorkMode'
      )?.value||'Office',

    workLocation:
      document.getElementById(
        'empWorkLocation'
      )?.value.trim()||'Bhubaneswar',

    employmentStatus:
      document.getElementById(
        'empEmploymentStatus'
      )?.value||'Active',

    kycStatus:
      document.getElementById(
        'empKycStatus'
      )?.value||'Pending'
  };

  try{
    const out=await apiGet(
      'addEmployee',
      {
        data:JSON.stringify(data)
      }
    );

    if(!out.success){
      throw new Error(
        out.error||
        'Unable to create employee'
      );
    }

    closeModal(
      'addEmployeeModal'
    );

    resetAddForm();

    toast(
      `Person record ${
        out.employeeId||
        'created'
      }`
    );

    await loadPeople();
    showView('people');
    loadRecentActivity();

  }catch(error){
    toast(
      error.message||
      'Unable to create person record.'
    );
  }
}

function openAddEmployee(){
  resetAddForm();
  openModal('addEmployeeModal');
}

function openAddEmployeeWithData(){
  resetAddForm();
  openModal('addEmployeeModal');

  if(!state.employee)return;

  const employee=
    state.employee;

  const set=(id,value)=>{
    const el=document.getElementById(id);

    if(el)el.value=value;
  };

  set(
    'empFullName',
    employee['Full Name']||''
  );

  set(
    'empOfficialEmail',
    employee['Official Email']||''
  );

  set(
    'empPersonalEmail',
    employee['Personal Email']||''
  );

  set(
    'empMobile',
    employee['Mobile']||''
  );

  set(
    'empDepartment',
    employee['Department']||''
  );

  set(
    'empDesignation',
    employee['Designation']||''
  );

  set(
    'empManager',
    employee['Reporting Manager']||''
  );

  set(
    'empJoiningDate',
    employee['Joining Date']
      ?new Date(
        employee['Joining Date']
      ).toISOString().slice(0,10)
      :''
  );

  set(
    'empEmploymentType',
    employee['Employment Type']||
    'Full Time'
  );

  set(
    'empWorkMode',
    employee['Work Mode']||
    'Office'
  );

  set(
    'empWorkLocation',
    employee['Work Location']||
    'Bhubaneswar'
  );

  set(
    'empEmploymentStatus',
    employee['Employment Status']||
    'Active'
  );

  set(
    'empKycStatus',
    employee['KYC Status']||
    'Pending'
  );
}

/* ---------- documents ---------- */

async function loadPersonDocuments(){
  const q=
    document.getElementById(
      'documentPerson'
    )?.value.trim();

  if(!q){
    toast(
      'Enter an Employee ID or person name.'
    );
    return;
  }

  const target=
    document.getElementById(
      'documentsTable'
    );

  if(target){
    target.innerHTML=
      '<div class="hr-empty"><span class="hr-loading">Loading documents</span></div>';
  }

  try{
    const data=await apiGet(
      'searchEmployees',
      {q}
    );

    const first=
      (data.results||[])[0];

    if(!first){
      if(target){
        target.innerHTML=
          '<div class="hr-empty">Person not found.</div>';
      }
      return;
    }

    const profile=
      await apiGet(
        'getEmployeeProfile',
        {
          employeeId:
            first['Employee ID']
        }
      );

    const docs=
      profile.documents||[];

    if(!target)return;

    target.innerHTML=
      docs.length
        ?`
          <div class="hr-filter-line">
            <div class="count">
              ${docs.length} document(s)
              for ${esc(
                first['Full Name']
              )}
            </div>
          </div>

          <table class="hr-doc-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Category</th>
                <th>File</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              ${docs.map(
                document=>`
                  <tr>
                    <td>
                      ${esc(
                        document['Document Type']||
                        '—'
                      )}
                    </td>

                    <td>
                      ${esc(
                        document['Document Category']||
                        '—'
                      )}
                    </td>

                    <td>
                      ${esc(
                        document['File Name']||
                        '—'
                      )}
                    </td>

                    <td>
                      ${esc(
                        document['Document Status']||
                        '—'
                      )}
                    </td>

                    <td>
                      ${esc(
                        document['Verification Status']||
                        '—'
                      )}
                    </td>

                    <td>
                      ${
                        document['Google Drive URL']
                          ?`
                            <a
                              href="${esc(
                                document['Google Drive URL']
                              )}"
                              target="_blank"
                              rel="noopener"
                            >
                              Open
                            </a>
                          `
                          :'—'
                      }
                    </td>
                  </tr>
                `
              ).join('')}
            </tbody>
          </table>
        `
        :'<div class="hr-empty">No documents are recorded for this person.</div>';

  }catch(error){
    if(target){
      target.innerHTML=
        '<div class="hr-empty">Unable to load documents.</div>';
    }

    toast(
      'Unable to load documents.'
    );
  }
}

/* ---------- tasks ---------- */

async function loadTasks(){
  const target=
    document.getElementById(
      'taskBoard'
    );

  if(!target)return;

  target.innerHTML=
    '<div class="hr-empty"><span class="hr-loading">Loading tasks</span></div>';

  try{
    const data=
      await apiGet(
        'listTasks',
        {}
      );

    state.tasks=
      data.tasks||[];

    renderTasks(
      state.tasks
    );

    refreshTodayStrip();

  }catch(error){
    target.innerHTML=
      '<div class="hr-empty">Tasks could not be loaded.</div>';
  }
}

function renderTasks(tasks){
  const target=
    document.getElementById(
      'taskBoard'
    );

  if(!target)return;

  const q=
    (
      document.getElementById(
        'taskSearch'
      )?.value||
      ''
    ).trim().toLowerCase();

  const priority=
    document.getElementById(
      'taskPriorityFilter'
    )?.value||'';

  const filtered=
    tasks.filter(
      task=>
        (
          !q||
          `${task.title||''} ${
            task.assignee||''
          }`
            .toLowerCase()
            .includes(q)
        )&&
        (
          !priority||
          task.priority===priority
        )
    );

  if(!filtered.length){
    target.innerHTML=
      '<div class="hr-empty">No tasks yet. Use "+ Assign Task" to create the first one.</div>';
    return;
  }

  const columns=[
    ['To Do','To Do'],
    ['In Progress','In Progress'],
    ['Done','Done']
  ];

  target.innerHTML=
    columns.map(
      ([key,label])=>{
        const items=
          filtered.filter(
            task=>
              (task.status||'To Do')===key
          );

        return`
          <div class="hr-task-col">

            <h4>
              ${esc(label)}
              <span>${items.length}</span>
            </h4>

            ${
              items.length
                ?items.map(
                  task=>{
                    const overdue=
                      key!=='Done'&&
                      task.dueDate&&
                      new Date(task.dueDate)<
                        new Date(
                          new Date()
                            .toDateString()
                        );

                    const reminder=
                      waLink(
                        task.mobile,
                        `Hi ${
                          task.assignee||''
                        }, reminder from ORIGENNT HR: "${
                          task.title||''
                        }"${
                          task.dueDate
                            ?` is due ${fmt(task.dueDate)}`
                            :''
                        }.`
                      );

                    return`
                      <div class="hr-task-card">

                        <div
                          style="display:flex;justify-content:space-between;gap:8px"
                        >
                          <strong>
                            ${esc(
                              task.title||
                              'Untitled'
                            )}
                          </strong>

                          <span
                            class="hr-priority ${
                              esc(
                                task.priority||
                                'Medium'
                              )
                            }"
                          >
                            ${esc(
                              task.priority||
                              'Medium'
                            )}
                          </span>
                        </div>

                        ${
                          task.details
                            ?`
                              <p>
                                ${esc(
                                  task.details
                                )}
                              </p>
                            `
                            :''
                        }

                        <div
                          class="hr-task-meta ${
                            overdue
                              ?'overdue'
                              :''
                          }"
                        >
                          <span class="who">
                            ${esc(
                              task.assignee||
                              'Unassigned'
                            )}
                          </span>

                          <span class="due">
                            ${
                              task.dueDate
                                ?`Due ${fmt(task.dueDate)}`
                                :'No due date'
                            }
                          </span>
                        </div>

                        <div class="hr-task-actions">

                          <select
                            data-task-id="${esc(
                              task.id||
                              task['Task ID']||
                              ''
                            )}"
                            class="task-status-select"
                          >
                            <option
                              value="To Do"
                              ${
                                key==='To Do'
                                  ?'selected'
                                  :''
                              }
                            >
                              To Do
                            </option>

                            <option
                              value="In Progress"
                              ${
                                key==='In Progress'
                                  ?'selected'
                                  :''
                              }
                            >
                              In Progress
                            </option>

                            <option
                              value="Done"
                              ${
                                key==='Done'
                                  ?'selected'
                                  :''
                              }
                            >
                              Done
                            </option>
                          </select>

                          ${
                            reminder
                              ?`
                                <a
                                  class="hr-btn small wa"
                                  href="${reminder}"
                                  target="_blank"
                                  rel="noopener"
                                >
                                  Remind on WhatsApp
                                </a>
                              `
                              :''
                          }

                        </div>

                      </div>
                    `;
                  }
                ).join('')
                :'<div class="hr-empty" style="padding:14px">Nothing here.</div>'
            }

          </div>
        `;
      }
    ).join('');

  target
    .querySelectorAll(
      '.task-status-select'
    )
    .forEach(
      select=>
        select.addEventListener(
          'change',
          ()=>updateTaskStatus(
            select.dataset.taskId,
            select.value
          )
        )
    );
}

async function updateTaskStatus(
  taskId,
  status
){
  try{
    const out=
      await apiGet(
        'updateTaskStatus',
        {
          id:taskId,
          status
        }
      );

    if(!out.success){
      throw new Error(
        out.error||
        'Unable to update task'
      );
    }

    toast(
      'Task updated.'
    );

    await loadTasks();

  }catch(error){
    toast(
      error.message||
      'Unable to update task.'
    );
  }
}

async function submitTask(event){
  event.preventDefault();

  const title=
    document.getElementById(
      'taskTitle'
    )?.value.trim();

  if(!title){
    toast(
      'Task title is required.'
    );
    return;
  }

  const data={
    title,

    details:
      document.getElementById(
        'taskDetails'
      )?.value.trim()||'',

    assignee:
      document.getElementById(
        'taskAssignee'
      )?.value.trim()||'',

    mobile:
      document.getElementById(
        'taskAssigneeMobile'
      )?.value.trim()||'',

    priority:
      document.getElementById(
        'taskPriority'
      )?.value||'Medium',

    dueDate:
      document.getElementById(
        'taskDueDate'
      )?.value||'',

    status:'To Do'
  };

  try{
    const out=
      await apiGet(
        'addTask',
        {
          data:JSON.stringify(data)
        }
      );

    if(!out.success){
      throw new Error(
        out.error||
        'Unable to create task'
      );
    }

    closeModal(
      'addTaskModal'
    );

    document
      .getElementById(
        'addTaskForm'
      )
      ?.reset();

    toast(
      'Task assigned.'
    );

    await loadTasks();

    showView('tasks');

    loadRecentActivity();

  }catch(error){
    toast(
      error.message||
      'Unable to assign task.'
    );
  }
}

/* ---------- training ---------- */

async function loadTraining(){
  const target=
    document.getElementById(
      'trainingTable'
    );

  if(!target)return;

  target.innerHTML=
    '<div class="hr-empty"><span class="hr-loading">Loading training records</span></div>';

  try{
    const data=
      await apiGet(
        'listTraining',
        {}
      );

    state.training=
      data.training||[];

    renderTraining(
      state.training
    );

  }catch(error){
    target.innerHTML=
      '<div class="hr-empty">Training records could not be loaded.</div>';
  }
}

function renderTraining(list){
  const target=
    document.getElementById(
      'trainingTable'
    );

  if(!target)return;

  const q=
    (
      document.getElementById(
        'trainingSearch'
      )?.value||
      ''
    ).trim().toLowerCase();

  const status=
    document.getElementById(
      'trainingStatusFilter'
    )?.value||'';

  const filtered=
    list.filter(
      training=>
        (
          !q||
          `${training.name||''} ${
            training.employees||''
          }`
            .toLowerCase()
            .includes(q)
        )&&
        (
          !status||
          training.status===status
        )
    );

  if(!filtered.length){
    target.innerHTML=
      '<div class="hr-empty">No training records yet.</div>';
    return;
  }

  target.innerHTML=`
    <table class="hr-reg-table">
      <thead>
        <tr>
          <th>Programme</th>
          <th>Type</th>
          <th>Employee(s)</th>
          <th>Dates</th>
          <th>Status</th>
          <th>Certificate</th>
        </tr>
      </thead>

      <tbody>
        ${filtered.map(
          training=>`
            <tr>
              <td>
                <strong>
                  ${esc(
                    training.name||
                    '—'
                  )}
                </strong>

                <br>

                <span class="hr-muted">
                  ${esc(
                    training.provider||
                    '—'
                  )}
                </span>
              </td>

              <td>
                ${esc(
                  training.type||
                  '—'
                )}
              </td>

              <td>
                ${esc(
                  training.employees||
                  '—'
                )}
              </td>

              <td>
                ${fmt(
                  training.startDate
                )}
                &rarr;
                ${fmt(
                  training.endDate
                )}
              </td>

              <td>
                ${esc(
                  training.status||
                  'Scheduled'
                )}
              </td>

              <td>
                ${
                  training.certLink
                    ?`
                      <a
                        href="${esc(
                          training.certLink
                        )}"
                        target="_blank"
                        rel="noopener"
                      >
                        Open
                      </a>
                    `
                    :'—'
                }
              </td>
            </tr>
          `
        ).join('')}
      </tbody>
    </table>
  `;
}

async function submitTraining(event){
  event.preventDefault();

  const name=
    document.getElementById(
      'trainingName'
    )?.value.trim();

  const employees=
    document.getElementById(
      'trainingEmployees'
    )?.value.trim();

  if(!name||!employees){
    toast(
      'Programme name and employees are required.'
    );
    return;
  }

  const data={
    name,

    type:
      document.getElementById(
        'trainingType'
      )?.value||'',

    provider:
      document.getElementById(
        'trainingProvider'
      )?.value.trim()||'',

    employees,

    status:
      document.getElementById(
        'trainingStatus'
      )?.value||'Scheduled',

    startDate:
      document.getElementById(
        'trainingStart'
      )?.value||'',

    endDate:
      document.getElementById(
        'trainingEnd'
      )?.value||'',

    certLink:
      document.getElementById(
        'trainingCertLink'
      )?.value.trim()||''
  };

  try{
    const out=
      await apiGet(
        'addTraining',
        {
          data:JSON.stringify(data)
        }
      );

    if(!out.success){
      throw new Error(
        out.error||
        'Unable to save training record'
      );
    }

    closeModal(
      'addTrainingModal'
    );

    document
      .getElementById(
        'addTrainingForm'
      )
      ?.reset();

    toast(
      'Training record saved.'
    );

    await loadTraining();

    showView('training');

    loadRecentActivity();

  }catch(error){
    toast(
      error.message||
      'Unable to save training record.'
    );
  }
}

/* ---------- MPR ---------- */

async function loadMpr(){
  const target=
    document.getElementById(
      'mprTable'
    );

  if(!target)return;

  target.innerHTML=
    '<div class="hr-empty"><span class="hr-loading">Loading MPRs</span></div>';

  try{
    const data=
      await apiGet(
        'listMpr',
        {}
      );

    state.mpr=
      data.mpr||[];

    renderMpr(
      state.mpr
    );

    refreshTodayStrip();

  }catch(error){
    target.innerHTML=
      '<div class="hr-empty">MPRs could not be loaded.</div>';
  }
}

function renderMpr(list){
  const target=
    document.getElementById(
      'mprTable'
    );

  if(!target)return;

  const month=
    document.getElementById(
      'mprMonthFilter'
    )?.value||'';

  const status=
    document.getElementById(
      'mprStatusFilter'
    )?.value||'';

  const filtered=
    list.filter(
      m=>
        (!month||m.month===month)&&
        (!status||m.status===status)
    );

  if(!filtered.length){
    target.innerHTML=
      '<div class="hr-empty">No MPRs logged yet.</div>';
    return;
  }

  target.innerHTML=`
    <table class="hr-reg-table">
      <thead>
        <tr>
          <th>Employee</th>
          <th>Month</th>
          <th>Achievements</th>
          <th>Rating</th>
          <th>Status</th>
        </tr>
      </thead>

      <tbody>
        ${filtered.map(
          m=>`
            <tr>
              <td>
                <strong>
                  ${esc(
                    m.employee||
                    '—'
                  )}
                </strong>
              </td>

              <td>
                ${esc(
                  m.month||
                  '—'
                )}
              </td>

              <td>
                ${esc(
                  (
                    m.achievements||
                    ''
                  ).slice(0,120)
                )}
                ${
                  (
                    m.achievements||
                    ''
                  ).length>120
                    ?'…'
                    :''
                }
              </td>

              <td>
                ${
                  m.rating
                    ?`${esc(m.rating)}/5`
                    :'—'
                }
              </td>

              <td>
                ${esc(
                  m.status||
                  'Draft'
                )}
              </td>
            </tr>
          `
        ).join('')}
      </tbody>
    </table>
  `;
}

async function submitMpr(event){
  event.preventDefault();

  const employee=
    document.getElementById(
      'mprEmployee'
    )?.value.trim();

  const month=
    document.getElementById(
      'mprMonth'
    )?.value;

  const achievements=
    document.getElementById(
      'mprAchievements'
    )?.value.trim();

  if(!employee||!month||!achievements){
    toast(
      'Employee, month and achievements are required.'
    );
    return;
  }

  const data={
    employee,
    month,
    achievements,

    targets:
      document.getElementById(
        'mprTargets'
      )?.value.trim()||'',

    rating:
      document.getElementById(
        'mprRating'
      )?.value||'',

    status:
      document.getElementById(
        'mprStatus'
      )?.value||'Draft'
  };

  try{
    const out=
      await apiGet(
        'addMpr',
        {
          data:JSON.stringify(data)
        }
      );

    if(!out.success){
      throw new Error(
        out.error||
        'Unable to save MPR'
      );
    }

    closeModal(
      'addMprModal'
    );

    document
      .getElementById(
        'addMprForm'
      )
      ?.reset();

    toast(
      'MPR saved.'
    );

    await loadMpr();

    showView('mpr');

    loadRecentActivity();

  }catch(error){
    toast(
      error.message||
      'Unable to save MPR.'
    );
  }
}

/* ---------- appointments ---------- */

async function loadAppointments(){
  const target=
    document.getElementById(
      'appointmentsTable'
    );

  if(!target)return;

  target.innerHTML=
    '<div class="hr-empty"><span class="hr-loading">Loading appointments</span></div>';

  try{
    const data=
      await apiGet(
        'listAppointments',
        {}
      );

    state.appointments=
      data.appointments||[];

    renderAppointments(
      state.appointments
    );

    refreshTodayStrip();

  }catch(error){
    target.innerHTML=
      '<div class="hr-empty">Appointments could not be loaded.</div>';
  }
}

function renderAppointments(list){
  const target=
    document.getElementById(
      'appointmentsTable'
    );

  if(!target)return;

  if(!list.length){
    target.innerHTML=
      '<div class="hr-empty">No appointments booked yet.</div>';
    return;
  }

  const sorted=
    [...list].sort(
      (a,b)=>
        new Date(
          `${a.date||''}T${
            a.startTime||
            '00:00'
          }`
        )-
        new Date(
          `${b.date||''}T${
            b.startTime||
            '00:00'
          }`
        )
    );

  target.innerHTML=`
    <table class="hr-reg-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>With</th>
          <th>Type</th>
          <th>When</th>
          <th>Calendar</th>
        </tr>
      </thead>

      <tbody>
        ${sorted.map(
          appointment=>`
            <tr>

              <td>
                <strong>
                  ${esc(
                    appointment.title||
                    '—'
                  )}
                </strong>

                ${
                  appointment.location
                    ?`
                      <br>
                      <span class="hr-muted">
                        ${esc(
                          appointment.location
                        )}
                      </span>
                    `
                    :''
                }
              </td>

              <td>
                ${esc(
                  appointment.with||
                  '—'
                )}
              </td>

              <td>
                ${esc(
                  appointment.type||
                  '—'
                )}
              </td>

              <td>
                ${fmt(
                  appointment.date
                )}
                &middot;
                ${esc(
                  appointment.startTime||
                  ''
                )}
                ${
                  appointment.endTime
                    ?`&ndash;${esc(
                      appointment.endTime
                    )}`
                    :''
                }
              </td>

              <td>
                <a
                  href="${gcalLink(
                    appointment
                  )}"
                  target="_blank"
                  rel="noopener"
                >
                  Add to Google Calendar
                </a>
              </td>

            </tr>
          `
        ).join('')}
      </tbody>
    </table>
  `;
}

async function submitAppointment(event){
  event.preventDefault();

  const title=
    document.getElementById(
      'apptTitle'
    )?.value.trim();

  const date=
    document.getElementById(
      'apptDate'
    )?.value;

  const startTime=
    document.getElementById(
      'apptStart'
    )?.value;

  if(!title||!date||!startTime){
    toast(
      'Title, date and start time are required.'
    );
    return;
  }

  const data={
    title,

    with:
      document.getElementById(
        'apptWith'
      )?.value.trim()||'',

    type:
      document.getElementById(
        'apptType'
      )?.value||'',

    date,
    startTime,

    endTime:
      document.getElementById(
        'apptEnd'
      )?.value||'',

    location:
      document.getElementById(
        'apptLocation'
      )?.value.trim()||'',

    notes:
      document.getElementById(
        'apptNotes'
      )?.value.trim()||''
  };

  try{
    const out=
      await apiGet(
        'bookAppointment',
        {
          data:JSON.stringify(data)
        }
      );

    if(!out.success){
      throw new Error(
        out.error||
        'Unable to book appointment'
      );
    }

    closeModal(
      'addAppointmentModal'
    );

    document
      .getElementById(
        'addAppointmentForm'
      )
      ?.reset();

    toast(
      out.calendarEventUrl
        ?'Appointment booked and added to Google Calendar.'
        :'Appointment saved.'
    );

    await loadAppointments();

    showView('appointments');

    loadRecentActivity();

  }catch(error){
    toast(
      error.message||
      'Unable to book appointment.'
    );
  }
}

/* ---------- analytics ---------- */

const CHART_INSTANCES={};

function drawChart(id,config){
  if(typeof Chart==='undefined'){
    setTimeout(
      ()=>drawChart(id,config),
      250
    );
    return;
  }

  const canvas=
    document.getElementById(id);

  if(!canvas)return;

  if(CHART_INSTANCES[id]){
    CHART_INSTANCES[id].destroy();
  }

  CHART_INSTANCES[id]=
    new Chart(
      canvas,
      config
    );
}

function countBy(list,fn){
  const map={};

  list.forEach(
    item=>{
      const key=
        fn(item)||
        '—';

      map[key]=
        (map[key]||0)+1;
    }
  );

  return map;
}

function renderAnalytics(){
  const byDept=
    countBy(
      state.people,
      person=>person['Department']
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
      person=>
        person['Employment Type']||
        'Unspecified'
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
      task=>task.status||'To Do'
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
      state.mpr.filter(
        m=>m.rating
      ),
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

  const complianceRows=
    state.compliance.length
      ?state.compliance
      :COMPLIANCE_RULES.map(
        rule=>({
          ...rule,
          status:
            complianceStatus(
              nextOccurrence(rule)
            )
        })
      );

  const byCompliance=
    countBy(
      complianceRows,
      row=>
        row.status==='overdue'
          ?'Overdue'
          :row.status==='soon'
            ?'Due soon'
            :row.status==='ongoing'
              ?'Ongoing'
              :'On track'
    );

  drawChart(
    'chartCompliance',
    {
      type:'bar',
      data:{
        labels:Object.keys(
          byCompliance
        ),
        datasets:[
          {
            label:'Filings',
            data:Object.values(
              byCompliance
            ),
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

/* ---------- authentication ---------- */

let operationsBooted=false;

function parseJwt(token){
  try{
    const parts=
      String(token||'')
        .split('.');

    if(parts.length!==3){
      return null;
    }

    const payload=
      parts[1]
        .replace(/-/g,'+')
        .replace(/_/g,'/');

    const padded=
      payload.padEnd(
        payload.length+
          (4-payload.length%4)%4,
        '='
      );

    return JSON.parse(
      atob(padded)
    );

  }catch(error){
    console.error(
      'Google JWT parse failed:',
      error
    );

    return null;
  }
}

function setAuthGate(visible){
  const gate=
    document.getElementById(
      'authGate'
    );

  if(gate){
    gate.style.display=
      visible
        ?'grid'
        :'none';
  }
}

async function getServerSession(){
  try{
    const response=
      await fetch(
        '/api/auth/session',
        {
          method:'GET',
          credentials:'include',
          cache:'no-store',
          headers:{
            Accept:'application/json'
          }
        }
      );

    if(!response.ok){
      return null;
    }

    const body=
      await response.json();

    if(
      !body||
      !body.authenticated
    ){
      return null;
    }

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

    state.userRole=
      body.user?.role||
      body.role||
      'hr';

    return body;

  }catch(error){
    return null;
  }
}

async function onGoogleSignIn(response){
  const credential=
    response&&
    response.credential;

  if(!credential){
    toast(
      'Google did not return a sign-in credential. Please try again.'
    );
    return;
  }

  try{
    const res=
      await fetch(
        '/api/auth/verify',
        {
          method:'POST',
          credentials:'include',
          headers:{
            'Content-Type':
              'application/json',
            Accept:
              'application/json'
          },
          body:JSON.stringify({
            credential
          })
        }
      );

    const body=
      await res
        .json()
        .catch(
          ()=>({})
        );

    if(
      !res.ok||
      body.success===false
    ){
      throw new Error(
        body.error||
        `Sign-in verification failed (${res.status}).`
      );
    }

    state.userName=
      body.name||
      body.email||
      'HR';

    state.userEmail=
      body.email||
      '';

    state.userRole=
      body.role||
      'hr';

    sessionStorage.setItem(
      'origennt_hr_last_user',
      JSON.stringify({
        email:
          state.userEmail,
        name:
          state.userName
      })
    );

    setGreeting();
    setAuthGate(false);

    await bootOperations();

  }catch(error){
    console.error(
      'Google sign-in failed:',
      error
    );

    toast(
      error.message||
      'Unable to complete sign-in.'
    );
  }
}

/* Expose callback globally for Google Identity Services. */
window.origenntGoogleSignIn=
  onGoogleSignIn;

function devBypassAuth(){
  toast(
    'Local preview bypass is disabled in Production.'
  );
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
    );
  }catch(error){}

  sessionStorage.removeItem(
    'origennt_hr_last_user'
  );

  location.reload();
}

async function bootOperations(){
  if(operationsBooted){
    return;
  }

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

let inactivityTimer=null;

function resetInactivityTimer(){
  clearTimeout(
    inactivityTimer
  );

  inactivityTimer=
    setTimeout(
      ()=>{
        toast(
          'Session expired due to inactivity.'
        );

        signOut();
      },
      1000*60*20
    );
}

function initialiseInactivityTracking(){
  [
    'click',
    'keydown',
    'mousemove',
    'touchstart'
  ].forEach(
    eventName=>
      document.addEventListener(
        eventName,
        resetInactivityTimer,
        {
          passive:true
        }
      )
  );
}

async function initialiseAccess(){
  const session=
    await getServerSession();

  if(session){
    setAuthGate(false);
    setGreeting();
    await bootOperations();
    return;
  }

  setAuthGate(true);

  try{
    if(
      typeof google!=='undefined'&&
      google.accounts&&
      google.accounts.id
    ){

      window.origenntGoogleSignIn=
        onGoogleSignIn;

      google.accounts.id.initialize({
        client_id:
          GOOGLE_CLIENT_ID,

        callback:
          window.origenntGoogleSignIn,

        ux_mode:
          'popup',

        auto_select:
          false,

        cancel_on_tap_outside:
          false,

        use_fedcm_for_button:
          true
      });

      const holder=
        document.getElementById(
          'gsiBtnHolder'
        );

      if(holder){
        holder.innerHTML='';

        google.accounts.id.renderButton(
          holder,
          {
            theme:'filled_black',
            size:'large',
            text:'signin_with',
            shape:'rectangular',
            logo_alignment:'left',
            width:320
          }
        );
      }

    }else{
      console.warn(
        'Google Identity Services not available yet.'
      );
    }

  }catch(error){
    console.error(
      'Google Identity Services initialization failed:',
      error
    );
  }
}

/* ---------- wiring ---------- */

function bindIfExists(
  id,
  event,
  handler
){
  const el=
    document.getElementById(id);

  if(el){
    el.addEventListener(
      event,
      handler
    );
  }
}

function bindEvents(){

  bindIfExists(
    'peopleSearch',
    'input',
    ()=>renderPeople(
      state.people
    )
  );

  bindIfExists(
    'peopleStatus',
    'change',
    ()=>renderPeople(
      state.people
    )
  );

  bindIfExists(
    'peopleDepartment',
    'change',
    ()=>renderPeople(
      state.people
    )
  );

  bindIfExists(
    'peopleEmpType',
    'change',
    ()=>renderPeople(
      state.people
    )
  );

  bindIfExists(
    'refreshPeople',
    'click',
    loadPeople
  );

  bindIfExists(
    'addEmployeeBtn',
    'click',
    openAddEmployee
  );

  bindIfExists(
    'addEmployeeBtn2',
    'click',
    openAddEmployee
  );

  bindIfExists(
    'addEmployeeBtn2b',
    'click',
    openAddEmployee
  );

  bindIfExists(
    'addEmployeeForm',
    'submit',
    submitEmployee
  );

  bindIfExists(
    'employeePhoto',
    'change',
    previewPhoto
  );

  bindIfExists(
    'kycFiles',
    'change',
    showKycFiles
  );

  document
    .querySelectorAll(
      '[data-close-modal]'
    )
    .forEach(
      button=>
        button.addEventListener(
          'click',
          ()=>closeModal(
            button.dataset.closeModal
          )
        )
    );

  bindIfExists(
    'closeProfile',
    'click',
    ()=>{
      document
        .getElementById(
          'employee-record'
        )
        ?.classList.add(
          'hr-hidden'
        );
    }
  );

  bindIfExists(
    'generateBtn',
    'click',
    ()=>showView(
      'generate'
    )
  );

  bindIfExists(
    'loadGenerateEmployee',
    'click',
    loadGeneratePerson
  );

  bindIfExists(
    'templateSearch',
    'input',
    renderTemplates
  );

  bindIfExists(
    'generateDocumentAction',
    'click',
    ()=>{
      if(!state.generatePerson){
        toast(
          'Select a person first.'
        );
        return;
      }

      if(!state.selectedTemplate){
        toast(
          'Select a document template first.'
        );
        return;
      }

      toast(
        'Template selected. Document generation is ready for the backend route.'
      );
    }
  );

  bindIfExists(
    'loadPersonDocuments',
    'click',
    loadPersonDocuments
  );

  bindIfExists(
    'refreshActivity',
    'click',
    loadRecentActivity
  );

  bindIfExists(
    'startExitBtn',
    'click',
    ()=>{
      document
        .getElementById(
          'exitEmployeeId'
        )
        ?.focus();
    }
  );

  bindIfExists(
    'saveExitBtn',
    'click',
    ()=>{
      toast(
        'Exit workflow UI is ready.'
      );
    }
  );

  bindIfExists(
    'addCandidateBtn',
    'click',
    ()=>{
      toast(
        'Candidate creation connects to the CANDIDATES backend module.'
      );
    }
  );

  bindIfExists(
    'candidateSearchBtn',
    'click',
    ()=>{
      toast(
        'Candidate search connects to the CANDIDATES backend module.'
      );
    }
  );

  bindIfExists(
    'addTaskBtn',
    'click',
    ()=>openModal(
      'addTaskModal'
    )
  );

  bindIfExists(
    'addTaskBtnHeader',
    'click',
    ()=>{
      showView('tasks');
      openModal('addTaskModal');
    }
  );

  bindIfExists(
    'addTaskForm',
    'submit',
    submitTask
  );

  bindIfExists(
    'taskSearch',
    'input',
    ()=>renderTasks(
      state.tasks
    )
  );

  bindIfExists(
    'taskPriorityFilter',
    'change',
    ()=>renderTasks(
      state.tasks
    )
  );

  bindIfExists(
    'refreshTasks',
    'click',
    loadTasks
  );

  bindIfExists(
    'addTrainingBtn',
    'click',
    ()=>openModal(
      'addTrainingModal'
    )
  );

  bindIfExists(
    'addTrainingForm',
    'submit',
    submitTraining
  );

  bindIfExists(
    'trainingSearch',
    'input',
    ()=>renderTraining(
      state.training
    )
  );

  bindIfExists(
    'trainingStatusFilter',
    'change',
    ()=>renderTraining(
      state.training
    )
  );

  bindIfExists(
    'refreshTraining',
    'click',
    loadTraining
  );

  bindIfExists(
    'addMprBtn',
    'click',
    ()=>openModal(
      'addMprModal'
    )
  );

  bindIfExists(
    'addMprForm',
    'submit',
    submitMpr
  );

  bindIfExists(
    'mprMonthFilter',
    'change',
    ()=>renderMpr(
      state.mpr
    )
  );

  bindIfExists(
    'mprStatusFilter',
    'change',
    ()=>renderMpr(
      state.mpr
    )
  );

  bindIfExists(
    'refreshMpr',
    'click',
    loadMpr
  );

  bindIfExists(
    'addAppointmentBtn',
    'click',
    ()=>openModal(
      'addAppointmentModal'
    )
  );

  bindIfExists(
    'addAppointmentForm',
    'submit',
    submitAppointment
  );

  bindIfExists(
    'refreshAppointments',
    'click',
    loadAppointments
  );

  document
    .querySelectorAll(
      '.hr-nav button[data-view]'
    )
    .forEach(
      button=>
        button.addEventListener(
          'click',
          ()=>showView(
            button.dataset.view
          )
        )
    );

  bindIfExists(
    'signOutBtn',
    'click',
    signOut
  );

  bindIfExists(
    'sendWaDigestBtn',
    'click',
    ()=>{
      window.open(
        `https://wa.me/?text=${encodeURIComponent(
          buildDailyDigestText()
        )}`,
        '_blank'
      );
    }
  );

  bindIfExists(
    'refreshCompliance',
    'click',
    renderCompliance
  );

  bindIfExists(
    'waComplianceBtn',
    'click',
    waComplianceDigest
  );
}

/* ---------- startup ---------- */

function startApplication(){
  setGreeting();
  renderTemplates();
  renderCompliance();
  wireViewLinks();
  bindEvents();
  initialiseInactivityTracking();

  /*
    IMPORTANT:
    Do not load People / Tasks / MPR / Appointments here.
    They are protected API resources and must only be loaded
    after a valid server session has been established.
  */
  initialiseAccess();
}

if(
  document.readyState==='loading'
){
  document.addEventListener(
    'DOMContentLoaded',
    startApplication,
    {
      once:true
    }
  );
}else{
  startApplication();
}
