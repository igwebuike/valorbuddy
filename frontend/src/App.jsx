import React,{useEffect,useMemo,useRef,useState}from'react';
import{Shield,Mic,MicOff,LogOut,User,Calendar,MapPin,Heart,Folder,Music,Bell,Brain,Search,ChevronRight,BarChart3,Lock,Eye,EyeOff,Plus,Upload,FileText,RefreshCw,Radio,Menu,X,Trash2,Car,Home,Briefcase,Navigation,DollarSign,BookOpen}from'lucide-react';
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
Army:{emblem:armyEmblem,cls:'army',label:'Army Mission Control',motto:'Duty. Honor. Support.',style:{'--bg':'#06140b','--panel':'#0b2111','--panel2':'#102f18','--accent':'#75f06e','--accent2':'#e6c96a','--text':'#fff5cf','--muted':'#c7d8b1','--border':'#4caf50'}},
Navy:{emblem:navyEmblem,cls:'navy',label:'United States Navy • Fleet Command',motto:'Honor. Courage. Commitment.',style:{'--bg':'#031426','--panel':'#062743','--panel2':'#0a3a5d','--accent':'#d4af37','--accent2':'#f7e7a9','--text':'#f7fbff','--muted':'#b9d2e8','--border':'#2f6f99'}},
'Air Force':{emblem:airForceEmblem,cls:'airforce',label:'Air Force Flight Operations',motto:'Aim High. Fly. Fight. Support.',style:{'--bg':'#071a2f','--panel':'#0d2d52','--panel2':'#123f73','--accent':'#c9ced6','--accent2':'#d6d9df','--text':'#e6e8ec','--muted':'#b9c0ca','--border':'#8b95a3'}},
Marines:{emblem:marinesEmblem,cls:'marines',label:'Marine Command Post',motto:'Semper Fidelis. Always Faithful.',style:{'--bg':'#1f120b','--panel':'#332014','--panel2':'#4b2b18','--accent':'#ff3131','--accent2':'#ff3131','--text':'#ffd9d0','--muted':'#e5b9a8','--border':'#c92b2b'}},
'Coast Guard':{emblem:coastGuardEmblem,cls:'coastguard',label:'Coast Guard Rescue Operations',motto:'Semper Paratus. Always Ready.',style:{'--bg':'#031922','--panel':'#062838','--panel2':'#0d3d54','--accent':'#36d7ff','--accent2':'#ff7a1a','--text':'#effcff','--muted':'#b9dce7','--border':'#12a4c8'}},
'Space Force':{emblem:spaceForceEmblem,cls:'spaceforce',label:'Space Force Orbital Command',motto:'Semper Supra. Always Above.',style:{'--bg':'#070716','--panel':'#11112d','--panel2':'#1c1b45','--accent':'#b794ff','--accent2':'#d8d8ff','--text':'#f5f2ff','--muted':'#c8c1ef','--border':'#7c4dff'}}
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
async function api(path,opts={}){
  let r;
  try{
    r=await fetch(API+path,{...opts,headers:{'Content-Type':'application/json',...authHeaders(),...(opts.headers||{})}});
  }catch(err){
    throw new Error('ValorBuddy could not reach the server. Please check your connection and try again in a few seconds.');
  }
  if(!r.ok){
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
const speechState={queue:[],timer:null,active:false};
function stopSpeaking(){try{clearTimeout(speechState.timer);speechState.queue=[];speechState.active=false;window.speechSynthesis?.cancel()}catch{}}
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
  const next=()=>{
    const chunk=speechState.queue.shift();
    if(!chunk){speechState.active=false;onDone?.();return}
    try{
      const u=new SpeechSynthesisUtterance(chunk);
      const prefs=voicePreferences();const style=voiceStyles[prefs.style]||voiceStyles.command;
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
        <p>We retain information for as long as reasonably necessary to provide the service, maintain your account, meet legal and security obligations, resolve disputes, and enforce agreements. Retention periods vary by data type and purpose. Information may remain in encrypted backups for a limited period after deletion before being overwritten.</p>
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
        <div className="privacyCallout"><h3>Account and data deletion</h3><p>To request deletion of your ValorBuddy account and associated personal data, visit our <a href="/delete-account">Account Deletion page</a>. You may also email <a href="mailto:eugene.ebem@datastruma.com?subject=ValorBuddy%20Account%20Deletion%20Request">eugene.ebem@datastruma.com</a>. We may need to verify your identity before completing the request.</p></div>
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
        <address><b>TAGUS Technologies LLC</b><br/>ValorBuddy Privacy Team<br/><a href="mailto:eugene.ebem@datastruma.com">eugene.ebem@datastruma.com</a><br/><a href="https://valorbuddy.com">https://valorbuddy.com</a></address>
      </section>
    </main>
    <footer className="privacyFooter"><span>© 2026 TAGUS Technologies LLC. All rights reserved.</span><a href="/">ValorBuddy Home</a></footer>
  </div>
}

function AccountDeletion(){
  const updated='August 2, 2026';
  const subject='ValorBuddy Account Deletion Request';
  const mailto=`mailto:eugene.ebem@datastruma.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent('Please delete my ValorBuddy account and associated data.\n\nAccount email: \nFull name: \nReason (optional): \n')}`;
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
        <p className="deletionEmail">Email: <a href="mailto:eugene.ebem@datastruma.com">eugene.ebem@datastruma.com</a><br/>Subject: <b>{subject}</b></p>
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
        <address><b>TAGUS Technologies LLC</b><br/>ValorBuddy Privacy Team<br/><a href="mailto:eugene.ebem@datastruma.com">eugene.ebem@datastruma.com</a><br/><a href="https://valorbuddy.com/privacy-policy">Privacy Policy</a></address>
      </section>
    </main>
    <footer className="privacyFooter"><span>© 2026 TAGUS Technologies LLC. All rights reserved.</span><span><a href="/privacy-policy">Privacy Policy</a> · <a href="/">ValorBuddy Home</a></span></footer>
  </div>
}

function App(){
  const path=window.location.pathname.replace(/\/+$/,'')||'/';
  if(path==='/privacy'||path==='/privacy-policy') return <PrivacyPolicy/>;
  if(path==='/delete-account'||path==='/account-deletion'||path==='/delete-my-account') return <AccountDeletion/>;
  return <ValorBuddyApplication/>;
}

function ValorBuddyApplication(){
  const[token,setToken]=useState(localStorage.getItem('valor_token'));
  const[user,setUser]=useState(null);
  const[screen,setScreen]=useState('dashboard');
  const[mobileNav,setMobileNav]=useState(false);
  const[loading,setLoading]=useState(true);
  const[branchTheme,setBranchTheme]=useState(()=>normalizeBranch(localStorage.getItem('valor_branch_theme')||'Army'));
  useEffect(()=>{applyBranchTheme(branchTheme)},[branchTheme]);
  useEffect(()=>{
    if(!token){setLoading(false);return}
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
  if(loading)return <div className="boot"><Shield/>ValorBuddy loading...</div>;
  if(!token||!user)return <Auth onLogin={(t,u)=>{
    const normalized=normalizeBranch(u.branch);
    localStorage.setItem('valor_token',t);applyBranchTheme(normalized);setBranchTheme(normalized);setToken(t);setUser({...u,branch:normalized})
  }}/>;
  const safeBranch=normalizeBranch(branchTheme||user.branch);
  const b=branches[safeBranch]||branches.Army;
  return <div className={`app ${b.cls}`} data-branch={b.cls} style={b.style}>
    <Sidebar user={{...user,branch:safeBranch}} screen={screen} setScreen={(x)=>{setScreen(x);setMobileNav(false)}} mobileOpen={mobileNav}/>
    <button type="button" className={`mobileNavBackdrop ${mobileNav?'open':''}`} aria-label="Close navigation" onClick={()=>setMobileNav(false)}/>
    <main>
      <Topbar user={{...user,branch:safeBranch}} b={b} setScreen={setScreen} setUser={setUser} setBranchTheme={setBranchTheme} onMenu={()=>setMobileNav(v=>!v)} mobileOpen={mobileNav} onLogout={()=>{localStorage.removeItem('valor_token');setToken(null);setUser(null)}}/>
      <GlobalSearch user={{...user,branch:safeBranch}} setScreen={setScreen}/>
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
      {screen==='admin'&&<Admin/>}
      {screen==='profile'&&<Profile user={{...user,branch:safeBranch}} setUser={setUser}/>}
    </main>
  </div>
}
function Auth({onLogin}){
  const[tab,setTab]=useState('login');
  const[show,setShow]=useState(false);
  const[err,setErr]=useState('');
  const[busy,setBusy]=useState(false);
  const[form,setForm]=useState({email:'',password:'',first_name:'',last_name:'',branch:'Army',city:'',state:'',rank:'',service_status:'Veteran',service_start_year:'',service_end_year:'',deployment_history:'',va_rating:''});
  async function submit(e){
    e.preventDefault();if(busy)return;setErr('');
    const email=form.email.trim().toLowerCase();
    if(!email){setErr('Enter your email address.');return}
    if(form.password.length<6){setErr('Password must be at least 6 characters.');return}
    if(tab==='register'&&!form.first_name.trim()){setErr('Enter your first name.');return}
    setBusy(true);
    try{
      const endpoint=tab==='login'?'/auth/login':'/auth/register';
      const payload={...form,email,first_name:form.first_name.trim(),last_name:form.last_name.trim(),city:form.city.trim(),state:form.state.trim()};
      const d=await api(endpoint,{method:'POST',body:JSON.stringify(payload)});
      onLogin(d.token,d.user)
    }catch(ex){setErr(ex.message)}
    finally{setBusy(false)}
  }
  const currentTheme=branches[normalizeBranch(form.branch)]||branches.Army;
  return <div className={`loginPage ${currentTheme.cls}`} data-branch={currentTheme.cls} style={currentTheme.style}>
    <div className="loginCard">
      <div className="brand"><Shield/><h1>ValorBuddy</h1><p>Your digital battle buddy</p></div>
      <div className="tabs"><button type="button" className={tab==='login'?'active':''} onClick={()=>{setErr('');setTab('login')}}>Login</button><button type="button" className={tab==='register'?'active':''} onClick={()=>{setErr('');setTab('register')}}>Create Account</button></div>
      <form onSubmit={submit}>
        {tab==='register'&&<>
          <label>Service Branch<select value={form.branch} onChange={e=>setForm({...form,branch:e.target.value})}>{Object.keys(branches).map(x=><option key={x}>{x}</option>)}</select></label>
          <div className="row"><label>First Name<input required autoComplete="given-name" value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})}/></label><label>Last Name<input autoComplete="family-name" value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})}/></label></div>
          <div className="row"><label>Rank<input value={form.rank} onChange={e=>setForm({...form,rank:e.target.value})} placeholder="Optional"/></label><label>Status<select value={form.service_status} onChange={e=>setForm({...form,service_status:e.target.value})}><option>Veteran</option><option>Retired</option><option>Active Duty</option><option>Reserve</option><option>National Guard</option><option>Spouse</option><option>Dependent</option><option>Caregiver</option></select></label></div>
          <div className="row"><label>City<input autoComplete="address-level2" value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label><label>State<input autoComplete="address-level1" value={form.state} onChange={e=>setForm({...form,state:e.target.value})}/></label></div>
        </>}
        <label>Email<input required type="email" autoComplete="email" inputMode="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
        <label>Password<div className="password"><input required minLength="6" autoComplete={tab==='login'?'current-password':'new-password'} type={show?'text':'password'} value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><button type="button" aria-label={show?'Hide password':'Show password'} onClick={()=>setShow(!show)}>{show?<EyeOff/>:<Eye/>}</button></div></label>
        {err&&<p className="err" role="alert">{err}</p>}
        <button className="primary" disabled={busy}>{busy?(tab==='login'?'Signing in...':'Creating account...'):(tab==='login'?'Enter Mission Control':'Create Account')}</button>
      </form>
    </div>
  </div>
}
function Sidebar({user,screen,setScreen,mobileOpen}){const nav=[['dashboard','Dashboard',Shield],['companion','AI Assistant',Brain],['events','Activities',MapPin],['benefits','Benefits',Search],['memories','Memories',Heart],['reminders','Reminders',Bell],['documents','Document Intelligence',Folder],['missions','Mission Control',Brain],['career','Career & Business',Briefcase],['music','Music & Media',Music],['tutorial','User Tutorial',BookOpen],['profile','Profile',User]];if(user.role==='admin')nav.push(['admin','Admin Dashboard',BarChart3]);return <aside className={mobileOpen?"mobileOpen":""}><div className="logo"><div className="logoStack"><img src={valorLogo} alt="ValorBuddy logo"/><img className="branchMini" src={(branches[normalizeBranch(user.branch)]||branches.Army).emblem} alt={`${user.branch} service emblem`}/></div><div><b>VALORBUDDY</b><span>Your Digital Battle Buddy</span></div></div><div className="miniProfile"><User/><div><b>{user.rank?`${user.rank} `:""}{user.first_name} {user.last_name||""}</b><span>{user.branch} • {user.service_status||"Veteran"}</span><small>{user.city}, {user.state}</small></div></div>{nav.map(([id,label,Icon])=><button className={screen===id?'active':''}key={id}onClick={()=>setScreen(id)}><Icon/>{label}</button>)}<div className="pledge">COMMITMENT<br/><span>Supporting those who served. Always.</span></div></aside>}
function Topbar({user,b,setScreen,setUser,setBranchTheme,onLogout,onMenu,mobileOpen}){
  async function changeBranch(branch){
    const normalized=applyBranchTheme(branch);setBranchTheme(normalized);setUser(u=>({...u,branch:normalized}));
    requestAnimationFrame(()=>applyBranchTheme(normalized));setTimeout(()=>applyBranchTheme(normalized),80);
    try{await api('/api/profile/branch',{method:'POST',body:JSON.stringify({branch:normalized})})}catch(e){console.warn('Branch theme save failed; keeping local theme',e)}
  }
  return <header>
    <button className="mobileMenu" onClick={onMenu} aria-label={mobileOpen?'Close navigation':'Open navigation'} aria-expanded={mobileOpen}>{mobileOpen?<X/>:<Menu/>}</button>
    <div className="commandIdentity"><img src={b.emblem} alt={`${user.branch} service emblem`}/><div><b>{b.label}</b><span>{b.motto}</span></div></div>
    <div className="status">// PRIVATE //</div>
    <nav className="branchSwitcher" aria-label="Switch service branch theme">{Object.keys(branches).map(x=><button type="button" title={`Switch to ${x} theme`} className={normalizeBranch(user.branch)===x?'active':''} key={x} onClick={()=>changeBranch(x)}>{x}</button>)}</nav>
    <button onClick={()=>setScreen('companion')}><Mic/>Voice</button>
    <button onClick={onLogout} className="logout"><LogOut/>Logout</button>
  </header>
}
function GlobalSearch({user,setScreen}){const[q,setQ]=useState('');function go(e){e?.preventDefault?.();const v=q.trim().toLowerCase();if(!v)return;if(v.includes('event')||v.includes('activit')||v.includes('place')||v.includes('vfw')||v.includes('coffee'))setScreen('events');else if(v.includes('benefit')||v.includes('va')||v.includes('claim')||v.includes('spouse')||v.includes('dependent'))setScreen('benefits');else if(v.includes('document')||v.includes('dd214')||v.includes('vault'))setScreen('documents');else if(v.includes('remind')||v.includes('appointment'))setScreen('reminders');else if(v.includes('resume')||v.includes('business plan')||v.includes('career'))setScreen('career');else if(v.includes('mission')||v.includes('agent'))setScreen('missions');else if(v.includes('music'))setScreen('music');else setScreen('companion')}return <form className="globalSearch" onSubmit={go}><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={`Search benefits, spouse/dependent access, activities near ${user.city}, documents...`}/><button type="submit">Search</button></form>}
function Hero({user}){return <section className="hero"><div><h1>{new Date().getHours()<12?"GOOD MORNING":new Date().getHours()<18?"GOOD AFTERNOON":"GOOD EVENING"}, {user.first_name.toUpperCase()}</h1><b>{user.branch.toUpperCase()} COMMUNITY</b><p>I’m ValorBuddy. How can I help you today?</p><div className="heroStatus"><span>● READY</span><small>Honor • Courage • Commitment</small></div></div><VoicePanel user={user}/></section>}

function SmartResultPopup({open,onClose,title,subtitle,items,onChoose,kind='event'}){if(!open)return null;return <div className="smartModalBackdrop" onClick={onClose}><section className="smartModal" role="dialog" aria-modal="true" onClick={e=>e.stopPropagation()}><button className="modalClose" onClick={onClose} aria-label="Close">×</button><div className="modalHeader"><span className="modalEyebrow">VALORBUDDY RECOMMENDATIONS</span><h2>{cleanVisibleText(title)}</h2>{subtitle&&<p>{cleanVisibleText(subtitle)}</p>}</div><div className="smartResultWrap">{items.map((x,i)=><article className="smartResultCard" key={`${x.title}-${i}`}><div className="resultRank">{i+1}</div><div className="resultMain"><div className="resultTitleRow"><h3>{cleanVisibleText(x.title)}</h3>{x.rating&&<span className="ratingPill">★ {x.rating}{x.review_count?` · ${x.review_count}`:''}</span>}</div>{x.location&&<p className="resultLocation">📍 {cleanVisibleText(x.location)}</p>}<p className="assistantExplains"><b>Why ValorBuddy suggests it:</b> {cleanVisibleText(x.assistant_explanation||x.description||x.summary)}</p>{x.open_now!==undefined&&x.open_now!==null&&<span className={`openPill ${x.open_now?'open':'closed'}`}>{x.open_now?'Open now':'Currently closed'}</span>}{x.next_step&&<div className="nextStep"><b>Best next step</b><span>{cleanVisibleText(x.next_step)}</span></div>}{x.community_note&&<div className="communityVoice"><b>What veterans commonly say</b><p>{cleanVisibleText(x.community_note)}</p></div>}{x.reviews?.length>0&&<div className="reviewPanel"><b>What Google reviewers are saying</b>{x.reviews.map((r,j)=><blockquote key={j}><span>“{cleanVisibleText(r.text)}”</span><small>{r.author}{r.rating?` · ${r.rating}/5`:''}{r.time_description?` · ${r.time_description}`:''}</small></blockquote>)}</div>}<div className="resultActions">{onChoose&&<button className="primaryAction" onClick={()=>onChoose(x,i)}>Choose this</button>}{x.maps_url&&<a href={x.maps_url} target="_blank" rel="noreferrer">Directions</a>}{x.website&&<a href={x.website} target="_blank" rel="noreferrer">Website</a>}{x.phone&&<a href={`tel:${x.phone}`}>Call</a>}</div></div></article>)}</div><div className="modalFooter"><span>Not seeing the right fit?</span><button onClick={onClose}>Refine the search</button></div></section></div>}
function VoicePanel({user,onResult}){
  const[listening,setListening]=useState(false);const[transcript,setTranscript]=useState('');const[reply,setReply]=useState('');const[results,setResults]=useState([]);const[choices,setChoices]=useState([]);const[popupOpen,setPopupOpen]=useState(false);const[popupTitle,setPopupTitle]=useState('Recommended options');
  const[voiceStyle,setVoiceStyle]=useState(()=>voicePreferences().style);const[voiceName,setVoiceName]=useState(()=>voicePreferences().voiceName);const[availableVoices,setAvailableVoices]=useState([]);const[locationState,setLocationState]=useState('');
  const rec=useRef(null);const followUpTimer=useRef(null);const welcomed=useRef(false);const resultContext=useRef([]);const restartTimer=useRef(null);
  const greeting=useMemo(()=>{const h=new Date().getHours();const time=h<12?'Good morning':h<18?'Good afternoon':'Good evening';return `${time}, ${user.first_name}. Welcome back. I’m ValorBuddy, your digital battle buddy. Tap the microphone and speak naturally. You can interrupt me by saying wait, stop, or hold on, and I’ll listen.`},[user.first_name]);
  function playWelcome(force=false){if(welcomed.current&&!force)return;welcomed.current=true;setReply(greeting);speak(greeting);try{sessionStorage.setItem(`valor_welcome_${user.email||user.first_name}`,'1')}catch{}}
  useEffect(()=>{const loadVoices=()=>setAvailableVoices((window.speechSynthesis?.getVoices?.()||[]).filter(v=>String(v.lang||'').toLowerCase().startsWith('en')));loadVoices();window.speechSynthesis?.addEventListener?.('voiceschanged',loadVoices);return()=>window.speechSynthesis?.removeEventListener?.('voiceschanged',loadVoices)},[]);
  useEffect(()=>{localStorage.setItem('valor_voice_style',voiceStyle);localStorage.setItem('valor_voice_name',voiceName)},[voiceStyle,voiceName]);
  useEffect(()=>{setReply(greeting);const key=`valor_welcome_${user.email||user.first_name}`;let already=false;try{already=!!sessionStorage.getItem(key)}catch{}const timer=setTimeout(()=>{if(!already)playWelcome()},700);const unlock=()=>{if(!already)playWelcome()};window.addEventListener('pointerdown',unlock,{once:true});window.addEventListener('keydown',unlock,{once:true});return()=>{clearTimeout(timer);clearTimeout(restartTimer.current);stopSpeaking();window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);clearTimeout(followUpTimer.current)}},[greeting]);
  async function send(text,{auto=false,liveLocOverride=null}={}){const value=String(text||'').trim();if(!value)return;clearTimeout(followUpTimer.current);stopSpeaking();if(!auto)setTranscript(value);setReply('Let me check that for you…');setChoices([]);setPopupOpen(false);try{const needsLiveLocation=/near me|nearby|around me|close to me|closest/i.test(value);const liveLoc=liveLocOverride||(needsLiveLocation?await freshLocation({required:true,maximumAge:0}):{source:'profile'});const d=await api('/api/vapi/action',{method:'POST',body:JSON.stringify({message:value,query:value,first_name:user.first_name,email:user.email,branch:user.branch,city:user.city,state:user.state,user_type:user.user_type||'Veteran',context_items:resultContext.current,lat:liveLoc?.source==='gps'?liveLoc.lat:null,lng:liveLoc?.source==='gps'?liveLoc.lng:null,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone})});const found=d.data?.items||[];if(found.length){resultContext.current=found;setResults(found)}else if(!d.data?.preserve_results){setResults([]);resultContext.current=[]}setReply(d.response);setChoices(d.data?.choices||[]);if(found.length){setPopupTitle(d.intent==='search_benefits'?'Benefits explained clearly':'Best nearby options');setPopupOpen(true)}speak(d.response,{items:found.length?found:[]});onResult?.(d);if(d.data?.awaiting_clarification&&d.data?.default_query){followUpTimer.current=setTimeout(()=>send(d.data.default_query,{auto:true}),12000)}}catch(e){setReply(e.message)}}
  async function useMyLocation(){setLocationState('Locating…');setReply('Getting your live location…');try{const loc=await freshLocation({required:true,maximumAge:0});setLocationState(`Live location active • ±${Math.round(loc.accuracy||0)}m`);await send('Use my current GPS location and show confirmed veteran events near me',{liveLocOverride:loc})}catch(e){setLocationState('Location unavailable');setReply(e.message)}}
  function testVoice(){stopSpeaking();speak(`ValorBuddy command voice ready. ${user.first_name}, I’m here and ready to support your mission.`)}
  function handleSpeech(text){const value=String(text||'').trim();const lower=value.toLowerCase();if(/^(wait|stop|hold on|pause|one moment|be quiet|listen)(\b|$)/.test(lower)){stopSpeaking();setReply(`Okay, ${user.first_name}. I stopped. I’m listening.`);setTranscript(value);restartTimer.current=setTimeout(()=>start(true),450);return}if(speechState.active)stopSpeaking();send(value)}
  function start(restart=false){clearTimeout(followUpTimer.current);if(!restart)playWelcome();const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){setReply('Voice recognition is not available in this browser. Please type your request below.');return}try{rec.current?.abort?.()}catch{}const r=new SR();r.lang='en-US';r.interimResults=true;r.continuous=false;r.onstart=()=>{setListening(true);if(!restart)setReply(`I’m listening, ${user.first_name}. Speak naturally, and interrupt me whenever you need to.`)};r.onend=()=>setListening(false);r.onerror=e=>{setListening(false);if(e.error!=='aborted')setReply('I didn’t catch that clearly. Tap the microphone and try again, or choose one of the options below.')};r.onresult=e=>{let finalText='';let interim='';for(let i=e.resultIndex;i<e.results.length;i++){const t=e.results[i][0].transcript;if(e.results[i].isFinal)finalText+=t;else interim+=t}const heard=(finalText||interim).trim();if(heard)setTranscript(heard);if(finalText.trim())handleSpeech(finalText)};rec.current=r;r.start()}
  const suggestions=['Veteran events near me','Benefits for my family','Closest VA clinic','Free activities this weekend','Why did you choose these?','Are these veteran-owned?'];
  return <><div className="voiceBox"><div className="voiceHeading"><h3><Radio/> ValorBuddy Voice</h3><span className="liveBadge">READY</span></div><p className="voiceIntro">Speak naturally. Choose the voice and delivery that feels right for you. “Command” is stronger, lower-pitched, and steady for a military-style presence.</p><div className="voiceSettings"><label><span>Voice style</span><select value={voiceStyle} onChange={e=>setVoiceStyle(e.target.value)}>{Object.entries(voiceStyles).map(([key,v])=><option key={key} value={key}>{v.label}</option>)}</select></label><label><span>AI voice</span><select value={voiceName} onChange={e=>setVoiceName(e.target.value)}><option value="">Best available voice</option>{availableVoices.map(v=><option key={`${v.name}-${v.lang}`} value={v.name}>{friendlyVoiceLabel(v)}</option>)}</select></label><button type="button" onClick={testVoice}>▶ Test voice</button></div><div className="voiceUtilityRow"><button className="welcomeButton" onClick={()=>playWelcome(true)}>🔊 Hear welcome</button><button className="stopVoiceButton" onClick={()=>{stopSpeaking();setReply(`Stopped. I’m ready when you are, ${user.first_name}.`)}}>⏸ Stop speaking</button><button className="locationButton" onClick={useMyLocation}>📍 Use my location</button></div>{locationState&&<div className={`locationStatus ${locationState.includes('active')?'success':''}`}>{locationState}</div>}<button className={`mic ${listening?'listening':''}`} onClick={()=>listening?rec.current?.stop():start()}>{listening?<MicOff/>:<Mic/>}<span>{listening?'Listening...':'Tap to Speak'}</span></button>{transcript&&<small className="heard">You said: {transcript}</small>}{reply&&<div className="reply" aria-live="polite">{reply}</div>}<div className="suggestionWrap">{suggestions.map((x,i)=><button key={i} onClick={()=>send(x)}>{x}</button>)}</div>{choices.length>0&&<div className="choiceGrid">{choices.map((x,i)=><button key={i} onClick={()=>send(x.query||x.label)}><span>{i+1}</span>{x.label}</button>)}</div>}{results.length>0&&<button className="openResultsButton" onClick={()=>setPopupOpen(true)}>View {results.length} explained recommendations</button>}</div><SmartResultPopup open={popupOpen} onClose={()=>setPopupOpen(false)} title={popupTitle} subtitle="ValorBuddy explains why each option was selected and clearly separates confirmed facts from assumptions." items={results.slice(0,6)} onChoose={(x)=>{setPopupOpen(false);setReply(`${x.title} is selected. Choose Directions, Website, or Call to continue.`);speak(`${x.title} is selected. Choose directions, website, or call on the screen.`)}}/></>}

function Dashboard({user,setScreen}){const[brief,setBrief]=useState(null);useEffect(()=>{api('/api/briefing').then(setBrief).catch(()=>{})},[]);return <><Hero user={user}/><div className="quickCards">{[['AI Assistant','Personalized help using your profile and current context.',Brain,'companion'],['Travel Safety','Safer routes, VA facilities, weather, traffic, and veteran-friendly stops.',Navigation,'companion'],['Housing & Credit','Veteran-friendly housing, VA loan education, and credit preparation.',Home,'companion'],['Career & Business','Build a resume, business plan, and career transition mission from your service history.',Briefcase,'career'],['Vehicle Guidance','Auto-buying education, discounts, financing questions, and checklists.',Car,'companion'],['Benefits & VA Forms','Plain-English benefits and official VA form guidance.',Search,'benefits'],['Activities','Live veteran events and community options.',MapPin,'events'],['Document Intelligence','Upload a resume, DD214, or record and let specialist agents analyze it.',Folder,'documents'],['Mission Control','Give ValorBuddy a real goal and watch the Supervisor coordinate specialist agents.',Brain,'missions'],['User Tutorial','Learn the fastest way to use benefits, forms, activities, reminders, documents, music, profile, and the AI assistant.',BookOpen,'tutorial']].map(([t,d,I,s])=><div className="card"onClick={()=>setScreen(s)}key={t}><I/><h3>{t}</h3><p>{d}</p><button>Open <ChevronRight/></button></div>)}</div><section className="glance"><h2>Today’s Briefing</h2><div><b>{brief?.greeting||`Good to see you, ${user.first_name}. How is your day going?`}</b><p>{brief?.wellness_prompt||'Choose one positive action today.'}</p></div><button className="metric" type="button" onClick={()=>setScreen('reminders')}><Bell/><b>{brief?.reminders?.length||0}</b><span>Reminders</span><ChevronRight/></button><button className="metric" type="button" onClick={()=>setScreen('events')}><MapPin/><b>{brief?.events?.length||0}</b><span>Nearby options</span><ChevronRight/></button></section></>}
function MissionInline({mission}){
  if(!mission)return null;
  const steps=mission.steps||[];
  return <section className="agentMissionResult">
    <div className="agentMissionTop">
      <div><small>{mission.mission_uid||'VALORBUDDY MISSION'}</small><h3>{mission.title||'Mission in progress'}</h3></div>
      <span className={`statusPill ${mission.status||'planned'}`}>{mission.status||'planned'}</span>
    </div>
    <div className="agentStrip">{(mission.participating_agents||[]).map(agent=><span key={agent}>{agent.replaceAll('_',' ')}</span>)}</div>
    <div className="progressTrack"><i style={{width:`${mission.progress||0}%`}}/></div>
    <b>{mission.progress||0}% complete</b>
    <div className="agentStepGrid">{steps.map(step=><div className="agentStep" key={step.id||`${step.sequence}-${step.title}`}>
      <span>{step.status==='completed'?'✓':step.status==='failed'?'!':step.status==='running'?'…':'○'}</span>
      <div><b>{step.agent_name||step.agent_key}</b><small>{step.title}</small></div>
    </div>)}</div>
    {mission.next_action&&<div className="nextAction"><b>Next action</b><span>{mission.next_action}</span></div>}
  </section>
}

function Companion({user}){const[msg,setMsg]=useState('');const[items,setItems]=useState([{role:'assistant',content:`${new Date().getHours()<12?"Good morning":new Date().getHours()<18?"Good afternoon":"Good evening"}, ${user.first_name}. I’m ValorBuddy. How can I help you today?`}]);const followUpTimer=useRef(null);useEffect(()=>()=>clearTimeout(followUpTimer.current),[]);async function send(text=msg,{auto=false}={}){const value=String(text||'').trim();if(!value)return;clearTimeout(followUpTimer.current);if(!auto)setItems(v=>[...v,{role:'user',content:value}]);else setItems(v=>[...v,{role:'assistant',content:'I didn’t hear back, so I’m using the most likely option and continuing.'}]);setMsg('');try{const needsLiveLocation=/near me|nearby|around me|close to me|closest/i.test(value);const loc=needsLiveLocation?await freshLocation({required:true,maximumAge:0}):{source:'profile'};const d=await api('/api/companion/chat',{method:'POST',body:JSON.stringify({message:value,lat:loc?.source==='gps'?loc.lat:null,lng:loc?.source==='gps'?loc.lng:null,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone})});setItems(v=>[...v,{role:'assistant',content:d.response,mission:d.data?.mission,mode:d.mode||d.intent}]);if(d.data?.reminder_id){requestReminderPermission().then(()=>api('/api/reminders').then(rows=>{const r=rows.find(x=>x.id===d.data.reminder_id);if(r)scheduleBrowserReminder(r)}).catch(()=>{}));}speak(d.response);if(d.data?.awaiting_clarification&&d.data?.default_query){followUpTimer.current=setTimeout(()=>send(d.data.default_query,{auto:true}),12000)}}catch(e){setItems(v=>[...v,{role:'assistant',content:e.message}])}}return <section className="page assistantPage actionsPage"><VoicePanel user={user} onResult={d=>setItems(v=>[...v,{role:'assistant',content:d.response,mission:d.data?.mission,mode:d.mode||d.intent}])}/><div className="chat">{items.map((m,i)=><div className={m.role} key={i}>{m.role==='assistant'?<div className="assistantReadable">{cleanVisibleText(m.content)}</div>:<div className="userReadable">{m.content}</div>}<MissionInline mission={m.mission}/></div>)}<div className="composer actionComposer"><input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Ask ValorBuddy a question or give it a mission..."/><button className="actionButton" type="button" onClick={()=>send()}><Brain/>Send to ValorBuddy</button></div></div></section>}

function Events({user}){const[items,setItems]=useState([]);const[live,setLive]=useState(false);const[query,setQuery]=useState('veteran events VFW American Legion coffee VA clinic parks');const[popupOpen,setPopupOpen]=useState(false);const[locationNotice,setLocationNotice]=useState('');async function load(searchValue=query){const actualQuery=String(searchValue||query).trim();const nearMe=/near me|nearby|around me|close to me/i.test(actualQuery);let loc={source:'profile'};try{if(nearMe)loc=await freshLocation({required:true,maximumAge:0});if(loc?.source==='gps')setLocationNotice(`Using your live GPS location • accuracy ±${Math.round(loc.accuracy||0)}m`);else setLocationNotice(user.city?`Using profile location: ${user.city}, ${user.state||''}`:'Enter a city/state or allow location access.')}catch(e){setItems([]);setLive(false);setPopupOpen(false);setLocationNotice(e.message);return}const geo=loc?.source==='gps'&&loc.lat!=null&&loc.lng!=null?`&lat=${encodeURIComponent(loc.lat)}&lng=${encodeURIComponent(loc.lng)}`:'';const d=await api(`/api/events/search?city=${encodeURIComponent(user.city||'')}&state=${encodeURIComponent(user.state||'')}&keyword=${encodeURIComponent(actualQuery)}${geo}`);setItems(d.items||[]);setLive(d.live);if(d.location?.source==='browser_location')setLocationNotice(`Using your current location${d.location.city?`: ${d.location.city}, ${d.location.state||''}`:''}`);if(d.items?.length)setPopupOpen(true)}useEffect(()=>{load(query)},[]); return <section className="page actionsPage"><h1>Veteran-friendly activities <span className="badge">{live?'LIVE':'CHECK CONNECTION'}</span></h1><p className="pageLead">Search by activity, city, or date. For “near me” searches, ValorBuddy now requires your live location instead of silently falling back to the city saved on your profile.</p><div className="locationSearchRow"><button className="locationButton" type="button" onClick={()=>{const next='veteran events near me';setQuery(next);load(next)}}><MapPin/>Use my live location</button>{locationNotice&&<span className={locationNotice.includes('current')||locationNotice.includes('GPS')?'success':''}>{locationNotice}</span>}</div><div className="composer actionComposer"><input value={query}onChange={e=>setQuery(e.target.value)}placeholder="Try: free veteran events this weekend in Arlington"/><button className="primary actionButton" type="button" onClick={()=>load()}><RefreshCw/>Search activities</button></div><div className="suggestionWrap pageSuggestions">{['Today','This weekend','Free events','Family-friendly','VFW or Legion','Pick the best for me'].map(x=><button key={x} onClick={()=>{const next=`${x} veteran events near me`;setQuery(next);load(next)}}>{x}</button>)}</div><Grid items={items}/>{items.length>0&&<button className="openResultsButton" onClick={()=>setPopupOpen(true)}>Compare and explain these options</button>}<SmartResultPopup open={popupOpen} onClose={()=>setPopupOpen(false)} title="Veteran-friendly options near you" subtitle="Review the reason for each recommendation, current details, and available Google reviewer comments." items={items.slice(0,6)} onChoose={(x)=>window.open(x.maps_url||x.website,'_blank')}/></section>}


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

  return <section className="page actionsPage benefitsHub">
    <h1>Benefits, VA Forms & Veteran Programs</h1>
    <p className="pageLead">Use ValorBuddy for plain-English guidance, then open the official VA source when you are ready. ValorBuddy can prepare checklists and explain forms, but it does not submit a VA claim or sign a government form for you.</p>
    <div className="composer">
      <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="Ask about benefits, eligibility, family support, or a VA program"/>
      <button className="primary actionButton" type="button" disabled={busy} onClick={()=>search()}><Search/>{busy?'Checking...':'Explain benefits'}</button>
    </div>
    <div className="suggestionWrap pageSuggestions">{['Disability claim','GI Bill and education','VA home loan','Healthcare','Spouse and dependent benefits','Caregiver support','Which VA form do I need?'].map(x=><button key={x} onClick={()=>{setQ(x);search(x)}}>{x}</button>)}</div>
    {data?.error&&<div className="profileMessage" role="alert">{data.error}</div>}
    {data&&<Grid items={(data.items||[]).map(x=>({title:x.title,description:x.summary,location:x.next_step,url:x.url,assistant_explanation:x.assistant_explanation,community_note:x.community_note}))}/>}
    <div className="officialResourceSearch">
      <div><h2>Official VA forms and assistance programs</h2><p>Search the built-in official-resource directory. Results link to VA.gov or other official federal resources.</p></div>
      <div className="composer">
        <input value={resourceQuery} onChange={e=>setResourceQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&loadOfficial()} placeholder="Try: disability, caregiver, education, home loan, VSO"/>
        <button className="actionButton" type="button" disabled={resourceBusy} onClick={()=>loadOfficial()}><Search/>{resourceBusy?'Searching...':'Search official resources'}</button>
      </div>
    </div>
    <div className="officialResourceGrid">
      <section><h2>VA Forms</h2>{forms.map(f=><article className="officialResourceCard" key={f.form}><small>{f.form}</small><h3>{f.title}</h3><p>{f.purpose}</p><div className="resourceActions"><button onClick={()=>explainResource(f)}><Brain/>Ask ValorBuddy to explain</button><a href={f.url} target="_blank" rel="noreferrer">Open official form</a></div></article>)}</section>
      <section><h2>Veteran Assistance Programs</h2>{programs.map(x=><article className="officialResourceCard" key={x.title}><small>OFFICIAL RESOURCE</small><h3>{x.title}</h3><p>{x.summary}</p><div className="resourceActions"><button onClick={()=>explainResource(x)}><Brain/>Ask ValorBuddy to explain</button><a href={x.url} target="_blank" rel="noreferrer">Open official program</a></div></article>)}</section>
    </div>
    <p className="muted">Informational only. Eligibility and submission requirements must be verified on VA.gov or with a VA-accredited representative.</p>
    <SmartResultPopup open={popupOpen} onClose={()=>setPopupOpen(false)} title="Your benefits guidance" subtitle="Plain-English explanations, practical next steps, and clearly labeled community guidance." items={data?.items||[]} kind="benefit"/>
  </section>
}

function Memories(){const[title,setTitle]=useState('');const[note,setNote]=useState('');const[tags,setTags]=useState('personal, memory');const[file,setFile]=useState(null);const[items,setItems]=useState([]);const[busy,setBusy]=useState(false);async function load(){try{setItems(await api('/api/memories'))}catch(e){console.warn(e)}}useEffect(()=>{load()},[]);async function save(){if(!title.trim()){alert('Enter a memory title before saving.');return;}setBusy(true);try{let image_url='';if(file){const fd=new FormData();fd.append('file',file);fd.append('doc_type','memory_photo');const r=await fetch(API+'/api/documents',{method:'POST',headers:authHeaders(),body:fd});const d=await r.json();if(!r.ok)throw new Error(d.detail||'Photo upload failed');image_url=d.file_url||''}await api('/api/memories',{method:'POST',body:JSON.stringify({title:title.trim(),note:note.trim(),tags:tags.split(',').map(x=>x.trim()).filter(Boolean),image_url})});setTitle('');setNote('');setTags('personal, memory');setFile(null);await load()}catch(e){alert(e.message)}finally{setBusy(false)}}async function removeMemory(id,name){if(!window.confirm(`Delete memory “${name}”?`))return;try{await api(`/api/memories/${id}`,{method:'DELETE'});await load()}catch(e){alert(e.message)}}return <section className="page readablePage"><h1>Memory Wall</h1><p className="pageLead">Save meaningful stories, people, places, photos, and moments that ValorBuddy can remember with you.</p><div className="featureForm darkForm"><label><span>Memory title</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Example: My retirement ceremony"/></label><label><span>Tags</span><input value={tags} onChange={e=>setTags(e.target.value)} placeholder="family, service, deployment"/></label><label className="wide"><span>Story or note</span><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Write the story you want ValorBuddy to remember..."/></label><label className="wide"><span>Upload photo or keepsake</span><input type="file" accept="image/*" onChange={e=>setFile(e.target.files?.[0]||null)}/><small>{file?`Selected: ${file.name}`:'Choose a JPG, PNG, or WEBP image.'}</small></label><button className="primary actionButton wideAction" type="button" disabled={busy} onClick={save}><Plus/>{busy?'Saving memory...':'Upload and save memory'}</button></div><div className="contentGrid">{items.length===0&&<div className="emptyState"><Heart/><h3>No memories saved yet</h3><p>Add your first story or photo.</p></div>}{items.map(x=><article className="contentCard memoryCard" key={x.id}>{x.image_url&&<img src={x.image_url.startsWith('http')?x.image_url:API+x.image_url} alt={x.title} className="memoryImage"/>}<h3>{x.title}</h3><p>{x.note}</p><button type="button" className="dangerButton" onClick={()=>removeMemory(x.id,x.title)}><Trash2/>Delete memory</button></article>)}</div></section>}

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
  return <section className="page readablePage"><h1>Reminders</h1><p className="pageLead">Track appointments, benefits deadlines, calls, medications, and personal tasks. ValorBuddy now distinguishes upcoming, due, overdue, and completed reminders instead of leaving expired items marked active.</p>{notice&&<div className="reminderNotice"><Bell/><span>{notice}</span></div>}<div className="featureForm darkForm"><label><span>Reminder title</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Example: VA appointment"/></label><label><span>Date</span><input type="date" value={date} min={new Date().toISOString().slice(0,10)} onChange={e=>setDate(e.target.value)}/></label><label><span>Time</span><input type="time" value={time} onChange={e=>setTime(e.target.value)}/><small>If no time is chosen, ValorBuddy uses 9:00 AM.</small></label><label className="wide"><span>Notes</span><textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Location, documents to bring, or other details..."/></label><button className="primary actionButton wideAction" type="button" disabled={busy} onClick={save}><Bell/>{busy?'Scheduling reminder...':'Create and schedule reminder'}</button></div><div className="contentGrid">{items.length===0&&<div className="emptyState"><Bell/><h3>No reminders yet</h3><p>Create a reminder for an appointment, deadline, call, or task.</p></div>}{items.map(item=>{const status=reminderDisplayStatus(item);return <article className={`contentCard reminderCard reminder-${String(status).replace(/\s+/g,'-')}`} key={item.id}><div className="cardTop"><h3>{item.title}</h3><span className="statusPill">{status}</span></div><p className="strongLine">{item.when_text||[item.date,item.time].filter(Boolean).join(' ')||'No date selected'}</p>{item.note&&<p>{item.note}</p>}<small>{item.delivery_state==='email sent'?'Email reminder sent':status==='upcoming'?'Scheduled and being watched by ValorBuddy':status==='overdue'?'This time has passed — complete, dismiss, or reschedule this reminder.':''}</small><div className="reminderActions">{!['completed','cancelled','dismissed'].includes(item.stored_status)&&<button type="button" onClick={()=>setStatus(item.id,'completed')}>Mark complete</button>}{status==='overdue'&&<button type="button" onClick={()=>setStatus(item.id,'dismissed')}>Dismiss</button>}<button type="button" className="dangerButton" onClick={()=>remove(item.id,item.title)}><Trash2/>Delete</button></div></article>})}</div></section>
}

function Documents(){const[file,setFile]=useState(null);const[type,setType]=useState('general');const[docs,setDocs]=useState([]);const[busy,setBusy]=useState(false);const[result,setResult]=useState(null);async function load(){setDocs(await api('/api/documents'))}async function removeDocument(id,filename){if(!window.confirm(`Delete ${filename}? This permanently removes the document from ValorBuddy.`))return;try{await api(`/api/documents/${id}`,{method:'DELETE'});if(result?.id===id)setResult(null);await load()}catch(e){alert(e.message)}}useEffect(()=>{load()},[]);async function upload(){if(!file)return;setBusy(true);setResult(null);try{const fd=new FormData();fd.append('file',file);fd.append('doc_type',type);const r=await fetch(API+'/api/documents',{method:'POST',headers:authHeaders(),body:fd});const d=await r.json();if(!r.ok)throw new Error(d.detail||'Upload failed');setResult(d);setFile(null);load()}catch(e){alert(e.message)}finally{setBusy(false)}}return <section className="page"><h1>Document Intelligence</h1><p className="pageLead">Upload a resume, DD214, VA record, certification, PDF, DOCX, or text file. The Documents Agent extracts readable text, classifies it, summarizes it, and automatically creates a specialist mission when useful.</p><div className="featureForm darkForm documentUploadForm"><label><span>Document type</span><select value={type} onChange={e=>setType(e.target.value)}><option value="general">Detect automatically</option><option value="resume">Resume</option><option value="dd214">DD214</option><option value="va_record">VA record</option><option value="certification">Certification</option></select></label><label className="wide"><span>Choose file</span><input type="file" accept=".pdf,.docx,.txt,.md,.csv,.jpg,.jpeg,.png" onChange={e=>setFile(e.target.files[0])}/></label><button className="primary" disabled={!file||busy} onClick={upload}><Upload/>{busy?'Agents analyzing...':'Upload and analyze'}</button></div>{result&&<section className="intelPanel"><div><b>{result.filename}</b><span className="statusPill">{result.status}</span></div><p>{result.ai_summary}</p>{result.analysis?.skills?.length>0&&<div className="chipRow">{result.analysis.skills.slice(0,12).map(x=><span key={x}>{x}</span>)}</div>}{result.analysis?.suggested_roles?.length>0&&<><h3>Suggested civilian directions</h3><ul>{result.analysis.suggested_roles.map(x=><li key={x}>{x}</li>)}</ul></>}{result.analysis?.suggested_actions?.length>0&&<><h3>Recommended next actions</h3><ol>{result.analysis.suggested_actions.map(x=><li key={x}>{x}</li>)}</ol></>}{result.mission&&<div className="missionNotice"><Brain/><div><b>Agents started a mission automatically</b><small>{result.mission.participating_agents?.join(' • ')} · {result.mission.progress}% complete</small></div></div>}</section>}<div className="grid">{docs.map(d=><article className="card" key={d.id}><div className="cardTop"><h3>{d.filename}</h3><span className="statusPill">{d.status||d.doc_type}</span></div><p>{d.ai_summary}</p>{d.analysis?.skills?.length>0&&<small>{d.analysis.skills.slice(0,5).join(' • ')}</small>}<div className="documentActions">{d.file_url&&<a href={API+d.file_url} target="_blank" rel="noreferrer">Open secure file</a>}<button type="button" className="dangerButton" onClick={()=>removeDocument(d.id,d.filename)}><Trash2/>Delete document</button></div></article>)}</div></section>}
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
  return <section className="page readablePage mediaCenterPage"><h1>Music & Entertainment</h1><p className="pageLead">Choose your own genres, add or remove them at any time, play supported media with approved provider players, and save favorites.</p><section className="genreManager"><div><small>YOUR MUSIC PROFILE</small><h2>Music genres</h2><p>Add any genre you enjoy. ValorBuddy can use these preferences when suggesting music.</p></div><div className="genreComposer"><input value={newGenre} onChange={e=>setNewGenre(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addGenre()} placeholder="Add a genre: Gospel, Afrobeats, Jazz, Country..."/><button className="primary" onClick={addGenre} disabled={!newGenre.trim()}><Plus/>Add genre</button></div><div className="genreChips">{genres.length===0?<span className="emptyGenre">No genres added yet.</span>:genres.map(g=><span key={g}>{g}<button aria-label={`Remove ${g}`} onClick={()=>removeGenre(g)}><X/></button></span>)}</div></section><div className="providerTabs" role="tablist" aria-label="Media providers">{Object.keys(mediaProviders).map(name=><button key={name} className={provider===name?'active':''} onClick={()=>{setProvider(name);setError('');setPreview(null)}}>{name}</button>)}</div><div className="mediaWorkspace"><section className="providerPanel"><div className="providerHeading"><div><small>SELECTED SERVICE</small><h2>{provider}</h2></div><span className={`supportBadge ${selected.kind==='external'?'handoff':'embedded'}`}>{selected.kind==='external'?'Secure handoff':'In-app player'}</span></div><p>{selected.help}</p><div className="mediaSearchRow"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&openSearch()} placeholder={`Search ${provider} for an artist, song, playlist, or podcast`}/><button onClick={openSearch}><Search/>Search {provider}</button></div><label className="mediaUrlField"><span>Paste a specific {provider} content link</span><input value={url} onChange={e=>setUrl(e.target.value)} placeholder={`Paste the copied ${provider} link here`}/></label>{error&&<div className="mediaError">{error}</div>}<div className="mediaActionRow"><button className="primary" onClick={()=>previewLink()} disabled={!url.trim()&&selected.kind!=='external'}>{selected.kind==='external'?'Open safely':'Preview inside ValorBuddy'}</button><button onClick={()=>window.open(selected.home,'_blank','noopener,noreferrer')}>Visit {provider}</button></div></section><section className="mediaPreviewPanel">{preview?.embed?<><div className="playerTitle"><div><small>NOW READY</small><h3>{preview.provider} player</h3></div><button onClick={()=>setPreview(null)}>Close</button></div><iframe src={preview.embed} title={`${preview.provider} approved player`} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/></>:preview&&!preview.embed?<div className="handoffCard"><Radio/><h3>{preview.provider} protects playback outside embedded websites</h3><p>ValorBuddy will keep your saved title and link. Open the service securely without displaying a broken player.</p><button className="primary" onClick={()=>window.open(preview.source||selected.home,'_blank','noopener,noreferrer')}>Continue to {preview.provider}</button></div>:<div className="playerEmpty"><Music/><h3>No blank player</h3><p>Choose a provider and paste a supported content link. ValorBuddy will only display an approved player when one is available.</p></div>}</section></div><div className="featureForm darkForm saveMediaForm"><label><span>Favorite title</span><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Example: Gospel classics or veteran podcast"/></label><label><span>Direct content link</span><input value={url} onChange={e=>setUrl(e.target.value)} placeholder="Paste the track, playlist, podcast, station, or video link"/></label><label><span>Mood or purpose</span><input value={mood} onChange={e=>setMood(e.target.value)} placeholder="Relax, workout, memories, motivation"/></label><button className="primary" disabled={!title.trim()} onClick={add}><Plus/>Save favorite</button></div><h2>Saved media</h2><div className="contentGrid">{items.length===0&&<div className="emptyState"><Music/><h3>No saved media yet</h3><p>Save a song, playlist, station, podcast, audiobook, or Veteran TV link.</p></div>}{items.map(x=><article className="contentCard" key={x.id}><h3>{x.title}</h3><p>{x.mood||'Saved favorite'}</p><div className="cardActions">{x.url&&<button onClick={()=>{const match=Object.keys(mediaProviders).find(name=>{try{const host=new URL(x.url).hostname;return(name==='Spotify'&&host.includes('spotify'))||((name==='YouTube'||name==='YouTube Music')&&host.includes('youtube'))||(name==='Apple Music'&&host.includes('music.apple'))||(name==='SoundCloud'&&host.includes('soundcloud'))}catch{return false}})||'Veteran TV';setProvider(match);previewLink(x.url,match)}}>Play or open</button>}<button className="dangerButton" onClick={()=>remove(x.id)}><Trash2/>Remove</button></div></article>)}</div></section>
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
  return <section className="page profilePage"><div className="pageTitleRow"><div><h1>Service & Career Profile</h1><p className="pageLead">Edit your information directly in the fields below. Changes are saved only when you press Save profile.</p></div><div className="profileActions">{editing&&<button type="button" onClick={cancel} disabled={saving}>Cancel</button>}<button className="primary" type="button" disabled={saving} onClick={()=>editing?save():beginEdit()}>{saving?'Saving...':editing?'Save profile':'Edit profile'}</button></div></div>{message&&<div className="profileMessage" role="status">{message}</div>}{editing?<div className="profileEditNotice"><b>Edit mode is on</b><span>Click or tap any field and type normally. Use Tab/Next to move between fields, then Save profile when finished.</span></div>:null}{editing?<div className="profileForm labeledProfileForm highReadabilityProfile"><ProfileField {...fieldProps} label="First name" name="first_name" placeholder="Enter your first name" required/><ProfileField {...fieldProps} label="Last name" name="last_name" placeholder="Enter your last name" required/><ProfileField {...fieldProps} label="Military rank" name="rank" placeholder="Example: SSG, CPT, PO1" help="Your current or highest rank."/><label className="profileField" htmlFor="profile-branch"><span className="fieldLabel">Service branch</span><small className="fieldHelp">Select the branch in which you served.</small><select id="profile-branch" value={form.branch||'Army'} onChange={e=>change('branch',e.target.value)} disabled={saving}>{Object.keys(branches).map(x=><option key={x}>{x}</option>)}</select></label><ProfileField {...fieldProps} label="MOS / AFSC / Rating" name="military_mos" placeholder="Example: 25B, 3D0X2, IT" help="Your military occupational specialty code."/><ProfileField {...fieldProps} label="Military job title" name="military_job_title" placeholder="Example: Information Technology Specialist" help="The plain-English title of your military role."/><ProfileField {...fieldProps} label="Years of service" name="years_of_service" type="number" placeholder="Example: 12" help="Total completed years of military service."/><ProfileField {...fieldProps} label="Security clearance" name="security_clearance" placeholder="Example: Secret" help="Only include a current or previously verified clearance."/><ProfileField {...fieldProps} label="Highest education" name="highest_education" placeholder="Example: Bachelor of Science in Information Technology"/><ProfileField {...fieldProps} label="Civilian certifications" name="civilian_certifications" placeholder="Example: Security+, PMP, AWS Solutions Architect" help="Separate multiple certifications with commas."/><ProfileField {...fieldProps} label="Civilian career goal" name="civilian_career_goal" placeholder="Example: Cybersecurity GRC Analyst" help="The role or career field you want ValorBuddy to target."/><ProfileField {...fieldProps} label="LinkedIn profile URL" name="linkedin_url" type="url" placeholder="https://www.linkedin.com/in/your-name"/><ProfileField {...fieldProps} label="Business interest" name="business_interest" wide area placeholder="Describe the business idea or industry you want to explore." help="Used by the Business Plan Agent."/><ProfileField {...fieldProps} label="Military specialty description" name="military_specialty_description" wide area placeholder="Describe your specialty, mission, unit function, and technical focus." help="Explain your MOS or military occupation in your own words."/><ProfileField {...fieldProps} label="Military duties, tools, leadership, and accomplishments" name="military_experience" wide area placeholder="Describe teams led, systems used, missions supported, measurable results, awards, and major responsibilities." help="Used by the Career Agent to translate military experience into civilian resume language."/><ProfileField {...fieldProps} label="Deployment history" name="deployment_history" wide area placeholder="List deployments, locations, dates, and responsibilities you are comfortable sharing." help="Optional. Do not include classified or sensitive information."/><ProfileField {...fieldProps} label="Current city" name="city" placeholder="Example: Dallas"/><ProfileField {...fieldProps} label="State" name="state" placeholder="Example: TX" help="Use the two-letter state abbreviation."/></div>:<div className="profileSummary">{[['Full name',`${user.first_name} ${user.last_name||''}`],['Rank / Branch',`${user.rank||'—'} / ${user.branch}`],['MOS / AFSC / Rating',user.military_mos||'Not provided'],['Military role',user.military_job_title||'Not provided'],['Years served',user.years_of_service||'Not provided'],['Career goal',user.civilian_career_goal||'Not provided'],['Business interest',user.business_interest||'Not provided'],['Education',user.highest_education||'Not provided'],['Certifications',user.civilian_certifications||'Not provided'],['Location',`${user.city||'—'}, ${user.state||'—'}`]].map(([a,b])=><div key={a}><span>{a}</span><b>{b}</b></div>)}</div>}</section>
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
  return <section className="page tutorialPage"><div className="pageTitleRow"><div><h1>ValorBuddy User Tutorial</h1><p className="pageLead">A quick guided tour of the safest and fastest way to use the system.</p></div><button className="primary" onClick={()=>setScreen('dashboard')}>Back to dashboard</button></div><div className="tutorialGrid">{steps.map(([title,body,target],i)=><article className="tutorialCard" key={title}><span>{i+1}</span><div><h2>{title}</h2><p>{body}</p><button onClick={()=>setScreen(target)}>Open this feature <ChevronRight/></button></div></article>)}</div><div className="tutorialSafety"><Shield/><div><h2>Important</h2><p>ValorBuddy provides informational assistance. For official eligibility, claims, medical care, legal advice, financial decisions, or emergencies, use the appropriate official or licensed professional resource.</p></div></div></section>
}

function MissionControl(){const[goal,setGoal]=useState('');const[missions,setMissions]=useState([]);const[busy,setBusy]=useState(false);async function load(){setMissions(await api('/api/agentic/missions'))}useEffect(()=>{load()},[]);async function start(){if(goal.trim().length<3){alert('Describe the outcome you want ValorBuddy agents to complete.');return;}setBusy(true);try{await api('/api/agentic/missions',{method:'POST',body:JSON.stringify({...locationPayload(),goal,timezone:Intl.DateTimeFormat().resolvedOptions().timeZone})});setGoal('');load()}finally{setBusy(false)}}return <section className="page"><h1>Mission Control</h1><p className="pageLead">Give ValorBuddy an outcome—not just a question. The Supervisor reads your profile and approved memory, selects specialist agents, executes tools, verifies results, and records progress.</p><div className="missionComposer"><textarea value={goal} onChange={e=>setGoal(e.target.value)} placeholder="Example: Analyze my resume, suggest three civilian career paths, and build a tailored resume for a senior operations role."/><button className="primary actionButton" type="button" disabled={busy} onClick={start}><Brain/>{busy?'Agents working...':'Send mission to Supervisor Agent'}</button></div><div className="missionList">{missions.map(m=><article className="missionCard" key={m.id}><div className="missionHead"><div><small>{m.mission_uid}</small><h3>{m.title}</h3></div><span className={`statusPill ${m.status}`}>{m.status}</span></div><p>{m.goal}</p><div className="progressTrack"><i style={{width:`${m.progress||0}%`}}/></div><div className="missionMeta"><b>{m.progress||0}% complete</b><span>{(m.participating_agents||[]).join(' • ')}</span></div>{m.steps?.map(s=><div className="stepRow" key={s.id}><span>{s.status==='completed'?'✓':s.status==='failed'?'!':'○'}</span><div><b>{s.agent_name||s.agent_key}</b><small>{s.title}</small></div></div>)}{m.next_action&&<div className="nextAction"><b>Next action</b><span>{m.next_action}</span></div>}</article>)}</div></section>}

function CareerBusiness({user}){
  const[type,setType]=useState('resume');const[target,setTarget]=useState(user.civilian_career_goal||user.business_interest||'');const[notes,setNotes]=useState('');const[docs,setDocs]=useState([]);const[current,setCurrent]=useState(null);const[busy,setBusy]=useState(false);
  async function load(){setDocs(await api('/api/career/documents'))}
  useEffect(()=>{load()},[]);
  async function generate(){if(target.trim().length<2){alert('Enter the target role or business idea before sending this request to the Career Agent.');return;}setBusy(true);try{const d=await api('/api/career/generate',{method:'POST',body:JSON.stringify({document_type:type,target,notes})});setCurrent(d);load()}catch(e){alert(e.message)}finally{setBusy(false)}}
  return <section className="page readablePage"><h1>Career & Business Studio</h1><p className="pageLead">Use your MOS, military role, uploaded resume, education, certifications, career goal, and business interests to produce a verified draft without invented credentials.</p><div className="careerLayout"><div className="featureForm darkForm"><label><span>What should ValorBuddy build?</span><select value={type} onChange={e=>setType(e.target.value)}><option value="resume">Civilian resume</option><option value="cover_letter">Cover letter</option><option value="career_plan">Career transition plan</option><option value="business_plan">Veteran business plan</option></select></label><label><span>Target role or business idea</span><input value={target} onChange={e=>setTarget(e.target.value)} placeholder="Example: Senior Operations Manager"/></label><label className="wide"><span>Extra instructions</span><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Include leadership, logistics, team management, certifications, and measurable outcomes..."/></label><button className="primary actionButton wideAction" type="button" disabled={busy} onClick={generate}><Briefcase/>{busy?'Career Agent working...':'Send to Career Agent and generate draft'}</button></div><aside className="readinessCard"><h3>Agent readiness</h3><p><b>MOS:</b> {user.military_mos||'Add to profile'}</p><p><b>Military role:</b> {user.military_job_title||'Add to profile'}</p><p><b>Career goal:</b> {user.civilian_career_goal||'Add to profile'}</p><p><b>Business interest:</b> {user.business_interest||'Add to profile'}</p></aside></div>{current&&<article className="generatedDoc readableDocument"><div className="pageTitleRow"><h2>{current.title}</h2><button onClick={()=>navigator.clipboard?.writeText(current.content)}>Copy</button></div><pre>{current.content}</pre></article>}<h2>Saved drafts</h2><div className="contentGrid">{docs.length===0&&<div className="emptyState"><Briefcase/><h3>No drafts yet</h3><p>Create a resume, transition plan, cover letter, or business plan.</p></div>}{docs.map(d=><article className="contentCard" key={d.id}><h3>{d.title}</h3><p>{d.target}</p><small>{d.document_type} • {d.status}</small><button onClick={()=>setCurrent(d)}>Open draft</button></article>)}</div></section>
}

function Admin(){const[o,setO]=useState(null);const[users,setUsers]=useState([]);useEffect(()=>{api('/admin/overview').then(setO);api('/admin/users').then(setUsers)},[]);return <section className="page adminPage"><h1>Admin Dashboard</h1>{o&&<div className="stats">{Object.entries(o).map(([k,v])=><div key={k}><b>{v}</b><span>{k}</span></div>)}</div>}<div className="adminUsersHeading"><h2>Users</h2><span>{users.length} total</span></div><div className="adminUsersGrid">{users.map(u=><article className="adminUserCard" key={u.id}><div className="adminUserTop"><div className="adminUserIdentity"><h3>{u.first_name||'Member'}{u.last_name?` ${u.last_name}`:''}</h3><a className="adminUserEmail" href={`mailto:${u.email}`}>{u.email}</a></div><span className={`adminStatus ${u.active?'active':'inactive'}`}>{u.active?'Active':'Inactive'}</span></div><div className="adminUserMeta"><span>{u.role||'member'}</span><span>{u.branch||'Branch not set'}</span></div><small className="adminUserLocation">{[u.city,u.state].filter(Boolean).join(', ')||'Location not set'}</small></article>)}</div></section>}
function Grid({items=[]}){return <div className="grid">{items.map((x,i)=><div className="card"key={i}><h3>{x.title||x.name}</h3><p>{x.description||x.note||x.summary||''}</p><small>{x.location||x.type||x.when_text||''}</small>{(x.url||x.maps_url)&&<a target="_blank"href={x.url||x.maps_url}>Open</a>}</div>)}</div>}
export default App;
