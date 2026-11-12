"""ValorBuddy Tactical Veteran Intelligence and Response Engine.

Provides authoritative, empathetic, battlefield-tested guidance for veterans,
active duty, guard/reserves, and military families across all core operational areas.
"""
from __future__ import annotations
import re
from typing import Any, Optional


def generate_veteran_assistant_response(
    message: str,
    first_name: str = "Battle Buddy",
    branch: str = "Armed Forces",
    city: str = "",
    state: str = "",
    context: Optional[dict[str, Any]] = None,
    intent: str = "general",
) -> str:
    """Generate a rich, human, professional assistant response tailored to veterans."""
    msg = (message or "").strip()
    lower = msg.lower()
    first_name = first_name.strip() or "Battle Buddy"
    branch = branch.strip() or "Armed Forces"
    loc_str = f"in {city}, {state}" if city and state else (f"in {city}" if city else "")

    # 1. EMERGENCY & CRISIS INTERVENTION PROTOCOL (Highest Priority)
    crisis_keywords = [
        "suicide", "kill myself", "hurt myself", "end my life", "want to die",
        "can't go on", "cant go on", "ending it all", "end it all", "no reason to live",
        "hang myself", "shoot myself"
    ]
    if any(k in lower for k in crisis_keywords):
        return (
            f"{first_name}, I am with you, and your life and service matter. Please reach out for immediate backup right now—you don't have to carry this alone.\n\n"
            "• **Veterans Crisis Line:** Dial **988, then Press 1** (Available 24/7/365, free, confidential)\n"
            "• **Crisis Text Line:** Send a text to **838255**\n"
            "• **Deaf / Hard of Hearing:** Dial **711**, then **988**\n"
            "• **Emergency Dispatch:** Call **911** or go to the nearest emergency room or VA hospital.\n\n"
            "You can also connect with a local **Vet Center**, where fellow combat veterans and military peers provide free, 100% confidential readjustment counseling outside the formal VA records system. Please take that step right now."
        )

    # 2. COMPANY IDENTITY, FOUNDERS & OWNERSHIP
    if any(k in lower for k in ["who built", "who owns", "who created", "who made you", "datastruma", "tagus", "eugene", "godson"]):
        return (
            f"ValorBuddy is owned and operated by **Tagus Technologies LLC**, a Texas-based, veteran-owned enterprise (UEI: CLBEA2FNJ456, CAGE: 95U91) headquartered in Wylie, Texas.\n\n"
            f"• **Military Operations & Veteran Strategy:** Led by **SSG Godson Onyeije, U.S. Army (Ret.)**, President of Federal Programs.\n"
            f"• **Platform Architecture & Engineering:** Led by **Eugene Ezenwa Ebem**, Co-Founder & CTO of Tagus Technologies and Founder & CEO of **DataStruma LLC**.\n"
            f"• **Mission:** Delivering a private, voice-first AI orchestration layer that simplifies earned benefits navigation, skills translation, and community connection for the entire military community.\n\n"
            f"All member data is protected under AES-256 encryption and is never used to train public foundation models. How can I assist your mission today, {first_name}?"
        )

    # 3. GREETINGS & INTRODUCTIONS
    greeting_triggers = [
        "hello", "hi", "hey", "good morning", "good afternoon", "good evening",
        "who are you", "what are you", "what can you do", "help me", "how does this work",
        "what is valorbuddy", "introduce yourself"
    ]
    # Check if message is purely or predominantly a greeting/introductory query
    words = lower.split()
    is_greeting = any(k in lower for k in ["who are you", "what can you do", "what is valorbuddy", "introduce yourself"]) or (
        len(words) <= 4 and any(g in words for g in ["hello", "hi", "hey", "greetings", "morning", "afternoon", "evening"])
    )
    if is_greeting:
        return (
            f"Good to have you with us, {first_name}! I am **ValorBuddy**, your AI Battle Buddy. I'm engineered specifically for our {branch} community, veterans, transitioning service members, and military families.\n\n"
            "Here is how I can back you up right now:\n"
            "• **VA Disability Claims & PACT Act:** Plain-English roadmaps for filing claims, intent-to-file, gathering nexus evidence, and understanding presumptive conditions.\n"
            "• **Career & Skills Translation:** Converting your MOS/AFSC/Rating, unit leadership, and clearances into high-impact civilian resume bullet points.\n"
            "• **Education & GI Bill:** Guidance on Post-9/11 GI Bill (Chapter 33), housing allowances (MHA/BAH), Yellow Ribbon, and VR&E (Chapter 31).\n"
            "• **Healthcare & Community:** Finding your nearest VA hospital, Vet Center, VFW post, or American Legion with live directions.\n"
            "• **Tactical Vault & Reminders:** Secure AES-256 storage for your DD-214 and automated reminders for doctor appointments or claim deadlines.\n\n"
            f"What mission are we tackling today, {first_name}?"
        )

    # 4. VA DISABILITY CLAIMS, PACT ACT, C&P EXAMS, NEXUS & RATINGS
    if any(k in lower for k in [
        "claim", "disability", "pact act", "rating", "c&p", "intent to file", "nexus",
        "burn pit", "agent orange", "service connection", "service-connected", "increase",
        "compensation", "100%", "va rating", "dbq", "disability benefits questionnaire"
    ]):
        return (
            f"{first_name}, here is your operational roadmap for navigating VA disability claims under current federal guidelines:\n\n"
            "### 1. Lock in Your Effective Date Immediately\n"
            "Submit an **Intent to File** on [VA.gov](https://www.va.gov/disability/how-to-file-claim/) right away. This establishes your retroactive back-pay date and gives you a full **365 days** to gather your evidence before formal submission.\n\n"
            "### 2. The Three Golden Elements of Service Connection\n"
            "To win an approved rating, your claim file must prove three distinct facts:\n"
            "• **In-Service Event or Injury:** Documented in your Service Treatment Records (STRs), personnel records, or incident reports.\n"
            "• **Current Formal Diagnosis:** A current medical diagnosis from a licensed doctor (VA or civilian).\n"
            "• **Medical Nexus (Link):** A professional medical opinion (Nexus Letter or DBQ) stating it is *'at least as likely as not'* (50%+ probability) that your condition was caused or aggravated by your military service.\n\n"
            "### 3. PACT Act Presumptive Conditions\n"
            "If you served in designated combat zones (Vietnam, Gulf War, Post-9/11 Iraq/Afghanistan/Horn of Africa), over 20 respiratory conditions, asthma, rhinitis, sinusitis, and numerous cancers are now **presumptive**. You do *not* need to prove a specific in-service event—only your qualifying deployment dates and a current diagnosis.\n\n"
            "### 4. C&P Exam Readiness\n"
            "When scheduled for your Compensation & Pension (C&P) exam, attend without fail. Describe your pain, mobility limitations, and psychological symptoms on your **worst days**, not how you feel in that brief exam room.\n\n"
            "### 5. Work With an Accredited VSO\n"
            "Never pay an unaccredited 'claims shark'. Veterans of Foreign Wars (VFW), Disabled American Veterans (DAV), and the American Legion provide **100% free, accredited representation**.\n\n"
            f"Would you like me to help you draft a checklist for your specific conditions or explain how to submit an Intent to File?"
        )

    # 5. MOS / MILITARY-TO-CIVILIAN CAREER & RESUME TRANSLATION
    if any(k in lower for k in [
        "resume", "career", "job", "translate", "civilian", "interview", "transition",
        "cybersecurity", "employment", "hire", "business plan", "entrepreneur", "mos",
        "afsc", "work", "cover letter", "fed job", "usajobs"
    ]):
        return (
            f"{first_name}, translating military service into civilian corporate or federal hiring language requires highlighting operational impact, leadership, and accountability:\n\n"
            "### 1. De-Militarize Your Jargon\n"
            "• **NCOIC / Platoon Sergeant:** Translate to *'Senior Operations & Personnel Manager'* managing teams of 20–40 personnel, mission logistics, and $X million in critical assets.\n"
            "• **Squad Leader:** Translate to *'First-Line Supervisor & Field Operations Lead'* responsible for tactical execution, safety compliance, and team training.\n"
            "• **Briefings & S-3 / S-4:** Translate to *'Executive Stakeholder Communications'* and *'Global Supply Chain & Logistics Operations'*.\n\n"
            "### 2. Quantify Your Accountability\n"
            "Civilian hiring managers and ATS algorithms look for measurable results. Frame your accomplishments with numbers:\n"
            "• *'Maintained 98% equipment operational readiness rate across $12M in sensitive gear.'*\n"
            "• *'Trained, mentored, and evaluated 35 specialists in safety and compliance protocols with zero lost-time incidents.'*\n\n"
            "### 3. Leverage Your Security Clearance & Federal Preference\n"
            "If you hold an active Secret or TS/SCI clearance, you are prime candidate for defense contractors and federal agencies. On USAJOBS, your veterans' preference (5-point or 10-point preference for service-connected disability) gives you competitive advantage.\n\n"
            "**Next Step:** Head to ValorBuddy's **Career & Business** section from the sidebar menu to automatically generate a complete civilian resume, tailored cover letter, or veteran business plan from your profile!"
        )

    # 6. EDUCATION, GI BILL & VR&E (CHAPTER 31 / 33)
    if any(k in lower for k in [
        "gi bill", "post-9/11", "mha", "bah", "yellow ribbon", "chapter 33", "chapter 31",
        "vr&e", "vre", "voc rehab", "college", "tuition", "school", "degree", "certification"
    ]):
        return (
            f"{first_name}, here is how to maximize your earned military education benefits:\n\n"
            "### 1. Post-9/11 GI Bill (Chapter 33)\n"
            "• **Tuition Coverage:** Pays up to 100% of all in-state public university tuition and fees, or up to the national cap for private institutions.\n"
            "• **Monthly Housing Allowance (MHA):** Calculated based on the Department of Defense BAH rate for an **E-5 with dependents** based on the campus ZIP code (requires taking at least one in-person class per term for full rate).\n"
            "• **Books & Supplies:** Up to $1,000 annually paid directly to you.\n\n"
            "### 2. The Yellow Ribbon Program\n"
            "For private colleges or out-of-state public schools whose tuition exceeds the national GI Bill cap, participating Yellow Ribbon universities match VA funds dollar-for-dollar to cover the remaining tuition gap with zero out-of-pocket cost to you.\n\n"
            "### 3. Veteran Readiness & Employment (VR&E / Chapter 31)\n"
            "**Strategic Tip:** If you have a VA disability rating of **10% or higher** and an employment barrier, apply for VR&E *before* using your GI Bill. VR&E pays 100% of tuition, all required books, laptop/equipment, AND pays the higher P9/11 MHA subsistence rate—**without consuming your 36 months of Post-9/11 GI Bill entitlement**!\n\n"
            "Would you like me to help you compare colleges using the VA GI Bill Comparison Tool or check VR&E qualifications?"
        )

    # 7. VA HEALTHCARE, CLINICS & ENROLLMENT
    if any(k in lower for k in [
        "healthcare", "clinic", "hospital", "enroll", "10-10ez", "priority group",
        "doctor", "medical", "appointment", "va facility", "community care"
    ]):
        return (
            f"{first_name}, here is how VA Healthcare enrollment and local clinical access work:\n\n"
            "### 1. How to Enroll (VA Form 10-10EZ)\n"
            "You can enroll in VA Healthcare in under 15 minutes at [VA.gov/health-care](https://www.va.gov/health-care/apply/application/introduction) or walk in directly to any VA Medical Center enrollment office with your DD-214 and a photo ID.\n\n"
            "### 2. Priority Groups & Costs\n"
            "The VA assigns veterans to one of 8 Priority Groups based on disability rating, combat service, and income. If you have a service-connected disability rating of **50% or higher**, or are receiving treatment for any service-connected condition, your medical care and prescriptions are **100% copay-free**.\n\n"
            "### 3. VA Community Care (Private Doctors)\n"
            "If your local VA clinic cannot schedule an appointment within standard wait times (**20 days for primary/mental health**, 28 days for specialty) or if you live more than a **30-minute drive** (primary care) or **60-minute drive** (specialty care) from a VA facility, you are legally entitled to receive care from private civilian doctors paid entirely by the VA.\n\n"
            "### 4. Emergency Care Outside the VA\n"
            "If you experience a medical emergency, go to the nearest emergency room. You must notify the VA within **72 hours** (via the VA 72-Hour Notification Portal or 1-844-724-7842) so the VA can cover the emergency medical bill.\n\n"
            f"Would you like me to search for the closest VA Medical Center or Community Clinic {loc_str}?"
        )

    # 8. VA HOME LOAN, HOUSING & MORTGAGE
    if any(k in lower for k in [
        "home loan", "mortgage", "housing", "buy a house", "coe", "certificate of eligibility",
        "homeless", "rent", "va loan", "funding fee"
    ]):
        return (
            f"{first_name}, the VA-backed home loan is one of the single most powerful financial benefits earned through military service:\n\n"
            "### 1. Core VA Loan Benefits\n"
            "• **0% Down Payment:** No requirement for the traditional 20% down payment up to full conforming loan limits.\n"
            "• **No Private Mortgage Insurance (PMI):** Saves you $150–$400 every month compared to conventional loans.\n"
            "• **Competitive Interest Rates:** Backed by the federal government, VA loans consistently offer lower interest rates than conventional mortgages.\n\n"
            "### 2. VA Funding Fee Exemption\n"
            "While most borrowers pay a 1.25%–3.3% VA funding fee, **veterans receiving VA compensation for a service-connected disability (10%+ rating) are 100% exempt from paying the funding fee**, saving thousands in closing costs.\n\n"
            "### 3. How to Obtain Your Certificate of Eligibility (COE)\n"
            "You need your **Certificate of Eligibility (COE)** to prove your entitlement to lenders. You can download it instantly via [VA.gov eBenefits](https://www.va.gov/housing-assistance/home-loans/how-to-request-coe/) or any VA-approved lender can pull it in seconds using the WebLGY system with your DD-214.\n\n"
            "### 4. Urgent Housing Assistance\n"
            "If you or a veteran you know is facing eviction, foreclosure, or homelessness, the **National Call Center for Homeless Veterans** is available 24/7 at **1-877-4AID-VET (1-877-424-3838)** for immediate shelter and HUD-VASH voucher placement.\n\n"
            "Would you like me to help you check lender comparison questions or review your COE requirements?"
        )

    # 9. MENTAL WELLNESS, COMBAT STRESS & DECOMPRESSION
    if any(k in lower for k in [
        "stress", "ptsd", "anxious", "anxiety", "depressed", "depression",
        "overwhelmed", "struggling", "hard day", "tired", "bad day", "decompression",
        "trauma", "nightmares"
    ]):
        return (
            f"I hear you, {first_name}, and I want you to know you're not walking this alone. Transitioning from the high-tempo camaraderie of the {branch} to civilian life brings unique weights that most people don't understand.\n\n"
            "Here are practical, battle-ready steps for today:\n"
            "• **Vet Centers (Free & Confidential):** Vet Centers provide community-based counseling, combat peer support, and family readjustment counseling. Crucially, **Vet Center records are kept separate from the VA hospital system** and are never disclosed without your permission.\n"
            "• **Peer Support:** Talking with someone who wore the uniform helps cut through the noise. Organizations like *Team Red, White & Blue (Team RWB)*, *The Mission Continues*, and local VFW/American Legion posts provide strong community roots.\n"
            "• **Immediate Backup:** If things get overwhelming or dark, the **Veterans Crisis Line** is available 24/7. Dial **988, then Press 1**, or text **838255**. It is 100% confidential and staffed by veteran-trained counselors.\n\n"
            "Let's focus on just the next small win right now. What is one thing on your plate today we can simplify or take off your shoulders?"
        )

    # 10. MILITARY RECORDS & DD-214 RETRIEVAL
    if any(k in lower for k in ["dd214", "dd-214", "personnel file", "ompf", "national archives", "evetrecs", "service record"]):
        return (
            f"{first_name}, having an official copy of your **DD-214 (Member 4 Copy)** is essential for virtually every veteran benefit:\n\n"
            "### 1. How to Request an Official Replacement Copy\n"
            "• **Online via eVetRecs:** Submit an official military records request through the [National Archives eVetRecs Portal](https://www.archives.gov/veterans/military-service-records).\n"
            "• **Via MilConnect:** Veterans discharged after 2000 can often download their DD-214 and Official Military Personnel File (OMPF) immediately from [milConnect](https://milconnect.dmdc.osd.mil/).\n"
            "• **Standard Form 180 (SF-180):** You can mail or fax a completed SF-180 form directly to the National Personnel Records Center (NPRC) in St. Louis, MO.\n\n"
            "### 2. Store It in ValorBuddy's Encrypted Vault\n"
            "Once you have your PDF copy, upload it into ValorBuddy's **Document Vault**. It is encrypted with field-level **AES-256 encryption** so you can safely access it on your phone or computer whenever you need to prove your veteran status.\n\n"
            "Would you like me to walk you through submitting the eVetRecs request online?"
        )

    # 11. MUSIC, RELAXATION & CADENCE
    if any(k in lower for k in ["music", "song", "playlist", "play", "relax", "listen"]):
        return (
            f"Roger that, {first_name}. Music is one of the best ways to decompress and reset your operational mindset.\n\n"
            f"Inside ValorBuddy's **Music & Media** hub, we have curated YouTube channels and playlists specifically for you:\n"
            f"• **{branch} Heritage & Cadence:** Marching cadences, anthems, and military pride.\n"
            "• **Calm Instrumental Focus:** Low-tempo, lo-fi beats, and acoustic tracks designed for focus and stress relief.\n"
            "• **Classic Country & Heartland Rock:** Uplifting tracks for the road or workshop.\n"
            "• **Uplifting Gospel & Soul:** Calming vocal harmonies.\n\n"
            "Open **Music & Media** from the sidebar menu to launch the built-in theater player with zero ads!"
        )

    # 12. GENERAL / TACTICAL ASSISTANCE FALLBACK
    return (
        f"{first_name}, I am standing by to assist with that. As your ValorBuddy companion for the {branch}, I can break this down into clear, actionable steps.\n\n"
        "Here are three immediate ways we can move forward:\n"
        "1. **Check Earned Benefits & Eligibility:** See if there are VA healthcare, disability, education, or state veteran programs tied to this request.\n"
        "2. **Connect With Local Resources:** Locate verified veteran organizations, VFW/American Legion posts, or regional specialists {loc_str}.\n"
        "3. **Set a Mission Plan or Reminder:** Schedule a reminder or save this goal to your ValorBuddy Mission Control.\n\n"
        "Tell me a little more about what specific outcome you'd like to achieve, and I'll lay out the exact steps."
    )
