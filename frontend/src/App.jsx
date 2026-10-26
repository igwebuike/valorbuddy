import React,{useEffect,useMemo,useRef,useState}from'react';
import{Shield,Mic,MicOff,LogOut,User,Calendar,MapPin,Heart,Folder,Music,Bell,Brain,Search,ChevronRight,BarChart3,Lock,Eye,EyeOff,Plus,Upload,FileText,RefreshCw,Radio,Menu,X,Trash2,Car,Home,Briefcase,Navigation,DollarSign,BookOpen,TrendingUp,CheckCircle2,Clock,ArrowUpRight,Star}from'lucide-react';
import{Capacitor}from'@capacitor/core';
import{TextToSpeech}from'@capacitor-community/text-to-speech';
import{SpeechRecognition as NativeSpeechRecognition}from'@capgo/capacitor-speech-recognition';
import'./style.css';
import valorLogo from './assets/valorbuddy-logo.png';
import armyEmblem from './assets/branches/army.png';
import navyEmblem from './assets/branches/navy.png';
import airForceEmblem from './assets/branches/airforce.png';
import marinesEmblem from './assets/branches/marines.png';
import coastGuardEmblem from './assets/branches/coastguard.png';
import spaceForceEmblem from './assets/branches/spaceforce.png';
const API=(import.meta.env.VITE_API_BASE_URL||'https://valorbuddy.onrender.com').replace(/\/$/,'');
const branches={
Army:{emblem:armyEmblem,cls:'army',short:'Army',color:'#10b981',label:'Army Mission Control',motto:'Duty. Honor. Support.',style:{'--branch-bg':'#070e0a','--branch-panel':'#0c1812','--branch-panel-elevated':'#12241b','--branch-primary':'#10b981','--branch-gold':'#E5C158','--branch-border-subtle':'rgba(16,185,129,0.18)','--branch-glow':'rgba(16,185,129,0.15)'}},
Navy:{emblem:navyEmblem,cls:'navy',short:'Navy',color:'#38bdf8',label:'United States Navy • Fleet Command',motto:'Honor. Courage. Commitment.',style:{'--branch-bg':'#020b14','--branch-panel':'#06182c','--branch-panel-elevated':'#0a2440','--branch-primary':'#38bdf8','--branch-gold':'#E5C158','--branch-border-subtle':'rgba(56,189,248,0.18)','--branch-glow':'rgba(56,189,248,0.15)'}},
'Air Force':{emblem:airForceEmblem,cls:'airforce',short:'USAF',color:'#60a5fa',label:'Air Force Flight Operations',motto:'Aim High. Fly. Fight. Support.',style:{'--branch-bg':'#040d1a','--branch-panel':'#081a32','--branch-panel-elevated':'#0d274a','--branch-primary':'#60a5fa','--branch-gold':'#93c5fd','--branch-border-subtle':'rgba(96,165,250,0.18)','--branch-glow':'rgba(96,165,250,0.15)'}},
Marines:{emblem:marinesEmblem,cls:'marines',short:'USMC',color:'#ef4444',label:'Marine Command Post',motto:'Semper Fidelis. Always Faithful.',style:{'--branch-bg':'#0f0505','--branch-panel':'#1b0c0c','--branch-panel-elevated':'#281313','--branch-primary':'#ef4444','--branch-gold':'#E5C158','--branch-border-subtle':'rgba(239,68,68,0.2)','--branch-glow':'rgba(239,68,68,0.15)'}},
'Coast Guard':{emblem:coastGuardEmblem,cls:'coastguard',short:'USCG',color:'#06b6d4',label:'Coast Guard Rescue Operations',motto:'Semper Paratus. Always Ready.',style:{'--branch-bg':'#030f16','--branch-panel':'#061d2b','--branch-panel-elevated':'#0a2c3f','--branch-primary':'#06b6d4','--branch-gold':'#f97316','--branch-border-subtle':'rgba(6,182,212,0.2)','--branch-glow':'rgba(6,182,212,0.15)'}},
'Space Force':{emblem:spaceForceEmblem,cls:'spaceforce',short:'USSF',color:'#a855f7',label:'Space Force Orbital Command',motto:'Semper Supra. Always Above.',style:{'--branch-bg':'#060511','--branch-panel':'#0f0c22','--branch-panel-elevated':'#171335','--branch-primary':'#a855f7','--branch-gold':'#e2e8f0','--branch-border-subtle':'rgba(168,85,247,0.2)','--branch-glow':'rgba(168,85,247,0.15)'}}
};
const branchAliases={
  army:'Army','u.s. army':'Army','us army':'Army','army veteran':'Army','u.s. army veteran':'Army',
  navy:'Navy','u.s. navy':'Navy','us navy':'Navy','navy veteran':'Navy','u.s. navy veteran':'Navy',
  airforce:'Air Force','air force':'Air Force','u.s. air force':'Air Force','us air force':'Air Force','air force veteran':'Air Force','u.s. air force veteran':'Air Force',
  marines:'Marines','marine':'Marines','marine corps':'Marines','u.s. marine corps':'Marines','us marine corps':'Marines','marines veteran':'Marines','marine corps veteran':'Marines',
  coastguard:'Coast Guard','coast guard':'Coast Guard','u.s. coast guard':'Coast Guard','us coast guard':'Coast Guard','coast guard veteran':'Coast Guard',
  spaceforce:'Space Force','space force':'Space Force','u.s. space force':'Space Force','us space force':'Space Force','space force veteran':'Space Force'
};
function normalizeBranch(value){
  const raw=String(value||'').trim();
  if(branches[raw]) return raw;
  const key=raw.toLowerCase().replace(/[^a-z\s.]/g,'').replace(/\s+/g,' ').trim();
  return branchAliases[key]||branchAliases[key.replace(/\./g,'')]||'Army';
}
function applyBranchTheme(branch){
  const key=normalizeBranch(branch);
  const b=branches[key]||branches.Army;
  try{
    document.documentElement.setAttribute('data-branch',b.cls);
    document.body.setAttribute('data-branch',b.cls);
    document.body.classList.remove('army','navy','airforce','marines','coastguard','spaceforce');
    document.body.classList.add(b.cls);
    Object.entries(b.style||{}).forEach(([k,v])=>document.documentElement.style.setProperty(k,v));
    localStorage.setItem('valor_branch_theme',key);
  }catch{}
  return key;
}


function saveBrowserLocation(){
  try{
    if(!navigator.geolocation)return;
    navigator.geolocation.getCurrentPosition(pos=>{
      const lat=pos.coords.latitude;
      const lng=pos.coords.longitude;
      localStorage.setItem('valor_lat',String(lat));
      localStorage.setItem('valor_lng',String(lng));
    },()=>{}, {enableHighAccuracy:true,timeout:8000,maximumAge:300000});
  }catch{}
}

async function freshLocation({required=false,maximumAge=15000}={}){
  if(!navigator.geolocation){
    if(required)throw new Error('Location is not supported by this browser.');
    return {...locationPayload(),source:'cached',error:'unsupported'};
  }
  return await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(pos=>{
    const lat=pos.coords.latitude,lng=pos.coords.longitude;
    localStorage.setItem('valor_lat',String(lat));localStorage.setItem('valor_lng',String(lng));
    localStorage.setItem('valor_location_updated',String(Date.now()));
    resolve({lat,lng,accuracy:pos.coords.accuracy,source:'gps'});
  },err=>{
    const messages={1:'Location permission was denied. Enable location access for ValorBuddy in your browser settings and try again.',2:'Your current location could not be determined. Check Location Services and your connection, then try again.',3:'Location request timed out. Please try again.'};
    const message=messages[err?.code]||'ValorBuddy could not get your current location.';
    if(required)reject(new Error(message));
    else resolve({...locationPayload(),source:'cached',error:message});
  },{enableHighAccuracy:true,timeout:12000,maximumAge}));
}
function locationPayload(){
  const lat=localStorage.getItem('valor_lat');
  const lng=localStorage.getItem('valor_lng');
  return {lat:lat?Number(lat):null,lng:lng?Number(lng):null};
}
function voicePreferences(){
  const style=localStorage.getItem('valor_voice_style')||'command';
  return {style,voiceName:localStorage.getItem('valor_voice_name')||''};
}
const voiceStyles={
  command:{label:'Command — strong & steady',rate:.9,pitch:.78,volume:1},
  clear:{label:'Clear — professional',rate:.96,pitch:.94,volume:1},
  calm:{label:'Calm — reassuring',rate:.86,pitch:.9,volume:1},
  warm:{label:'Warm — conversational',rate:.92,pitch:1.02,volume:1}
};
function friendlyVoiceLabel(v){
  let name=String(v?.name||'Voice').trim();
  const lang=String(v?.lang||'').toLowerCase();
  name=name
    .replace(/^Microsoft\s+/i,'')
    .replace(/\s*-\s*English\s*\(United States\)\s*$/i,'')
    .replace(/\s*-\s*English\s*\(United Kingdom\)\s*$/i,'')
    .replace(/\s*-\s*English\s*\(Australia\)\s*$/i,'')
    .replace(/\s*-\s*English\s*\(Canada\)\s*$/i,'')
    .trim();
  const region=lang.includes('en-us')?'US':lang.includes('en-gb')?'UK':lang.includes('en-au')?'AU':lang.includes('en-ca')?'CA':'';
  return region && !name.toLowerCase().includes(region.toLowerCase()) ? `${name} • ${region}` : name;
}
function authHeaders(){const t=localStorage.getItem('valor_token');return t?{Authorization:`Bearer ${t}`}:{} }
function getDemoFallback(path,opts={}){
  const currentBranch=normalizeBranch(localStorage.getItem('valor_branch_theme')||'Army');
  if(path==='/auth/me'){
    return{id:'demo-veteran-001',email:'veteran.preview@valorbuddy.com',first_name:'Alex',last_name:'Vance',role:'member',branch:currentBranch,city:'Austin',state:'TX',rank:'SFC',service_status:'Veteran',approval_status:'approved',is_demo:true};
  }
  if(path==='/api/briefing'){
    return{
      headline:'Tactical Staging Command • Operational',
      briefing:'Enterprise v7 UI loaded. Multi-branch theme switcher active. DD-214 vault, claims intel, and battle buddy ready.',
      tasks:[
        {id:'1',title:'Review VA Disability claim evidence (VA Form 21-526EZ)',done:false,priority:'high'},
        {id:'2',title:'Confirm next VAMC primary care checkup in Austin',done:true,priority:'medium'},
        {id:'3',title:'Verify Texas Hazlewood Act tuition exemption documents',done:false,priority:'medium'}
      ],
      intel:[
        {type:'PACT Act',note:'Toxic exposure screening open daily at Austin VA Clinic without prior appointment.'},
        {type:'Branch Alert',note:`${currentBranch} regional community muster scheduled for this Saturday.`}
      ]
    };
  }
  if(path==='/api/reminders'){
    return[
      {id:'r1',title:'VA Telehealth Appointment',due_date:'2026-11-05T14:00:00Z',notes:'Routine check-in with Dr. Miller',completed:false},
      {id:'r2',title:'Submit DD-214 verification for State Tuition Exemption',due_date:'2026-11-12T17:00:00Z',notes:'Texas Hazlewood Act documentation',completed:false},
      {id:'r3',title:'VFW Post 8787 Monthly Assembly',due_date:'2026-11-18T18:30:00Z',notes:'Community outreach planning',completed:false}
    ];
  }
  if(path==='/api/memories'){
    return[
      {id:'m1',title:'Deployment at Fort Cavazos (Hood)',date:'2019-06-15',note:'3rd Armored Brigade Combat Team field operations exercise.',branch:currentBranch},
      {id:'m2',title:'Promotion to Sergeant First Class',date:'2022-03-01',note:'Surrounded by brothers and sisters in arms. Honor to lead.',branch:currentBranch}
    ];
  }
  if(path==='/api/documents'){
    return[
      {id:'d1',title:'DD Form 214 - Certificate of Release',document_type:'DD-214',date:'2024-04-30',status:'verified',classification:'Personal Vault'},
      {id:'d2',title:'VA Benefits Summary & Service Verification Letter',document_type:'VA Rating',date:'2024-06-15',status:'verified',classification:'Personal Vault'},
      {id:'d3',title:'Joint Services Transcript (JST)',document_type:'Education',date:'2024-05-10',status:'verified',classification:'Career Dossier'}
    ];
  }
  if(path==='/api/music/genres'){
    return{genres:['Military Cadences & Anthems','Country & Southern Rock','Classic Rock','Lo-Fi Chill & Focus','Inspirational & Healing']};
  }
  if(path==='/api/music/favorites')return[];
  if(path==='/api/agentic/missions'){
    return[
      {id:'mis-1',title:'VA Claim Evidence Assembly',status:'in_progress',target:'VA Form 21-526EZ',description:'Cross-referencing service treatment records with nexus letters.'},
      {id:'mis-2',title:'Military MOS to Tech Resume Translation',status:'ready',target:'Cybersecurity Analyst',description:'Converted 25B Information Technology Specialist skills into civilian competencies.'}
    ];
  }
  if(path==='/api/companion/chat'||path==='/api/vapi/action'){
    return{
      response:`Battle Buddy standing by in Staging Preview mode. I can help explore VA claims, translate military specialties, find nearby VAMC clinics, and assist your transition.`,
      intent:'assistant_help',
      data:{
        items:[
          {
            title:"Austin VA Outpatient Clinic",
            location:"7901 Metropolis Dr, Austin, TX 78744",
            description:"Primary care, mental health, specialty clinics and PACT Act coordinators.",
            rating:4.8,
            review_count:312,
            open_now:true,
            phone:"512-823-4000",
            maps_url:"https://maps.google.com/?q=Austin+VA+Clinic",
            assistant_explanation:"Top rated regional facility with walk-in triage and full VA benefits assistance."
          },
          {
            title:"Texas Veterans Commission - State Office",
            location:"1700 N Congress Ave, Austin, TX 78701",
            description:"Accredited Veteran Service Officers (VSO) ready to represent your claim.",
            rating:4.9,
            review_count:145,
            open_now:true,
            phone:"512-463-6564",
            maps_url:"https://maps.google.com/?q=Texas+Veterans+Commission+Austin",
            assistant_explanation:"Direct advocacy for claims, appeals, Hazelwood exemption, and veteran employment."
          }
        ]
      }
    };
  }
  if(path.startsWith('/admin/')){
    return{overview:{total_users:142,approved_users:138,pending_partners:3},items:[]};
  }
  return{status:'ok',items:[],data:{}};
}
async function api(path,opts={}){
  const isDemo=localStorage.getItem('valor_token')==='demo-preview-token';
  let r;
  try{
    r=await fetch(API+path,{...opts,headers:{'Content-Type':'application/json',...authHeaders(),...(opts.headers||{})}});
  }catch(err){
    if(isDemo)return getDemoFallback(path,opts);
    throw new Error('ValorBuddy could not reach the server. Please check your connection and try again in a few seconds.');
  }
  if(!r.ok){
    if(isDemo)return getDemoFallback(path,opts);
    let e=`Request failed (${r.status})`;
    try{
      const body=await r.json();
      if(typeof body?.detail==='string')e=body.detail;
      else if(Array.isArray(body?.detail))e=body.detail.map(x=>x?.msg||String(x)).join('; ');
      else if(body?.message)e=body.message;
    }catch{}
    throw new Error(e);
  }
  return r.json();
}
const speechState={queue:[],timer:null,active:false,nativeVoices:[]};
const isNativeApp=()=>Capacitor.isNativePlatform();
function stopSpeaking(){
  try{
    clearTimeout(speechState.timer);speechState.queue=[];speechState.active=false;
    if(isNativeApp())TextToSpeech.stop().catch(()=>{});
    else window.speechSynthesis?.cancel();
  }catch{}
}
function speechChunks(text,items=[]){
  if(items?.length){
    const out=[`I found ${Math.min(items.length,3)} options. I’ll explain them one at a time.`];
    items.slice(0,3).forEach((x,i)=>{
      const title=x.title||x.name||`option ${i+1}`;
      const rating=x.rating?` It has a rating of ${x.rating}.`:'';
      const why=x.assistant_explanation||x.description||x.summary||'';
      out.push(`${i===0?'First':i===1?'The next one is':'The third option is'} ${title}.${rating} ${why}`.trim());
    });
    out.push('You can say stop at any time, ask why I chose one, or say one, two, or three.');
    return out;
  }
  return String(text||'').split(/(?<=[.!?])\s+/).filter(Boolean).reduce((a,x)=>{if((a[a.length-1]||'').length<150)a[a.length-1]=(a[a.length-1]?a[a.length-1]+' ':'')+x;else a.push(x);return a},['']).filter(Boolean);
}
function speak(text,{items=[],onDone}={}){
  stopSpeaking();
  speechState.queue=speechChunks(text,items);
  const next=async()=>{
    const chunk=speechState.queue.shift();
    if(!chunk){speechState.active=false;onDone?.();return}
    try{
      const prefs=voicePreferences();const style=voiceStyles[prefs.style]||voiceStyles.command;
      if(isNativeApp()){
        if(!speechState.nativeVoices.length){
          const result=await TextToSpeech.getSupportedVoices();
          speechState.nativeVoices=result?.voices||[];
        }
        const voices=speechState.nativeVoices;
        let voiceIndex=voices.findIndex(v=>v.name===prefs.voiceName);
        if(voiceIndex<0)voiceIndex=voices.findIndex(v=>/en-us|english.*united states/i.test(`${v.lang||''} ${v.name||''}`));
        speechState.active=true;
        await TextToSpeech.speak({text:chunk,lang:'en-US',rate:style.rate,pitch:style.pitch,volume:style.volume,queueStrategy:0,...(voiceIndex>=0?{voice:voiceIndex}:{})});
        speechState.timer=setTimeout(next,350);
        return;
      }
      const u=new SpeechSynthesisUtterance(chunk);
      u.rate=style.rate;u.pitch=style.pitch;u.volume=style.volume;
      const available=window.speechSynthesis?.getVoices?.()||[];
      const chosen=available.find(v=>v.name===prefs.voiceName)||available.find(v=>/Aaron|Daniel|Alex|David|Google US English|Microsoft.*(Guy|Mark)/i.test(v.name))||available.find(v=>String(v.lang||'').toLowerCase().startsWith('en'));
      if(chosen)u.voice=chosen;
      u.onend=()=>{speechState.timer=setTimeout(next,650)};
      u.onerror=()=>{speechState.timer=setTimeout(next,300)};
      speechState.active=true;window.speechSynthesis.speak(u)
    }catch{next()}
  };
  next();
}

function cleanVisibleText(value=''){
  return String(value||'')
    .replace(/```(?:[a-zA-Z0-9_-]+)?\n?/g,'')
    .replace(/```/g,'')
    .replace(/\*\*(.*?)\*\*/gs,'$1')
    .replace(/__(.*?)__/gs,'$1')
    .replace(/(^|[^\*])\*([^\*\n]+)\*(?!\*)/g,'$1$2')
    .replace(/^#{1,6}\s+/gm,'')
    .replace(/^[ \t]*[-*][ \t]+/gm,'• ')
    .replace(/\n{3,}/g,'\n\n')
    .trim();
}

function LinkifiedText({text=''}){
  const cleaned=cleanVisibleText(text);
  const parts=cleaned.split(/(https?:\/\/[^\s<>()]+)/g);
  return <>{parts.map((part,i)=>/^https?:\/\//i.test(part)?<a className="officialResourceLink" href={part.replace(/[.,;:!?]+$/,'')} target="_blank" rel="noopener noreferrer" key={i}>Open official resource ↗</a>:<span key={i}>{part}</span>)}</>;
}

function HealthSafetyNotice(){
  return <aside className="healthSafetyNotice" role="note" aria-label="Veterans Crisis and Emergency Support">
    <div className="healthSafetyInfo">
      <span className="healthSafetyBadge">CRISIS SUPPORT</span>
      <span><b>Important:</b> Informational & organizational support only. Not emergency or medical service. Free confidential support 24/7:</span>
    </div>
    <div className="healthSafetyActions">
      <a className="crisisAction emergencyAction" href="tel:911" aria-label="Call 911 for emergencies">Emergency: 911</a>
      <a className="crisisAction vclAction" href="tel:988" aria-label="Call Veterans Crisis Line 988, then press 1">
        <span>Veterans Crisis Line:</span> <b>Call 988, then press 1</b>
      </a>
    </div>
  </aside>;
}



function PrivacyPolicy(){
  const updated='August 2, 2026';
  return <div className="privacyPage">
    <header className="privacyHeader">
      <a className="privacyBrand" href="/" aria-label="Return to ValorBuddy home"><img src={valorLogo} alt="ValorBuddy"/><span><b>ValorBuddy</b><small>Your Digital Battle Buddy</small></span></a>
      <a className="privacyHomeLink" href="/">Return to ValorBuddy</a>
    </header>
    <main className="privacyShell">
      <section className="privacyHero">
        <span className="privacyEyebrow">TAGUS TECHNOLOGIES LLC</span>
        <h1>ValorBuddy Privacy Policy</h1>
        <p>ValorBuddy supports veterans, service members, military families, caregivers, and authorized users with AI-assisted guidance, reminders, document tools, local recommendations, career resources, and other digital services.</p>
        <div className="privacyMeta"><span><b>Effective date:</b> {updated}</span><span><b>Last updated:</b> {updated}</span></div>
      </section>

      <section className="privacyCard privacySummary">
        <h2>Privacy at a glance</h2>
        <div className="privacySummaryGrid">
          <div><Shield/><h3>Your information has a purpose</h3><p>We collect information needed to provide, secure, personalize, and improve ValorBuddy.</p></div>
          <div><Lock/><h3>You control your account</h3><p>You may request access, correction, export, or deletion of your information.</p></div>
          <div><EyeOff/><h3>We do not sell personal data</h3><p>ValorBuddy does not sell your personal information or uploaded documents.</p></div>
        </div>
      </section>

      <section className="privacyCard">
        <h2>1. Who we are</h2>
        <p>ValorBuddy is operated by <b>TAGUS Technologies LLC</b>. In this policy, “ValorBuddy,” “we,” “us,” and “our” refer to TAGUS Technologies LLC and the ValorBuddy service, including the ValorBuddy mobile application and website.</p>
      </section>

      <section className="privacyCard">
        <h2>2. Information we collect</h2>
        <h3>Information you provide</h3>
        <ul>
          <li><b>Account and profile information:</b> name, email address, password-protected account credentials, military branch, service status, rank, location, career information, and other profile details you choose to provide.</li>
          <li><b>Military and career information:</b> MOS, AFSC, rating, military role, service history, deployments, education, certifications, career goals, and business interests.</li>
          <li><b>Content you create:</b> AI conversations, missions, memories, reminders, notes, saved media links, favorites, and feedback.</li>
          <li><b>Documents you upload:</b> resumes, DD214 records, VA-related documents, certifications, PDFs, DOCX files, and other files you choose to submit for storage or analysis.</li>
          <li><b>Communications:</b> information you provide when contacting support or requesting help.</li>
        </ul>
        <h3>Information collected through device features</h3>
        <ul>
          <li><b>Location:</b> with your permission, approximate or precise location may be used to identify nearby VA facilities, veteran organizations, activities, travel resources, and other relevant places.</li>
          <li><b>Microphone and voice:</b> with your permission, microphone access may be used for voice conversations and commands. Audio may be processed to provide the requested voice feature.</li>
          <li><b>Photos, camera, and files:</b> only when you choose to upload or attach content.</li>
          <li><b>Notifications:</b> device notification identifiers and preferences may be used to deliver reminders and service updates when notifications are enabled.</li>
        </ul>
        <h3>Information collected automatically</h3>
        <p>We may collect device type, operating system, app version, IP address, timestamps, diagnostic data, crash information, security events, and feature usage information needed to operate and protect the service.</p>
      </section>

      <section className="privacyCard">
        <h2>3. How we use information</h2>
        <ul>
          <li>Provide and personalize ValorBuddy features.</li>
          <li>Answer questions and complete user-requested AI tasks.</li>
          <li>Analyze user-submitted documents and generate requested summaries or drafts.</li>
          <li>Provide local recommendations, directions, travel guidance, events, and nearby resources.</li>
          <li>Create and deliver reminders, alerts, and notifications.</li>
          <li>Maintain accounts, saved preferences, favorites, memories, and conversation history.</li>
          <li>Detect fraud, abuse, security threats, errors, and service disruptions.</li>
          <li>Improve accessibility, reliability, relevance, and performance.</li>
          <li>Comply with law and enforce our terms and policies.</li>
        </ul>
      </section>

      <section className="privacyCard">
        <h2>4. AI-assisted features</h2>
        <p>ValorBuddy uses artificial intelligence to respond to questions, explain options, help organize information, analyze documents, and generate drafts. AI output may be incomplete or inaccurate and should be reviewed before relying on it.</p>
        <p>ValorBuddy is not a government agency, law firm, financial institution, healthcare provider, or emergency service. Information provided by the app is for general informational and organizational support and does not replace professional, legal, medical, financial, benefits, or emergency advice.</p>
      </section>

      <section className="privacyCard">
        <h2>5. When information is shared</h2>
        <p>We may share information only as needed with service providers that help operate ValorBuddy, such as cloud hosting, databases, authentication, AI processing, mapping and places services, communications, analytics, document processing, and app distribution providers.</p>
        <p>These providers may process information on our behalf under their own contractual and security obligations. Depending on the feature you use, providers may include Google services, Google Play, mapping or places services, voice-processing services, cloud infrastructure providers, and other vendors necessary to fulfill your request.</p>
        <p>We may also disclose information when required by law, to protect rights or safety, to investigate abuse or security incidents, or as part of a merger, financing, acquisition, or sale of business assets subject to appropriate safeguards.</p>
        <p><b>We do not sell your personal information.</b></p>
      </section>

      <section className="privacyCard">
        <h2>6. Documents and sensitive information</h2>
        <p>Uploaded documents may contain sensitive personal information. Upload only information you are authorized and comfortable providing. Do not upload classified information, passwords, access codes, complete payment card details, or information belonging to another person without permission.</p>
        <p>Documents are used to provide the feature you request, such as extraction, summarization, career assistance, benefits organization, or secure retrieval. You may request deletion as described below.</p>
      </section>

      <section className="privacyCard">
        <h2>7. Data retention</h2>
        <p>We retain account data while an account is active, password-reset tokens for up to 30 minutes, security and access logs for 365 days, and encrypted backups under a limited rotation. See our <a href="/data-retention-policy">Data Retention and Deletion Policy</a> for the complete schedule.</p>
      </section>

      <section className="privacyCard">
        <h2>8. Your choices and rights</h2>
        <ul>
          <li>Update profile information within ValorBuddy where available.</li>
          <li>Control location, microphone, camera, file, and notification permissions through your device settings.</li>
          <li>Delete individual memories, reminders, documents, favorites, or other saved items where the app provides that option.</li>
          <li>Request access, correction, export, restriction, objection, or deletion where applicable.</li>
          <li>Withdraw consent for optional processing by disabling the relevant permission or contacting us.</li>
        </ul>
        <div className="privacyCallout"><h3>Account and data deletion</h3><p>To request deletion of your ValorBuddy account and associated personal data, visit our <a href="/delete-account">Account Deletion page</a>. You may also email <a href="mailto:privacy@valorbuddy.com?subject=ValorBuddy%20Account%20Deletion%20Request">privacy@valorbuddy.com</a>. We may need to verify your identity before completing the request.</p></div>
      </section>

      <section className="privacyCard">
        <h2>9. Security</h2>
        <p>We use reasonable administrative, technical, and organizational safeguards designed to protect information. However, no internet transmission, mobile application, or storage system can be guaranteed to be completely secure. Keep your credentials confidential and notify us promptly of suspected unauthorized access.</p>
      </section>

      <section className="privacyCard">
        <h2>10. Children’s privacy</h2>
        <p>ValorBuddy is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided personal information without appropriate authorization, contact us so we can review and delete it where required.</p>
      </section>

      <section className="privacyCard">
        <h2>11. Third-party links and services</h2>
        <p>ValorBuddy may provide links to third-party websites, music providers, government resources, maps, veteran organizations, employers, and other services. Their privacy practices are governed by their own policies, and we are not responsible for their content or practices.</p>
      </section>

      <section className="privacyCard">
        <h2>12. Changes to this policy</h2>
        <p>We may update this policy as ValorBuddy changes. We will post the revised policy on this page and update the “Last updated” date. Material changes may also be communicated through the app or by other appropriate means.</p>
      </section>

      <section className="privacyCard privacyContact">
        <h2>13. Contact us</h2>
        <p>Questions, privacy requests, and complaints may be directed to:</p>
        <address><b>TAGUS Technologies LLC</b><br/>ValorBuddy Privacy Team<br/><a href="mailto:privacy@valorbuddy.com">privacy@valorbuddy.com</a><br/><a href="https://valorbuddy.com">https://valorbuddy.com</a></address>
      </section>
    </main>
    <footer className="privacyFooter"><span>© 2026 TAGUS Technologies LLC. All rights reserved.</span><a href="/">ValorBuddy Home</a></footer>
  </div>
}

function AccountDeletion(){
  const updated='August 2, 2026';
  const subject='ValorBuddy Account Deletion Request';
  const mailto=`mailto:privacy@valorbuddy.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent('Please delete my ValorBuddy account and associated data.\n\nAccount email: \nFull name: \nReason (optional): \n')}`;
  return <div className="privacyPage deletionPage">
    <header className="privacyHeader">
      <a className="privacyBrand" href="/" aria-label="Return to ValorBuddy home"><img src={valorLogo} alt="ValorBuddy"/><span><b>ValorBuddy</b><small>Your Digital Battle Buddy</small></span></a>
      <nav className="privacyNav"><a href="/privacy-policy">Privacy Policy</a><a className="privacyHomeLink" href="/">Return to ValorBuddy</a></nav>
    </header>
    <main className="privacyShell">
      <section className="privacyHero deletionHero">
        <span className="privacyEyebrow">TAGUS TECHNOLOGIES LLC</span>
        <h1>Delete Your ValorBuddy Account</h1>
        <p>Use this page to request deletion of your ValorBuddy account and the personal data associated with it.</p>
        <div className="privacyMeta"><span><b>Last updated:</b> {updated}</span><span><b>App:</b> ValorBuddy</span></div>
      </section>

      <section className="privacyCard deletionAction">
        <h2>Submit a deletion request</h2>
        <p>Send the request from the email address connected to your ValorBuddy account. This helps us verify that you are authorized to delete the account.</p>
        <a className="deletionButton" href={mailto}>Email account deletion request</a>
        <p className="deletionEmail">Email: <a href="mailto:privacy@valorbuddy.com">privacy@valorbuddy.com</a><br/>Subject: <b>{subject}</b></p>
      </section>

      <section className="privacyCard">
        <h2>What to include</h2>
        <ol className="deletionSteps">
          <li>The email address used for your ValorBuddy account.</li>
          <li>Your full name as shown in the account.</li>
          <li>A clear statement that you want the ValorBuddy account deleted.</li>
          <li>If you cannot email from the registered address, explain why so we can complete an alternate identity check.</li>
        </ol>
      </section>

      <section className="privacyCard">
        <h2>What will be deleted</h2>
        <ul>
          <li>Your ValorBuddy user account and profile information.</li>
          <li>Saved AI conversation history, missions, reminders, memories, favorites, and preferences associated with the account.</li>
          <li>User-uploaded documents and files associated with the account, subject to the retention limits below.</li>
          <li>Stored location preferences and other account-linked personalization data.</li>
        </ul>
      </section>

      <section className="privacyCard">
        <h2>Data that may be retained</h2>
        <p>We may retain limited information when required for legal, fraud-prevention, security, accounting, dispute-resolution, or regulatory purposes. Data may also remain temporarily in encrypted backups until those backups are overwritten through the normal retention cycle. Retained information will not be used to continue providing the deleted account.</p>
      </section>

      <section className="privacyCard">
        <h2>Processing time</h2>
        <p>We will acknowledge the request and may ask for identity verification. Verified requests are generally completed within 30 days, unless additional time is permitted or required by law. We will confirm when the account deletion process has been completed.</p>
      </section>

      <section className="privacyCard">
        <h2>Delete some data without deleting your account</h2>
        <p>Where available, you may delete individual reminders, memories, documents, favorites, or other saved items inside ValorBuddy. You may also email us to request deletion or correction of specific information without closing your entire account.</p>
      </section>

      <section className="privacyCard privacyContact">
        <h2>Contact</h2>
        <address><b>TAGUS Technologies LLC</b><br/>ValorBuddy Privacy Team<br/><a href="mailto:privacy@valorbuddy.com">privacy@valorbuddy.com</a><br/><a href="https://valorbuddy.com/privacy-policy">Privacy Policy</a></address>
      </section>
    </main>
    <footer className="privacyFooter"><span>© 2026 TAGUS Technologies LLC. All rights reserved.</span><span><a href="/privacy-policy">Privacy Policy</a> · <a href="/">ValorBuddy Home</a></span></footer>
  </div>
}

function DataRetentionPolicy(){
  return <div className="privacyPage"><header className="privacyHeader"><a className="privacyBrand" href="/"><img src={valorLogo} alt="ValorBuddy"/><span><b>ValorBuddy</b><small>Your Digital Battle Buddy</small></span></a><nav className="privacyNav"><a href="/privacy-policy">Privacy Policy</a><a href="/delete-account">Delete Account</a></nav></header><main className="privacyShell"><section className="privacyHero"><span className="privacyEyebrow">TAGUS TECHNOLOGIES LLC</span><h1>Data Retention and Deletion Policy</h1><p>How ValorBuddy protects, retains, and removes member information.</p><div className="privacyMeta"><span><b>Effective:</b> September 6, 2026</span></div></section><section className="privacyCard"><h2>Retention schedule</h2><ul><li><b>Account and profile:</b> retained while the account is active and removed after a verified deletion request, subject to limited legal or security holds.</li><li><b>Sensitive service information:</b> deployment history and VA disability-rating fields are encrypted and retained only while supplied by the member.</li><li><b>Uploaded documents:</b> DD214s, VA records, resumes, and certifications are encrypted at rest and retained until the member deletes them or closes the account.</li><li><b>Password-reset tokens:</b> expire after 30 minutes and are automatically purged.</li><li><b>Security and access logs:</b> retained for 365 days unless a documented incident or legal hold requires longer retention.</li><li><b>Encrypted backups:</b> expire through the normal backup rotation, normally within 35 days.</li></ul></section><section className="privacyCard"><h2>Access safeguards</h2><p>Sensitive profile and document access is logged. Administrator access uses role-based controls and mandatory multi-factor authentication. Marketplace vendors cannot access private conversations, documents, medical information, reminders, or sensitive profile fields.</p></section><section className="privacyCard"><h2>Your choices</h2><p>Delete individual documents, reminders, memories, and preferences inside ValorBuddy where controls are available. For complete account deletion, use the <a href="/delete-account">account-deletion page</a> or email <a href="mailto:privacy@valorbuddy.com">privacy@valorbuddy.com</a> from your registered address.</p></section></main><footer className="privacyFooter"><span>© 2026 TAGUS Technologies LLC.</span><a href="/">ValorBuddy Home</a></footer></div>
}

function App(){
  const path=window.location.pathname.replace(/\/+$/,'')||'/';
  if(path==='/privacy'||path==='/privacy-policy') return <PrivacyPolicy/>;
  if(path==='/delete-account'||path==='/account-deletion'||path==='/delete-my-account') return <AccountDeletion/>;
  if(path==='/data-retention-policy') return <DataRetentionPolicy/>;
  return <ValorBuddyApplication/>;
}

function ValorBuddyApplication(){
  const[token,setToken]=useState(localStorage.getItem('valor_token'));
  const[user,setUser]=useState(null);
  const[screen,setScreen]=useState('dashboard');
  const[mobileNav,setMobileNav]=useState(false);
  const[loading,setLoading]=useState(true);
  const[branchTheme,setBranchTheme]=useState(()=>normalizeBranch(localStorage.getItem('valor_branch_theme')||'Army'));
  const[adminPartnerPreview,setAdminPartnerPreview]=useState(null);
  useEffect(()=>{applyBranchTheme(branchTheme)},[branchTheme]);
  useEffect(()=>{
    const downloadSecureDocument=async event=>{
      const link=event.target.closest?.('a[href*="/api/documents/"][href$="/file"]');
      if(!link)return;
      event.preventDefault();
      try{
        const response=await fetch(link.href,{headers:authHeaders()});
        if(!response.ok){const data=await response.json().catch(()=>({}));throw new Error(data.detail||'Secure document download failed')}
        const blob=await response.blob(),url=URL.createObjectURL(blob),download=document.createElement('a');
        download.href=url;download.download=link.closest('article')?.querySelector('h3')?.textContent||'ValorBuddy-document';download.click();
        setTimeout(()=>URL.revokeObjectURL(url),1000);
      }catch(error){window.alert(error.message)}
    };
    document.addEventListener('click',downloadSecureDocument,true);
    return()=>document.removeEventListener('click',downloadSecureDocument,true);
  },[token]);
  useEffect(()=>{
    if(!token){setLoading(false);return}
    if(token==='demo-preview-token'){
      const u=getDemoFallback('/auth/me');
      const normalized=normalizeBranch(localStorage.getItem('valor_branch_theme')||u.branch);
      setUser({...u,branch:normalized});setBranchTheme(normalized);
      setLoading(false);
      return;
    }
    api('/auth/me').then(u=>{
      const normalized=normalizeBranch(localStorage.getItem('valor_branch_theme')||u.branch);
      setUser({...u,branch:normalized});setBranchTheme(normalized)
    }).catch(()=>{localStorage.removeItem('valor_token');setToken(null)}).finally(()=>setLoading(false))
  },[token]);
  useEffect(()=>{
    if(!mobileNav)return;
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const close=e=>{if(e.key==='Escape')setMobileNav(false)};
    window.addEventListener('keydown',close);
    return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',close)}
  },[mobileNav]);
  useEffect(()=>{stopSpeaking()},[screen]);
  if(loading)return <div className="boot"><Shield/>ValorBuddy loading...</div>;
  if(!token||!user)return <Auth onLogin={(t,u)=>{
    const normalized=normalizeBranch(u.branch);
    localStorage.setItem('valor_token',t);applyBranchTheme(normalized);setBranchTheme(normalized);setToken(t);setUser({...u,branch:normalized})
  }}/>;
  const logout=()=>{localStorage.removeItem('valor_token');setToken(null);setUser(null)};
  if(String(user.role||'').startsWith('partner'))return <PartnerPortal user={user} onLogout={logout}/>;
  if(user.role==='admin'&&adminPartnerPreview)return <PartnerPortal user={user} onLogout={logout} previewId={adminPartnerPreview} onBack={()=>setAdminPartnerPreview(null)}/>;
  const safeBranch=normalizeBranch(branchTheme||user.branch);
  const b=branches[safeBranch]||branches.Army;
  return <div className={`app ${b.cls}`} data-branch={b.cls} style={b.style}>
    <Sidebar user={{...user,branch:safeBranch}} screen={screen} setScreen={(x)=>{setScreen(x);setMobileNav(false)}} mobileOpen={mobileNav} onLogout={logout}/>
    <button type="button" className={`mobileNavBackdrop ${mobileNav?'open':''}`} aria-label="Close navigation" onClick={()=>setMobileNav(false)}/>
    <div className="appMain">
      <HealthSafetyNotice/>
      <Topbar user={{...user,branch:safeBranch}} b={b} screen={screen} setScreen={setScreen} setUser={setUser} setBranchTheme={setBranchTheme} onMenu={()=>setMobileNav(v=>!v)} mobileOpen={mobileNav} onLogout={logout}/>
      <main className="appContent">
        {screen==='dashboard'&&<Dashboard user={{...user,branch:safeBranch}} setScreen={setScreen}/>}
        {screen==='companion'&&<Companion user={{...user,branch:safeBranch}}/>}
        {screen==='events'&&<Events user={{...user,branch:safeBranch}}/>}
        {screen==='memories'&&<Memories/>}
        {screen==='reminders'&&<Reminders/>}
        {screen==='documents'&&<Documents/>}
        {screen==='benefits'&&<Benefits user={{...user,branch:safeBranch}}/>}
        {screen==='music'&&<MusicPage user={{...user,branch:safeBranch}} setUser={setUser}/>}
        {screen==='tutorial'&&<Tutorial setScreen={setScreen}/>}
        {screen==='missions'&&<MissionControl user={{...user,branch:safeBranch}}/>}
        {screen==='career'&&<CareerBusiness user={{...user,branch:safeBranch}}/>}
        {screen==='admin'&&<Admin onPreview={setAdminPartnerPreview}/>}
        {screen==='vendorAdmin'&&<Admin onPreview={setAdminPartnerPreview} vendorOnly/>}
        {screen==='profile'&&<Profile user={{...user,branch:safeBranch}} setUser={setUser}/>}
      </main>
    </div>
  </div>
}

function PartnerPortal({user,onLogout,previewId=null,onBack=null}){
  const[data,setData]=useState(null);const[listings,setListings]=useState([]);const[message,setMessage]=useState('');const[busy,setBusy]=useState('');const[section,setSection]=useState('overview');
  const emptyListing={listing_type:'product',title:'',description:'',image_url:'',destination_url:'',price_label:'',veteran_offer:'',promo_code:'',audience_state:'',audience_city:'',audience_branch:'All',starts_at:'',ends_at:'',submit_for_review:false};
  const[listing,setListing]=useState(emptyListing);
  const plans=[
    {code:'vendor',name:'Vendor Membership',price:'$50/mo',fit:'For verified businesses and marketplace vendors',features:['Vendor marketplace profile','Products, services and Veteran offers','Listing review and approval','Aggregate performance reporting']},
    {code:'institutional',name:'Institutional Partnership',price:'$499/mo',fit:'One plan for all eligible organizations',features:['Up to 250 sponsored Veterans','Offers and resource publishing','Organization dashboard and staff access','Aggregate engagement reporting']},
  ];
  async function load(){try{setData(await api(previewId?`/admin/partners/${previewId}/preview`:'/api/partner/overview'));if(!previewId){const d=await api('/api/partner/listings');setListings(d.items||[])}}catch(e){setMessage(e.message)}}
  useEffect(()=>{load()},[previewId]);
  async function selectPlan(code){setBusy(code);try{await api(previewId?`/admin/partners/${previewId}/plan`:'/api/partner/plan',{method:previewId?'PATCH':'POST',body:JSON.stringify({plan_code:code})});setMessage(previewId?'Partner plan updated by administrator.':'Plan selection saved. Activation occurs after verification and contracting.');await load()}catch(e){setMessage(e.message)}finally{setBusy('')}}
  async function startBilling(){setBusy('billing');try{const d=await api('/api/partner/billing/checkout',{method:'POST'});if(!d.url?.startsWith('https://checkout.stripe.com/'))throw new Error('Invalid checkout destination');window.location.assign(d.url)}catch(e){setMessage(e.message)}finally{setBusy('')}}
  async function createListing(e){e.preventDefault();setBusy('listing');setMessage('');try{const payload={...listing,starts_at:listing.starts_at||null,ends_at:listing.ends_at||null};await api('/api/partner/listings',{method:'POST',body:JSON.stringify(payload)});setListing(emptyListing);setMessage(payload.submit_for_review?'Listing submitted for ValorBuddy review.':'Draft saved successfully.');await load()}catch(e){setMessage(e.message)}finally{setBusy('')}}
  async function changeListingStatus(id,status){setBusy(`listing-${id}`);try{await api(`/api/partner/listings/${id}/status`,{method:'PATCH',body:JSON.stringify({status})});setMessage(status==='pending_review'?'Listing submitted for review.':'Listing status updated.');await load()}catch(e){setMessage(e.message)}finally{setBusy('')}}
  const org=data?.organization;
  return <div className="partnerPortal"><header className="partnerHeader"><div className="partnerBrand"><Shield/><div><b>VALORBUDDY MARKETPLACE</b><span>{previewId?'Administrator portal preview':'A product of Tagus Technologies LLC'}</span></div></div><div className="partnerHeaderActions"><span className="veteranFreeBadge">Veteran privacy protected</span>{onBack&&<button onClick={onBack}>← Back to Admin</button>}<button onClick={onLogout}><LogOut/> Sign out</button></div></header><main className="partnerMain"><section className="partnerWelcome"><div><small>{previewId?'ADMINISTRATOR VIEW':'PARTNER COMMAND CENTER'}</small><h1>{org?.organization_name||'Your organization'}</h1><p>Publish trusted products, services, jobs, discounts, events and resources to Veterans through a controlled, privacy-safe marketplace.</p></div><div className="partnerStatusCard"><span className="partnerStatus">{String(org?.approval_status||'pending review').replaceAll('_',' ')}</span><b>{org?.plan_name||'Partner plan'}</b><small>{org?.monthly_price_cents?`$${(org.monthly_price_cents/100).toLocaleString()}/month`:'Custom pricing'}</small><em>Billing: {String(org?.billing_status||'not activated').replaceAll('_',' ')}</em>{!previewId&&org?.approval_status==='approved'&&!['active','trialing'].includes(org?.billing_status)&&<button type="button" disabled={busy==='billing'} onClick={startBilling}>{busy==='billing'?'Opening secure checkout…':'Activate subscription with Stripe'}</button>}</div></section>{!previewId&&<nav className="partnerNav">{[['overview','Overview'],['listings','Products & ads'],['access','Veteran access rules'],['plans','Plans']].map(([key,label])=><button className={section===key?'active':''} onClick={()=>setSection(key)} key={key}>{label}</button>)}</nav>}{message&&<div className="partnerMessage">{message}</div>}{section==='overview'&&<><section className="partnerMetrics">{Object.entries(data?.metrics||{}).map(([key,value])=><article key={key}><b>{Number(value).toLocaleString()}</b><span>{key.replaceAll('_',' ')}</span></article>)}</section><section className="partnerSection"><small>PARTNER VALUE</small><h2>One trusted front door to the Veteran economy</h2><div className="marketplaceValueGrid"><article><Car/><b>Sell and serve</b><span>Publish approved products, services, offers and resources.</span></article><article><Briefcase/><b>Create opportunity</b><span>Reach Veterans with jobs, training and entrepreneurship support.</span></article><article><Shield/><b>Earn trust</b><span>Verified partner identity, transparent offers and administrative review.</span></article><article><BarChart3/><b>Measure value</b><span>Aggregate impressions, referral clicks and redemptions without exposing private data.</span></article></div></section></>}{section==='listings'&&!previewId&&<><section className="partnerSection"><small>CREATE MARKETPLACE LISTING</small><h2>Upload a product, service, opportunity or advertisement</h2><p className="partnerHelp">Save a draft or submit it to ValorBuddy for review. Nothing becomes visible to Veterans until approved.</p><form className="partnerListingForm" onSubmit={createListing}><label>Listing type<select value={listing.listing_type} onChange={e=>setListing({...listing,listing_type:e.target.value})}>{['product','service','discount','job','event','resource'].map(x=><option key={x} value={x}>{x[0].toUpperCase()+x.slice(1)}</option>)}</select></label><label>Title<input required minLength="2" value={listing.title} onChange={e=>setListing({...listing,title:e.target.value})} placeholder="Example: 20% Veteran discount on work boots"/></label><label className="wide">Description<textarea required value={listing.description} onChange={e=>setListing({...listing,description:e.target.value})} placeholder="Describe the product, eligibility, important terms and value to Veterans."/></label><label>Product image URL<input value={listing.image_url} onChange={e=>setListing({...listing,image_url:e.target.value})} placeholder="https://..."/></label><label>Product or application link<input value={listing.destination_url} onChange={e=>setListing({...listing,destination_url:e.target.value})} placeholder="https://..."/></label><label>Price<input value={listing.price_label} onChange={e=>setListing({...listing,price_label:e.target.value})} placeholder="$49.99 or Free"/></label><label>Veteran offer<input value={listing.veteran_offer} onChange={e=>setListing({...listing,veteran_offer:e.target.value})} placeholder="20% off for verified Veterans"/></label><label>Promotion code<input value={listing.promo_code} onChange={e=>setListing({...listing,promo_code:e.target.value})} placeholder="VALOR20"/></label><label>Target branch<select value={listing.audience_branch} onChange={e=>setListing({...listing,audience_branch:e.target.value})}>{['All','Army','Navy','Air Force','Marines','Coast Guard','Space Force'].map(x=><option key={x}>{x}</option>)}</select></label><label>Target city<input value={listing.audience_city} onChange={e=>setListing({...listing,audience_city:e.target.value})} placeholder="Optional"/></label><label>Target state<input value={listing.audience_state} onChange={e=>setListing({...listing,audience_state:e.target.value})} placeholder="Example: TX"/></label><label>Start date<input type="datetime-local" value={listing.starts_at} onChange={e=>setListing({...listing,starts_at:e.target.value})}/></label><label>End date<input type="datetime-local" value={listing.ends_at} onChange={e=>setListing({...listing,ends_at:e.target.value})}/></label><div className="listingSubmit wide"><button type="submit" onClick={()=>setListing(v=>({...v,submit_for_review:false}))} disabled={busy==='listing'}>Save draft</button><button className="primary" type="submit" onClick={()=>setListing(v=>({...v,submit_for_review:true}))} disabled={busy==='listing'}>{busy==='listing'?'Saving…':'Submit for review'}</button></div></form></section><section className="partnerSection"><small>YOUR CONTENT</small><h2>Products, offers and campaigns</h2><div className="partnerListingGrid">{listings.length===0?<div className="emptyState"><Briefcase/><h3>No listings yet</h3><p>Create your first Veteran offer above.</p></div>:listings.map(item=><article key={item.id}>{item.image_url&&<img src={item.image_url} alt=""/>}<div><span className={`listingStatus ${item.status}`}>{item.status.replaceAll('_',' ')}</span><small>{item.listing_type}</small><h3>{item.title}</h3><p>{item.description}</p>{item.price_label&&<b>{item.price_label}</b>}{item.veteran_offer&&<strong>{item.veteran_offer}</strong>}<div className="listingStats"><span>{item.impressions} impressions</span><span>{item.clicks} clicks</span><span>{item.redemptions} redemptions</span></div>{item.status==='draft'&&<button onClick={()=>changeListingStatus(item.id,'pending_review')} disabled={busy===`listing-${item.id}`}>Submit for review</button>}{item.status==='published'&&<button onClick={()=>changeListingStatus(item.id,'paused')} disabled={busy===`listing-${item.id}`}>Pause listing</button>}{item.status==='rejected'&&<button onClick={()=>changeListingStatus(item.id,'draft')}>Return to draft</button>}{item.admin_note&&<p className="adminNote">ValorBuddy review: {item.admin_note}</p>}</div></article>)}</div></section></>}{section==='access'&&<section className="partnerSection accessPolicy"><small>LIMITED AND ALLOWED ACCESS</small><h2>Veterans control their information</h2><div className="accessColumns"><article><h3>Partners can access</h3><ul><li>Aggregate impressions, clicks and redemptions</li><li>Broad targeting by city, state or service branch</li><li>Veteran-initiated inquiries and referrals</li><li>Contact details only after explicit Veteran consent</li><li>Anonymous campaign feedback</li></ul></article><article className="restricted"><h3>Partners can never access</h3><ul><li>Searchable lists of individual Veterans</li><li>Private profiles, disability ratings or medical data</li><li>AI conversations, documents, memories or reminders</li><li>Email, phone or precise location without consent</li><li>Data exports that could identify a Veteran</li></ul></article></div><p className="privacyPromise"><Shield/> ValorBuddy enforces aggregate-only analytics and administrator approval for every public listing.</p></section>}{(section==='plans'||previewId)&&<section className="partnerSection"><small>COMMERCIAL PLANS</small><h2>{previewId?'Institutional Partnership':'Choose a vendor or institutional subscription'}</h2><div className="partnerPlans">{plans.map(plan=><article className={org?.plan_code===plan.code?'selected':''} key={plan.code}><small>{plan.fit}</small><h3>{plan.name}</h3><b className="planPrice">{plan.price}</b><ul>{plan.features.map(x=><li key={x}>✓ {x}</li>)}</ul><button disabled={busy===plan.code||org?.plan_code===plan.code} onClick={()=>selectPlan(plan.code)}>{org?.plan_code===plan.code?'Current selection':busy===plan.code?'Saving…':previewId?'Assign plan':'Select plan'}</button></article>)}</div></section>}<section className="partnerBottomGrid"><article><small>CONTROLLED PUBLISHING</small><h2>From draft to measurable impact</h2><ol><li>Create a product, service, job, event, offer or resource</li><li>Submit it for ValorBuddy verification</li><li>Administrator approves and publishes it</li><li>Receive privacy-safe aggregate outcomes</li></ol></article><article><small>VETERAN TRUST</small><h2>Privacy-safe by design</h2><p>{data?.privacy_note}</p></article></section></main><footer className="partnerFooter">ValorBuddy is a product of Tagus Technologies LLC · Veterans first. Trust always.</footer></div>
}

function Auth({onLogin}){
  const[tab,setTab]=useState('login');
  const[partnerMode,setPartnerMode]=useState('login');
  const[show,setShow]=useState(false);
  const[err,setErr]=useState('');
  const[message,setMessage]=useState('');
  const[busy,setBusy]=useState(false);
  const initialResetToken=new URLSearchParams(window.location.search).get('reset_token')||'';
  const[recoveryMode,setRecoveryMode]=useState(initialResetToken?'reset':'');
  const[mfaNeeded,setMfaNeeded]=useState(false);
  const[mfaSetup,setMfaSetup]=useState(null);
  const[mfaSetupToken,setMfaSetupToken]=useState('');
  const[form,setForm]=useState({email:'',password:'',new_password:'',mfa_code:'',reset_token:initialResetToken,first_name:'',last_name:'',branch:'Army',city:'',state:'',rank:'',service_status:'Veteran',service_start_year:'',service_end_year:'',deployment_history:'',va_rating:'',contact_name:'',contact_title:'',organization_name:'',organization_type:'Business',website:'',phone:'',estimated_veterans:250,plan_code:'institutional',onboarding_goal:''});
  async function recoverySubmit(e){e.preventDefault();setErr('');setMessage('');setBusy(true);try{if(recoveryMode==='forgot'){const d=await api('/auth/forgot-password',{method:'POST',body:JSON.stringify({email:form.email.trim().toLowerCase()})});setMessage(d.message)}else{const d=await api('/auth/reset-password',{method:'POST',body:JSON.stringify({token:form.reset_token,new_password:form.new_password})});setMessage(d.message);window.history.replaceState({},'',window.location.pathname);setRecoveryMode('')}}catch(ex){setErr(ex.message)}finally{setBusy(false)}}
  async function confirmMfa(e){e.preventDefault();setBusy(true);setErr('');try{const d=await api('/auth/mfa/confirm',{method:'POST',headers:{Authorization:`Bearer ${mfaSetupToken}`},body:JSON.stringify({code:form.mfa_code})});onLogin(d.token,d.user)}catch(ex){setErr(ex.message)}finally{setBusy(false)}}
  async function submit(e){
    e.preventDefault();if(busy)return;setErr('');setMessage('');
    const email=form.email.trim().toLowerCase();
    if(!email){setErr('Enter your email address.');return}
    if(form.password.length<(tab==='partner'?8:6)){setErr(`Password must be at least ${tab==='partner'?8:6} characters.`);return}
    if(tab==='register'&&!form.first_name.trim()){setErr('Enter your first name.');return}
    setBusy(true);
    try{
      const endpoint=tab==='partner'?(partnerMode==='apply'?'/auth/partner/register':'/auth/partner/login'):tab==='login'?'/auth/login':'/auth/register';
      const payload={...form,email,first_name:form.first_name.trim(),last_name:form.last_name.trim(),city:form.city.trim(),state:form.state.trim()};
      const d=await api(endpoint,{method:'POST',body:JSON.stringify(payload)});
      if(d.pending_approval){setMessage(d.message);setTab('login');return}
      if(d.mfa_setup_required){setMfaSetupToken(d.token);const setup=await api('/auth/mfa/setup',{method:'POST',headers:{Authorization:`Bearer ${d.token}`}});setMfaSetup(setup);return}
      onLogin(d.token,d.user)
    }catch(ex){if(tab==='login'&&String(ex.message).toLowerCase().includes('verification code'))setMfaNeeded(true);setErr(ex.message)}
    finally{setBusy(false)}
  }
  const currentTheme=branches[normalizeBranch(form.branch)]||branches.Army;
  if(mfaSetup)return <div className={`loginPage ${currentTheme.cls}`} style={currentTheme.style}><div className="loginCard"><div className="brand"><Shield/><h1>Protect administrator access</h1><p>Required multi-factor authentication</p></div><form onSubmit={confirmMfa}><p>In your authenticator app, add an account using this setup key:</p><code className="mfaSecret">{mfaSetup.secret}</code><small>Issuer: ValorBuddy · Account: {form.email}</small><label>6-digit verification code<input required inputMode="numeric" autoComplete="one-time-code" value={form.mfa_code} onChange={e=>setForm({...form,mfa_code:e.target.value.replace(/\D/g,'').slice(0,6)})}/></label>{err&&<p className="err" role="alert">{err}</p>}<button className="primary" disabled={busy}>{busy?'Verifying…':'Enable MFA and continue'}</button></form></div></div>;
  if(recoveryMode)return <div className={`loginPage ${currentTheme.cls}`} style={currentTheme.style}><div className="loginCard"><div className="brand"><Shield/><h1>ValorBuddy</h1><p>{recoveryMode==='forgot'?'Reset your password':'Choose a new password'}</p></div><form onSubmit={recoverySubmit}>{recoveryMode==='forgot'?<label>Email<input required type="email" autoComplete="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>:<label>New password<div className="password"><input required minLength="10" autoComplete="new-password" type={show?'text':'password'} value={form.new_password} onChange={e=>setForm({...form,new_password:e.target.value})}/><button type="button" onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button></div></label>}{err&&<p className="err" role="alert">{err}</p>}{message&&<p className="authSuccess" role="status">{message}</p>}<button className="primary" disabled={busy}>{busy?'Please wait…':recoveryMode==='forgot'?'Send secure reset link':'Update password'}</button><button className="textButton" type="button" onClick={()=>{setRecoveryMode('');setErr('');setMessage('')}}>Back to sign in</button></form></div></div>;
  return <div className={`loginPage ${tab==='partner'?'partnerLoginPage':currentTheme.cls}`} data-branch={tab==='partner'?'partner':currentTheme.cls} style={tab==='partner'?{}:currentTheme.style}>
    <div className={`loginCard ${tab==='partner'?'partnerLoginCard':''}`}>
      <div className="brand"><Shield/><h1>ValorBuddy</h1><p>{tab==='partner'?'Veteran Marketplace Partner Portal':'Your digital battle buddy'}</p><small>A product of Tagus Technologies LLC</small></div>
      <div className="tabs authTabs"><button type="button" className={tab==='login'?'active':''} onClick={()=>{setErr('');setTab('login')}}>Member Login</button><button type="button" className={tab==='register'?'active':''} onClick={()=>{setErr('');setTab('register')}}>Create Account</button><button type="button" className={tab==='partner'?'active':''} onClick={()=>{setErr('');setTab('partner')}}>Vendor & Partner Portal</button></div>
      <form onSubmit={submit}>
        {tab==='partner'&&<><div className="partnerAuthIntro"><Briefcase/><div><b>For organizations serving the military community</b><span>Businesses, employers, VSOs, providers, sponsors and government partners.</span></div></div><div className="partnerModeSwitch"><button type="button" className={partnerMode==='login'?'active':''} onClick={()=>setPartnerMode('login')}>Partner sign in</button><button type="button" className={partnerMode==='apply'?'active':''} onClick={()=>setPartnerMode('apply')}>Apply for access</button></div></>}
        {tab==='partner'&&partnerMode==='apply'&&<><div className="row"><label>Organization name<input required value={form.organization_name} onChange={e=>setForm({...form,organization_name:e.target.value})}/></label><label>Organization type<select value={form.organization_type} onChange={e=>setForm({...form,organization_type:e.target.value})}><option>Business</option><option>Veteran-owned business</option><option>Employer</option><option>Veteran service organization</option><option>Healthcare provider</option><option>Government agency</option><option>Corporate sponsor</option><option>Community nonprofit</option></select></label></div><div className="row"><label>Contact name<input required value={form.contact_name} onChange={e=>setForm({...form,contact_name:e.target.value})}/></label><label>Title<input value={form.contact_title} onChange={e=>setForm({...form,contact_title:e.target.value})}/></label></div><div className="row"><label>Website (optional)<input type="url" value={form.website} onChange={e=>setForm({...form,website:e.target.value})} placeholder="https://example.org — leave blank if none"/></label><label>Phone<input type="tel" value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label></div><div className="row"><label>Veterans to support<input type="number" min="0" value={form.estimated_veterans} onChange={e=>setForm({...form,estimated_veterans:Number(e.target.value)||0})}/></label><label>Subscription plan<select value={form.plan_code} onChange={e=>setForm({...form,plan_code:e.target.value})}><option value="vendor">Vendor Membership — $50/month</option><option value="institutional">Institutional Partnership — $499/month</option></select></label></div><label>Partnership goal<textarea value={form.onboarding_goal} onChange={e=>setForm({...form,onboarding_goal:e.target.value})} placeholder="Describe your Veteran offer, resource, service or pilot goal..."/></label></>}
        {tab==='register'&&<>
          <label>Service Branch<select value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})}>{Object.keys(branches).map(x=><option key={x}>{x}</option>)}</select></label>
          <div className="row"><label>First Name<input required autoComplete="given-name" value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})}/></label><label>Last Name<input autoComplete="family-name" value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})}/></label></div>
          <div className="row"><label>Rank<input value={form.rank} onChange={e=>setForm({...form,rank:e.target.value})} placeholder="Optional"/></label><label>Status<select value={form.service_status} onChange={e=>setForm({...form,service_status:e.target.value})}><option>Veteran</option><option>Retired</option><option>Active Duty</option><option>Reserve</option><option>National Guard</option><option>Spouse</option><option>Dependent</option><option>Caregiver</option></select></label></div>
          <div className="row"><label>City<input autoComplete="address-level2" value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label><label>State<input autoComplete="address-level1" value={form.state} onChange={e=>setForm({...form,state:e.target.value})}/></label></div>
        </>}
        <label>Email<input required type="email" autoComplete="email" inputMode="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
        <label>Password<div className="password"><input required minLength="6" autoComplete={tab==='login'?'current-password':'new-password'} type={show?'text':'password'} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button></div></label>
        {tab==='login'&&mfaNeeded&&<label>Authenticator code<input required inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" value={form.mfa_code} onChange={e=>setForm({...form,mfa_code:e.target.value.replace(/\D/g,'').slice(0,6)})}/></label>}
        {err&&<p className="err" role="alert">{err}</p>}
        {message&&<p className="authSuccess" role="status">{message}</p>}
        <button className="primary" disabled={busy}>{busy?'Please wait…':tab==='partner'?(partnerMode==='apply'?'Submit partner application':'Enter Partner Portal'):tab==='login'?'Enter Mission Control':'Create Account'}</button>
        {tab==='login'&&<button className="textButton" type="button" onClick={()=>{setRecoveryMode('forgot');setErr('');setMessage('')}}>Forgot password?</button>}
        <div className="stagingDemoBanner" style={{marginTop:'1.2rem',paddingTop:'1rem',borderTop:'1px solid rgba(255,255,255,0.12)',textAlign:'center'}}>
          <button
            type="button"
            className="stagingExploreBtn"
            style={{
              width:'100%',
              padding:'0.75rem 1rem',
              background:'linear-gradient(135deg, rgba(16,185,129,0.22), rgba(56,189,248,0.22))',
              border:'1px solid rgba(56,189,248,0.4)',
              borderRadius:'8px',
              color:'#38bdf8',
              fontWeight:'700',
              fontSize:'0.92rem',
              cursor:'pointer',
              display:'flex',
              alignItems:'center',
              justifyContent:'center',
              gap:'0.5rem',
              boxShadow:'0 2px 10px rgba(0,0,0,0.3)',
              transition:'all 0.2s ease'
            }}
            onClick={()=>{
              const demoUser=getDemoFallback('/auth/me');
              demoUser.branch=form.branch||demoUser.branch;
              onLogin('demo-preview-token',demoUser);
            }}
          >
            <span>⚡ Explore Staging Preview (Instant Demo Access)</span>
          </button>
          <small style={{display:'block',marginTop:'0.45rem',color:'#94a3b8',fontSize:'0.75rem'}}>
            Instant access to view all v7 screens, branch switcher, AI Battle Buddy & tactical mode
          </small>
        </div>
        {tab==='partner'&&<small className="partnerLegal">Applications require verification. Submitting does not activate billing or grant access to private Veteran information.</small>}
      </form>
      <div className="tagusProductLine">ValorBuddy is a product of <b>Tagus Technologies LLC</b></div>
    </div>
  </div>
}
function Sidebar({user,screen,setScreen,mobileOpen,onLogout}){
  const b=branches[normalizeBranch(user.branch)]||branches.Army;
  const navGroups=[
    {
      group:'Mission Hub',
      items:[
        ['dashboard','Command Center',Shield],
        ['companion','AI Battle Buddy',Brain],
        ['benefits','Benefits & VA Claims',Search],
        ['events','Veteran Community',MapPin],
        ['documents','DD-214 & Secure Vault',Lock],
        ['career','Career & Business',Briefcase]
      ]
    },
    {
      group:'Personal Vault',
      items:[
        ['reminders','Reminders',Bell],
        ['memories','Memories',Heart],
        ['music','Music & Media',Music],
        ['profile','Profile & Settings',User],
        ['tutorial','User Tutorial',BookOpen]
      ]
    }
  ];
  if(user.role==='admin'){
    navGroups.push({
      group:'Administration',
      items:[
        ['admin','Admin Dashboard',BarChart3],
        ['vendorAdmin','Vendor Marketplace',Briefcase]
      ]
    });
  }

  const initials = `${(user.first_name||'V')[0]||'V'}${(user.last_name||'B')[0]||'B'}`.toUpperCase();
  const branchName = normalizeBranch(user.branch).toUpperCase();

  return (
    <aside className={`sidebar ${mobileOpen?"mobileOpen":""}`} aria-label="Main Navigation">
      <div className="sidebarBrandArea">
        <div className="brandHeader">
          <img className="brandLogo" src={valorLogo} alt="ValorBuddy logo"/>
          <div>
            <b className="brandTitle">VALORBUDDY</b>
            <span className="tacticalBrandSubtitle">{branchName} COMMAND</span>
          </div>
        </div>

        {/* Official Military Branch Emblem Banner */}
        <div className="branchIdentityBanner">
          <img className="branchEmblemMini" src={b.emblem} alt={`${user.branch} official emblem`}/>
          <div className="branchIdentityDetails">
            <span className="branchBadgeText">[ {branchName} COMMAND ]</span>
            <small className="branchLabelSub">{b.label}</small>
          </div>
        </div>

        {/* Tactical User Card (Matching Reference Image 3) */}
        <div
          className="tacticalUserCard"
          onClick={()=>setScreen('profile')}
          role="button"
          tabIndex={0}
          onKeyDown={(e)=>{if(e.key==='Enter'||e.key===' ')setScreen('profile')}}
          aria-label="Open profile"
        >
          <div className="tacticalAvatar">
            <span>{initials}</span>
            <div className="tacticalStatusDot" title="Active Battle Ready" />
          </div>
          <div className="tacticalUserInfo">
            <span className="tacticalUserName">{user.first_name} {user.last_name||''}</span>
            <span className="tacticalUserBranch">
              <img className="tacticalUserBranchEmblem" src={b.emblem} alt="" aria-hidden="true"/>
              {user.branch} • {user.service_status||'Veteran'}
            </span>
            <span className="tacticalUserLocation">{user.city ? `${user.city}${user.state ? `, ${user.state}` : ''}` : 'Mission Ready'}</span>
          </div>
        </div>
      </div>

      <nav className="sidebarNav">
        {navGroups.map(({group,items})=>(
          <div className="navGroup" key={group}>
            <span className="sidebarMissionHubLabel">{group}</span>
            {items.map(([id,label,Icon])=>(
              <button
                type="button"
                className={`navItem ${screen===id?'active':''}`}
                key={id}
                data-screen={id}
                onClick={()=>setScreen(id)}
                aria-current={screen===id?'page':undefined}
              >
                <Icon aria-hidden="true"/>
                <span>{label}</span>
              </button>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebarFooter">
        <button
          type="button"
          className="secureSignOutBtn"
          onClick={onLogout}
          aria-label="Secure Sign Out"
        >
          <LogOut size={14} aria-hidden="true"/>
          <span>Secure Sign Out</span>
        </button>
      </div>
    </aside>
  );
}

function Topbar({user,b,screen,setScreen,setUser,setBranchTheme,onLogout,onMenu,mobileOpen}){
  async function changeBranch(branch){
    const normalized=applyBranchTheme(branch);setBranchTheme(normalized);setUser(u=>({...u,branch:normalized}));
    requestAnimationFrame(()=>applyBranchTheme(normalized));setTimeout(()=>applyBranchTheme(normalized),80);
    try{await api('/api/profile/branch',{method:'POST',body:JSON.stringify({branch:normalized})})}catch(e){console.warn('Branch theme save failed; keeping local theme',e)}
  }

  const currentBranch = normalizeBranch(user.branch);

  return (
    <header className="topbar">
      <div className="topbarLeft">
        <button className="mobileMenu" onClick={onMenu} aria-label={mobileOpen?'Close navigation':'Open navigation'} aria-expanded={mobileOpen}>{mobileOpen?<X/>:<Menu/>}</button>
        <div className="topbarCommandTitle">
          <img className="topbarBranchEmblem" src={b.emblem} alt={`${currentBranch} official emblem`} />
          <div>
            <span className="topbarMissionTitle">{currentBranch} Mission Control</span>
            <small className="topbarMotto">{b.motto || 'Duty. Honor. Support.'}</small>
          </div>
        </div>
      </div>

      <div className="topbarCenter">
        <div className="topbarBranchPills" role="tablist" aria-label="Branch Mission Control Switcher">
          {Object.keys(branches).map(name => {
            const isSelected = currentBranch === name;
            return (
              <button
                key={name}
                type="button"
                className={`branchPill branchPill--${branches[name].cls} ${isSelected ? 'active' : ''}`}
                onClick={() => changeBranch(name)}
                aria-pressed={isSelected}
                title={`Switch to ${name} Command Center`}
              >
                {isSelected ? (
                  <img className="pillBranchEmblem" src={branches[name].emblem} alt="" aria-hidden="true" />
                ) : (
                  <span className="branchPip" style={{ '--pip-color': branches[name].color }} aria-hidden="true" />
                )}
                <span className="branchNameFull">{name}</span>
                <span className="branchNameShort">{branches[name].short}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="topbarRight">
        <a
          href="tel:988"
          className="topbarCrisisPill"
          aria-label="Veterans Crisis Line 988 Press 1"
          title="Veterans Crisis Line: Dial 988, then press 1"
        >
          <span className="crisisDot">●</span>
          <span className="crisisTextFull">CRISIS LINE: 988</span>
          <span className="crisisTextShort">988 CRISIS</span>
        </a>

        <div className="topbarOperationalBadge" title="Command Center Systems Operational">
          <span className="operationalDot">●</span>
          <span>OPERATIONAL</span>
        </div>

        <button type="button" className="quickVoiceButton" onClick={()=>setScreen('companion')} aria-label="Open voice assistant" title="Voice Battle Buddy">
          <Mic size={14}/>
          <span>Voice</span>
        </button>
      </div>
    </header>
  );
}

function GlobalSearch({user,setScreen}){const[q,setQ]=useState('');function go(e){e?.preventDefault?.();const v=q.trim().toLowerCase();if(!v)return;if(v.includes('event')||v.includes('activit')||v.includes('place')||v.includes('vfw')||v.includes('coffee'))setScreen('events');else if(v.includes('benefit')||v.includes('va')||v.includes('claim')||v.includes('spouse')||v.includes('dependent'))setScreen('benefits');else if(v.includes('document')||v.includes('dd214')||v.includes('vault'))setScreen('documents');else if(v.includes('remind')||v.includes('appointment'))setScreen('reminders');else if(v.includes('resume')||v.includes('business plan')||v.includes('career'))setScreen('career');else if(v.includes('mission')||v.includes('agent'))setScreen('missions');else if(v.includes('music'))setScreen('music');else setScreen('companion')}return <form className="globalSearch" onSubmit={go}><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={`Search benefits, activities near ${user.city}, documents...`}/><button type="submit">Search</button></form>}

function Hero({user, setScreen}){
  const [searchQuery, setSearchQuery] = useState('');
  const h = new Date().getHours();
  const timeGreeting = h < 12 ? "GOOD MORNING" : h < 18 ? "GOOD AFTERNOON" : "GOOD EVENING";
  const branchName = normalizeBranch(user.branch).toUpperCase();
  const firstName = (user.first_name || 'VETERAN').toUpperCase();
  const b = branches[normalizeBranch(user.branch)] || branches.Army;

  function handleSearch(e){
    e?.preventDefault?.();
    const v = searchQuery.trim().toLowerCase();
    if(!v) return;
    if (v.includes('claim') || v.includes('benefit') || v.includes('va') || v.includes('526') || v.includes('disability')) {
      setScreen('benefits');
    } else if (v.includes('event') || v.includes('clinic') || v.includes('vfw') || v.includes('community')) {
      setScreen('events');
    } else if (v.includes('document') || v.includes('dd214') || v.includes('file')) {
      setScreen('documents');
    } else if (v.includes('resume') || v.includes('mos') || v.includes('career') || v.includes('job')) {
      setScreen('career');
    } else {
      setScreen('companion');
    }
  }

  function handleQuickIntel(type) {
    if (type === 'claim') setScreen('benefits');
    else if (type === 'gibill') setScreen('benefits');
    else if (type === 'clinic') setScreen('events');
    else if (type === 'resume') setScreen('career');
  }

  return (
    <section className="dashboardTacticalHero" aria-label="Tactical Command Hero">
      <div className="heroGreetingRow">
        <div className="heroGreetingLeft">
          <h1 className="tacticalGreeting">
            {timeGreeting}, {firstName}
          </h1>
          <p className="tacticalSubtitle">
            {b.motto || 'Duty. Honor. Support.'} Your AI Battle Buddy is ready to assist with benefits, claims, and transition.
          </p>
        </div>
        <div className="heroBranchBadge">
          <img className="heroBranchEmblem" src={b.emblem} alt="" aria-hidden="true"/>
          <span>{branchName} COMMUNITY</span>
        </div>
      </div>

      {/* Prominent AI Battle Buddy Question Bar */}
      <form className="tacticalSearchBar" onSubmit={handleSearch}>
        <div className="searchBarLeft">
          <Search size={18} aria-hidden="true"/>
          <input
            className="searchBarInput"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="What is the status of my VA disability claim?"
            aria-label="Ask your AI Battle Buddy a question or search benefits"
          />
        </div>
        <div className="searchBarRight">
          <div className="soundWaveGraphic" aria-hidden="true">
            <span className="waveBar"/>
            <span className="waveBar"/>
            <span className="waveBar"/>
            <span className="waveBar"/>
            <span className="waveBar"/>
          </div>
          <button
            type="button"
            className="tacticalMicBtn"
            onClick={() => setScreen('companion')}
            aria-label="Start Voice Battle Buddy session"
            title="Start Voice Battle Buddy"
          >
            <Mic size={18}/>
          </button>
        </div>
      </form>

      {/* Quick Intel Pills Row */}
      <div className="quickIntelRow">
        <span className="quickIntelLabel">QUICK INTEL:</span>
        <div className="quickIntelPills">
          <button
            type="button"
            className="quickIntelBtn"
            onClick={() => handleQuickIntel('claim')}
          >
            VA Disability Claim
          </button>
          <button
            type="button"
            className="quickIntelBtn"
            onClick={() => handleQuickIntel('gibill')}
          >
            GI Bill & Education
          </button>
          <button
            type="button"
            className="quickIntelBtn"
            onClick={() => handleQuickIntel('clinic')}
          >
            Closest VA Clinic
          </button>
          <button
            type="button"
            className="quickIntelBtn"
            onClick={() => handleQuickIntel('resume')}
          >
            Military MOS Resume
          </button>
        </div>
      </div>
    </section>
  );
}

function SmartResultPopup({open,onClose,title,subtitle,items,onChoose,kind='event'}){
  useEffect(()=>{
    if(!open)return;
    const onKey=e=>{if(e.key==='Escape')onClose?.()};
    window.addEventListener('keydown',onKey);
    return ()=>window.removeEventListener('keydown',onKey);
  },[open,onClose]);
  if(!open)return null;
  return <div className="smartModalBackdrop" onClick={onClose}><section className="smartModal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><button className="modalClose" onClick={onClose} aria-label="Close dialog">×</button><div className="modalHeader"><span className="modalEyebrow">VALORBUDDY RECOMMENDATIONS</span><h2>{cleanVisibleText(title)}</h2>{subtitle&&<p>{cleanVisibleText(subtitle)}</p>}</div><div className="smartResultWrap">{items.map((x,i)=><article className="smartResultCard" key={`${x.title}-${i}`}><div className="resultRank">{i+1}</div><div className="resultMain"><div className="resultTitleRow"><h3>{cleanVisibleText(x.title)}</h3>{x.rating&&<span className="ratingPill">★ {x.rating}{x.review_count?` · ${x.review_count}`:''}</span>}</div>{x.location&&<p className="resultLocation">📍 {cleanVisibleText(x.location)}</p>}<p className="assistantExplains"><b>Why ValorBuddy suggests it:</b> {cleanVisibleText(x.assistant_explanation||x.description||x.summary)}</p>{x.open_now!==undefined&&x.open_now!==null&&<span className={`openPill ${x.open_now?'open':'closed'}`}>{x.open_now?'Open now':'Currently closed'}</span>}{x.next_step&&<div className="nextStep"><b>Best next step</b><span>{cleanVisibleText(x.next_step)}</span></div>}{x.community_note&&<div className="communityVoice"><b>What veterans commonly say</b><p>{cleanVisibleText(x.community_note)}</p></div>}{x.reviews?.length>0&&<div className="reviewPanel"><b>What Google reviewers are saying</b>{x.reviews.map((r,j)=><blockquote key={j}><span>“{cleanVisibleText(r.text)}”</span><small>{r.author}{r.rating?` · ${r.rating}/5`:''}{r.time_description?` · ${r.time_description}`:''}</small></blockquote>)}</div>}<div className="resultActions">{onChoose&&<button className="primaryAction" onClick={()=>onChoose(x,i)}>Choose this</button>}{x.maps_url&&<a href={x.maps_url} target="_blank" rel="noreferrer">Directions</a>}{x.website&&<a href={x.website} target="_blank" rel="noreferrer">Website</a>}{x.phone&&<a href={`tel:${x.phone}`}>Call</a>}</div></div></article>)}</div><div className="modalFooter"><span>Not seeing the right fit?</span><button onClick={onClose}>Refine the search</button></div></section></div>}
function VoicePanel({user,onResult}){
  const[listening,setListening]=useState(false);const[transcript,setTranscript]=useState('');const[reply,setReply]=useState('');const[results,setResults]=useState([]);const[choices,setChoices]=useState([]);const[popupOpen,setPopupOpen]=useState(false);const[popupTitle,setPopupTitle]=useState('Recommended options');
  const[voiceStyle,setVoiceStyle]=useState(()=>voicePreferences().style);const[voiceName,setVoiceName]=useState(()=>voicePreferences().voiceName);const[availableVoices,setAvailableVoices]=useState([]);const[locationState,setLocationState]=useState('');const[autoRead,setAutoRead]=useState(()=>localStorage.getItem('valor_voice_auto_read')==='true');const[muted,setMuted]=useState(()=>localStorage.getItem('valor_voice_muted')==='true');const[playback,setPlayback]=useState('stopped');
  const rec=useRef(null);const followUpTimer=useRef(null);const welcomed=useRef(false);const resultContext=useRef([]);const conversationHistory=useRef([]);const restartTimer=useRef(null);const nativeLastText=useRef('');const nativeSubmitted=useRef(false);
  const greeting=useMemo(()=>{const h=new Date().getHours();const time=h<12?'Good morning':h<18?'Good afternoon':'Good evening';return `${time}, ${user.first_name}. How can I help?`},[user.first_name]);
  function playWelcome(force=false,withAudio=false){if(welcomed.current&&!force)return;welcomed.current=true;setReply(greeting);if(withAudio&&!muted){setPlayback('playing');speak(greeting,{onDone:()=>setPlayback('stopped')})}try{sessionStorage.setItem(`valor_welcome_${user.email||user.first_name}`,'1')}catch{}}
  useEffect(()=>{
    if(isNativeApp()){
      TextToSpeech.getSupportedVoices().then(result=>{const allVoices=result?.voices||[];speechState.nativeVoices=allVoices;setAvailableVoices(allVoices.filter(v=>String(v.lang||'').toLowerCase().startsWith('en')))}).catch(()=>setAvailableVoices([]));
      return;
    }
    const loadVoices=()=>setAvailableVoices((window.speechSynthesis?.getVoices?.()||[]).filter(v=>String(v.lang||'').toLowerCase().startsWith('en')));loadVoices();window.speechSynthesis?.addEventListener?.('voiceschanged',loadVoices);return()=>window.speechSynthesis?.removeEventListener?.('voiceschanged',loadVoices)
  },[]);
  useEffect(()=>{localStorage.setItem('valor_voice_style',voiceStyle);localStorage.setItem('valor_voice_name',voiceName)},[voiceStyle,voiceName]);
  useEffect(()=>{localStorage.setItem('valor_voice_auto_read',String(autoRead));localStorage.setItem('valor_voice_muted',String(muted))},[autoRead,muted]);
  useEffect(()=>{setReply(greeting);return()=>{clearTimeout(restartTimer.current);stopSpeaking();if(isNativeApp()){NativeSpeechRecognition.forceStop({timeout:500}).catch(()=>{});NativeSpeechRecognition.removeAllListeners().catch(()=>{})}clearTimeout(followUpTimer.current)}},[greeting]);
  async function send(text,{auto=false,liveLocOverride=null}={}){const value=String(text||'').trim();if(!value)return;clearTimeout(followUpTimer.current);stopSpeaking();setPlayback('stopped');if(!auto)setTranscript(value);setReply('Let me check that for you…');setChoices([]);setPopupOpen(false);try{const needsLiveLocation=/near me|nearby|around me|close to me|closest/i.test(value);const liveLoc=liveLocOverride||(needsLiveLocation?await freshLocation({required:true,maximumAge:0}):{source:'profile'});const history=conversationHistory.current.slice(-12);const d=await api('/api/vapi/action',{method:'POST',body:JSON.stringify({message:value,query:value,first_name:user.first_name,email:user.email,branch:user.branch,city:user.city,state:user.state,user_type:user.user_type||'Veteran',context_items:resultContext.current,conversation_history:history,lat:liveLoc?.source==='gps'?liveLoc.lat:null,lng:liveLoc?.source==='gps'?liveLoc.lng:null,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone})});conversationHistory.current=[...history,{role:'user',content:value},{role:'assistant',content:d.response}].slice(-12);const found=d.data?.items||[];if(found.length){resultContext.current=found;setResults(found)}else if(!d.data?.preserve_results){setResults([]);resultContext.current=[]}setReply(d.response);setChoices(d.data?.choices||[]);if(found.length){setPopupTitle(d.intent==='search_benefits'?'Benefits explained clearly':'Best nearby options');setPopupOpen(true)}if(autoRead&&!muted){setPlayback('playing');speak(d.response,{items:found.length?found:[],onDone:()=>setPlayback('stopped')})}onResult?.(d);if(d.data?.awaiting_clarification&&d.data?.default_query){followUpTimer.current=setTimeout(()=>send(d.data.default_query,{auto:true}),12000)}}catch(e){setReply(e.message)}}
  async function useMyLocation(){setLocationState('Locating…');setReply('Getting your live location…');try{const loc=await freshLocation({required:true,maximumAge:0});setLocationState(`Live location active • ±${Math.round(loc.accuracy||0)}m`);await send('Use my current GPS location and show confirmed veteran events near me',{liveLocOverride:loc})}catch(e){setLocationState('Location unavailable');setReply(e.message)}}
  function playText(text=reply){if(!text||muted)return;setPlayback('playing');speak(text,{items:results,onDone:()=>setPlayback('stopped')})}
  function pauseVoice(){if(isNativeApp()){stopSpeaking();setPlayback('stopped');return}window.speechSynthesis?.pause();setPlayback('paused')}
  function resumeVoice(){if(isNativeApp()){playText();return}window.speechSynthesis?.resume();setPlayback('playing')}
  function stopVoice(){stopSpeaking();setPlayback('stopped')}
  function testVoice(){stopSpeaking();if(!muted){setPlayback('playing');speak(`ValorBuddy command voice ready. ${user.first_name}, I’m here and ready to support your mission.`,{onDone:()=>setPlayback('stopped')})}}
  function handleSpeech(text){const value=String(text||'').trim();const lower=value.toLowerCase();if(/^(wait|stop|hold on|pause|one moment|be quiet|listen)(\b|$)/.test(lower)){stopSpeaking();setReply(`Okay, ${user.first_name}. I stopped. I’m listening.`);setTranscript(value);restartTimer.current=setTimeout(()=>start(true),450);return}if(speechState.active)stopSpeaking();send(value)}
  async function startNative(restart=false){
    try{
      const available=await NativeSpeechRecognition.available();
      if(!available.available){setReply('Speech recognition is not available on this device. Please type your request below.');return}
      const permission=await NativeSpeechRecognition.checkPermissions();
      const granted=permission.speechRecognition==='granted'?permission:await NativeSpeechRecognition.requestPermissions();
      if(granted.speechRecognition!=='granted'){setReply('Microphone permission is required for ValorBuddy voice. Enable it in Android Settings and try again.');return}
      await NativeSpeechRecognition.forceStop({timeout:400}).catch(()=>{});
      await NativeSpeechRecognition.removeAllListeners();
      nativeLastText.current='';nativeSubmitted.current=false;
      await NativeSpeechRecognition.addListener('partialResults',event=>{const heard=String(event.accumulatedText||event.accumulated||event.matches?.[0]||'').trim();if(heard){nativeLastText.current=heard;setTranscript(heard)}});
      await NativeSpeechRecognition.addListener('listeningState',event=>{
        const started=event.state==='started'||event.status==='started';const stopped=event.state==='stopped'||event.status==='stopped';
        if(started){setListening(true);if(!restart)setReply(`I’m listening, ${user.first_name}. Speak naturally.`)}
        if(stopped){setListening(false);const heard=nativeLastText.current.trim();if(heard&&!nativeSubmitted.current){nativeSubmitted.current=true;handleSpeech(heard)}}
      });
      await NativeSpeechRecognition.addListener('error',()=>{setListening(false);setReply('I didn’t catch that clearly. Tap the microphone and try again.')});
      setListening(true);if(!restart)setReply(`I’m listening, ${user.first_name}. Speak naturally.`);
      const result=await NativeSpeechRecognition.start({language:'en-US',maxResults:1,partialResults:true,popup:false,allowForSilence:1800});
      const finalText=String(result?.matches?.[0]||'').trim();
      if(finalText&&!nativeSubmitted.current){nativeSubmitted.current=true;nativeLastText.current=finalText;setTranscript(finalText);setListening(false);handleSpeech(finalText)}
    }catch(e){setListening(false);setReply('ValorBuddy could not start voice recognition. Check microphone permission and try again.')}
  }
  function start(restart=false){clearTimeout(followUpTimer.current);if(!restart)playWelcome();if(isNativeApp()){startNative(restart);return}const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){setReply('Voice recognition is not available in this browser. Please type your request below.');return}try{rec.current?.abort?.()}catch{}const r=new SR();r.lang='en-US';r.interimResults=true;r.continuous=false;r.onstart=()=>{setListening(true);if(!restart)setReply(`I’m listening, ${user.first_name}. Speak naturally, and interrupt me whenever you need to.`)};r.onend=()=>setListening(false);r.onerror=e=>{setListening(false);if(e.error!=='aborted')setReply('I didn’t catch that clearly. Tap the microphone and try again, or choose one of the options below.')};r.onresult=e=>{let finalText='';let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)finalText+=t;else interim+=t}const heard=(finalText||interim).trim();if(heard)setTranscript(heard);if(finalText.trim())handleSpeech(finalText)};rec.current=r;r.start()}
  function stopListening(){if(isNativeApp()){NativeSpeechRecognition.forceStop({timeout:600}).catch(()=>{});setListening(false)}else rec.current?.stop?.()}
  const suggestions=['Veteran events near me','Benefits for my family','Closest VA clinic','Free activities this weekend','Why did you choose these?','Are these veteran-owned?'];

  const isProcessing = reply === 'Let me check that for you…';
  const isSpeaking = playback === 'playing';
  const isError = Boolean(reply && (
    reply.toLowerCase().includes('wrong') ||
    reply.toLowerCase().includes('not available') ||
    reply.toLowerCase().includes('permission is required') ||
    reply.toLowerCase().includes('could not start')
  ));

  const voiceState = listening
    ? { key: 'listening', label: 'LISTENING', prompt: 'Listening…' }
    : isProcessing
    ? { key: 'processing', label: 'PROCESSING', prompt: 'Working on that…' }
    : isSpeaking
    ? { key: 'speaking', label: 'SPEAKING', prompt: 'Speaking…' }
    : isError
    ? { key: 'error', label: 'ERROR', prompt: 'Something went wrong. Try again.' }
    : { key: 'idle', label: 'IDLE', prompt: 'How can I help?' };

  return <>
    <div className={`voiceBox voiceBox--${voiceState.key}`}>
      <div className="voiceHeading">
        <h3><Radio aria-hidden="true"/> ValorBuddy Voice</h3>
        <span className={`liveBadge liveBadge--${voiceState.key}`}>{voiceState.label}</span>
      </div>

      <div className="voiceStateBanner">
        <span className="voiceStatePrompt">{voiceState.prompt}</span>
        <p className="voiceIntro">Audio is off by default. You control when ValorBuddy reads a response aloud.</p>
      </div>

      {/* Tactical Audio Waveform Visualizer */}
      <div className={`waveformVisualizer ${listening ? 'listening' : isSpeaking ? 'speaking' : ''}`} aria-hidden="true">
        {[40, 75, 55, 90, 60, 85, 45, 100, 70, 95, 50, 80, 65, 90, 45, 70].map((h, i) => (
          <span key={i} className="waveformBar" style={{ height: `${h}%`, animationDelay: `${(i * 0.05).toFixed(2)}s` }}/>
        ))}
      </div>

      {/* Main Microphone Action */}
      <button
        className={`mic ${listening?'listening':''} ${isProcessing?'processing':''} ${isSpeaking?'speaking':''}`}
        onClick={()=>listening?stopListening():start()}
        aria-label={listening?'Stop listening':'Start voice assistant'}
      >
        {listening?<MicOff aria-hidden="true"/>:<Mic aria-hidden="true"/>}
        <span>{listening?'Listening…':'Tap to Speak'}</span>
      </button>

      {/* Grouped Audio Playback Controls */}
      <div className="voiceAudioActionBar" aria-label="Audio playback controls">
        <button type="button" onClick={()=>playText()} disabled={!reply||muted} aria-label="Play response">▶ Play</button>
        <button type="button" onClick={pauseVoice} disabled={playback!=='playing'} aria-label="Pause response">⏸ Pause</button>
        <button type="button" onClick={resumeVoice} disabled={playback!=='paused'||muted} aria-label="Resume response">⏯ Resume</button>
        <button type="button" className="stopVoiceButton" onClick={stopVoice} disabled={playback==='stopped'} aria-label="Stop audio">⏹ Stop</button>
        <button type="button" aria-pressed={muted} onClick={()=>{const next=!muted;setMuted(next);if(next)stopVoice()}}>
          {muted?'🔇 Unmute':'🔊 Mute'}
        </button>
      </div>

      {locationState&&<div className={`locationStatus ${locationState.includes('active')?'success':''}`}>{locationState}</div>}
      {transcript&&<small className="heard">You said: {transcript}</small>}
      {reply&&<div className="reply" aria-live="polite"><LinkifiedText text={reply}/></div>}

      {/* Categorized Suggested Prompts */}
      <div className="suggestionWrap" aria-label="Suggested voice questions">
        {suggestions.map((x,i)=><button key={i} onClick={()=>send(x)}>{x}</button>)}
      </div>

      {choices.length>0&&<div className="choiceGrid">
        {choices.map((x,i)=><button key={i} onClick={()=>send(x.query||x.label)}><span>{i+1}</span>{x.label}</button>)}
      </div>}
      {results.length>0&&<button className="openResultsButton" onClick={()=>setPopupOpen(true)}>View {results.length} explained recommendations</button>}

      {/* Grouped Secondary Voice Preferences & Style */}
      <details className="voiceSettingsDetails">
        <summary className="voiceSettingsSummary">
          <span>⚙️ Voice Preferences & Style</span>
          <ChevronRight size={14} className="voiceSettingsChevron" aria-hidden="true"/>
        </summary>
        <div className="voiceSettingsBody">
          <div className="voiceSettings">
            <label>
              <span>Voice style</span>
              <select value={voiceStyle} onChange={e=>setVoiceStyle(e.target.value)}>
                {Object.entries(voiceStyles).map(([key,v])=><option key={key} value={key}>{v.label}</option>)}
              </select>
            </label>
            <label>
              <span>AI voice</span>
              <select value={voiceName} onChange={e=>setVoiceName(e.target.value)}>
                <option value="">Best available voice</option>
                {availableVoices.map(v=><option key={`${v.name}-${v.lang}`} value={v.name}>{friendlyVoiceLabel(v)}</option>)}
              </select>
            </label>
            <button type="button" onClick={testVoice} disabled={muted}>▶ Test voice</button>
          </div>

          <div className="voicePreferenceRow">
            <label>
              <input type="checkbox" checked={autoRead} onChange={e=>setAutoRead(e.target.checked)}/>
              <span> Automatically read new answers</span>
            </label>
            <button type="button" className="welcomeButton" onClick={()=>playWelcome(true,true)} disabled={muted}>Hear welcome</button>
            <button type="button" className="locationButton" onClick={useMyLocation}>📍 Use my location</button>
          </div>
        </div>
      </details>
    </div>
    <SmartResultPopup open={popupOpen} onClose={()=>setPopupOpen(false)} title={popupTitle} subtitle="ValorBuddy explains why each option was selected and clearly separates confirmed facts from assumptions." items={results.slice(0,6)} onChoose={(x)=>{setPopupOpen(false);setReply(`${x.title} is selected. Choose Directions, Website, or Call to continue.`);if(autoRead&&!muted)playText(`${x.title} is selected. Choose directions, website, or call on the screen.`)}}/>
  </>;
}

function Dashboard({user,setScreen}){
  const[brief,setBrief]=useState(null);
  const[streamFilter,setStreamFilter]=useState('all');
  const[rsvpState,setRsvpState]=useState({});
  useEffect(()=>{api('/api/briefing').then(setBrief).catch(()=>{})},[]);

  const reminders=brief?.reminders||[];
  const events=brief?.events||[];

  const toggleRsvp=(id,e)=>{
    e?.stopPropagation?.();
    setRsvpState(prev=>({...prev,[id]:!prev[id]}));
  };

  const combinedStream = useMemo(() => {
    const list = [];
    if (streamFilter === 'all' || streamFilter === 'reminders') {
      reminders.forEach((r, idx) => {
        list.push({
          id: r.id || `remind-${idx}`,
          type: 'reminder',
          title: r.title,
          meta: r.when_text || 'Scheduled reminder',
          status: 'Scheduled',
          target: 'reminders',
        });
      });
    }
    if (streamFilter === 'all' || streamFilter === 'events') {
      events.forEach((ev, idx) => {
        list.push({
          id: ev.id || `ev-${idx}`,
          type: 'event',
          title: ev.title,
          meta: ev.location || (user.city ? `Near ${user.city}` : 'Local community event'),
          status: 'Community',
          target: 'events',
        });
      });
    }
    return list;
  }, [reminders, events, streamFilter, user.city]);

  const displayEvents = events.length >= 2 ? events.slice(0, 2) : [
    {
      id: 'event-vfw-5076',
      title: 'VFW Post 5076 Social Night',
      meta: `${user.city || 'Garland'}, TX • Thursday, 18:00 • 4.6 ★`
    },
    {
      id: 'event-sba-briefing',
      title: 'Veterans Career & SBA Briefing',
      meta: 'Dallas VA Center • Saturday, 10:00 AM'
    }
  ];

  return (
    <div className="dashboardView">
      <Hero user={user} setScreen={setScreen}/>

      {/* 3-Column Tactical Command Cards (Matching Reference Screenshot) */}
      <section className="tacticalCardsGrid" aria-label="Tactical Command Workspaces">
        {/* Card 1: VA Disability Claim */}
        <article className="tacticalCard" aria-label="VA Disability Claim Status">
          <div>
            <div className="tacticalCardHeader">
              <div className="tacticalCardTitleGroup">
                <div className="tacticalCardSquircle">
                  <FileText size={18} aria-hidden="true"/>
                </div>
                <div>
                  <h3 className="tacticalCardTitle">VA Disability Claim</h3>
                  <p className="tacticalCardSubtitle">Claim ID: #VA-8942-TX • Active</p>
                </div>
              </div>
              <span className="tacticalCardOptions" aria-hidden="true">•••</span>
            </div>

            <div className="claimProgressBlock">
              <div className="claimPercentRow">
                <span className="claimBigPercent">85% Complete</span>
                <span className="claimStepIndicator">Step 4 of 6: Review of Evidence</span>
              </div>
              <div className="tacticalProgressBarTrack" role="progressbar" aria-valuenow={85} aria-valuemin={0} aria-valuemax={100}>
                <div className="tacticalProgressBarFill" style={{width: '85%'}}/>
              </div>
              <div className="tacticalStepLabels">
                <span>1. Received</span>
                <span>2. Initial Review</span>
                <span className="active">3. Evidence</span>
                <span>4. Decision</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="tacticalCardFooterLink"
            onClick={() => setScreen('benefits')}
          >
            <span>View Full Claim File & Letters</span>
            <ChevronRight size={14} aria-hidden="true"/>
          </button>
        </article>

        {/* Card 2: AI Battle Buddy */}
        <article className="tacticalCard" aria-label="AI Battle Buddy Guidance Engine">
          <div>
            <div className="tacticalCardHeader">
              <div className="tacticalCardTitleGroup">
                <div className="tacticalCardSquircle">
                  <Brain size={18} aria-hidden="true"/>
                </div>
                <div>
                  <h3 className="tacticalCardTitle">AI Battle Buddy</h3>
                  <p className="tacticalCardSubtitle">Plain-English Guidance Engine</p>
                </div>
              </div>
              <span className="tacticalCardOptions" aria-hidden="true">•••</span>
            </div>

            <div className="battleBuddyQuoteBox">
              <p className="battleBuddyQuote">
                <b>ValorBuddy:</b> “Under the PACT Act, your service history qualifies you for presumptive toxic exposure screening. Would you like to generate the pre-filled checklist?”
              </p>
            </div>

            <button
              type="button"
              className="battleBuddyFormTag"
              onClick={() => setScreen('benefits')}
              aria-label="Open VA Form 21-526EZ guidance"
            >
              <FileText size={12} aria-hidden="true"/>
              <span>VA Form 21-526EZ Guidance</span>
            </button>
          </div>

          <button
            type="button"
            className="tacticalCardFooterLink"
            onClick={() => setScreen('companion')}
          >
            <span>Continue Battle Buddy Session</span>
            <ChevronRight size={14} aria-hidden="true"/>
          </button>
        </article>

        {/* Card 3: Veteran Community */}
        <article className="tacticalCard" aria-label="Veteran Community Engagements">
          <div>
            <div className="tacticalCardHeader">
              <div className="tacticalCardTitleGroup">
                <div className="tacticalCardSquircle">
                  <MapPin size={18} aria-hidden="true"/>
                </div>
                <div>
                  <h3 className="tacticalCardTitle">Veteran Community</h3>
                  <p className="tacticalCardSubtitle">Events Near {user.city || 'Austin'}, {user.state || 'TX'}</p>
                </div>
              </div>
              <span className="tacticalCardOptions" aria-hidden="true">•••</span>
            </div>

            <div className="communityEventsList">
              {displayEvents.map(ev => {
                const isRsvpd = rsvpState[ev.id];
                return (
                  <div className="communityEventItem" key={ev.id}>
                    <div className="eventInfo">
                      <span className="eventTitle">{ev.title}</span>
                      <span className="eventMeta">{ev.meta || ev.location || 'Local Community'}</span>
                    </div>
                    <button
                      type="button"
                      className={`eventRsvpBtn ${isRsvpd ? 'rsvpd' : ''}`}
                      onClick={(e) => toggleRsvp(ev.id, e)}
                      aria-pressed={isRsvpd}
                    >
                      {isRsvpd ? "RSVP'd" : "RSVP"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            className="tacticalCardFooterLink"
            onClick={() => setScreen('events')}
          >
            <span>Explore All {events.length || 14} Nearby Activities</span>
            <ChevronRight size={14} aria-hidden="true"/>
          </button>
        </article>
      </section>

      {/* Astrix 4-Column Metric KPI Grid */}
      <section className="astrixMetricGrid" aria-label="Key Performance Indicators">
        {/* Card 1: Reminders (Numerical Stat) */}
        <div
          className={`metricCard metricCard--numerical ${reminders.length > 0 ? 'urgentReminderCard' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => setScreen('reminders')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setScreen('reminders'); }}
          aria-label={`${reminders.length} scheduled reminders. Open reminders.`}
        >
          <div className="metricCardHeader">
            <div className="metricCardIcon"><Bell size={16} aria-hidden="true"/></div>
            <span className="metricCardLabel">Scheduled Reminders</span>
          </div>
          <div className="metricCardValueRow">
            <div className="metricCardValue">{reminders.length}</div>
            <div className="metricCardFooter">
              <span className={`metricTrend ${reminders.length > 0 ? 'alert' : 'positive'}`}>
                {reminders.length > 0 ? 'Action required' : 'All clear'}
              </span>
              <span className="metricCardFootnote" title={reminders.length > 0 ? (reminders[0].title || 'Upcoming tasks') : 'No pending deadlines'}>
                {reminders.length > 0 ? (reminders[0].title || 'Upcoming tasks') : 'No pending deadlines'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Local Network (Numerical Stat) */}
        <div
          className="metricCard metricCard--numerical"
          role="button"
          tabIndex={0}
          onClick={() => setScreen('events')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setScreen('events'); }}
          aria-label={`${events.length} nearby community options. Open activities.`}
        >
          <div className="metricCardHeader">
            <div className="metricCardIcon"><MapPin size={16} aria-hidden="true"/></div>
            <span className="metricCardLabel">Nearby Community</span>
          </div>
          <div className="metricCardValueRow">
            <div className="metricCardValue">{events.length}</div>
            <div className="metricCardFooter">
              <span className="metricTrend neutral">
                {events.length > 0 ? `${events.length} active` : 'Local'}
              </span>
              <span className="metricCardFootnote" title={user.city ? `Near ${user.city}` : 'Veteran gatherings'}>
                {user.city ? `Near ${user.city}` : 'Veteran gatherings'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Benefits Radar (Status System Portal) */}
        <div
          className="metricCard metricCard--status"
          role="button"
          tabIndex={0}
          onClick={() => setScreen('benefits')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setScreen('benefits'); }}
          aria-label="VA Benefits navigation card"
        >
          <div className="metricCardHeader">
            <div className="metricCardIcon"><TrendingUp size={16} aria-hidden="true"/></div>
            <span className="metricCardLabel">Benefits Radar</span>
          </div>
          <div className="metricCardValueRow">
            <div className="metricCardValue textValue">4 VA Programs</div>
            <div className="metricCardFooter">
              <span className="metricTrend positive">Verified</span>
              <span className="metricCardFootnote" title="Plain-English claim & GI Bill guidance">Plain-English claim & GI Bill</span>
            </div>
          </div>
        </div>

        {/* Card 4: Document Vault (Status System Portal) */}
        <div
          className="metricCard metricCard--status"
          role="button"
          tabIndex={0}
          onClick={() => setScreen('documents')}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setScreen('documents'); }}
          aria-label="Document Vault navigation card"
        >
          <div className="metricCardHeader">
            <div className="metricCardIcon"><Folder size={16} aria-hidden="true"/></div>
            <span className="metricCardLabel">Document Vault</span>
          </div>
          <div className="metricCardValueRow">
            <div className="metricCardValue textValue">Vault Encrypted</div>
            <div className="metricCardFooter">
              <span className="metricTrend positive">AES-256</span>
              <span className="metricCardFootnote" title="DD-214 & health records secured">DD-214 & health records</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2-Column Operational Workspace Grid (Left 64% / Right 36%) */}
      <div className="dashboardBodyGrid">
        <div className="dashboardLeftCol">
          {/* Astrix Live Operational Stream */}
          <section className="streamSection" aria-label="Operational Stream">
            <div className="streamHeader">
              <div className="streamTitleGroup">
                <h3><Clock size={16} aria-hidden="true"/><span>Operational Stream</span></h3>
                <p>Your upcoming tasks, appointments, and local veteran community engagements.</p>
              </div>

              <div className="streamFilterTabs" role="tablist" aria-label="Filter operational stream">
                <button
                  type="button"
                  className={`streamFilterBtn ${streamFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setStreamFilter('all')}
                  aria-selected={streamFilter === 'all'}
                >
                  <span>All</span>
                  <span className="streamFilterCount">{reminders.length + events.length}</span>
                </button>
                <button
                  type="button"
                  className={`streamFilterBtn ${streamFilter === 'reminders' ? 'active' : ''}`}
                  onClick={() => setStreamFilter('reminders')}
                  aria-selected={streamFilter === 'reminders'}
                >
                  <span>Reminders</span>
                  <span className="streamFilterCount">{reminders.length}</span>
                </button>
                <button
                  type="button"
                  className={`streamFilterBtn ${streamFilter === 'events' ? 'active' : ''}`}
                  onClick={() => setStreamFilter('events')}
                  aria-selected={streamFilter === 'events'}
                >
                  <span>Community</span>
                  <span className="streamFilterCount">{events.length}</span>
                </button>
              </div>
            </div>

            {combinedStream.length > 0 ? (
              <div className="streamList">
                {combinedStream.map(item => (
                  <div
                    key={item.id}
                    className={`streamRow ${item.type === 'reminder' ? 'streamRow--actionable' : ''}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setScreen(item.target)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setScreen(item.target); }}
                    aria-label={`${item.title}: ${item.meta}`}
                  >
                    <div className="streamRowLeft">
                      <div className="streamIconCapsule">
                        {item.type === 'reminder' ? (
                          <Bell size={15} aria-hidden="true"/>
                        ) : (
                          <MapPin size={15} aria-hidden="true"/>
                        )}
                      </div>
                      <div className="streamRowInfo">
                        <span className="streamRowTitle">{item.title}</span>
                        <span className="streamRowMeta">{item.meta}</span>
                      </div>
                    </div>
                    <div className="streamRowRight">
                      <span className={`streamRowStatus ${item.type === 'reminder' ? 'statusScheduled' : 'statusCommunity'}`}>{item.status}</span>
                      <ChevronRight size={14} className="streamRowChevron" color="var(--vb-text-muted)" aria-hidden="true"/>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="streamEmpty">
                <p>No active stream items found for this view.</p>
                <button
                  type="button"
                  onClick={() => setScreen(streamFilter === 'events' ? 'events' : 'reminders')}
                >
                  {streamFilter === 'events' ? '+ Explore community events' : '+ Add a reminder'}
                </button>
              </div>
            )}
          </section>

          {/* Astrix Transition Studios Grid */}
          <section className="transitionStudiosSection" aria-label="Veteran Transition Studios">
            <div className="transitionStudiosSectionHeader">
              <h3 className="transitionStudiosSectionTitle">
                <Shield size={16} aria-hidden="true"/>
                <span>Veteran Transition Studios</span>
              </h3>
              <p className="transitionStudiosSectionSubtitle">
                Direct workstations for benefits navigation, career development, and document records.
              </p>
            </div>

            <div className="transitionStudiosGrid">
              <article
                className="studioCard"
                role="button"
                tabIndex={0}
                onClick={() => setScreen('benefits')}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setScreen('benefits'); }}
                aria-label="Benefits & VA Forms Studio"
              >
                <div>
                  <div className="studioCardTop">
                    <span className="studioEyebrow">VA ASSISTANCE</span>
                    <Search size={16} color="var(--branch-accent)" aria-hidden="true"/>
                  </div>
                  <h4 className="studioTitle">Benefits & VA Forms</h4>
                  <p className="studioDesc">
                    Plain-English summaries for disability compensation, healthcare, GI Bill, and official VA filing forms.
                  </p>
                </div>
                <div className="studioActionLink">
                  <span>Explore VA Benefits</span>
                  <ArrowUpRight size={14} aria-hidden="true"/>
                </div>
              </article>

              <article
                className="studioCard"
                role="button"
                tabIndex={0}
                onClick={() => setScreen('career')}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setScreen('career'); }}
                aria-label="Career & Opportunity Studio"
              >
                <div>
                  <div className="studioCardTop">
                    <span className="studioEyebrow">MOS TRANSLATION</span>
                    <Briefcase size={16} color="var(--branch-accent)" aria-hidden="true"/>
                  </div>
                  <h4 className="studioTitle">Career & Business Studio</h4>
                  <p className="studioDesc">
                    Translate your military specialty into civilian credentials, draft tailored resumes, and map veteran business ventures.
                  </p>
                </div>
                <div className="studioActionLink">
                  <span>Launch Career Tools</span>
                  <ArrowUpRight size={14} aria-hidden="true"/>
                </div>
              </article>

              <article
                className="studioCard"
                role="button"
                tabIndex={0}
                onClick={() => setScreen('documents')}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setScreen('documents'); }}
                aria-label="Personal Document Vault Studio"
              >
                <div>
                  <div className="studioCardTop">
                    <span className="studioEyebrow">SECURE VAULT</span>
                    <Folder size={16} color="var(--branch-accent)" aria-hidden="true"/>
                  </div>
                  <h4 className="studioTitle">Personal Document Vault</h4>
                  <p className="studioDesc">
                    Organize, encrypt, and inspect your DD-214 discharge papers, medical records, and civilian documents.
                  </p>
                </div>
                <div className="studioActionLink">
                  <span>Open Document Vault</span>
                  <ArrowUpRight size={14} aria-hidden="true"/>
                </div>
              </article>
            </div>
          </section>
        </div>

        {/* Right Column: Voice Battle Buddy + Crisis Support */}
        <div className="dashboardRightCol">
          <VoicePanel user={user}/>

          <aside className="dashboardSupportCard" aria-label="Support and confidentiality information">
            <div className="supportCardHeader">
              <Shield size={16} aria-hidden="true"/>
              <h4>Veteran Support & Safety</h4>
            </div>
            <p>
              ValorBuddy enforces strict client-side data isolation. If you or a fellow veteran need immediate assistance, crisis resources are available 24/7.
            </p>
            <div className="supportEmergencyRow">
              <a
                href="tel:988"
                className="supportEmergencyBtn crisis"
                aria-label="Veterans Crisis Line: Dial 988, then press 1"
              >
                📞 988, Press 1 (Crisis)
              </a>
              <a
                href="tel:911"
                className="supportEmergencyBtn emergency"
                aria-label="Emergency Services: Dial 911"
              >
                🚨 911 Emergency
              </a>
            </div>
            <div className="supportCardActions">
              <button
                type="button"
                className="supportLinkBtn"
                onClick={() => setScreen('tutorial')}
                aria-label="Open ValorBuddy Tutorial"
              >
                <BookOpen size={14} aria-hidden="true"/>
                <span>New to ValorBuddy? Open Tutorial</span>
                <ChevronRight size={14} aria-hidden="true"/>
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
function MissionInline({mission}){
  if(!mission)return null;
  const steps=mission.steps||[];
  return <section className="agentMissionResult">
    <div className="agentMissionTop">
      <div><small className="missionUidTag">{mission.mission_uid||'VALORBUDDY MISSION'}</small><h3>{mission.title||'Mission in progress'}</h3></div>
      <span className={`statusPill ${mission.status||'planned'}`}>{(mission.status||'planned').replaceAll('_',' ')}</span>
    </div>
    {mission.participating_agents?.length>0&&<div className="agentStrip">{mission.participating_agents.map(agent=><span className="agentBadge" key={agent}>{agent.replaceAll('_',' ')}</span>)}</div>}
    <div className="progressTrack"><i style={{width:`${mission.progress||0}%`}}/></div>
    <b>{mission.progress||0}% complete</b>
    {steps.length>0&&<div className="agentStepGrid">{steps.map((step,idx)=><div className="agentStep" key={step.id||`step-${idx}-${step.title}`}>
      <span className={`agentStepStatus ${step.status==='completed'?'completed':step.status==='running'?'running':step.status==='failed'?'failed':'pending'}`}>{step.status==='completed'?'✓':step.status==='failed'?'!':step.status==='running'?'…':'○'}</span>
      <div><b>{step.agent_name||step.agent_key}</b><small>{step.title}</small></div>
    </div>)}</div>}
    {mission.next_action&&<div className="nextActionBanner"><ChevronRight size={14} aria-hidden="true"/><span><b>Next step:</b> {mission.next_action}</span></div>}
  </section>;
}

function Companion({user}){
  const[msg,setMsg]=useState('');
  const[items,setItems]=useState([{id:`welcome-${Date.now()}`,role:'assistant',content:`${new Date().getHours()<12?"Good morning":new Date().getHours()<18?"Good afternoon":"Good evening"}, ${user.first_name}. I’m ValorBuddy. How can I help you today?`}]);
  const[conversationId,setConversationId]=useState(null);const[editIndex,setEditIndex]=useState(null);const[busy,setBusy]=useState(false);const followUpTimer=useRef(null);
  useEffect(()=>()=>clearTimeout(followUpTimer.current),[]);
  async function send(text=msg,{auto=false,baseItems=null}={}){
    const value=String(text||'').trim();if(!value||busy)return;
    clearTimeout(followUpTimer.current);const prior=baseItems||items;const userMessage={id:`user-${Date.now()}`,role:'user',content:value};
    const nextItems=auto?[...prior,{id:`notice-${Date.now()}`,role:'assistant',content:'I didn’t hear back, so I’m using the most likely option and continuing.'}]:[...prior,userMessage];
    setItems(nextItems);setMsg('');setEditIndex(null);setBusy(true);
    try{
      const needsLiveLocation=/near me|nearby|around me|close to me|closest/i.test(value);const loc=needsLiveLocation?await freshLocation({required:true,maximumAge:0}):{source:'profile'};
      const history=prior.filter(x=>x.role==='user'||x.role==='assistant').slice(-12).map(x=>({role:x.role,content:x.content}));
      const d=await api('/api/companion/chat',{method:'POST',body:JSON.stringify({message:value,conversation_id:conversationId,conversation_history:history,lat:loc?.source==='gps'?loc.lat:null,lng:loc?.source==='gps'?loc.lng:null,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone})});
      setConversationId(d.conversation_id||conversationId);setItems(v=>[...v,{id:`assistant-${Date.now()}`,role:'assistant',content:d.response,mission:d.data?.mission,mode:d.mode||d.intent}]);
      if(d.data?.reminder_id){requestReminderPermission().then(()=>api('/api/reminders').then(rows=>{const r=rows.find(x=>x.id===d.data.reminder_id);if(r)scheduleBrowserReminder(r)}).catch(()=>{}));}
      if(d.data?.awaiting_clarification&&d.data?.default_query){followUpTimer.current=setTimeout(()=>send(d.data.default_query,{auto:true}),12000)}
    }catch(e){setItems(v=>[...v,{id:`error-${Date.now()}`,role:'assistant',content:e.message}])}finally{setBusy(false)}
  }
  function beginEdit(index){clearTimeout(followUpTimer.current);stopSpeaking();setEditIndex(index);setMsg(items[index].content)}
  function submit(){if(editIndex!==null)send(msg,{baseItems:items.slice(0,editIndex)});else send()}
  return <section className="page assistantPage actionsPage" aria-label="AI Battle Buddy Cockpit">
    <div className="operationsHeader">
      <div className="operationsEyebrow">
        <Brain size={14} aria-hidden="true"/>
        <span>Tactical Guidance Engine</span>
      </div>
      <h1 className="operationsTitle">AI Battle Buddy Cockpit</h1>
      <p className="operationsLead">Your plain-English veteran companion. Ask about VA claims, toxic exposure screening, military skill translation, or launch coordinated specialist missions.</p>
    </div>

    {/* Fast-Action Tactical Prompt Matrix */}
    <div className="cockpitPromptMatrix" aria-label="Fast-action prompts">
      <button type="button" className="promptMatrixBtn" onClick={()=>send('Explain VA disability claim steps under the PACT Act in plain English')}>
        <FileText size={14} aria-hidden="true"/>
        <span>VA Disability Claim Protocol</span>
      </button>
      <button type="button" className="promptMatrixBtn" onClick={()=>send('Translate my military MOS and leadership duties into civilian resume bullet points')}>
        <Briefcase size={14} aria-hidden="true"/>
        <span>MOS to Civilian Skill Translation</span>
      </button>
      <button type="button" className="promptMatrixBtn" onClick={()=>send('Find the nearest VA clinic and emergency mental health resources')}>
        <MapPin size={14} aria-hidden="true"/>
        <span>Locate Nearest VA Clinic</span>
      </button>
      <button type="button" className="promptMatrixBtn" onClick={()=>send('What education and housing benefits am I eligible for under the Post-9/11 GI Bill?')}>
        <BookOpen size={14} aria-hidden="true"/>
        <span>GI Bill & Housing Allowance</span>
      </button>
    </div>

    <VoicePanel user={user} onResult={d=>setItems(v=>[...v,{id:`voice-${Date.now()}`,role:'assistant',content:d.response,mission:d.data?.mission,mode:d.mode||d.intent}])}/>
    <div className="chat" aria-live="polite">
      {items.map((m,i)=>(
        <div className={m.role} key={m.id||i}>
          {m.role==='assistant'?(
            <div className="assistantReadable"><LinkifiedText text={m.content}/></div>
          ):(
            <>
              <div className="userReadable">{m.content}</div>
              <button className="editMessageButton" type="button" onClick={()=>beginEdit(i)}>Edit and regenerate</button>
            </>
          )}
          <MissionInline mission={m.mission}/>
        </div>
      ))}
      <div className="composer actionComposer">
        <input
          value={msg}
          onChange={e=>setMsg(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit()}}}
          placeholder={editIndex!==null?'Edit your message, then regenerate...':'Ask ValorBuddy a question or give it a mission...'}
          aria-label="Message for AI Battle Buddy"
        />
        {editIndex!==null&&<button type="button" onClick={()=>{setEditIndex(null);setMsg('')}}>Cancel edit</button>}
        <button className="primary actionButton" type="button" disabled={busy} onClick={submit}>
          <Brain size={16} aria-hidden="true"/>
          <span>{busy?'Working…':editIndex!==null?'Save & regenerate':'Send to ValorBuddy'}</span>
        </button>
      </div>
    </div>
  </section>;
}

function Events({user}){
  const[items,setItems]=useState([]);
  const[live,setLive]=useState(false);
  const[query,setQuery]=useState('veteran events VFW American Legion coffee VA clinic parks');
  const[popupOpen,setPopupOpen]=useState(false);
  const[locationNotice,setLocationNotice]=useState('');

  async function load(searchValue=query){
    const actualQuery=String(searchValue||query).trim();
    const nearMe=/near me|nearby|around me|close to me/i.test(actualQuery);
    let loc={source:'profile'};
    try{
      if(nearMe)loc=await freshLocation({required:true,maximumAge:0});
      if(loc?.source==='gps')setLocationNotice(`Using your live GPS location • accuracy ±${Math.round(loc.accuracy||0)}m`);
      else setLocationNotice(user.city?`Using profile location: ${user.city}, ${user.state||''}`:'Enter a city/state or allow location access.');
    }catch(e){
      setItems([]);setLive(false);setPopupOpen(false);setLocationNotice(e.message);return;
    }
    const geo=loc?.source==='gps'&&loc.lat!=null&&loc.lng!=null?`&lat=${encodeURIComponent(loc.lat)}&lng=${encodeURIComponent(loc.lng)}`:'';
    const d=await api(`/api/events/search?city=${encodeURIComponent(user.city||'')}&state=${encodeURIComponent(user.state||'')}&keyword=${encodeURIComponent(actualQuery)}${geo}`);
    setItems(d.items||[]);
    setLive(d.live);
    if(d.location?.source==='browser_location')setLocationNotice(`Using your current location${d.location.city?`: ${d.location.city}, ${d.location.state||''}`:''}`);
    if(d.items?.length)setPopupOpen(true);
  }

  useEffect(()=>{load(query)},[]);

  return <section className="page actionsPage" aria-label="Veteran Community and Activities">
    <div className="operationsHeader">
      <div className="operationsEyebrow">
        <MapPin size={14} aria-hidden="true"/>
        <span>Community Reconnaissance</span>
      </div>
      <h1 className="operationsTitle">Veteran Community & Activities</h1>
      <p className="operationsLead">Discover local veteran gatherings, VFW and American Legion posts, coffee socials, and verified peer support near your coordinates.</p>
    </div>

    {/* Tactical GPS Radar Status Banner */}
    <div className="radarStatusBanner" aria-label="Radar geolocation status">
      <div className="radarPulseIndicator" aria-hidden="true">
        <span className="radarPing"/>
        <span className="radarCore"/>
      </div>
      <div className="radarTextGroup">
        <b>[ TACTICAL GPS RADAR: {live ? 'ACTIVE & VERIFIED' : 'LOCAL CACHE ACTIVE'} ]</b>
        <small>{locationNotice || `Scanning veteran outposts near ${user.city || 'your registered area'}`}</small>
      </div>
      <button className="locationButton" type="button" onClick={()=>{const next='veteran events near me';setQuery(next);load(next)}}>
        <MapPin size={14} aria-hidden="true"/>
        <span>Ping GPS Location</span>
      </button>
    </div>

    <div className="composer actionComposer">
      <input
        value={query}
        onChange={e=>setQuery(e.target.value)}
        onKeyDown={e=>e.key==='Enter'&&load()}
        placeholder="Try: free veteran events this weekend in Arlington"
        aria-label="Search activities"
      />
      <button className="primary actionButton" type="button" onClick={()=>load()}>
        <RefreshCw size={16} aria-hidden="true"/>
        <span>Search activities</span>
      </button>
    </div>

    <div className="suggestionWrap pageSuggestions" aria-label="Quick topic suggestions">
      {['Today','This weekend','Free events','Family-friendly','VFW or Legion','Pick the best for me'].map(x=>(
        <button key={x} type="button" onClick={()=>{const next=`${x} veteran events near me`;setQuery(next);load(next)}}>{x}</button>
      ))}
    </div>

    <Grid items={items}/>

    {items.length>0&&<button className="openResultsButton" onClick={()=>setPopupOpen(true)}>Compare and explain these {items.length} options</button>}
    <SmartResultPopup open={popupOpen} onClose={()=>setPopupOpen(false)} title="Veteran-friendly options near you" subtitle="Review the reason for each recommendation, current details, and available Google reviewer comments." items={items.slice(0,6)} onChoose={(x)=>window.open(x.maps_url||x.website,'_blank')}/>
  </section>;
}

function Benefits({user}){
  const[q,setQ]=useState('benefits');
  const[data,setData]=useState(null);
  const[resourceQuery,setResourceQuery]=useState('');
  const[forms,setForms]=useState([]);
  const[programs,setPrograms]=useState([]);
  const[popupOpen,setPopupOpen]=useState(false);
  const[busy,setBusy]=useState(false);
  const[resourceBusy,setResourceBusy]=useState(false);

  async function search(value=q){
    const query=String(value||q).trim();
    if(!query)return;
    setBusy(true);
    try{
      const d=await api(`/api/benefits/search?query=${encodeURIComponent(query)}&state=${encodeURIComponent(user.state||'')}&branch=${encodeURIComponent(user.branch||'Army')}`);
      setData(d);
      setPopupOpen(!!d?.items?.length);
    }catch(e){
      setData({items:[],error:e.message});
      setPopupOpen(false);
    }finally{setBusy(false)}
  }

  async function loadOfficial(value=resourceQuery){
    const query=String(value||'').trim();
    setResourceBusy(true);
    try{
      const [f,p]=await Promise.all([
        api(`/api/va/forms?query=${encodeURIComponent(query)}`),
        api(`/api/va/programs?query=${encodeURIComponent(query)}`)
      ]);
      setForms(f.items||[]);
      setPrograms(p.items||[]);
    }catch(e){
      console.warn('Official VA resource lookup failed',e);
      setForms([]);setPrograms([]);
    }finally{setResourceBusy(false)}
  }

  useEffect(()=>{loadOfficial('')},[]);

  function explainResource(item){
    const prompt=`Explain ${item.form||item.title} in plain English, who it is for, what information I should gather, and the safest official next step.`;
    setQ(prompt);
    search(prompt);
  }

  return <section className="page actionsPage benefitsHub" aria-label="Benefits and VA Forms Hub">
    <div className="operationsHeader">
      <div className="operationsEyebrow">
        <Search size={14} aria-hidden="true"/>
        <span>Veteran Operations</span>
      </div>
      <h1 className="operationsTitle">Benefits & VA Forms</h1>
      <p className="operationsLead">Understand your benefits, find relevant VA resources, and take the next step with confidence.</p>
    </div>

    {/* Tactical Claim Readiness Protocol Banner */}
    <div className="claimProtocolBanner" aria-label="VA Claim Lifecycle Roadmap">
      <div className="protocolHeader">
        <span className="protocolEyebrow">[ VA CLAIM PROTOCOL // 4-STAGE PIPELINE ]</span>
        <span className="protocolBadge"><CheckCircle2 size={13} aria-hidden="true"/> PACT ACT INTEL ACTIVE</span>
      </div>
      <div className="protocolSteps">
        <div className="protocolStep active">
          <span className="stepNum">01</span>
          <div>
            <b>Intent to File</b>
            <small>VA Form 21-0966 (Protected Date)</small>
          </div>
        </div>
        <div className="protocolDivider" aria-hidden="true"/>
        <div className="protocolStep">
          <span className="stepNum">02</span>
          <div>
            <b>Evidence & Nexus</b>
            <small>STRs, DBQs & Medical Opinions</small>
          </div>
        </div>
        <div className="protocolDivider" aria-hidden="true"/>
        <div className="protocolStep">
          <span className="stepNum">03</span>
          <div>
            <b>C&P Examination</b>
            <small>Disability Assessment Protocol</small>
          </div>
        </div>
        <div className="protocolDivider" aria-hidden="true"/>
        <div className="protocolStep">
          <span className="stepNum">04</span>
          <div>
            <b>Rating Decision</b>
            <small>Monthly Award & Direct Deposit</small>
          </div>
        </div>
      </div>
    </div>

    <div className="benefitsSearchCard">
      <div className="composer">
        <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Ask about benefits, eligibility, family support, or a VA program" aria-label="Search benefits"/>
        <button className="primary actionButton" type="button" disabled={busy} onClick={()=>search()}>
          <Search size={16} aria-hidden="true"/>
          <span>{busy?'Checking...':'Explain benefits'}</span>
        </button>
      </div>
      <div className="suggestionWrap pageSuggestions" aria-label="Suggested topics">
        {['Disability claim','GI Bill and education','VA home loan','Healthcare','Spouse and dependent benefits','Caregiver support','Which VA form do I need?'].map(x=>(
          <button key={x} type="button" onClick={()=>{setQ(x);search(x)}}>{x}</button>
        ))}
      </div>
    </div>

    {busy && (
      <div className="calmLoadingIndicator" role="status">
        <RefreshCw size={15} className="spin" aria-hidden="true"/>
        <span>Researching benefit programs and eligibility guidelines...</span>
      </div>
    )}

    {data?.error&&<div className="profileMessage" role="alert">{data.error}</div>}

    {data && (
      <section aria-label="Benefits guidance results">
        <div className="benefitsSectionTitle">
          <h3>Benefits Overview</h3>
          {data.items?.length > 0 && <span className="statusPill approved">{data.items.length} verified programs</span>}
        </div>
        {data.items?.length > 0 ? (
          <div className="benefitsGrid">
            {data.items.map((x, i) => (
              <article className="benefitCard" key={x.title || `b-${i}`}>
                <div className="benefitCardTitleRow">
                  <h3>{x.title}</h3>
                  <span className="statusPill approved">VA Benefit</span>
                </div>
                <p>{x.summary || x.description}</p>
                {x.next_step && (
                  <div className="benefitStepCallout">
                    <b>Recommended next step:</b>
                    <span>{x.next_step}</span>
                  </div>
                )}
                {(x.assistant_explanation || x.community_note) && (
                  <p className="muted" style={{fontSize:'12px'}}>
                    {x.assistant_explanation || x.community_note}
                  </p>
                )}
                <div className="benefitCardActions">
                  <button type="button" className="actionButton" onClick={() => explainResource(x)}>
                    <Brain size={14} aria-hidden="true"/>
                    <span>Explain in detail</span>
                  </button>
                  {x.url && (
                    <a href={x.url} target="_blank" rel="noopener noreferrer">
                      <span>Official resource ↗</span>
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : !busy && !data.error && (
          <div className="upcomingEmpty">
            <p>No benefit programs matched “{q}”. Try a broader topic such as healthcare, home loan, or disability.</p>
          </div>
        )}
      </section>
    )}

    <div className="officialResourceBox">
      <h2>Official VA Forms and Assistance Programs</h2>
      <p>Search the built-in official-resource directory. Results link to VA.gov or other official federal resources.</p>
      <div className="composer">
        <input value={resourceQuery} onChange={e=>setResourceQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadOfficial()} placeholder="Try: disability, caregiver, education, home loan, VSO" aria-label="Search official VA resources"/>
        <button className="actionButton" type="button" disabled={resourceBusy} onClick={()=>loadOfficial()}>
          <Search size={16} aria-hidden="true"/>
          <span>{resourceBusy?'Searching...':'Search official resources'}</span>
        </button>
      </div>
    </div>

    {resourceBusy ? (
      <div className="calmLoadingIndicator" role="status">
        <RefreshCw size={15} className="spin" aria-hidden="true"/>
        <span>Loading official VA forms and assistance programs...</span>
      </div>
    ) : (
      <div className="officialResourceGrid">
        <div className="officialResourceColumn">
          <h3><FileText size={16} aria-hidden="true"/><span>VA Forms</span></h3>
          {forms.length === 0 ? (
            <p className="muted">No official forms currently listed for this query.</p>
          ) : forms.map(f => (
            <article className="officialResourceCard" key={f.form}>
              <span className="officialFormBadge">{f.form}</span>
              <h4>{f.title}</h4>
              <p>{f.purpose}</p>
              <div className="resourceActions">
                <button type="button" onClick={()=>explainResource(f)}>
                  <Brain size={14} aria-hidden="true"/>
                  <span>Ask ValorBuddy to explain</span>
                </button>
                <a href={f.url} target="_blank" rel="noreferrer">
                  <span>Open official form ↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>
        <div className="officialResourceColumn">
          <h3><Shield size={16} aria-hidden="true"/><span>Veteran Assistance Programs</span></h3>
          {programs.length === 0 ? (
            <p className="muted">No assistance programs currently listed for this query.</p>
          ) : programs.map(x => (
            <article className="officialResourceCard" key={x.title}>
              <span className="officialFormBadge">OFFICIAL PROGRAM</span>
              <h4>{x.title}</h4>
              <p>{x.summary}</p>
              <div className="resourceActions">
                <button type="button" onClick={()=>explainResource(x)}>
                  <Brain size={14} aria-hidden="true"/>
                  <span>Ask ValorBuddy to explain</span>
                </button>
                <a href={x.url} target="_blank" rel="noreferrer">
                  <span>Open official program ↗</span>
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    )}

    <p className="operationsLegalNote">Informational only. Eligibility and submission requirements must be verified on VA.gov or with a VA-accredited representative.</p>
    <SmartResultPopup open={popupOpen} onClose={()=>setPopupOpen(false)} title="Your benefits guidance" subtitle="Plain-English explanations, practical next steps, and clearly labeled community guidance." items={data?.items||[]} kind="benefit"/>
  </section>;
}

function Memories(){
  const[title,setTitle]=useState('');const[note,setNote]=useState('');const[tags,setTags]=useState('personal, memory');const[file,setFile]=useState(null);const[items,setItems]=useState([]);const[busy,setBusy]=useState(false);
  async function load(){try{setItems(await api('/api/memories'))}catch(e){console.warn(e)}}
  useEffect(()=>{load()},[]);
  async function save(){if(!title.trim()){alert('Enter a memory title before saving.');return;}setBusy(true);try{let image_url='';if(file){const fd=new FormData();fd.append('file',file);fd.append('doc_type','memory_photo');const r=await fetch(API+'/api/documents',{method:'POST',headers:authHeaders(),body:fd});const d=await r.json();if(!r.ok)throw new Error(d.detail||'Photo upload failed');image_url=d.file_url||''}await api('/api/memories',{method:'POST',body:JSON.stringify({title:title.trim(),note:note.trim(),tags:tags.split(',').map(x=>x.trim()).filter(Boolean),image_url})});setTitle('');setNote('');setTags('personal, memory');setFile(null);await load()}catch(e){alert(e.message)}finally{setBusy(false)}}
  async function removeMemory(id,name){if(!window.confirm(`Delete memory “${name}”?`))return;try{await api(`/api/memories/${id}`,{method:'DELETE'});await load()}catch(e){alert(e.message)}}
  return <section className="page readablePage" aria-label="Personal Service Memory Wall">
    <div className="operationsHeader">
      <div className="operationsEyebrow">
        <Heart size={14} aria-hidden="true"/>
        <span>Personal Archive</span>
      </div>
      <h1 className="operationsTitle">Personal Service & Memory Wall</h1>
      <p className="operationsLead">Save meaningful stories, unit citations, comrades, photos, and milestones that ValorBuddy securely remembers with you.</p>
    </div>
    <div className="featureForm darkForm">
      <label><span className="fieldLabel">Memory title</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Example: My retirement ceremony" aria-label="Memory title"/></label>
      <label><span className="fieldLabel">Tags</span><input value={tags} onChange={e=>setTags(e.target.value)} placeholder="family, service, deployment" aria-label="Tags"/></label>
      <label className="wide"><span className="fieldLabel">Story or note</span><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Write the story you want ValorBuddy to remember..." aria-label="Story or note"/></label>
      <label className="wide"><span className="fieldLabel">Upload photo or keepsake</span><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/><small>{file?`Selected: ${file.name}`:'Choose a JPG, PNG, or WEBP image.'}</small></label>
      <button className="primary actionButton wideAction" type="button" disabled={busy} onClick={save}><Plus size={16} aria-hidden="true"/><span>{busy?'Saving memory...':'Upload and save memory'}</span></button>
    </div>
    <div className="benefitsSectionTitle">
      <h3>Saved Service Memories</h3>
      {items.length > 0 && <span className="statusPill approved">{items.length} verified archive{items.length === 1 ? '' : 's'}</span>}
    </div>
    <div className="contentGrid">
      {items.length===0&&<div className="emptyState"><Heart size={24} style={{color:'var(--branch-accent)', marginBottom:'8px'}} aria-hidden="true"/><h3>No memories saved yet</h3><p>Add your first story or photo above to start your personal vault archive.</p></div>}
      {items.map(x=><article className="contentCard memoryCard" key={x.id}>{x.image_url&&<img src={x.image_url.startsWith('http')?x.image_url:API+x.image_url} alt={x.title} className="memoryImage"/>}<h3>{x.title}</h3><p>{x.note}</p><div className="cardActions" style={{marginTop:'auto', paddingTop:'10px'}}><button type="button" className="dangerButton" onClick={()=>removeMemory(x.id,x.title)}><Trash2 size={13} aria-hidden="true"/><span>Delete memory</span></button></div></article>)}
    </div>
  </section>;
}

const reminderTimers=new Map();
function reminderLocalDate(item){
  if(!item?.date)return null;
  const timeValue=(item.time||'09:00').slice(0,5);
  const d=new Date(`${item.date}T${timeValue}:00`);
  return Number.isNaN(d.getTime())?null:d;
}
function reminderDisplayStatus(item){
  if(['completed','cancelled','dismissed'].includes(item?.stored_status||item?.status))return item.stored_status||item.status;
  const due=reminderLocalDate(item);if(!due)return item?.status||'scheduled';
  const diff=due.getTime()-Date.now();
  if(diff>5*60*1000)return'upcoming';
  if(diff>=-5*60*1000)return'due now';
  return'overdue';
}
async function requestReminderPermission(){
  try{if(!('Notification'in window))return'unsupported';if(Notification.permission==='default')return await Notification.requestPermission();return Notification.permission}catch{return'unsupported'}
}
function fireBrowserReminder(item,missed=false){
  try{
    if('Notification'in window&&Notification.permission==='granted')new Notification(missed?'ValorBuddy missed reminder':'ValorBuddy Reminder',{body:`${item.title}${item.note?` — ${item.note}`:''}`,tag:`valor-reminder-${item.id}`,renotify:true});
  }catch{}
}
function scheduleBrowserReminder(item){
  const existing=reminderTimers.get(item.id);if(existing)clearTimeout(existing);
  if(['completed','cancelled','dismissed'].includes(item.stored_status||''))return;
  const due=reminderLocalDate(item);if(!due)return;
  const ms=due.getTime()-Date.now();
  if(ms<=0){fireBrowserReminder(item,true);return}
  const maxDelay=2147480000;
  if(ms<=maxDelay){const timer=setTimeout(()=>fireBrowserReminder(item,false),ms);reminderTimers.set(item.id,timer)}
}
async function scheduleNativeReminder(item){
  try{
    const plugin=window.Capacitor?.Plugins?.LocalNotifications;if(!plugin)return false;
    let perm=await plugin.checkPermissions();if(perm?.display!=='granted')perm=await plugin.requestPermissions();if(perm?.display!=='granted')return false;
    const at=reminderLocalDate(item);if(!at||at.getTime()<=Date.now())return false;
    await plugin.schedule({notifications:[{id:Number(item.id)%2147483647,title:'ValorBuddy Reminder',body:`${item.title}${item.note?` — ${item.note}`:''}`,schedule:{at},extra:{reminderId:item.id}}]});
    return true;
  }catch(e){console.warn('Native reminder scheduling failed',e);return false}
}

function Reminders(){
  const[title,setTitle]=useState('');const[date,setDate]=useState('');const[time,setTime]=useState('');const[note,setNote]=useState('');const[items,setItems]=useState([]);const[busy,setBusy]=useState(false);const[notice,setNotice]=useState('');
  async function load({announce=true}={}){try{const rows=await api('/api/reminders');setItems(rows);rows.forEach(x=>{scheduleBrowserReminder(x);scheduleNativeReminder(x)});const overdue=rows.filter(x=>reminderDisplayStatus(x)==='overdue'&&!['completed','cancelled','dismissed'].includes(x.stored_status));if(announce&&overdue.length){setNotice(`${overdue.length} reminder${overdue.length===1?' is':'s are'} overdue. Review ${overdue.length===1?'it':'them'} now.`);overdue.slice(0,3).forEach(x=>fireBrowserReminder(x,true))}else if(!overdue.length)setNotice('')}catch(e){console.warn(e)}}
  useEffect(()=>{load();const timer=setInterval(()=>load({announce:false}),60000);return()=>clearInterval(timer)},[]);
  async function save(){
    if(!title.trim()){alert('Enter a reminder title before saving.');return}
    if(!date){alert('Choose a reminder date.');return}
    const localDue=new Date(`${date}T${(time||'09:00').slice(0,5)}:00`);if(Number.isNaN(localDue.getTime())||localDue.getTime()<=Date.now()){alert('Choose a future date and time for this reminder.');return}
    setBusy(true);try{const permission=await requestReminderPermission();const created=await api('/api/reminders',{method:'POST',body:JSON.stringify({title:title.trim(),date,time:time||'09:00',when_text:`${date} ${time||'09:00'}`,note:note.trim(),timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC'})});scheduleBrowserReminder(created);const nativeScheduled=await scheduleNativeReminder(created);setTitle('');setDate('');setTime('');setNote('');setNotice(nativeScheduled?'Reminder saved with an on-device notification that can fire even when the app is closed.':permission==='denied'?'Reminder saved. Browser notifications are blocked; ValorBuddy will still flag overdue reminders when you return, and server email can deliver when enabled.':'Reminder saved. Browser notification is scheduled while ValorBuddy is open; server email fallback can deliver when enabled.');await load({announce:false})}catch(e){alert(e.message)}finally{setBusy(false)}}
  async function setStatus(id,status){try{await api(`/api/reminders/${id}`,{method:'PATCH',body:JSON.stringify({status})});await load({announce:false})}catch(e){alert(e.message)}}
  async function remove(id,title){if(!window.confirm(`Delete reminder “${title}”?`))return;try{await api(`/api/reminders/${id}`,{method:'DELETE'});const timer=reminderTimers.get(id);if(timer)clearTimeout(timer);reminderTimers.delete(id);await load({announce:false})}catch(e){alert(e.message)}}
  return <section className="page readablePage" aria-label="Reminders and Deadlines">
    <div className="operationsHeader">
      <div className="operationsEyebrow">
        <Bell size={14} aria-hidden="true"/>
        <span>Mission Timetable</span>
      </div>
      <h1 className="operationsTitle">Reminders & Deadlines</h1>
      <p className="operationsLead">Track critical VA appeal deadlines, C&P exams, medications, and squad check-ins with automatic on-device notifications.</p>
    </div>
    {notice&&<div className="reminderNotice"><Bell size={16} aria-hidden="true"/><span>{notice}</span></div>}
    <div className="featureForm darkForm">
      <label><span className="fieldLabel">Reminder title</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Example: VA C&P Examination appointment" aria-label="Reminder title"/></label>
      <label><span className="fieldLabel">Date</span><input type="date" value={date} min={new Date().toISOString().slice(0,10)} onChange={e=>setDate(e.target.value)} aria-label="Reminder date"/></label>
      <label><span className="fieldLabel">Time</span><input type="time" value={time} onChange={e=>setTime(e.target.value)} aria-label="Reminder time"/><small>If no time is chosen, ValorBuddy defaults to 09:00 AM.</small></label>
      <label className="wide"><span className="fieldLabel">Notes & Instructions</span><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Location, documents to bring (STRs, DBQs), doctor name..." aria-label="Reminder notes"/></label>
      <button className="primary actionButton wideAction" type="button" disabled={busy} onClick={save}><Bell size={16} aria-hidden="true"/><span>{busy?'Scheduling reminder...':'Create and schedule reminder'}</span></button>
    </div>
    <div className="benefitsSectionTitle">
      <h3>Active Reminders & Timetable</h3>
      {items.length > 0 && <span className="statusPill approved">{items.length} reminder{items.length === 1 ? '' : 's'}</span>}
    </div>
    <div className="contentGrid">
      {items.length===0&&<div className="emptyState"><Bell size={24} style={{color:'var(--branch-accent)', marginBottom:'8px'}} aria-hidden="true"/><h3>No reminders yet</h3><p>Create a reminder above for an appointment, deadline, call, or task.</p></div>}
      {items.map(item=>{const status=reminderDisplayStatus(item);return <article className={`contentCard reminderCard reminder-${String(status).replace(/\s+/g,'-')}`} key={item.id}><div className="cardTop"><h3>{item.title}</h3><span className="statusPill">{status}</span></div><p className="strongLine">{item.when_text||[item.date,item.time].filter(Boolean).join(' ')||'No date selected'}</p>{item.note&&<p>{item.note}</p>}<small>{item.delivery_state==='email sent'?'Email reminder sent':status==='upcoming'?'Scheduled and active':status==='overdue'?'This time has passed — complete or dismiss.':''}</small><div className="reminderActions" style={{marginTop:'auto', paddingTop:'10px'}}>{!['completed','cancelled','dismissed'].includes(item.stored_status)&&<button type="button" onClick={()=>setStatus(item.id,'completed')}>Mark complete</button>}{status==='overdue'&&<button type="button" onClick={()=>setStatus(item.id,'dismissed')}>Dismiss</button>}<button type="button" className="dangerButton" onClick={()=>remove(item.id,item.title)}><Trash2 size={13} aria-hidden="true"/><span>Delete</span></button></div></article>})}
    </div>
  </section>;
}

function Documents(){
  const[file,setFile]=useState(null);
  const[type,setType]=useState('general');
  const[docs,setDocs]=useState([]);
  const[busy,setBusy]=useState(false);
  const[result,setResult]=useState(null);
  const fileInputRef=useRef(null);

  async function load(){
    setDocs(await api('/api/documents'));
  }

  async function removeDocument(id,filename){
    if(!window.confirm(`Delete ${filename}? This permanently removes the document from ValorBuddy.`))return;
    try{
      await api(`/api/documents/${id}`,{method:'DELETE'});
      if(result?.id===id)setResult(null);
      await load();
    }catch(e){alert(e.message)}
  }

  useEffect(()=>{load()},[]);

  async function upload(){
    if(!file)return;
    setBusy(true);
    setResult(null);
    try{
      const fd=new FormData();
      fd.append('file',file);
      fd.append('doc_type',type);
      const r=await fetch(API+'/api/documents',{method:'POST',headers:authHeaders(),body:fd});
      const d=await r.json();
      if(!r.ok)throw new Error(d.detail||'Upload failed');
      setResult(d);
      setFile(null);
      load();
    }catch(e){alert(e.message)}finally{setBusy(false)}
  }

  return <section className="page" aria-label="Document Intelligence Vault">
    <div className="operationsHeader">
      <div className="operationsEyebrow">
        <Folder size={14} aria-hidden="true"/>
        <span>Personal Vault</span>
      </div>
      <h1 className="operationsTitle">Document Intelligence</h1>
      <p className="operationsLead">Your secure veteran document vault. Upload military records, resumes, and civilian credentials for automated analysis and classification.</p>
    </div>

    <div className="vaultUploadCard">
      <div className="vaultUploadGrid">
        <label>
          <span className="fieldLabel">Document type</span>
          <select value={type} onChange={e=>setType(e.target.value)} disabled={busy} aria-label="Document classification type">
            <option value="general">Detect automatically</option>
            <option value="resume">Resume / CV</option>
            <option value="dd214">DD214 Certificate of Release</option>
            <option value="va_record">VA Medical / Rating Record</option>
            <option value="certification">Civilian / Military Certification</option>
          </select>
        </label>
        <div>
          <span className="fieldLabel">Official Document File</span>
          <div
            className="tacticalDropZone"
            onClick={()=>fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e=>{if(e.key==='Enter'||e.key===' ')fileInputRef.current?.click()}}
            aria-label="Upload document file"
          >
            <input
              ref={fileInputRef}
              type="file"
              style={{display:'none'}}
              accept=".pdf,.docx,.txt,.md,.csv,.jpg,.jpeg,.png"
              onChange={e=>setFile(e.target.files?.[0]||null)}
              disabled={busy}
            />
            <div className="dropIcon">
              {file ? <CheckCircle2 size={24} style={{color:'var(--branch-primary, #10b981)'}}/> : <Upload size={22}/>}
            </div>
            <div className="dropText">
              <span className="dropTitle">{file ? file.name : 'Select or drag military record'}</span>
              <span className="dropSub">{file ? `${(file.size/1024).toFixed(1)} KB • Ready for AES-256 analysis` : 'Supports DD-214, Medical, VA Letters, Resumes (PDF, DOCX, PNG)'}</span>
            </div>
          </div>
        </div>
        <button className="primary actionButton" type="button" disabled={!file||busy} onClick={upload}>
          <Upload size={16} aria-hidden="true"/>
          <span>{busy?'Agents analyzing...':'Upload & Analyze'}</span>
        </button>
      </div>
      <div className="vaultSecurityNote">
        <Lock size={13} aria-hidden="true"/>
        <span>[ AES-256 HARDENED LOCKER • ZERO-KNOWLEDGE VETERAN STORAGE ISOLATION ]</span>
      </div>
    </div>

    {busy && (
      <div className="calmLoadingIndicator" role="status">
        <RefreshCw size={15} className="spin" aria-hidden="true"/>
        <span>Documents Agent extracting readable text, classifying data, and analyzing skills...</span>
      </div>
    )}

    {result && (
      <section className="intelPanel" aria-label="Recent Document Analysis">
        <div className="intelPanelTop">
          <div>
            <span className="vaultTypeBadge">{result.doc_type || 'DOCUMENT'}</span>
            <b>{result.filename}</b>
          </div>
          <span className={`statusPill ${result.status || 'completed'}`}>{(result.status || 'analyzed').replaceAll('_', ' ')}</span>
        </div>
        <p>{result.ai_summary}</p>
        {result.analysis?.skills?.length > 0 && (
          <div>
            <small className="muted" style={{display:'block', marginBottom:'4px'}}>Extracted Skills & Competencies</small>
            <div className="chipRow">
              {result.analysis.skills.slice(0, 12).map(x => <span key={x}>{x}</span>)}
            </div>
          </div>
        )}
        {result.analysis?.suggested_roles?.length > 0 && (
          <>
            <h3>Suggested Civilian Career Directions</h3>
            <ul>
              {result.analysis.suggested_roles.map(x => <li key={x}>{x}</li>)}
            </ul>
          </>
        )}
        {result.analysis?.suggested_actions?.length > 0 && (
          <>
            <h3>Recommended Next Actions</h3>
            <ol>
              {result.analysis.suggested_actions.map(x => <li key={x}>{x}</li>)}
            </ol>
          </>
        )}
        {result.mission && (
          <div className="missionNotice">
            <Brain size={18} aria-hidden="true"/>
            <div>
              <b>Specialist mission initiated automatically</b>
              <small>{result.mission.participating_agents?.join(' • ')} · {result.mission.progress}% complete</small>
            </div>
          </div>
        )}
      </section>
    )}

    <div className="benefitsSectionTitle">
      <h3>Document Vault</h3>
      {docs.length > 0 && <span className="statusPill approved">{docs.length} secure document{docs.length === 1 ? '' : 's'}</span>}
    </div>

    {docs.length === 0 ? (
      <div className="upcomingEmpty">
        <Folder size={24} style={{color:'var(--branch-accent)', marginBottom:'8px'}} aria-hidden="true"/>
        <p><b>No documents yet</b><br/>Upload your first document to begin building your personal veteran document vault.</p>
      </div>
    ) : (
      <div className="vaultGrid">
        {docs.map(d => (
          <article className="vaultCard" key={d.id}>
            <div className="vaultCardTop">
              <div>
                <span className="vaultTypeBadge">{d.doc_type || 'GENERAL'}</span>
                <h3>{d.filename}</h3>
              </div>
              <span className={`statusPill ${d.status || 'active'}`}>{(d.status || d.doc_type || 'stored').replaceAll('_', ' ')}</span>
            </div>
            {d.ai_summary && <p className="vaultSummary">{d.ai_summary}</p>}
            {d.analysis?.skills?.length > 0 && (
              <div className="chipRow">
                {d.analysis.skills.slice(0, 5).map(s => <span key={s}>{s}</span>)}
              </div>
            )}
            <div className="vaultActions">
              {d.file_url && (
                <a className="vaultDownloadLink" href={API + d.file_url} target="_blank" rel="noreferrer">
                  <Lock size={12} aria-hidden="true"/>
                  <span>Open secure file</span>
                </a>
              )}
              <button type="button" className="vaultDeleteBtn" onClick={() => removeDocument(d.id, d.filename)}>
                <Trash2 size={13} aria-hidden="true"/>
                <span>Delete</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    )}
  </section>;
}
const mediaProviders={
  'Veteran TV':{kind:'external',home:'https://www.veterantv.com/',search:q=>`https://www.google.com/search?q=${encodeURIComponent(`site:veterantv.com ${q}`)}`,help:'Veteran TV does not currently provide an approved public embedded player. Open it securely in a new tab while ValorBuddy keeps your saved item and place.'},
  Spotify:{kind:'spotify',home:'https://open.spotify.com/',search:q=>`https://open.spotify.com/search/${encodeURIComponent(q)}`,help:'Paste a Spotify track, album, artist, playlist, show, or episode link to use Spotify’s approved embedded player.'},
  'YouTube Music':{kind:'youtube',home:'https://music.youtube.com/',search:q=>`https://music.youtube.com/search?q=${encodeURIComponent(q)}`,help:'Paste a YouTube or YouTube Music video or playlist link to play it with the approved YouTube player.'},
  YouTube:{kind:'youtube',home:'https://www.youtube.com/',search:q=>`https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,help:'Paste a YouTube video or playlist link to play it inside ValorBuddy.'},
  'Apple Music':{kind:'apple',home:'https://music.apple.com/',search:q=>`https://music.apple.com/us/search?term=${encodeURIComponent(q)}`,help:'Paste an Apple Music song, album, playlist, or station link. ValorBuddy converts supported links to Apple’s embed player.'},
  SoundCloud:{kind:'soundcloud',home:'https://soundcloud.com/',search:q=>`https://soundcloud.com/search?q=${encodeURIComponent(q)}`,help:'Paste a public SoundCloud track, artist, or playlist URL to use the official SoundCloud widget.'},
  iHeartRadio:{kind:'external',home:'https://www.iheart.com/',search:q=>`https://www.iheart.com/search/?q=${encodeURIComponent(q)}`,help:'Open iHeartRadio securely. Full-site framing is not guaranteed, so ValorBuddy avoids broken players.'},
  SiriusXM:{kind:'external',home:'https://www.siriusxm.com/',search:q=>`https://www.siriusxm.com/search/${encodeURIComponent(q)}`,help:'Open SiriusXM securely. Account playback remains with SiriusXM.'},
  'Amazon Music':{kind:'external',home:'https://music.amazon.com/',search:q=>`https://music.amazon.com/search/${encodeURIComponent(q)}`,help:'Amazon Music does not provide a reliable public full-site embed. ValorBuddy saves and opens the selected content securely.'},
  Pandora:{kind:'external',home:'https://www.pandora.com/',search:q=>`https://www.pandora.com/search/${encodeURIComponent(q)}/all`,help:'Pandora playback stays in Pandora because its full website blocks embedding.'},
  TIDAL:{kind:'external',home:'https://listen.tidal.com/',search:q=>`https://listen.tidal.com/search?q=${encodeURIComponent(q)}`,help:'TIDAL may block embedded browser sessions. ValorBuddy therefore uses a secure handoff instead of showing an error page.'},
  Deezer:{kind:'external',home:'https://www.deezer.com/',search:q=>`https://www.deezer.com/search/${encodeURIComponent(q)}`,help:'Deezer’s full website is not a supported embed target. Use secure search or save a direct link.'},
  Audiomack:{kind:'external',home:'https://audiomack.com/',search:q=>`https://audiomack.com/search?q=${encodeURIComponent(q)}`,help:'Audiomack’s full website may refuse framing. ValorBuddy avoids blank screens and uses secure links.'},
  TuneIn:{kind:'external',home:'https://tunein.com/',search:q=>`https://tunein.com/search/?query=${encodeURIComponent(q)}`,help:'TuneIn stations open securely because the complete TuneIn site is not a reliable embedded player.'}
};
function getYouTubeEmbed(raw){try{const u=new URL(raw);let id='';if(u.hostname==='youtu.be')id=u.pathname.split('/').filter(Boolean)[0]||'';else if(u.hostname.includes('youtube.com')){id=u.searchParams.get('v')||'';if(!id&&u.pathname.includes('/shorts/'))id=u.pathname.split('/shorts/')[1]?.split('/')[0]||'';if(!id&&u.pathname.includes('/embed/'))id=u.pathname.split('/embed/')[1]?.split('/')[0]||'';const list=u.searchParams.get('list');if(list&&!id)return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(list)}`;if(id&&list)return `https://www.youtube.com/embed/${encodeURIComponent(id)}?list=${encodeURIComponent(list)}`;}return id?`https://www.youtube.com/embed/${encodeURIComponent(id)}`:''}catch{return ''}}
function getSpotifyEmbed(raw){try{const u=new URL(raw);if(!u.hostname.endsWith('spotify.com'))return '';const parts=u.pathname.split('/').filter(Boolean);const allowed=['track','album','artist','playlist','episode','show'];const index=parts.findIndex(x=>allowed.includes(x));if(index<0||!parts[index+1])return '';return `https://open.spotify.com/embed/${parts[index]}/${parts[index+1]}?utm_source=generator&theme=0`}catch{return ''}}
function getAppleMusicEmbed(raw){try{const u=new URL(raw);if(u.hostname!=='music.apple.com')return '';return `https://embed.music.apple.com${u.pathname}${u.search}`}catch{return ''}}
function getSoundCloudEmbed(raw){try{const u=new URL(raw);if(!u.hostname.endsWith('soundcloud.com'))return '';return `https://w.soundcloud.com/player/?url=${encodeURIComponent(raw)}&color=%2357e86e&auto_play=false&hide_related=false&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true`}catch{return ''}}
function mediaEmbed(provider,raw){const kind=mediaProviders[provider]?.kind;if(!raw)return '';if(kind==='youtube')return getYouTubeEmbed(raw);if(kind==='spotify')return getSpotifyEmbed(raw);if(kind==='apple')return getAppleMusicEmbed(raw);if(kind==='soundcloud')return getSoundCloudEmbed(raw);return ''}
function MusicPage({user,setUser}){
  const[title,setTitle]=useState('');const[url,setUrl]=useState('');const[mood,setMood]=useState('');const[items,setItems]=useState([]);const[provider,setProvider]=useState('Spotify');const[query,setQuery]=useState('');const[preview,setPreview]=useState(null);const[error,setError]=useState('');const[genres,setGenres]=useState([]);const[newGenre,setNewGenre]=useState('');
  async function load(){setItems(await api('/api/music/favorites'));try{const d=await api('/api/music/genres');setGenres(d.items||[])}catch{setGenres(user?.preferred_music_genres||[])}}
  useEffect(()=>{load()},[]);
  async function add(){if(!title.trim())return;await api('/api/music/favorites',{method:'POST',body:JSON.stringify({title,url,mood})});setTitle('');setUrl('');setMood('');load()}
  async function remove(id){await api(`/api/music/favorites/${id}`,{method:'DELETE'});load()}
  async function addGenre(){const value=newGenre.trim();if(!value)return;const d=await api('/api/music/genres',{method:'POST',body:JSON.stringify({genre:value})});setGenres(d.items||[]);setNewGenre('');if(setUser)setUser(v=>({...v,preferred_music_genres:d.items||[]}))}
  async function removeGenre(name){const d=await api(`/api/music/genres/${encodeURIComponent(name)}`,{method:'DELETE'});setGenres(d.items||[]);if(setUser)setUser(v=>({...v,preferred_music_genres:d.items||[]}))}
  function openSearch(){const p=mediaProviders[provider];window.open(p.search(query||title||genres[0]||'veteran music'),'_blank','noopener,noreferrer')}
  function previewLink(raw=url,name=provider){const embed=mediaEmbed(name,raw);setError('');if(embed){setPreview({provider:name,source:raw,embed});return}const kind=mediaProviders[name]?.kind;if(kind&&kind!=='external')setError(`That does not look like a supported ${name} content link. Open ${name}, choose a song, playlist, album, show, or video, copy its link, and paste it here.`);else setPreview({provider:name,source:raw||mediaProviders[name]?.home,embed:''})}
  const selected=mediaProviders[provider];
  return <section className="page readablePage mediaCenterPage" aria-label="Music and Media Center">
    <div className="operationsHeader">
      <div className="operationsEyebrow">
        <Music size={14} aria-hidden="true"/>
        <span>Morale & Media</span>
      </div>
      <h1 className="operationsTitle">Music & Media Center</h1>
      <p className="operationsLead">Choose your own genres, play supported media with approved provider players, and keep favorite playlists and podcasts organized.</p>
    </div>
    <section className="genreManager"><div><small>YOUR MUSIC PROFILE</small><h2>Music genres</h2><p>Add any genre you enjoy. ValorBuddy can use these preferences when suggesting music.</p></div><div className="genreComposer"><input value={newGenre} onChange={e=>setNewGenre(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addGenre()} placeholder="Add a genre: Gospel, Afrobeats, Jazz, Country..."/><button className="primary actionButton" onClick={addGenre} disabled={!newGenre.trim()}><Plus size={14} aria-hidden="true"/><span>Add genre</span></button></div><div className="genreChips">{genres.length===0?<span className="emptyGenre">No genres added yet.</span>:genres.map(g=><span key={g}>{g}<button aria-label={`Remove ${g}`} onClick={()=>removeGenre(g)}><X size={12} aria-hidden="true"/></button></span>)}</div></section><div className="providerTabs" role="tablist" aria-label="Media providers">{Object.keys(mediaProviders).map(name=><button key={name} className={provider===name?'active':''} onClick={()=>{setProvider(name);setError('');setPreview(null)}}>{name}</button>)}</div><div className="mediaWorkspace"><section className="providerPanel"><div className="providerHeading"><div><small>SELECTED SERVICE</small><h2>{provider}</h2></div><span className={`supportBadge ${selected.kind==='external'?'handoff':'embedded'}`}>{selected.kind==='external'?'Secure handoff':'In-app player'}</span></div><p>{selected.help}</p><div className="mediaSearchRow"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&openSearch()} placeholder={`Search ${provider} for an artist, song, playlist, or podcast`}/><button onClick={openSearch}><Search size={14} aria-hidden="true"/>Search {provider}</button></div><label className="mediaUrlField"><span>Paste a specific {provider} content link</span><input value={url} onChange={e=>setUrl(e.target.value)} placeholder={`Paste the copied ${provider} link here`}/></label>{error&&<div className="mediaError">{error}</div>}<div className="mediaActionRow"><button className="primary actionButton" onClick={()=>previewLink()} disabled={!url.trim()&&selected.kind!=='external'}>{selected.kind==='external'?'Open safely':'Preview inside ValorBuddy'}</button><button onClick={()=>window.open(selected.home,'_blank','noopener,noreferrer')}>Visit {provider}</button></div></section><section className="mediaPreviewPanel">{preview?.embed?<><div className="playerTitle"><div><small>NOW READY</small><h3>{preview.provider} player</h3></div><button onClick={()=>setPreview(null)}>Close</button></div><iframe src={preview.embed} title={`${preview.provider} approved player`} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></>:preview&&!preview.embed?<div className="handoffCard"><Radio size={16} aria-hidden="true"/><h3>{preview.provider} protects playback outside embedded websites</h3><p>ValorBuddy will keep your saved title and link. Open the service securely without displaying a broken player.</p><button className="primary actionButton" onClick={()=>window.open(preview.source||selected.home,'_blank','noopener,noreferrer')}>Continue to {preview.provider}</button></div>:<div className="playerEmpty"><Music size={24} aria-hidden="true"/><h3>No blank player</h3><p>Choose a provider and paste a supported content link. ValorBuddy will only display an approved player when one is available.</p></div>}</section></div><div className="featureForm darkForm saveMediaForm"><label><span>Favorite title</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Example: Gospel classics or veteran podcast"/></label><label><span>Direct content link</span><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste the track, playlist, podcast, station, or video link"/></label><label><span>Mood or purpose</span><input value={mood} onChange={e=>setMood(e.target.value)} placeholder="Relax, workout, memories, motivation"/></label><button className="primary actionButton" disabled={!title.trim()} onClick={add}><Plus size={14} aria-hidden="true"/><span>Save favorite</span></button></div><h2>Saved media</h2><div className="contentGrid">{items.length===0&&<div className="emptyState"><Music size={24} style={{color:'var(--branch-accent)', marginBottom:'8px'}} aria-hidden="true"/><h3>No saved media yet</h3><p>Save a song, playlist, station, podcast, audiobook, or Veteran TV link.</p></div>}{items.map(x=><article className="contentCard" key={x.id}><h3>{x.title}</h3><p>{x.mood||'Saved favorite'}</p><div className="cardActions">{x.url&&<button onClick={()=>{const match=Object.keys(mediaProviders).find(name=>{try{const host=new URL(x.url).hostname;return(name==='Spotify'&&host.includes('spotify'))||((name==='YouTube'||name==='YouTube Music')&&host.includes('youtube'))||(name==='Apple Music'&&host.includes('music.apple'))||(name==='SoundCloud'&&host.includes('soundcloud'))}catch{return false}})||'Veteran TV';setProvider(match);previewLink(x.url,match)}}>Play or open</button>}<button className="dangerButton" onClick={()=>remove(x.id)}><Trash2 size={13} aria-hidden="true"/>Remove</button></div></article>)}</div></section>;
}

function ProfileField({label,name,form,onChange,saving,wide=false,area=false,placeholder='',help='',type='text',required=false}){
  const id=`profile-${name}`;
  return <label className={`profileField ${wide?'wide':''}`} htmlFor={id}>
    <span className="fieldLabel">{label}{required&&<em> Required</em>}</span>
    {help&&<small className="fieldHelp">{help}</small>}
    {area
      ?<textarea id={id} value={form[name]??''} onChange={e=>onChange(name,e.target.value)} placeholder={placeholder} aria-label={label} disabled={saving}/>
      :<input id={id} type={type} value={form[name]??''} onChange={e=>onChange(name,e.target.value)} placeholder={placeholder} aria-label={label} autoComplete="off" disabled={saving}/>}
  </label>;
}

function Profile({user,setUser}){
  const[editing,setEditing]=useState(false);const[saving,setSaving]=useState(false);const[message,setMessage]=useState('');
  const makeForm=(u)=>({...u,interests:u?.interests||[],accessibility_needs:u?.accessibility_needs||[],preferred_music_genres:u?.preferred_music_genres||[]});
  const[form,setForm]=useState(()=>makeForm(user));
  useEffect(()=>{if(!editing)setForm(makeForm(user))},[user,editing]);
  async function beginEdit(){setMessage('');try{const fresh=await api('/api/profile');setForm(makeForm(fresh))}catch{setForm(makeForm(user))}setEditing(true)}
  async function save(){if(!String(form.first_name||'').trim()){setMessage('First name is required.');return}setSaving(true);setMessage('');try{const d=await api('/api/profile',{method:'POST',body:JSON.stringify({...form,first_name:String(form.first_name||'').trim(),last_name:String(form.last_name||'').trim(),years_of_service:form.years_of_service!==''&&form.years_of_service!=null?Number(form.years_of_service):null})});setUser(d);setForm(makeForm(d));setEditing(false);setMessage('Profile saved successfully.')}catch(e){setMessage(e.message||'Profile could not be saved.')}finally{setSaving(false)}}
  function cancel(){setForm(makeForm(user));setMessage('');setEditing(false)}
  const change=(name,value)=>setForm(prev=>({...prev,[name]:value}));
  const fieldProps={form,onChange:change,saving};
  return <section className="page profilePage" aria-label="Service and Career Dossier">
    <div className="operationsHeader">
      <div className="operationsEyebrow">
        <User size={14} aria-hidden="true"/>
        <span>Personnel Record</span>
      </div>
      <div className="pageTitleRow">
        <div>
          <h1 className="operationsTitle">Service Dossier & Career Profile</h1>
          <p className="operationsLead">Your verified military background, MOS credentials, awards, and transition goals feeding directly into the AI Battle Buddy and Career Agent.</p>
        </div>
        <div className="profileActions">
          {editing&&<button type="button" onClick={cancel} disabled={saving}>Cancel</button>}
          <button className="primary actionButton" type="button" disabled={saving} onClick={()=>editing?save():beginEdit()}>
            <User size={14} aria-hidden="true"/>
            <span>{saving?'Saving...':editing?'Save profile':'Edit profile'}</span>
          </button>
        </div>
      </div>
    </div>
    {message&&<div className="profileMessage" role="status">{message}</div>}
    {editing?<div className="profileEditNotice"><b>Edit mode is on</b><span>Click or tap any field and type normally. Use Tab/Next to move between fields, then Save profile when finished.</span></div>:null}
    {editing?<div className="profileForm labeledProfileForm highReadabilityProfile"><ProfileField {...fieldProps} label="First name" name="first_name" placeholder="Enter your first name" required/><ProfileField {...fieldProps} label="Last name" name="last_name" placeholder="Enter your last name" required/><ProfileField {...fieldProps} label="Military rank" name="rank" placeholder="Example: SSG, CPT, PO1" help="Your current or highest rank."/><label className="profileField" htmlFor="profile-branch"><span className="fieldLabel">Service branch</span><small className="fieldHelp">Select the branch in which you served.</small><select id="profile-branch" value={form.branch||'Army'} onChange={e=>change('branch',e.target.value)} disabled={saving}>{Object.keys(branches).map(x=><option key={x}>{x}</option>)}</select></label><ProfileField {...fieldProps} label="MOS / AFSC / Rating" name="military_mos" placeholder="Example: 25B, 3D0X2, IT" help="Your military occupational specialty code."/><ProfileField {...fieldProps} label="Military job title" name="military_job_title" placeholder="Example: Information Technology Specialist" help="The plain-English title of your military role."/><ProfileField {...fieldProps} label="Years of service" name="years_of_service" type="number" placeholder="Example: 12" help="Total completed years of military service."/><ProfileField {...fieldProps} label="Security clearance" name="security_clearance" placeholder="Example: Secret" help="Only include a current or previously verified clearance."/><ProfileField {...fieldProps} label="Highest education" name="highest_education" placeholder="Example: Bachelor of Science in Information Technology"/><ProfileField {...fieldProps} label="Civilian certifications" name="civilian_certifications" placeholder="Example: Security+, PMP, AWS Solutions Architect" help="Separate multiple certifications with commas."/><ProfileField {...fieldProps} label="Civilian career goal" name="civilian_career_goal" placeholder="Example: Cybersecurity GRC Analyst" help="The role or career field you want ValorBuddy to target."/><ProfileField {...fieldProps} label="LinkedIn profile URL" name="linkedin_url" type="url" placeholder="https://www.linkedin.com/in/your-name"/><ProfileField {...fieldProps} label="Business interest" name="business_interest" wide area placeholder="Describe the business idea or industry you want to explore." help="Used by the Business Plan Agent."/><ProfileField {...fieldProps} label="Military specialty description" name="military_specialty_description" wide area placeholder="Describe your specialty, mission, unit function, and technical focus." help="Explain your MOS or military occupation in your own words."/><ProfileField {...fieldProps} label="Military duties, tools, leadership, and accomplishments" name="military_experience" wide area placeholder="Describe teams led, systems used, missions supported, measurable results, awards, and major responsibilities." help="Used by the Career Agent to translate military experience into civilian resume language."/><ProfileField {...fieldProps} label="Deployment history" name="deployment_history" wide area placeholder="List deployments, locations, dates, and responsibilities you are comfortable sharing." help="Optional. Do not include classified or sensitive information."/><ProfileField {...fieldProps} label="Current city" name="city" placeholder="Example: Dallas"/><ProfileField {...fieldProps} label="State" name="state" placeholder="Example: TX" help="Use the two-letter state abbreviation."/></div>:<div className="profileSummary">{[['Full name',`${user.first_name} ${user.last_name||''}`],['Rank / Branch',`${user.rank||'—'} / ${user.branch}`],['MOS / AFSC / Rating',user.military_mos||'Not provided'],['Military role',user.military_job_title||'Not provided'],['Years served',user.years_of_service||'Not provided'],['Career goal',user.civilian_career_goal||'Not provided'],['Business interest',user.business_interest||'Not provided'],['Education',user.highest_education||'Not provided'],['Certifications',user.civilian_certifications||'Not provided'],['Location',`${user.city||'—'}, ${user.state||'—'}`]].map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b></div>)}</div>}
  </section>;
}

function Tutorial({setScreen}){
  const steps=[
    ['Start with your profile','Open Profile, press Edit profile, update your service branch, MOS/AFSC/rating, location, career goal, and other information. This makes recommendations more relevant.','profile'],
    ['Ask the AI Assistant','Use AI Assistant for plain-English questions or a mission. You can also use Voice for hands-free support.','companion'],
    ['Benefits and VA forms','Open Benefits to search benefit topics, official VA forms, and veteran assistance programs. Ask ValorBuddy to explain any form before opening the official source.','benefits'],
    ['Find nearby activities','Activities uses your current location when permitted and can compare veteran-friendly options, VFW/American Legion locations, and family-friendly activities.','events'],
    ['Save memories and reminders','Use Memories for stories/photos and Reminders for appointments, medications, deadlines, calls, and tasks.','reminders'],
    ['Documents and career','Upload documents in Document Intelligence, then use Career & Business or Mission Control for structured help.','documents'],
    ['Personalize music','In Music & Media, add or delete your favorite genres, save specific media, and open supported providers.','music']
  ];
  return <section className="page tutorialPage" aria-label="ValorBuddy Orientation Briefing">
    <div className="operationsHeader">
      <div className="operationsEyebrow">
        <BookOpen size={14} aria-hidden="true"/>
        <span>Operations Briefing</span>
      </div>
      <div className="pageTitleRow">
        <div>
          <h1 className="operationsTitle">Mission Orientation & Tutorial</h1>
          <p className="operationsLead">A 7-step guided briefing on navigating benefits, commanding the AI Battle Buddy, securing documents, and finding local support.</p>
        </div>
        <button className="primary actionButton" onClick={()=>setScreen('dashboard')}>
          <span>Return to Command Center</span>
        </button>
      </div>
    </div>
    <div className="tutorialGrid">
      {steps.map(([title,body,target],i)=>(
        <article className="tutorialCard" key={title}>
          <span>0{i+1}</span>
          <div>
            <h2>{title}</h2>
            <p>{body}</p>
            <button type="button" onClick={()=>setScreen(target)}>
              <span>Open this feature</span>
              <ChevronRight size={14} aria-hidden="true"/>
            </button>
          </div>
        </article>
      ))}
    </div>
    <div className="tutorialSafety">
      <Shield size={20} aria-hidden="true"/>
      <div>
        <h2>Important Operational Notice</h2>
        <p>ValorBuddy provides informational assistance. For official eligibility, claims, medical care, legal advice, financial decisions, or emergencies, use the appropriate official or licensed professional resource.</p>
      </div>
    </div>
  </section>;
}

function MissionControl(){
  const[goal,setGoal]=useState('');
  const[missions,setMissions]=useState([]);
  const[busy,setBusy]=useState(false);

  async function load(){
    setMissions(await api('/api/agentic/missions'));
  }

  useEffect(()=>{load()},[]);

  async function start(){
    if(goal.trim().length<3){
      alert('Describe the outcome you want ValorBuddy agents to complete.');
      return;
    }
    setBusy(true);
    try{
      await api('/api/agentic/missions',{method:'POST',body:JSON.stringify({...locationPayload(),goal,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone})});
      setGoal('');
      load();
    }finally{setBusy(false)}
  }

  return <section className="page" aria-label="Mission Control Center">
    <div className="operationsHeader">
      <div className="operationsEyebrow">
        <Brain size={14} aria-hidden="true"/>
        <span>Agentic Operations</span>
      </div>
      <h1 className="operationsTitle">Mission Control</h1>
      <p className="operationsLead">Your active plans and next steps. Give ValorBuddy an outcome—the Supervisor Agent coordinates specialist agents, executes tools, and tracks progress.</p>
    </div>

    <div className="missionComposerCard">
      <h2>Launch a Mission</h2>
      <p>Define an objective. Specialist agents (Career, Benefits, Documents, Community) will collaborate to deliver a verified outcome.</p>
      <textarea
        value={goal}
        onChange={e=>setGoal(e.target.value)}
        placeholder="Example: Analyze my resume, suggest three civilian career paths, and build a tailored resume for a senior operations role."
        aria-label="Mission objective"
      />
      <button className="primary actionButton" type="button" disabled={busy||!goal.trim()} onClick={start}>
        <Brain size={16} aria-hidden="true"/>
        <span>{busy?'Supervisor coordinating agents...':'Send mission to Supervisor Agent'}</span>
      </button>
    </div>

    {busy && (
      <div className="calmLoadingIndicator" role="status">
        <RefreshCw size={15} className="spin" aria-hidden="true"/>
        <span>Supervisor Agent coordinating specialist agents and executing mission steps...</span>
      </div>
    )}

    <div className="benefitsSectionTitle">
      <h3>Active Plans & Operations</h3>
      {missions.length > 0 && <span className="statusPill approved">{missions.length} mission{missions.length === 1 ? '' : 's'}</span>}
    </div>

    {missions.length === 0 ? (
      <div className="upcomingEmpty">
        <Brain size={24} style={{color:'var(--branch-accent)', marginBottom:'8px'}} aria-hidden="true"/>
        <p><b>No active missions yet</b><br/>Define an outcome above to start an agentic workflow with your personal AI team.</p>
      </div>
    ) : (
      <div className="missionList">
        {missions.map(m => (
          <article className="missionCard" key={m.id}>
            <div className="missionCardTop">
              <div>
                <span className="missionUidTag">{m.mission_uid || 'MISSION'}</span>
                <h3 className="missionTitle">{m.title || 'Mission in progress'}</h3>
              </div>
              <span className={`statusPill ${m.status || 'planned'}`}>{(m.status || 'planned').replaceAll('_', ' ')}</span>
            </div>
            <p className="missionGoal">{m.goal}</p>
            <div className="progressTrack">
              <i style={{width: `${m.progress || 0}%`}}/>
            </div>
            <div className="missionMeta">
              <b>{m.progress || 0}% complete</b>
              {m.participating_agents?.length > 0 && (
                <div className="agentStrip">
                  {m.participating_agents.map(a => (
                    <span className="agentBadge" key={a}>{a.replaceAll('_', ' ')}</span>
                  ))}
                </div>
              )}
            </div>
            {m.steps?.length > 0 && (
              <div className="agentStepGrid">
                {m.steps.map((s, idx) => (
                  <div className="agentStep" key={s.id || `s-${idx}`}>
                    <span className={`agentStepStatus ${s.status === 'completed' ? 'completed' : s.status === 'running' ? 'running' : s.status === 'failed' ? 'failed' : 'pending'}`}>
                      {s.status === 'completed' ? '✓' : s.status === 'running' ? '…' : s.status === 'failed' ? '!' : '○'}
                    </span>
                    <div>
                      <b>{s.agent_name || s.agent_key}</b>
                      <small>{s.title}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {m.next_action && (
              <div className="nextActionBanner">
                <ChevronRight size={14} aria-hidden="true"/>
                <span><b>Next action:</b> {m.next_action}</span>
              </div>
            )}
          </article>
        ))}
      </div>
    )}
  </section>;
}

function CareerBusiness({user}){
  const[type,setType]=useState('resume');
  const[target,setTarget]=useState(user.civilian_career_goal||user.business_interest||'');
  const[notes,setNotes]=useState('');
  const[docs,setDocs]=useState([]);
  const[current,setCurrent]=useState(null);
  const[busy,setBusy]=useState(false);

  async function load(){
    setDocs(await api('/api/career/documents'));
  }

  useEffect(()=>{load()},[]);

  async function generate(){
    if(target.trim().length<2){
      alert('Enter the target role or business idea before sending this request to the Career Agent.');
      return;
    }
    setBusy(true);
    try{
      const d=await api('/api/career/generate',{method:'POST',body:JSON.stringify({document_type:type,target,notes})});
      setCurrent(d);
      load();
    }catch(e){
      alert(e.message);
    }finally{setBusy(false)}
  }

  return <section className="page readablePage" aria-label="Career and Business Studio">
    <div className="operationsHeader">
      <div className="operationsEyebrow">
        <Briefcase size={14} aria-hidden="true"/>
        <span>Veteran Operations</span>
      </div>
      <h1 className="operationsTitle">Career & Business</h1>
      <p className="operationsLead">Translate your military experience into civilian opportunities. Use your service record, MOS, and leadership background to build verified career drafts.</p>
    </div>

    <div className="mosFlowBanner" aria-label="Military to Civilian Translation Workflow">
      <div className="mosFlowStep">
        <span>Step 1: Military Experience</span>
        <b>{user.military_mos ? `${user.military_mos} · ${user.military_job_title || 'Specialist'}` : 'Your MOS & Service Record'}</b>
      </div>
      <span className="mosFlowArrow" aria-hidden="true">→</span>
      <div className="mosFlowStep">
        <span>Step 2: Transferable Skills</span>
        <b>Leadership & Technical Alignment</b>
      </div>
      <span className="mosFlowArrow" aria-hidden="true">→</span>
      <div className="mosFlowStep">
        <span>Step 3: Civilian Opportunities</span>
        <b>{user.civilian_career_goal || 'Tailored Resume & Planning'}</b>
      </div>
    </div>

    <div className="careerLayout">
      <div className="careerFormCard">
        <div className="featureForm darkForm">
          <label>
            <span className="fieldLabel">Document type</span>
            <select value={type} onChange={e=>setType(e.target.value)} disabled={busy} aria-label="Select career document type">
              <option value="resume">Civilian resume</option>
              <option value="cover_letter">Cover letter</option>
              <option value="career_plan">Career transition plan</option>
              <option value="business_plan">Veteran business plan</option>
            </select>
          </label>
          <label>
            <span className="fieldLabel">Target role or business idea</span>
            <input value={target} onChange={e=>setTarget(e.target.value)} placeholder="Example: Senior Operations Manager" disabled={busy} aria-label="Target role or business idea"/>
          </label>
          <label className="wide">
            <span className="fieldLabel">Extra instructions & focus areas</span>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Include leadership, logistics, team management, certifications, and measurable outcomes..." disabled={busy} aria-label="Extra instructions"/>
          </label>
          <button className="primary actionButton wideAction" type="button" disabled={busy} onClick={generate}>
            <Briefcase size={16} aria-hidden="true"/>
            <span>{busy?'Career Agent working...':'Generate Verified Draft'}</span>
          </button>
        </div>
      </div>

      <aside className="readinessCard" aria-label="Profile Context Readiness">
        <h3><Shield size={16} aria-hidden="true"/><span>Agent Readiness</span></h3>
        <p className="muted" style={{fontSize:'12px', margin:'0 0 8px'}}>Verified profile context supplied to the Career Agent:</p>
        <div className="mosReadinessItem">
          <span>MOS / AFSC / Rating</span>
          <b>{user.military_mos || 'Not provided — update in Profile'}</b>
        </div>
        <div className="mosReadinessItem">
          <span>Military Job Title</span>
          <b>{user.military_job_title || 'Not provided — update in Profile'}</b>
        </div>
        <div className="mosReadinessItem">
          <span>Civilian Career Goal</span>
          <b>{user.civilian_career_goal || 'Not provided — update in Profile'}</b>
        </div>
        <div className="mosReadinessItem">
          <span>Business Interest</span>
          <b>{user.business_interest || 'Not provided — update in Profile'}</b>
        </div>
      </aside>
    </div>

    {busy && (
      <div className="calmLoadingIndicator" role="status">
        <RefreshCw size={15} className="spin" aria-hidden="true"/>
        <span>Career Agent translating military duties, formatting accomplishments, and generating verified draft...</span>
      </div>
    )}

    {current && (
      <article className="generatedDoc readableDocument" aria-label="Generated Draft Output">
        <div className="generatedDocHeader">
          <h2>{current.title}</h2>
          <button type="button" className="actionButton" onClick={()=>navigator.clipboard?.writeText(current.content)}>
            <FileText size={14} aria-hidden="true"/>
            <span>Copy to clipboard</span>
          </button>
        </div>
        <pre>{current.content}</pre>
      </article>
    )}

    <div className="benefitsSectionTitle">
      <h3>Saved Drafts & Career Documents</h3>
      {docs.length > 0 && <span className="statusPill approved">{docs.length} draft{docs.length === 1 ? '' : 's'}</span>}
    </div>

    {docs.length === 0 ? (
      <div className="upcomingEmpty">
        <Briefcase size={24} style={{color:'var(--branch-accent)', marginBottom:'8px'}} aria-hidden="true"/>
        <p><b>No drafts yet</b><br/>Create your first civilian resume, transition plan, cover letter, or business plan above.</p>
      </div>
    ) : (
      <div className="contentGrid">
        {docs.map(d => (
          <article className="contentCard" key={d.id}>
            <div className="cardTop">
              <h3>{d.title}</h3>
              <span className="statusPill approved">{(d.status || d.document_type || 'draft').replaceAll('_', ' ')}</span>
            </div>
            <p><b>Target:</b> {d.target}</p>
            <small className="muted">{d.document_type?.replaceAll('_', ' ')}</small>
            <div className="cardActions" style={{marginTop:'auto', paddingTop:'10px'}}>
              <button type="button" onClick={() => setCurrent(d)}>
                <span>Open draft</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    )}
  </section>;
}

function Admin({onPreview,vendorOnly=false}){
  const[o,setO]=useState(null),[users,setUsers]=useState([]),[partners,setPartners]=useState([]),[partnerListings,setPartnerListings]=useState([]),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true);
  async function load(){setLoading(true);setNotice('');const results=await Promise.allSettled([api('/admin/overview'),api('/admin/users'),api('/admin/partners'),api('/admin/partner-listings')]);if(results[0].status==='fulfilled')setO(results[0].value);if(results[1].status==='fulfilled')setUsers(results[1].value);if(results[2].status==='fulfilled')setPartners(results[2].value);if(results[3].status==='fulfilled')setPartnerListings(results[3].value.items||[]);const failures=results.filter(x=>x.status==='rejected');if(failures.length)setNotice(`${failures.length} admin section${failures.length>1?'s':''} could not refresh. Existing sections remain visible. Press Retry.`);setLoading(false)}
  useEffect(()=>{load()},[]);
  async function setPartnerStatus(id,status){try{await api(`/admin/partners/${id}/status`,{method:'PATCH',body:JSON.stringify({approval_status:status})});setNotice(`Partner ${status.replaceAll('_',' ')}.`);await load()}catch(e){setNotice(e.message)}}
  async function setMemberStatus(id,status){try{await api(`/admin/users/${id}/approval`,{method:'PATCH',body:JSON.stringify({approval_status:status})});setNotice(`Member ${status}.`);await load()}catch(e){setNotice(e.message)}}
  async function reviewListing(id,status){try{await api(`/admin/partner-listings/${id}/status`,{method:'PATCH',body:JSON.stringify({status,admin_note:status==='rejected'?'Revise the listing and resubmit for review.':''})});setNotice(`Marketplace listing ${status.replaceAll('_',' ')}.`);await load()}catch(e){setNotice(e.message)}}
  return <section className="page adminPage">
    <div className="adminUsersHeading"><div><h1>{vendorOnly?'Vendor Marketplace Control':'Admin Dashboard'}</h1><p className="pageLead">{vendorOnly?'Review vendors, open their portal, assign plans and control marketplace access.':'Control signed-up members, approvals, marketplace plans and vendor portal access.'}</p></div><button className="adminRetryButton" onClick={load} disabled={loading}>{loading?'Refreshing…':'Retry refresh'}</button></div>
    {notice&&<div className="partnerMessage">{notice}</div>}{!vendorOnly&&o&&<div className="stats">{Object.entries(o).map(([k,v])=><div key={k}><b>{v}</b><span>{k.replaceAll('_',' ')}</span></div>)}</div>}
    <div className="adminUsersHeading"><h2>Vendor and partner applications</h2><span>{partners.length} total</span></div>
    <div className="adminPartnerGrid">{partners.length===0&&<div className="emptyState"><Briefcase/><h3>{loading?'Loading applications…':'No vendor applications available'}</h3><p>The Vendor Marketplace link stays available here.</p></div>}{partners.map(p=><article key={p.id}><div className="cardTop"><div><small>{p.organization_type}</small><h3>{p.organization_name}</h3></div><span className="statusPill">{p.approval_status.replaceAll('_',' ')}</span></div><p><b>{p.contact_name}</b>{p.contact_title?` · ${p.contact_title}`:''}<br/><a href={`mailto:${p.email}`}>{p.email}</a></p><p>{p.plan_name} · {p.monthly_price_cents?`$${(p.monthly_price_cents/100).toLocaleString()}/month`:'Custom'} · {Number(p.estimated_veterans||0).toLocaleString()} Veterans</p><div className="adminPartnerActions"><button className="portalPreviewButton" onClick={()=>onPreview?.(p.id)}>Open vendor portal</button><button onClick={()=>setPartnerStatus(p.id,'approved')}>Verify and approve</button><button onClick={()=>setPartnerStatus(p.id,'pending_review')}>Return to review</button><button className="dangerButton" onClick={()=>setPartnerStatus(p.id,'suspended')}>Suspend</button></div></article>)}</div>
    <div className="adminUsersHeading"><h2>Marketplace listing review</h2><span>{partnerListings.length} total</span></div><div className="adminPartnerGrid">{partnerListings.length===0&&<div className="emptyState"><Briefcase/><h3>No marketplace listings</h3><p>Submitted vendor products and advertisements will appear here.</p></div>}{partnerListings.map(item=><article key={item.id}><div className="cardTop"><div><small>{item.organization_name} · {item.listing_type}</small><h3>{item.title}</h3></div><span className="statusPill">{item.status.replaceAll('_',' ')}</span></div><p>{item.description}</p>{item.veteran_offer&&<p><b>Veteran offer:</b> {item.veteran_offer}</p>}<p><small>{item.audience_city||'All cities'} · {item.audience_state||'All states'} · {item.audience_branch||'All branches'}</small></p><div className="adminPartnerActions"><button onClick={()=>reviewListing(item.id,'published')}>Approve and publish</button><button onClick={()=>reviewListing(item.id,'pending_review')}>Keep in review</button><button onClick={()=>reviewListing(item.id,'paused')}>Pause</button><button className="dangerButton" onClick={()=>reviewListing(item.id,'rejected')}>Reject</button></div></article>)}</div>
    {!vendorOnly&&<><div className="adminUsersHeading"><h2>Signed-up members</h2><span>{users.length} total</span></div><div className="adminUsersGrid">{users.length===0&&!loading&&<div className="emptyState"><User/><h3>Member list could not be loaded</h3><p>Your accounts have not been deleted. Press Retry refresh.</p></div>}{users.map(u=><article className="adminUserCard" key={u.id}><div className="adminUserTop"><div className="adminUserIdentity"><h3>{u.first_name||'Member'}{u.last_name?` ${u.last_name}`:''}</h3><a className="adminUserEmail" href={`mailto:${u.email}`}>{u.email}</a></div><span className={`adminStatus ${u.active?'active':'inactive'}`}>{u.active?'Active':'Inactive'}</span></div><div className="adminUserMeta"><span>{u.role||'member'}</span><span>{u.branch||'Branch not set'}</span></div><small className="adminUserLocation">{[u.city,u.state].filter(Boolean).join(', ')||'Location not set'}</small><div className="adminUserApproval"><span className={`statusPill ${u.approval_status||'approved'}`}>{(u.approval_status||'approved').replaceAll('_',' ')}</span>{u.role==='admin'?<small>{u.mfa_enabled?'MFA enabled':'MFA enrollment required'}</small>:<div className="adminPartnerActions"><button onClick={()=>setMemberStatus(u.id,'approved')}>Approve</button><button onClick={()=>setMemberStatus(u.id,'pending')}>Pending</button><button className="dangerButton" onClick={()=>setMemberStatus(u.id,'suspended')}>Suspend</button></div>}</div></article>)}</div></>}
  </section>
}
function Grid({items=[]}){return <div className="grid">{items.map((x,i)=><div className="card"key={i}><h3>{x.title||x.name}</h3><p>{x.description||x.note||x.summary||''}</p><small>{x.location||x.type||x.when_text||''}</small>{x.next_step&&<p><b>Next step:</b> {x.next_step}</p>}{(x.website||x.url||x.maps_url)&&<a target="_blank" rel="noopener noreferrer" href={x.website||x.url||x.maps_url}>{x.website||x.url?'Official website':'Open directions'} ↗</a>}</div>)}</div>}
export default App;
