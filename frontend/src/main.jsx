import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  MessageCircle, MapPin, Folder, Calendar, Shield, User, LogOut, Bell, Settings,
  ChevronRight, Medal, Star, FileText, Mail, Home as HomeIcon, Target, Mic, MicOff,
  Volume2, BookOpen, Users, Briefcase, HeartPulse, DollarSign, Clock, Plus, Trash2,
  Music, Camera, Heart, RefreshCw, CheckCircle2
} from 'lucide-react';
import './style.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const branches = {
  army: { label:'U.S. Army Veteran', short:'Army', motto:'Duty. Honor. Support.', command:'Army Mission Control', greeting:'WELCOME BACK', theme:'army' },
  airforce: { label:'U.S. Air Force Veteran', short:'Air Force', motto:'Aim High. Fly. Fight. Support.', command:'Air Force Flight Operations', greeting:'WELCOME BACK', theme:'airforce' },
  navy: { label:'U.S. Navy Veteran', short:'Navy', motto:'Honor. Courage. Commitment.', command:'Navy Fleet Command', greeting:'WELCOME ABOARD', theme:'navy' },
  marines: { label:'U.S. Marine Corps Veteran', short:'Marines', motto:'Semper Fidelis. Always Faithful.', command:'Marines Command Post', greeting:'WELCOME BACK', theme:'marines' },
  coastguard: { label:'U.S. Coast Guard Veteran', short:'Coast Guard', motto:'Semper Paratus. Always Ready.', command:'Coast Guard Rescue Operations', greeting:'WELCOME ABOARD', theme:'coastguard' },
  spaceforce: { label:'U.S. Space Force Veteran', short:'Space Force', motto:'Semper Supra. Always Above.', command:'Space Force Orbital Command', greeting:'WELCOME BACK', theme:'spaceforce' }
};

const nav = [
  ['home','Dashboard',HomeIcon], ['chat','AI Companion',MessageCircle], ['activities','Activities',Calendar],
  ['memories','Memory Wall',Camera], ['resources','Resources',BookOpen], ['documents','Document Vault',Folder],
  ['reminders','Reminders',Bell], ['mission','Mission Tracker',Target], ['community','Community',Users],
  ['claims','Benefits & Claims',Shield], ['profile','Profile',User], ['settings','Settings',Settings]
];

function firstName(name){ return (name || 'Veteran').trim().split(/\s+/)[0]; }
function branchKey(label='Army'){
  const v = String(label).toLowerCase().replace(/\s+/g,'');
  if(v.includes('air')) return 'airforce'; if(v.includes('navy')) return 'navy'; if(v.includes('marine')) return 'marines';
  if(v.includes('coast')) return 'coastguard'; if(v.includes('space')) return 'spaceforce'; return 'army';
}
async function api(path, opts={}){
  const r = await fetch(API + path, { headers:{'Content-Type':'application/json', ...(opts.headers||{})}, ...opts });
  if(!r.ok) throw new Error(await r.text());
  return r.json();
}

function speakText(text){
  try{
    if(!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.92; u.pitch = 0.95; u.volume = 0.9;
    window.speechSynthesis.speak(u);
  }catch{}
}
function playCalmCadence(){
  try{
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const master = ctx.createGain(); master.gain.value = 0.05; master.connect(ctx.destination);
    const notes = [196, 246.94, 293.66, 392, 293.66, 246.94, 196];
    notes.forEach((f,i)=>{
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type='sine'; o.frequency.value=f; g.gain.setValueAtTime(0, ctx.currentTime+i*0.35);
      g.gain.linearRampToValueAtTime(0.7, ctx.currentTime+i*0.35+0.03);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+i*0.35+0.32);
      o.connect(g); g.connect(master); o.start(ctx.currentTime+i*0.35); o.stop(ctx.currentTime+i*0.35+0.34);
    });
  }catch{}
}

function App(){
  const [profile,setProfile] = useState(()=> JSON.parse(localStorage.getItem('valor_profile') || 'null'));
  const [page,setPage] = useState('home');
  const [brief,setBrief] = useState([]);
  const [apiOk,setApiOk] = useState(false);
  const bKey = branchKey(profile?.branch);
  const branch = branches[bKey];

  useEffect(()=>{ api('/health').then(()=>setApiOk(true)).catch(()=>setApiOk(false)); },[]);
  useEffect(()=>{ if(profile){ document.body.className='theme-'+bKey; localStorage.setItem('valor_profile', JSON.stringify(profile)); }},[profile,bKey]);

  async function handleLogin(p){
    const saved = await api('/profile', { method:'POST', body:JSON.stringify({ email:p.email, name:p.name, branch:branches[p.branch].short, city:p.city, state:p.state, interests:p.interests || ['local events','benefits','wellness'], preferred_tone:'calm, respectful, positive' }) }).catch(()=>null);
    const finalProfile = { ...p, branch:branches[p.branch].short, serviceBranch:p.branch };
    setProfile(finalProfile);
    setPage('home');
    const greeting = `Good to see you, ${firstName(p.name)}. How is your day going? I am ready to help with reminders, memories, local veteran activities, and benefits questions.`;
    setBrief([greeting]);
    setTimeout(()=>speakText(greeting), 500);
  }
  function logout(){ localStorage.removeItem('valor_profile'); setProfile(null); setPage('home'); }
  async function onVoice(text){
    if(!profile) return;
    setPage('chat');
    window.dispatchEvent(new CustomEvent('valor-command', { detail:text }));
  }
  if(!profile) return <Login onLogin={handleLogin} apiOk={apiOk}/>;
  return <div className={`app theme-${bKey}`}>
    <Sidebar user={profile} page={page} setPage={setPage} logout={logout}/>
    <main className="main">
      <Topbar user={profile} branch={branch} setProfile={setProfile}/>
      {page==='home' && <Home user={profile} branch={branch} setPage={setPage} brief={brief} onVoice={onVoice} apiOk={apiOk}/>} 
      {page==='chat' && <Chat user={profile}/>} {page==='activities' && <Activities user={profile}/>} {page==='memories' && <Memories user={profile}/>} 
      {page==='resources' && <Resources/>} {page==='documents' && <Docs/>} {page==='reminders' && <Reminders user={profile}/>} {page==='mission' && <Mission/>}
      {page==='community' && <Community/>} {page==='claims' && <Claims/>} {page==='profile' && <Profile user={profile}/>} {page==='settings' && <SettingsPage user={profile} setProfile={setProfile}/>} 
    </main>
  </div>
}

function Login({onLogin,apiOk}){
  const [serviceBranch,setServiceBranch] = useState('army'); const [name,setName] = useState('James'); const [email,setEmail] = useState('james@example.com'); const [city,setCity] = useState('Dallas'); const [state,setState] = useState('TX');
  const b=branches[serviceBranch];
  return <div className={`login theme-${serviceBranch}`}><div className="loginCard"><MilitaryLogo/><h1>ValorBuddy</h1><p>Your AI veteran assistant</p><h2>{b.command}</h2><label>Service Branch</label><select value={serviceBranch} onChange={e=>setServiceBranch(e.target.value)}>{Object.entries(branches).map(([k,v])=><option key={k} value={k}>{v.short}</option>)}</select><label>First Name</label><input value={name} onChange={e=>setName(e.target.value)} /><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} /><div className="two"><span><label>City</label><input value={city} onChange={e=>setCity(e.target.value)} /></span><span><label>State</label><input value={state} onChange={e=>setState(e.target.value)} /></span></div><button onClick={()=>onLogin({name,email,city,state,serviceBranch,interests:['local events','benefits','wellness']})}>Enter {b.command}<ChevronRight size={16}/></button><small>{apiOk?'Secure connection ready':'Connecting to ValorBuddy services...'}</small></div></div>
}
function Sidebar({user,page,setPage,logout}){return <aside className="sidebar"><div className="brand"><MilitaryLogo/><div><b>VALORBUDDY</b><span>Your AI Veteran Assistant</span></div></div><div className="profileBox"><User/><div><b>{firstName(user.name)}</b><span>{branches[branchKey(user.branch)].label}</span></div></div><nav>{nav.map(([id,label,Icon])=><button key={id} className={page===id?'active':''} onClick={()=>setPage(id)}><Icon size={17}/>{label}</button>)}</nav><button className="logout" onClick={logout}><LogOut size={16}/> Logout</button></aside>}
function Topbar({user,branch,setProfile}){const k=branchKey(user.branch);return <header className="topbar"><button className="menu"><Shield size={16}/></button><div className="commandTitle"><b>{branch.command}</b><span>{branch.motto}</span></div><div className="classification">// SUPPORT READY //</div><div className="branchTabs">{Object.entries(branches).map(([id,b])=><button key={id} className={k===id?'on':''} onClick={()=>setProfile({...user, serviceBranch:id, branch:b.short})}>{b.short}</button>)}</div><button className="iconBtn" onClick={playCalmCadence}><Music size={16}/></button><div className="profilePill"><User size={18}/>{firstName(user.name)}</div></header>}
function Home({user,branch,setPage,brief,onVoice,apiOk}){const tiles=[['AI Companion',MessageCircle,'Talk naturally and get calm, practical support.','OPEN','chat'],['Find Activities',MapPin,'Live veteran-friendly places and events near you.','BROWSE','activities'],['Memory Wall',Camera,'Save positive memories, photos, and stories.','OPEN','memories'],['Document Vault',Folder,'Organize important records and reminders.','OPEN','documents'],['Mission Tracker',Target,'Track goals, progress, and daily wins.','VIEW','mission']];return <div className="missionGrid"><section className="heroBanner"><div><h1>{branch.greeting}, {firstName(user.name).toUpperCase()}</h1><div className="serviceBadge">{branch.label}</div><div className="rankLine"><span></span><Star size={18}/><span></span></div><p>Good to see you, {firstName(user.name)}. How is your day going? I can help with local events, reminders, benefits, memories, music, and positive companionship.</p></div><div className="soldierShade"><Medal size={110}/></div></section><VoiceCommandPanel user={user} onCommand={onVoice}/><div className="tileGrid">{tiles.map(([title,I,desc,cta,id])=><div className="missionCard" key={title}><div className="circle"><I size={32}/></div><h3>{title}</h3><p>{desc}</p><button onClick={()=>setPage(id)}>{cta}<ChevronRight size={16}/></button></div>)}</div><Glance apiOk={apiOk}/><MissionProgress/><QuickVoice onCommand={onVoice}/><RightRail user={user} brief={brief}/></div>}
function VoiceCommandPanel({user,onCommand}){return <section className="voicePanel"><div><h2><Volume2/> Voice Command</h2><p>Tap the mic and speak naturally. ValorBuddy will respond by name.</p><p className="try">Try: “Find veteran events near me” or “Play calming music”</p></div><VoiceButton onCommand={onCommand}/></section>}
function VoiceButton({onCommand,compact=false}){const[active,setActive]=useState(false);const[txt,setTxt]=useState('');const recRef=useRef(null);function start(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){setTxt('Voice not supported in this browser.');return}const rec=new SR();rec.lang='en-US';rec.interimResults=false;rec.onstart=()=>setActive(true);rec.onend=()=>setActive(false);rec.onerror=()=>{setTxt('Mic permission needed.');setActive(false)};rec.onresult=e=>{const t=e.results[0][0].transcript;setTxt(t);onCommand?.(t)};recRef.current=rec;rec.start()}function stop(){recRef.current?.stop();setActive(false)}return <button className={compact?'voiceMini':'voiceBtn'} onClick={active?stop:start}>{active?<MicOff/>:<Mic/>}{!compact&&<span>{active?'Listening...':'Tap to Speak'}</span>}{txt&&!compact&&<small>{txt}</small>}</button>}
function Glance({apiOk}){return <section className="glance"><h3>AT A GLANCE</h3>{[[CheckCircle2,apiOk?'Online':'Check','System','API Connection'],[Bell,5,'Reminders','Due This Week'],[Folder,12,'Documents','In Your Vault'],[Calendar,8,'Activities','Nearby'],[Target,'75%','Progress','Keep Going']].map(([I,n,t,s])=><div key={t}><I/><b>{n}</b><span>{t}</span><small>{s}</small></div>)}</section>}
function MissionProgress(){return <section className="progressPanel"><h2>SERVICE READINESS <span>Your goals. Your journey. We are with you.</span></h2><div className="progressCards">{[[HeartPulse,'Health & Fitness',75,'3 of 4 tasks completed'],[Briefcase,'Career Growth',60,'3 of 5 tasks completed'],[DollarSign,'Financial Stability',40,'2 of 5 tasks completed'],[Users,'Community & Connection',80,'4 of 5 tasks completed']].map(([I,t,p,d])=><div className="progressCard" key={t}><h3><I/>{t}<b>{p}%</b></h3><div className="bar"><i style={{width:p+'%'}}/></div><small>{d}</small></div>)}</div></section>}
function QuickVoice({onCommand}){return <section className="quickVoice"><h3>QUICK VOICE ACTIONS <span>Tap or say these</span></h3>{['Find events near me','How is my day looking?','Play calming music','Remind me to call the VA tomorrow','Show my memories'].map(x=><button key={x} onClick={()=>onCommand(x)}><Mic size={18}/>{x}</button>)}</section>}
function RightRail({user,brief}){return <section className="rightRail"><Panel title="Today’s Briefing" icon={Calendar}><ul className="brief"><li><Bell/> Good to see you, {firstName(user.name)}</li><li><Mail/> Voice companion ready</li>{brief.map((b,i)=><li key={i}><CheckCircle2/>{b}</li>)}</ul></Panel><Panel title="Upcoming Activities" icon={Calendar}><ActivitiesMini user={user}/></Panel><Panel title="Readiness Status" icon={Target}><dl><dt>System Status</dt><dd>OPERATIONAL</dd><dt>Branch Theme</dt><dd>READY</dd><dt>Security Level</dt><dd>PRIVATE</dd></dl></Panel></section>}
function ActivitiesMini({user}){const[items,setItems]=useState([]);useEffect(()=>{api(`/activities?city=${encodeURIComponent(user.city)}&state=${encodeURIComponent(user.state)}&interest=veteran%20events`).then(d=>setItems((d.items||[]).slice(0,3))).catch(()=>{})},[user.city,user.state]);return <>{items.map((x,i)=><div className="event" key={i}><b>{i+1}</b><span>{x.title}<br/><small>{x.location}</small></span></div>)}</>}
function Panel({title,icon:Icon,children}){return <div className="panel"><h3><Icon size={18}/>{title}</h3>{children}</div>}
function Chat({user}){const[m,setM]=useState('');const[items,setItems]=useState([{role:'bot',text:`Good to see you, ${firstName(user.name)}. How is your day going?`}]);useEffect(()=>{const h=e=>send(e.detail);window.addEventListener('valor-command',h);return()=>window.removeEventListener('valor-command',h)},[user]);async function send(text=m){if(!text?.trim())return;setM('');setItems(i=>[...i,{role:'me',text}]);if(text.toLowerCase().includes('music')) playCalmCadence();try{const d=await api('/ai/companion',{method:'POST',body:JSON.stringify({profile:{name:user.name,branch:user.branch,city:user.city,state:user.state,interests:user.interests||[],preferred_tone:'calm and positive'},profile_email:user.email,message:text,mode:'companion'})});setItems(i=>[...i,{role:'bot',text:d.reply}]);speakText(d.reply)}catch{const fallback=`${firstName(user.name)}, I am connected locally but the API did not respond. Check the backend URL, then try again.`;setItems(i=>[...i,{role:'bot',text:fallback}])}}return <div className="card chat"><h2>AI Companion</h2><div className="messages">{items.map((x,i)=><div key={i} className={x.role}>{x.text}</div>)}</div><VoiceButton onCommand={send}/><div className="composer"><input value={m} onChange={e=>setM(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()} placeholder="Tell ValorBuddy what you need today..."/><button onClick={()=>send()}>Send</button></div></div>}
function Activities({user}){const[a,setA]=useState([]);const[live,setLive]=useState(false);const[loading,setLoading]=useState(false);async function load(){setLoading(true);try{const d=await api(`/activities?city=${encodeURIComponent(user.city)}&state=${encodeURIComponent(user.state)}&interest=veteran%20events`);setA(d.items||[]);setLive(!!d.live)}finally{setLoading(false)}}useEffect(()=>{load()},[]);return <div><h2 className="pageTitle">Local Veteran Activities {live&&<span className="liveBadge">LIVE</span>}</h2><button className="primary" onClick={load}><RefreshCw size={16}/> {loading?'Searching...':'Refresh activities'}</button><Cards data={a}/></div>}
function Resources(){return <List title="Veteran Resources" data={[{title:'VA Benefits',description:'Plain-English guidance and checklist support.'},{title:'State Veterans Office',description:'Find local state resources and representatives.'},{title:'Education Benefits',description:'GI Bill and training resource planning.'},{title:'Veteran Discounts',description:'Find discounts and veteran-owned businesses nearby.'}]}/>}function List({title,data}){return <div><h2 className="pageTitle">{title}</h2><Cards data={data}/></div>}function Cards({data}){return <div className="cards">{data.map((x,i)=><div className="card lift" key={i}><h3>{x.title||x.name}</h3><p>{x.description||x.type||''}</p><small>{x.location||''}</small>{x.url&&<a href={x.url} target="_blank">Open</a>}</div>)}</div>}
function Memories({user}){const[items,setItems]=useState([]);const[title,setTitle]=useState('');const[note,setNote]=useState('');useEffect(()=>{api('/memories?profile_email='+encodeURIComponent(user.email)).then(setItems).catch(()=>{})},[]);async function add(){if(!title)return;const row=await api('/memories',{method:'POST',body:JSON.stringify({profile_email:user.email,title,note,tags:['positive']})});setItems([row,...items]);setTitle('');setNote('')}return <div className="card pageCard"><h2><Camera/> Memory Wall</h2><p className="muted">Save positive memories, photos, service moments, and family stories.</p><div className="composer"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Memory title"/><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Short note"/><button onClick={add}><Plus/> Save</button></div><div className="docList">{items.map(x=><div key={x.id}><Heart/>{x.title}<small>{x.note}</small></div>)}</div></div>}
function Docs(){const[docs,setDocs]=useState(['DD214.pdf','VA Benefit Letter.pdf','Service Record.pdf']);const[file,setFile]=useState('');return <div className="card pageCard"><h2><FileText/> Document Vault</h2><p className="muted">Organize DD214, benefit letters, service records, education records, and personal admin files.</p><div className="composer"><input value={file} onChange={e=>setFile(e.target.value)} placeholder="Document name"/><button onClick={()=>{if(file){setDocs([file,...docs]);setFile('')}}}><Plus/> Add</button></div><div className="docList">{docs.map(d=><div key={d}><Folder/>{d}<button onClick={()=>setDocs(docs.filter(x=>x!==d))}><Trash2 size={16}/></button></div>)}</div></div>}
function Reminders({user}){const[items,setItems]=useState([]);const[n,setN]=useState('');useEffect(()=>{api('/reminders?profile_email='+encodeURIComponent(user.email)).then(setItems).catch(()=>{})},[]);async function add(){if(!n)return;const row=await api('/reminders',{method:'POST',body:JSON.stringify({profile_email:user.email,title:n,when_text:'Soon',note:''})});setItems([row,...items]);setN('')}return <div className="card pageCard"><h2><Bell/> Reminders</h2><div className="composer"><input value={n} onChange={e=>setN(e.target.value)} placeholder="Example: Call the VA tomorrow"/><button onClick={add}><Plus/> Save</button></div><div className="docList">{items.map(x=><div key={x.id||x.title}><Clock/>{x.title}<small>{x.when_text}</small></div>)}</div></div>}
function Mission(){return <div className="pageCard"><MissionProgress/><Glance apiOk={true}/></div>}function Community(){return <List title="Community & Support" data={[{title:'Local VFW Post',description:'Connect with nearby veteran community.'},{title:'Veteran Mentor Circle',description:'Find peer support and mentorship.'},{title:'Family Resource Night',description:'Activities and family support resources.'}]}/>}function Claims(){return <List title="Benefits & Claims" data={[{title:'Claim Status Tracker',description:'Track next actions and documents.'},{title:'Eligibility Guide',description:'Ask ValorBuddy to explain benefits in plain English.'},{title:'Education Benefits',description:'Plan GI Bill and training steps.'}]}/>}function Profile({user}){return <div className="card pageCard"><h2>Profile</h2><p><b>Name:</b> {user.name}</p><p><b>Branch:</b> {user.branch}</p><p><b>Location:</b> {user.city}, {user.state}</p><p><b>Email:</b> {user.email}</p></div>}
function SettingsPage({user,setProfile}){const svc=branchKey(user.branch);return <div className="card pageCard"><h2>Settings</h2><p className="muted">Change the service branch theme used across your ValorBuddy command center.</p><div className="settingsBranches">{Object.entries(branches).map(([id,b])=><button key={id} className={svc===id?'active':''} onClick={()=>setProfile({...user,serviceBranch:id,branch:b.short})}><Shield/>{b.short}<small>{b.motto}</small></button>)}</div></div>}
function MilitaryLogo(){return <div className="milLogo"><Shield size={28}/><Star size={14}/></div>}
createRoot(document.getElementById('root')).render(<App/>);
