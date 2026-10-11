// Buyer persona builder: an eight-step questionnaire that renders a one-page persona sheet.
// Answers save in this browser as they go. A finished persona is sent to /api/buyer-persona, which creates
// a Zoho CRM lead (Lead Source "Website - Buyer persona") and emails a copy to the ED Interactive team.
// No inline styles or scripts: the site's Content-Security-Policy allows neither.
(() => {
const CONFIG = {
  sendTo: 'david@edinteractive.digital', // shown in the fallback when sending fails
  storeKey: 'ed-buyer-persona-v1'
};

/* ===== Questionnaire, based on standard persona and customer profile worksheets ===== */
const STEPS = [
 { id:'you', label:'About you', title:'About you and your business',
   intro:'So we know whose customer this is and how to reach you with the finished persona.',
   fields:[
    {id:'r_name',q:'Your name',type:'text',req:true},
    {id:'r_email',q:'Work email',type:'email',req:true},
    {id:'r_company',q:'Company',type:'text',req:true},
    {id:'r_site',q:'Website',type:'text',ph:'example.com'},
    {id:'r_offer',q:'What do you sell?',type:'textarea',wide:true,hint:'The product or service this buyer purchases.'},
    {id:'r_model',q:'Who do you sell to?',type:'radio',opts:['Businesses (B2B)','Consumers (B2C)','Both']}
   ]},
 { id:'identity', label:'Persona', title:'Give this persona a face',
   intro:'A memorable name and a short story make the persona easy for your team to use. Something like “Operations Olivia”.',
   fields:[
    {id:'p_photo',q:'Photo or avatar',type:'photo',wide:true,hint:'Optional. A stock photo that fits works well.'},
    {id:'p_name',q:'Persona name',type:'text',req:true,ph:'Operations Olivia'},
    {id:'p_title',q:'Job title or role',type:'text',ph:'Director of Operations'},
    {id:'p_keywords',q:'Three to five words that describe them',type:'text',wide:true,ph:'pragmatic, time-poor, data-driven',hint:'Separate with commas.'},
    {id:'p_intro',q:'Introduction',type:'textarea',wide:true,hint:'Two or three sentences on who they are and what a typical day looks like.'},
    {id:'p_quote',q:'A quote that sounds like them',type:'textarea',wide:true,ph:'I don’t have time to babysit another vendor.',hint:'Something they’d actually say about the problem you solve.'}
   ]},
 { id:'demo', label:'Demographics', title:'Demographics and geography',
   intro:'Leave anything blank that doesn’t matter for your business.',
   fields:[
    {id:'d_age',q:'Age range',type:'select',opts:['Under 25','25–34','35–44','45–54','55–64','65+']},
    {id:'d_gender',q:'Gender',type:'select',opts:['Any / mixed','Mostly women','Mostly men','Non-binary']},
    {id:'d_edu',q:'Education',type:'select',opts:['High school','Some college','Bachelor’s degree','Master’s degree','Doctorate','Trade / vocational']},
    {id:'d_income',q:'Household income',type:'select',opts:['Under $50k','$50k–$100k','$100k–$150k','$150k–$250k','$250k+']},
    {id:'d_family',q:'Family status',type:'select',opts:['Single','Partnered, no kids','Parent of young kids','Parent of teens','Empty nester']},
    {id:'d_area',q:'Area type',type:'radio',opts:['Urban','Suburban','Rural']},
    {id:'d_location',q:'Where they live or work',type:'text',wide:true,ph:'Greater Montréal, Ontario, Northeast US',hint:'Country, region, cities or time zones.'}
   ]},
 { id:'company', label:'Company', title:'Their company',
   intro:'For B2B buyers. Skip this step if you sell to consumers.',
   fields:[
    {id:'c_industry',q:'Industry',type:'text',ph:'Metal fabrication, distribution, construction…'},
    {id:'c_size',q:'Company size (employees)',type:'select',opts:['1–10','11–50','51–200','201–1,000','1,001–5,000','5,000+']},
    {id:'c_revenue',q:'Annual revenue',type:'select',opts:['Under $1M','$1M–$10M','$10M–$50M','$50M–$250M','$250M–$1B','$1B+']},
    {id:'c_seniority',q:'Seniority',type:'select',opts:['Individual contributor','Manager','Director','VP','C-suite','Owner / founder']},
    {id:'c_reports',q:'Reports to',type:'text',ph:'COO'},
    {id:'c_budget',q:'Budget authority',type:'radio',opts:['Signs off','Recommends','Influences','None']},
    {id:'c_tools',q:'Tools and vendors they already use',type:'textarea',wide:true}
   ]},
 { id:'psycho', label:'Personality', title:'Behavior, personality and how they learn',
   intro:'Psychographics explain why they buy, not just who they are.',
   fields:[
    {id:'s_intro',type:'scale',q:'Personality',left:'Introvert',right:'Extrovert'},
    {id:'s_think',type:'scale',left:'Analytical',right:'Intuitive'},
    {id:'s_risk',type:'scale',left:'Cautious',right:'Risk-taking'},
    {id:'s_loyal',type:'scale',left:'Loyal to brands',right:'Always shopping around'},
    {id:'s_tech',type:'scale',left:'Tech-wary',right:'Early adopter'},
    {id:'b_learn',q:'How they prefer to learn',type:'chips',wide:true,opts:['Visual (video, diagrams)','Reading (articles, reports)','Hands-on (demos, trials)','Listening (podcasts, calls)','Peer advice']},
    {id:'b_values',q:'Values and beliefs',type:'textarea',wide:true,hint:'What they care about and believe about your category.'},
    {id:'b_interests',q:'Interests and hobbies',type:'textarea',wide:true}
   ]},
 { id:'goals', label:'Goals', title:'Goals and obstacles',
   intro:'The heart of the persona: what they’re trying to achieve and what’s in the way.',
   fields:[
    {id:'g_goals',q:'Goals and motivations',type:'textarea',wide:true,req:true,hint:'Professional and personal. What would make this a great year for them?'},
    {id:'g_pains',q:'Problems and pain points',type:'textarea',wide:true,req:true},
    {id:'g_obstacles',q:'Obstacles to success',type:'textarea',wide:true,hint:'What stops them solving it today: time, budget, skills, politics?'},
    {id:'g_background',q:'Background and context',type:'textarea',wide:true,hint:'Career path, how they got here, what shaped their thinking.'}
   ]},
 { id:'journey', label:'Buying', title:'How they buy',
   intro:'The five rings of buying insight: what triggers a purchase, how they define success, what holds them back, who’s involved and how they decide.',
   fields:[
    {id:'j_trigger',q:'Priority initiatives',type:'textarea',wide:true,hint:'What event or pressure makes them start looking for a solution like yours?'},
    {id:'j_success',q:'Success factors',type:'textarea',wide:true,hint:'What results do they expect after buying?'},
    {id:'j_barriers',q:'Perceived barriers',type:'textarea',wide:true,hint:'What makes them doubt that you, or any solution, will work?'},
    {id:'j_who',q:'Who else is involved in the decision?',type:'chips',wide:true,opts:['Just them','Their boss','Finance','IT / security','Procurement','End users','Spouse / family']},
    {id:'j_cycle',q:'Typical buying cycle',type:'select',opts:['Same day','Under a month','1–3 months','3–6 months','6–12 months','12+ months']},
    {id:'j_dealsize',q:'Typical purchase size',type:'text',ph:'$5k / year'},
    {id:'j_criteria',q:'Top decision criteria',type:'chips',wide:true,max:3,hint:'Pick up to three.',opts:['Price','ROI / proven results','Ease of use','Quality','Support and service','Speed to launch','Reputation / reviews','Integrations','Security','Local / personal relationship']},
    {id:'j_objections',q:'Common sales objections',type:'textarea',wide:true,ph:'“We tried an agency before and it didn’t work.”'}
   ]},
 { id:'channels', label:'Channels', title:'Where to reach them',
   intro:'How they research, where they spend time and how they use what you sell.',
   fields:[
    {id:'h_sources',q:'Where they research solutions',type:'chips',wide:true,opts:['Google search','AI assistants','Review sites','Peers / referrals','Industry publications','Trade shows','Vendor websites','Analyst reports']},
    {id:'h_social',q:'Social platforms they use',type:'chips',wide:true,opts:['LinkedIn','Facebook','Instagram','YouTube','TikTok','X','Reddit','None']},
    {id:'h_contact',q:'How they like to be contacted',type:'chips',wide:true,opts:['Email','Phone','Text','LinkedIn message','In person','Video call']},
    {id:'h_usage',q:'Product usage patterns',type:'textarea',wide:true,hint:'How often they buy or use your product, which features matter, how they found you.'},
    {id:'h_notes',q:'Anything else we should know?',type:'textarea',wide:true}
   ]}
];

const EXAMPLE = {r_name:'Jordan Lee',r_email:'jordan@northpeaklogistics.example',r_company:'Northpeak Logistics (example)',r_site:'northpeaklogistics.example',r_offer:'Fleet tracking software and route planning for regional delivery companies.',r_model:'Businesses (B2B)',
p_name:'Operations Olivia',p_title:'Director of Operations',p_keywords:'pragmatic, time-poor, data-driven, skeptical',p_intro:'Olivia runs day-to-day operations for a 60-truck regional delivery company. Her mornings are spent firefighting late routes and her afternoons in spreadsheets explaining fuel costs to the owner.',p_quote:'I don’t have time to babysit another vendor. Show me it works in a week.',
d_age:'35–44',d_gender:'Any / mixed',d_edu:'Bachelor’s degree',d_income:'$100k–$150k',d_family:'Parent of young kids',d_area:'Suburban',d_location:'Southern Ontario and Québec, mid-size cities',
c_industry:'Logistics and delivery',c_size:'51–200',c_revenue:'$10M–$50M',c_seniority:'Director',c_reports:'Owner / CEO',c_budget:'Recommends',c_tools:'Excel, QuickBooks, an aging GPS system, Slack',
s_intro:40,s_think:20,s_risk:30,s_loyal:35,s_tech:55,b_learn:['Hands-on (demos, trials)','Peer advice'],b_values:'Reliability over flash. Believes most software overpromises. Loyal to vendors who answer the phone.',b_interests:'Youth soccer coach, weekend fishing, follows industry podcasts on the commute.',
g_goals:'Cut late deliveries by 20% this year. Get home by 6pm. Be seen by the owner as the person who modernized the business.',g_pains:'Dispatch runs on spreadsheets and phone calls. No real-time view of drivers. Fuel costs are rising and she can’t prove where the waste is.',g_obstacles:'Small IT team, drivers resistant to new apps, owner wary of long contracts.',g_background:'Started as a dispatcher 12 years ago and worked her way up. Learned most of what she knows on the job.',
j_trigger:'A major customer threatened to leave after three missed delivery windows in a month.',j_success:'Fewer late routes within the first quarter and a weekly report she can forward to the owner.',j_barriers:'Fear that drivers won’t adopt it and that setup will eat her summer.',j_who:['Their boss','Finance','End users'],j_cycle:'1–3 months',j_dealsize:'$18k / year',j_criteria:['Ease of use','ROI / proven results','Support and service'],j_objections:'“We tried a tracking tool in 2021 and the drivers hated it.” “Can we do month-to-month?”',
h_sources:['Peers / referrals','Google search','Review sites'],h_social:['LinkedIn','Facebook','YouTube'],h_contact:['Email','Phone'],h_usage:'Would log in daily at 7am to check routes; the owner looks at a monthly summary.',h_notes:'Found us through a peer at a regional trucking association meetup.'};

/* ===== State ===== */
let data = {}; let cur = 0;
const $ = s => document.querySelector(s);
function load(){ try{ const s = localStorage.getItem(CONFIG.storeKey); if(s) data = JSON.parse(s)||{}; }catch(e){} }
function save(){ try{ localStorage.setItem(CONFIG.storeKey, JSON.stringify(data)); $('#saved').textContent = 'Saved in this browser'; }catch(e){} }
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>{ t.hidden=true; },2600); }
const esc = s => String(s ?? '').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const initials = n => (n||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
const embedded = (()=>{ try{ return window.self!==window.top; }catch(e){ return true; } })();

/* ===== Render form ===== */
function fieldHTML(f){
  const v = data[f.id];
  const lab = f.q ? `<label class="q" for="${f.id}">${esc(f.q)}${f.req?' <span class="req" aria-hidden="true">*</span>':''}</label>` : '';
  const hint = f.hint ? `<div class="hint" id="${f.id}-h">${esc(f.hint)}</div>` : '';
  const desc = f.hint ? `aria-describedby="${f.id}-h"` : '';
  let ctl='';
  switch(f.type){
    case 'text': case 'email':
      ctl=`<input type="${f.type}" id="${f.id}" name="${f.id}" value="${esc(v)}" placeholder="${esc(f.ph||'')}" ${f.req?'required':''} ${desc} ${f.type==='email'?'autocomplete="email"':''}>`; break;
    case 'textarea':
      ctl=`<textarea id="${f.id}" name="${f.id}" placeholder="${esc(f.ph||'')}" ${f.req?'required':''} ${desc}>${esc(v)}</textarea>`; break;
    case 'select':
      ctl=`<select id="${f.id}" name="${f.id}"><option value="">Choose…</option>${f.opts.map(o=>`<option ${v===o?'selected':''}>${esc(o)}</option>`).join('')}</select>`; break;
    case 'radio': case 'chips': {
      const multi=f.type==='chips'; const arr=multi?(v||[]):[v];
      ctl=`<div class="bp-chips" role="group" aria-label="${esc(f.q)}" id="${f.id}">${f.opts.map((o,i)=>`<label class="bp-chip"><input type="${multi?'checkbox':'radio'}" name="${f.id}" id="${f.id}-${i}" value="${esc(o)}" ${arr.includes(o)?'checked':''}><span>${esc(o)}</span></label>`).join('')}</div>`;
      return `<div class="bp-f ${f.wide?'wide':''}"><div class="q">${esc(f.q)}</div>${hint}${ctl}</div>`;
    }
    case 'scale':
      ctl=`<div class="bp-scale"><span>${esc(f.left)}</span><input type="range" min="0" max="100" step="5" id="${f.id}" name="${f.id}" value="${v??50}" aria-label="${esc(f.left)} to ${esc(f.right)}"><span>${esc(f.right)}</span></div>`;
      return `<div class="bp-f wide">${f.q?`<div class="q">${esc(f.q)}</div>`:''}${ctl}</div>`;
    case 'photo':
      ctl=`<div class="bp-photo"><div class="bp-avatar" id="p_avatar">${v?`<img src="${v}" alt="Persona photo">`:esc(initials(data.p_name))}</div><div class="bp-row"><label class="btn btn-ghost bp-small" for="${f.id}">Upload image</label><input type="file" accept="image/*" id="${f.id}" hidden>${v?'<button type="button" class="btn btn-ghost bp-small" id="p_photo_clear">Remove</button>':''}</div></div>`; break;
  }
  return `<div class="bp-f ${f.wide?'wide':''}">${lab}${hint}${ctl}</div>`;
}

function renderSteps(){
  $('#steps').innerHTML = STEPS.map((s,i)=>`<button type="button" data-i="${i}" ${i===cur?'aria-current="step"':''} class="${stepDone(i)?'done':''}">${i+1}. ${esc(s.label)}</button>`).join('') + `<button type="button" data-i="${STEPS.length}">Persona</button>`;
  $('#bar').style.width = Math.round(cur/STEPS.length*100)+'%';
  $('#steps').querySelectorAll('button').forEach(b=>{ b.onclick=()=>go(+b.dataset.i); });
  const a=$('#steps [aria-current]'); if(a) a.scrollIntoView({block:'nearest',inline:'nearest'});
}
function stepDone(i){ return STEPS[i].fields.some(f=>{const v=data[f.id]; return f.type!=='scale' && v && (!Array.isArray(v)||v.length);}); }

function renderStep(){
  const s=STEPS[cur];
  $('#form').innerHTML = `<header><div class="eyebrow">Step ${cur+1} of ${STEPS.length}</div><h2>${esc(s.title)}</h2><p>${esc(s.intro)}</p></header>
    <div class="bp-fields">${s.fields.map(fieldHTML).join('')}</div>
    <p class="err" id="err" hidden></p>
    <div class="bp-nav"><button type="button" class="btn btn-ghost" id="back">${cur?'← Back':'← Back to start'}</button><button type="submit" class="btn btn-primary">${cur===STEPS.length-1?'See my persona →':'Continue →'}</button></div>`;
  $('#back').onclick=()=> cur? go(cur-1) : showIntro();
  const ph=$('#p_photo'); if(ph) ph.onchange=e=>readPhoto(e.target.files[0]);
  const pc=$('#p_photo_clear'); if(pc) pc.onclick=()=>{ delete data.p_photo; save(); renderStep(); };
  renderSteps();
}
function readPhoto(file){
  if(!file) return;
  const img=new Image(), fr=new FileReader();
  fr.onload=()=>{ img.onload=()=>{ const c=document.createElement('canvas'), m=320, k=Math.min(1,m/Math.max(img.width,img.height)); c.width=img.width*k; c.height=img.height*k; c.getContext('2d').drawImage(img,0,0,c.width,c.height); data.p_photo=c.toDataURL('image/jpeg',.82); save(); renderStep(); }; img.src=fr.result; };
  fr.readAsDataURL(file);
}

/* capture input */
document.addEventListener('input',e=>{
  const el=e.target; if(!el.name || !$('#form').contains(el)) return;
  const f=STEPS[cur].fields.find(x=>x.id===el.name); if(!f) return;
  if(f.type==='chips'){
    let arr=[...$('#form').querySelectorAll(`input[name="${f.id}"]:checked`)].map(i=>i.value);
    if(f.max && arr.length>f.max){ el.checked=false; arr=arr.filter(x=>x!==el.value); toast(`Pick up to ${f.max}`); }
    data[f.id]=arr;
  } else if(f.type==='scale'){ data[f.id]=+el.value; }
  else data[f.id]=el.value;
  if(f.id==='r_email') delete data._example;
  if(f.id==='p_name' && !data.p_photo){ const a=$('#p_avatar'); if(a) a.textContent=initials(el.value); }
  save();
});
$('#form').addEventListener('submit',e=>{
  e.preventDefault();
  const missing=STEPS[cur].fields.filter(f=>f.req && !String(data[f.id]||'').trim());
  const badEmail = STEPS[cur].fields.some(f=>f.type==='email' && data[f.id] && !/^\S+@\S+\.\S+$/.test(data[f.id]));
  const err=$('#err');
  if(missing.length||badEmail){ err.hidden=false; err.textContent = missing.length ? `Please fill in: ${missing.map(f=>f.q).join(', ')}.` : 'That email address doesn’t look complete.'; const first=missing[0]; if(first) $('#'+first.id)?.focus(); return; }
  err.hidden=true; go(cur+1);
});

function go(i){
  if(i>=STEPS.length){ showResult(); return; }
  cur=i; $('#intro').hidden=true; $('#result').hidden=true; $('#app').hidden=false; renderStep();
  $('#app').scrollIntoView({behavior:'smooth',block:'start'});
}
function showIntro(){ $('#app').hidden=true; $('#result').hidden=true; $('#intro').hidden=false; }

/* ===== Persona sheet ===== */
const L = id => { for(const s of STEPS){ const f=s.fields.find(x=>x.id===id); if(f) return f.q||`${f.left} / ${f.right}`; } return id; };
const val = id => { const v=data[id]; return Array.isArray(v)? v.join(', ') : (v ?? ''); };
function dlist(ids){ const rows=ids.filter(id=>val(id)).map(id=>`<dt>${esc(L(id))}</dt><dd>${esc(val(id))}</dd>`).join(''); return rows?`<dl>${rows}</dl>`:''; }
function paras(ids){ return ids.filter(id=>val(id)).map(id=>`<p class="para"><b>${esc(L(id))}</b>${esc(val(id))}</p>`).join(''); }
function meters(){ return STEPS.find(s=>s.id==='psycho').fields.filter(f=>f.type==='scale').map(f=>`<div class="bp-meter"><span>${esc(f.left)}</span><i><b data-pos="${data[f.id]??50}"></b></i><span>${esc(f.right)}</span></div>`).join(''); }
function sec(title,inner,full){ return inner?`<section class="${full?'full':''}"><h3>${title}</h3>${inner}</section>`:''; }

function sheetHTML(){
  const kw=(data.p_keywords||'').split(',').map(s=>s.trim()).filter(Boolean);
  const secs=[
    sec('Demographics', dlist(['d_age','d_gender','d_edu','d_income','d_family','d_area','d_location'])),
    sec('Company', dlist(['c_industry','c_size','c_revenue','c_seniority','c_reports','c_budget','c_tools'])),
    sec('Goals and motivations', paras(['g_goals'])),
    sec('Pain points and obstacles', paras(['g_pains','g_obstacles'])),
    sec('Personality', meters()+dlist(['b_learn'])),
    sec('Values and background', paras(['b_values','b_interests','g_background'])),
    sec('How they buy', paras(['j_trigger','j_success','j_barriers'])+dlist(['j_who','j_cycle','j_dealsize','j_criteria']), true),
    sec('Sales objections', paras(['j_objections'])),
    sec('Where to reach them', dlist(['h_sources','h_social','h_contact'])+paras(['h_usage','h_notes']))
  ].filter(Boolean);
  if(secs.length%2) secs[secs.length-1]=secs[secs.length-1].replace('<section class="','<section class="full ');
  return `<article class="bp-sheet" id="sheet">
    <div class="head"><div class="bp-avatar">${data.p_photo?`<img src="${data.p_photo}" alt="">`:esc(initials(data.p_name))}</div>
      <div class="bp-min0"><div class="eyebrow">Buyer persona${data.r_company?` · ${esc(data.r_company)}`:''}</div><h2 class="bp-name">${esc(data.p_name||'Unnamed persona')}</h2>
      ${data.p_title?`<div class="title">${esc(data.p_title)}</div>`:''}
      ${kw.length?`<div class="bp-kw">${kw.map(k=>`<span>${esc(k)}</span>`).join('')}</div>`:''}
      ${data.p_intro?`<p class="para lead">${esc(data.p_intro)}</p>`:''}</div></div>
    ${data.p_quote?`<blockquote>${esc(data.p_quote.replace(/^[“"]|[”"]$/g,''))}</blockquote>`:''}
    <div class="bp-grid">${secs.join('')}</div>
    <div class="foot"><span><span class="mark" aria-hidden="true"></span>Prepared with ED Interactive Group · buyer.edinteractive.digital</span><span>${new Date().toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'})}</span></div>
  </article>`;
}

function plainText(){
  let out=`BUYER PERSONA: ${data.p_name||''}${data.p_title?' ('+data.p_title+')':''}\n`;
  out+=`Submitted by ${data.r_name||''}, ${data.r_company||''} <${data.r_email||''}>${data.r_site?' · '+data.r_site:''}\n`;
  STEPS.forEach(s=>{ const lines=s.fields.filter(f=>f.type!=='photo').map(f=>{ const v=f.type==='scale'? `${data[f.id]??50}/100 toward ${f.right}` : val(f.id); return v?`- ${f.q||(f.left+' vs '+f.right)}: ${v}`:''; }).filter(Boolean); if(lines.length) out+=`\n${s.title.toUpperCase()}\n${lines.join('\n')}\n`; });
  return out;
}

/* ===== Sending: Cloudflare Turnstile check, then /api/buyer-persona (Zoho CRM lead + email to us) ===== */
const siteKey = (document.querySelector('meta[name=turnstile-sitekey]') || {}).content || '';
let tsWidget = null;
function withToken(box, cb){
  if(!siteKey){ cb(''); return; }
  const mount = document.createElement('div'); box.appendChild(mount);
  const render = () => { tsWidget = window.turnstile.render(mount, { sitekey: siteKey, action: 'buyer-persona', size: 'flexible',
    callback: t => cb(t), 'error-callback': () => { cb(null); return true; } }); };
  if(window.turnstile){ render(); return; }
  window.bpTurnstileReady = render;
  const js = document.createElement('script');
  js.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=bpTurnstileReady'; js.async = true;
  js.onerror = () => cb(null); // blocked or offline: fall back to the email link
  document.head.appendChild(js);
}
async function submit(token){
  const text=plainText();
  if(data._sentText===text) return true;
  try{
    const r=await fetch('/api/buyer-persona',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:data.r_name||'',email:data.r_email||'',company:data.r_company||'',persona:data.p_name||'',text,turnstile:token||'',website:''})});
    const j=await r.json().catch(()=>({}));
    if(r.ok && j.ok){ data._sentText=text; save(); return true; }
    return false;
  }catch(e){ return false; }
}

function showResult(){
  $('#app').hidden=true; $('#intro').hidden=true;
  const res=$('#result'); res.hidden=false;
  const subject=`Buyer persona: ${data.p_name||'New persona'} (${data.r_company||''})`;
  const mailto=`mailto:${CONFIG.sendTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainText().slice(0,1800))}`;
  res.innerHTML = `<div class="bp-row bp-reshead no-print"><div><div class="eyebrow">Your persona</div><h2>Here’s ${esc(data.p_name||'your persona')}</h2></div><button class="btn btn-ghost bp-small" id="edit">Edit answers</button></div>
   ${sheetHTML()}
   <div class="bp-actions">
     ${embedded?'':'<button class="btn btn-primary" id="print">Save as PDF</button><button class="btn btn-ghost" id="dl">Download text file</button>'}
     <button class="btn btn-ghost" id="copy">Copy persona text</button>
     <button class="btn btn-ghost" id="new">Start a new persona</button>
   </div>
   <div class="bp-sendbox" id="sendbox"></div>
   <textarea id="copyfallback" class="bp-copy" hidden readonly></textarea>
   <div class="bp-cta no-print"><p><b>Want help turning this persona into pipeline?</b> Book a free 30-minute Zoho &amp; AI strategy call and we’ll map where this buyer shows up in your CRM.</p><a class="btn btn-primary" href="https://bookings.edinteractive.digital/meetwithed30min" target="_blank" rel="noopener">Book a call →</a></div>`;
  res.querySelectorAll('.bp-meter b[data-pos]').forEach(b=>{ b.style.left = Math.max(0,Math.min(100,+b.dataset.pos))+'%'; });
  $('#edit').onclick=()=>go(0);
  $('#new').onclick=()=>{ if(!$('#new').dataset.armed){ $('#new').dataset.armed=1; $('#new').textContent='Tap again to clear all answers'; return; } data={}; save(); showIntro(); };
  $('#copy').onclick=()=>{ const t=plainText(); if(navigator.clipboard) navigator.clipboard.writeText(t).then(()=>toast('Copied'),()=>fallbackCopy(t)); else fallbackCopy(t); };
  if(!embedded){
    $('#print').onclick=()=>window.print();
    $('#dl').onclick=()=>{ const b=new Blob([plainText()],{type:'text/plain'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=`${(data.p_name||'persona').replace(/\W+/g,'-').toLowerCase()}.txt`; a.click(); };
  }
  window.scrollTo({top:0,behavior:'smooth'});
  const box=$('#sendbox');
  const failed = () => { box.innerHTML = `<div><b>Send it to us:</b> <a href="${mailto}">email this persona to ED Interactive</a>, or copy the text above and send it to <code>${esc(CONFIG.sendTo)}</code>.</div>`; };
  if(data._example){ box.innerHTML = 'This is an example, so nothing was sent. Click <b>Edit answers</b> and enter your own details to send a real persona.'; return; }
  if(embedded){ failed(); return; }
  if(data._sentText===plainText()){ box.innerHTML = `<div><b class="ok">Sent.</b> The ED Interactive team has your persona and will be in touch at ${esc(data.r_email)}.</div>`; return; }
  box.innerHTML = '<div>One quick check, then we send a copy to the ED Interactive team…</div>';
  withToken(box, async token => {
    if(token===null){ failed(); return; }
    const ok=await submit(token);
    if(ok) box.innerHTML = `<div><b class="ok">Sent.</b> The ED Interactive team has your persona and will be in touch at ${esc(data.r_email)}.</div>`;
    else failed();
  });
}
function fallbackCopy(t){ const ta=$('#copyfallback'); ta.hidden=false; ta.value=t; ta.select(); toast('Select all and copy'); }

/* ===== Boot ===== */
load();
if(Object.keys(data).length) $('#saved').textContent='Saved in this browser';
$('#start').onclick=()=>go(0);
$('#example').onclick=()=>{ data=JSON.parse(JSON.stringify(EXAMPLE)); data._example=true; save(); showResult(); toast('Example loaded. Edit answers to make it yours.'); };
})();
