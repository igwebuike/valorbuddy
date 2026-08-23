from pathlib import Path
import re, shutil, sys

path = Path("frontend/src/App.jsx")
if not path.exists():
    print("ERROR: Run this from the valorbuddy-prod repository root.")
    sys.exit(1)

text = path.read_text(encoding="utf-8")
backup = Path("frontend/src/App.jsx.before-stability-repair")
shutil.copy2(path, backup)

has_partner = "function PartnerPortal" in text
has_admin_preview = "function AdminPartnerPreview" in text

app_fn = """function ValorBuddyApplication(){
  const[token,setToken]=useState(localStorage.getItem('valor_token'));
  const[user,setUser]=useState(null);
  const[screen,setScreen]=useState('dashboard');
  const[mobileNav,setMobileNav]=useState(false);
  const[loading,setLoading]=useState(true);
  const[branchTheme,setBranchTheme]=useState(()=>normalizeBranch(localStorage.getItem('valor_branch_theme')||'Army'));

  useEffect(()=>{saveBrowserLocation()},[]);
  useEffect(()=>{applyBranchTheme(branchTheme)},[branchTheme]);

  useEffect(()=>{
    if(!token){setLoading(false);return}
    api('/auth/me').then(u=>{
      const normalized=normalizeBranch(localStorage.getItem('valor_branch_theme')||u.branch);
      setUser({...u,branch:normalized});
      setBranchTheme(normalized);
    }).catch(()=>{
      localStorage.removeItem('valor_token');
      setToken(null);
      setUser(null);
    }).finally(()=>setLoading(false));
  },[token]);

  useEffect(()=>{
    if(!mobileNav)return;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    const closeOnEscape=e=>{if(e.key==='Escape')setMobileNav(false)};
    const closeOnDesktop=()=>{if(window.innerWidth>900)setMobileNav(false)};
    window.addEventListener('keydown',closeOnEscape);
    window.addEventListener('resize',closeOnDesktop);
    return()=>{
      document.body.style.overflow=previousOverflow;
      window.removeEventListener('keydown',closeOnEscape);
      window.removeEventListener('resize',closeOnDesktop);
    };
  },[mobileNav]);

  if(loading)return <div className="boot"><Shield/>ValorBuddy loading...</div>;
  if(!token||!user)return <Auth onLogin={(t,u)=>{
    const normalized=normalizeBranch(u.branch);
    localStorage.setItem('valor_token',t);
    applyBranchTheme(normalized);
    setBranchTheme(normalized);
    setToken(t);
    setUser({...u,branch:normalized});
  }}/>;

  const logout=()=>{
    localStorage.removeItem('valor_token');
    setToken(null);
    setUser(null);
    setMobileNav(false);
  };

__PARTNER__

  const safeBranch=normalizeBranch(branchTheme||user.branch);
  const b=branches[safeBranch]||branches.Army;
  const closeMobileNav=()=>setMobileNav(false);

__ADMIN_PREVIEW__

  return <div className={`app ${b.cls} ${mobileNav?'mobileNavOpen':''}`} data-branch={b.cls} style={b.style}>
    <button type="button" className={`mobileNavBackdrop ${mobileNav?'visible':''}`} onClick={closeMobileNav} aria-label="Close navigation" tabIndex={mobileNav?0:-1}/>
    <Sidebar user={{...user,branch:safeBranch}} screen={screen} setScreen={(x)=>{setScreen(x);closeMobileNav()}} mobileOpen={mobileNav} onClose={closeMobileNav}/>
    <main>
      <Topbar user={{...user,branch:safeBranch}} b={b} setScreen={setScreen} setUser={setUser} setBranchTheme={setBranchTheme} menuOpen={mobileNav} onMenu={()=>setMobileNav(v=>!v)} onLogout={logout}/>
      <GlobalSearch user={{...user,branch:safeBranch}} setScreen={setScreen}/>
      <HealthSafetyNotice/>
      {screen==='dashboard'&&<Dashboard user={{...user,branch:safeBranch}} setScreen={setScreen}/>}
      {screen==='companion'&&<Companion user={{...user,branch:safeBranch}}/>}
      {screen==='events'&&<Events user={{...user,branch:safeBranch}}/>}
      {screen==='benefits'&&<Benefits user={{...user,branch:safeBranch}}/>}
      {screen==='wellness'&&<Wellness user={{...user,branch:safeBranch}} setScreen={setScreen}/>}
      {screen==='memories'&&<Memories/>}
      {screen==='reminders'&&<Reminders/>}
      {screen==='documents'&&<Documents/>}
      {screen==='missions'&&<MissionControl user={{...user,branch:safeBranch}}/>}
      {screen==='career'&&<CareerBusiness user={{...user,branch:safeBranch}}/>}
      {screen==='music'&&<MusicPage user={{...user,branch:safeBranch}} setUser={setUser}/>}
      {screen==='tutorial'&&<Tutorial setScreen={setScreen}/>}
      {screen==='admin'&&<Admin/>}
      {screen==='profile'&&<Profile user={{...user,branch:safeBranch}} setUser={setUser}/>}
    </main>
  </div>;
}
"""

app_fn = app_fn.replace("__PARTNER__", "  if(String(user.role||'').startsWith('partner'))return <PartnerPortal user={user} onLogout={logout}/>;" if has_partner else "")
app_fn = app_fn.replace("__ADMIN_PREVIEW__", "  if(screen==='adminpartner')return <AdminPartnerPreview onExit={()=>setScreen('admin')}/>;" if has_admin_preview else "")

m = re.search(r"function ValorBuddyApplication\(\)\{.*?(?=\nfunction Auth\()", text, re.S)
if not m:
    print("ERROR: Could not locate ValorBuddyApplication().")
    sys.exit(2)
text = text[:m.start()] + app_fn.rstrip() + text[m.end():]

sidebar_fn = """function Sidebar({user,screen,setScreen,mobileOpen,onClose}){
  const nav=[['dashboard','Dashboard',Shield],['companion','AI Assistant',Brain],['events','Activities',MapPin],['benefits','Benefits',Search],['wellness','Fitness & Wellness',Dumbbell],['memories','Memories',Heart],['reminders','Reminders',Bell],['documents','Document Intelligence',Folder],['missions','Mission Control',Brain],['career','Career & Business',Briefcase],['music','Music & Media',Music],['tutorial','User Tutorial',BookOpen],['profile','Profile',User]];
  if(user.role==='admin'){
    nav.push(['admin','Admin Dashboard',BarChart3]);
__ADMIN_NAV__
  }
  return <aside id="mobile-navigation" className={mobileOpen?"mobileOpen":""} aria-hidden={mobileOpen?false:undefined}>
    <div className="mobileDrawerHeader"><span>Navigation</span><button type="button" className="mobileDrawerClose" onClick={onClose} aria-label="Close navigation"><X/></button></div>
    <div className="logo"><div className="logoStack"><img src={valorLogo} alt="ValorBuddy logo"/><img className="branchMini" src={(branches[normalizeBranch(user.branch)]||branches.Army).emblem} alt={`${user.branch} service emblem`}/></div><div><b>VALORBUDDY</b><span>Your Digital Battle Buddy</span></div></div>
    <div className="miniProfile"><User/><div><b>{user.rank?`${user.rank} `:""}{user.first_name} {user.last_name||""}</b><span>{user.branch} • {user.service_status||"Veteran"}</span><small>{user.city}, {user.state}</small></div></div>
    {nav.map(([id,label,Icon])=><button className={screen===id?'active':''} key={id} onClick={()=>setScreen(id)}><Icon/>{label}</button>)}
    <div className="pledge">COMMITMENT<br/><span>Supporting those who served. Always.</span></div>
  </aside>;
}
"""
sidebar_fn = sidebar_fn.replace("__ADMIN_NAV__", "    nav.push(['adminpartner','Partner Portal Preview',Briefcase]);" if has_admin_preview else "")

m = re.search(r"function Sidebar\(\{user,screen,setScreen,mobileOpen(?:,onClose)?\}\).*?(?=\nfunction Topbar\()", text, re.S)
if not m:
    shutil.copy2(backup, path)
    print("ERROR: Could not locate Sidebar().")
    sys.exit(3)
text = text[:m.start()] + sidebar_fn.rstrip() + text[m.end():]

topbar_fn = """function Topbar({user,b,setScreen,setUser,setBranchTheme,onLogout,onMenu,menuOpen}){
  async function changeBranch(branch){
    const normalized=applyBranchTheme(branch);
    setBranchTheme(normalized);
    setUser(u=>({...u,branch:normalized}));
    requestAnimationFrame(()=>applyBranchTheme(normalized));
    setTimeout(()=>applyBranchTheme(normalized),80);
    try{await api('/api/profile/branch',{method:'POST',body:JSON.stringify({branch:normalized})})}
    catch(e){console.warn('Branch theme save failed; keeping local theme',e)}
  }
  return <header>
    <button className="mobileMenu" onClick={onMenu} aria-label={menuOpen?'Close navigation':'Open navigation'} aria-expanded={menuOpen} aria-controls="mobile-navigation">{menuOpen?<X/>:<Menu/>}</button>
    <div className="commandIdentity"><img src={b.emblem} alt={`${user.branch} service emblem`}/><div><b>{b.label}</b><span>{b.motto}</span></div></div>
    <div className="status">// PRIVATE //</div>
    <nav className="branchSwitcher" aria-label="Switch service branch theme">{Object.keys(branches).map(x=><button type="button" title={`Switch to ${x} theme`} className={normalizeBranch(user.branch)===x?'active':''} key={x} onClick={()=>changeBranch(x)}>{x}</button>)}</nav>
    <label className="mobileBranchControl"><span>Service theme</span><select aria-label="Switch service branch theme" value={normalizeBranch(user.branch)} onChange={e=>changeBranch(e.target.value)}>{Object.keys(branches).map(x=><option value={x} key={x}>{x}</option>)}</select></label>
    <button className="voiceHeaderButton voiceTopButton" onClick={()=>setScreen('companion')}><Mic/><span>Voice</span></button>
    <button onClick={onLogout} className="logout"><LogOut/><span>Logout</span></button>
  </header>;
}
"""

m = re.search(r"function Topbar\(\{user,b,setScreen,setUser,setBranchTheme,onLogout,onMenu(?:,menuOpen)?\}\).*?(?=\nfunction (?:GlobalSearch|Hero)\()", text, re.S)
if not m:
    shutil.copy2(backup, path)
    print("ERROR: Could not locate Topbar().")
    sys.exit(4)
text = text[:m.start()] + topbar_fn.rstrip() + text[m.end():]

if "function HealthSafetyNotice()" not in text:
    notice = """function HealthSafetyNotice(){
  return <section className="healthSafetyNotice" aria-label="Important health and safety notice"><Shield/><div><strong>Important Health Notice</strong><p>ValorBuddy provides general informational and organizational support only. It is not a medical device and does not diagnose, treat, cure, or prevent any medical condition. Always consult a qualified healthcare professional for medical advice, diagnosis, medications, or treatment.</p></div><div className="healthSafetyActions"><a href="tel:911">Emergency: Call 911</a><a href="tel:988">Veterans Crisis Line: Call 988, then press 1</a></div></section>;
}

"""
    marker = "function Hero({user})"
    if marker not in text:
        shutil.copy2(backup, path)
        print("ERROR: Could not locate Hero().")
        sys.exit(5)
    text = text.replace(marker, notice + marker, 1)

path.write_text(text, encoding="utf-8", newline="\n")
print("SUCCESS: Stable pre-v5.3.6 app structure restored.")
print("Preserved: Wellness, mobile branch selector, stronger voice profiles, live GPS, health notice.")
print("Backup:", backup)
