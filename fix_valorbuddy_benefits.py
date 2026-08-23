from pathlib import Path
import sys

path = Path("frontend/src/App.jsx")

if not path.exists():
    print(f"ERROR: {path} was not found. Run this script from the valorbuddy-prod repository root.")
    sys.exit(1)

text = path.read_text(encoding="utf-8")

benefits_start = """function Benefits({user}){
  const[q,setQ]=useState('VA benefits for veterans spouses and dependents');
  const[data,setData]=useState(null);const[popupOpen,setPopupOpen]=useState(false);
  const[forms,setForms]=useState([]);const[programs,setPrograms]=useState([]);const[resourceQuery,setResourceQuery]=useState('');
  async function search(value=q){const result=await api(`/api/benefits/search?query=${encodeURIComponent(value)}&state=${encodeURIComponent(user.state||'')}&branch=${encodeURIComponent(user.branch||'')}`);setData(result);setPopupOpen(true)}
  async function loadOfficial(value=resourceQuery){try{const [f,p]=await Promise.all([api(`/api/va/forms?query=${encodeURIComponent(value||'')}`),api(`/api/va/programs?query=${encodeURIComponent(value||'')}`)]);setForms(f.items||[]);setPrograms(p.items||[])}catch(e){console.warn(e)}}
  useEffect(()=>{loadOfficial('')},[]);
"""

marker = """  function explainResource(item){const prompt=`Explain ${item.form||item.title} in plain English, who it is for, what information I should gather, and the safest official next step.`;setQ(prompt);search(prompt)}"""

if "function Benefits({user}){" in text:
    print("Benefits component already has its opening block. No change made.")
    sys.exit(0)

if marker not in text:
    print("ERROR: Expected Benefits marker was not found. No file was changed.")
    sys.exit(2)

text = text.replace(marker, benefits_start + marker, 1)
path.write_text(text, encoding="utf-8", newline="\n")
print("SUCCESS: Restored the missing Benefits component opening block in frontend/src/App.jsx")
