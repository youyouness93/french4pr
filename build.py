#!/usr/bin/env python3
"""French4PR static site generator.

Edit the CONFIG block below (prices, contacts, IDs, durations), then run:
    python3 build.py
Output goes to ./site (upload that folder to any static host: Netlify,
Cloudflare Pages, Vercel, GitHub Pages, or any web hosting).
Values wrapped in [brackets] are placeholders and are highlighted in yellow on the site.
"""
import json, os, re, html
from datetime import date

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "site")

# ---------------------------------------------------------------- CONFIG ----
CONFIG = {
    "domain": "https://french4pr.com",          # [À RÉSERVER] .com or .ca
    "email": "pr4french@gmail.com",                # receives form submissions
    "show_email": False,                          # True = display the email publicly on the site
    "whatsapp": "[1XXXXXXXXXX]",                 # digits only, with country code, e.g. 14165551234
    "whatsapp_display": "[+1 (XXX) XXX-XXXX]",
    "instagram": "https://www.instagram.com/[french4pr]",
    "facebook": "https://www.facebook.com/[french4pr]",
    "reply_hours": "Mon–Sat, 9 am–8 pm (Eastern Time). We reply within 24 h.",
    "group_size": "5 to 8",
    "teacher_name": "[Teacher's first name]",
    "calendly_url": "",                          # e.g. https://calendly.com/french4pr/free-assessment
    "form_endpoint": "https://formsubmit.co/ajax/pr4french@gmail.com",  # FormSubmit: forwards each form to this inbox
    "ga4_id": "",                                # e.g. G-XXXXXXXXXX
    "meta_pixel_id": "",                         # e.g. 123456789012345
    "assessment_format": "a 20-minute video call",
    "level_duration": "8–12 weeks",
    # Monthly plans (CAD). Features = bullet points on each card.
    "plans": [
        {"name": "Group classes", "tag": "Most popular", "featured": True, "price": 239, "classes": 20, "time_to_b2": "10–12 months",
         "features": ["5 classes a week, 1 hour each", "Small group: 5 to 8 students", "Evenings & weekends", "A1 to B2 + TEF/TCF Canada prep"]},
        {"name": "Private classes", "tag": "", "price": 359, "classes": 12, "time_to_b2": "8–10 months",
         "features": ["3 classes a week, 1 hour each", "1:1 with your teacher", "Schedule built around your job", "A1 to B2 + TEF/TCF Canada prep"]},
        {"name": "Private fast-track", "tag": "Fastest", "price": 539, "classes": 20, "time_to_b2": "6–8 months",
         "features": ["5 classes a week, 1 hour each", "1:1 with your teacher", "For close permit or test deadlines", "A1 to B2 + TEF/TCF Canada prep"]},
    ],
    # Express Entry draws — UPDATE after each round, from the official IRCC page.
    "draws": {
        "french_range": "382–420",
        "french_label": "French-language draws",
        "general_range": "507–518",               # from the brief: verify on IRCC before launch
        "general_label": "Regular CEC draws",
        "as_of": "Mar–Aug 2026",
        "checked": "November 2026",
        "source": "https://www.canada.ca/en/immigration-refugees-citizenship/corporate/mandate/policies-operational-instructions-agreements/ministerial-instructions/express-entry-rounds.html",
    },
    "show_testimonials": False,                  # turn on only with REAL testimonials
    "testimonials": [],                          # {"name","city","level","quote","photo"}
}
C = CONFIG
TODAY = date.today().isoformat()

# ------------------------------------------------------------- HELPERS -------
def ph(text):
    """Highlight [placeholders] so nothing unfinished ships unnoticed."""
    return re.sub(r"\[([^\]]+)\]", r'<span class="todo">[\1]</span>', text)

def esc(s):
    return html.escape(re.sub(r"[\[\]]", "", s), quote=True)

def wa_link(msg="Bonjour! I'd like to know more about French4PR classes."):
    num = re.sub(r"\D", "", C["whatsapp"]) or "0"
    from urllib.parse import quote
    return f"https://wa.me/{num}?text={quote(msg)}"

def url(path):
    return C["domain"].rstrip("/") + path

ICONS = {
    "users": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    "clock": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    "target": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    "compass": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z"/></svg>',
    "ear": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 8.5a6 6 0 1 1 12 0c0 6-6 6-6 10a3 3 0 0 1-6 0"/><path d="M15 8.5a3 3 0 1 0-6 0"/></svg>',
    "book": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/></svg>',
    "pen": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    "mic": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10a7 7 0 0 1-14 0M12 19v3"/></svg>',
    "laptop": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M2 20h20"/></svg>',
}
WA_SVG = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.5.7 4.8 1.9 6.8L3 29l6.8-2.1c1.9 1 4 1.6 6.2 1.6 7 0 12.7-5.6 12.7-12.6S23 3 16 3zm0 23.2c-2 0-3.9-.6-5.6-1.6l-.4-.2-4 1.2 1.3-3.9-.3-.4a10.3 10.3 0 0 1-1.7-5.7c0-5.8 4.8-10.5 10.7-10.5s10.6 4.7 10.6 10.5S21.9 26.2 16 26.2zm5.9-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.6-1.6-1-.9-1.6-1.9-1.8-2.2-.2-.3 0-.5.1-.7l.5-.6.3-.5c.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.7s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.7 5 .8.3 1.4.5 1.9.7.8.3 1.5.2 2.1.1.6-.1 1.9-.8 2.2-1.5.3-.7.3-1.4.2-1.5-.1-.2-.3-.3-.7-.5z"/></svg>'

LEVELS = [
    {"code": "A1", "slug": "a1", "name": "Beginner", "title": "A1 French – Beginner",
     "tagline": "From zero to your first real conversations.",
     "out": "Introduce yourself, ask simple questions, understand everyday basics.",
     "nclc": "NCLC 1–3",
     "for": ["You have never studied French, or only know a few words.",
             "You studied French in school years ago and forgot most of it.",
             "You want a solid base before aiming for NCLC 7."],
     "learn": ["The French sound system and pronunciation that Canadians understand",
               "Present tense of the most useful verbs (être, avoir, aller, faire…)",
               "Introducing yourself, your job, your family and your city",
               "Numbers, dates, times, prices and directions",
               "Short everyday dialogues: shopping, appointments, transport",
               "Reading short messages, signs and simple forms"],
     "can": ["Introduce yourself and talk about your daily routine",
             "Understand slow, clear speech on familiar topics",
             "Fill in a simple form and write a short message",
             "Handle basic interactions at a store, clinic or office"]},
    {"code": "A2", "slug": "a2", "name": "Elementary", "title": "A2 French – Elementary",
     "tagline": "Talk about your past, your plans and your life in Canada.",
     "out": "Describe your experience, handle daily tasks, tell simple stories.",
     "nclc": "NCLC 3–4",
     "for": ["You finished A1 or can already handle very basic French.",
             "You understand slow French but freeze when you need to answer.",
             "You want to move from words to full sentences."],
     "learn": ["Past tenses: passé composé and imparfait",
               "Near future and talking about plans",
               "Describing people, places, your work and your experience",
               "Making requests, invitations and simple complaints",
               "Understanding short announcements and voicemails",
               "Writing short emails and personal messages"],
     "can": ["Tell what you did last weekend or in your last job",
             "Understand the main point of short, clear audio",
             "Write a short, structured email",
             "Take part in simple conversations without preparing"]},
    {"code": "B1", "slug": "b1", "name": "Intermediate", "title": "B1 French – Intermediate",
     "tagline": "Express your opinion and start working on test-style tasks.",
     "out": "Give opinions, explain problems, understand longer audio and texts.",
     "nclc": "NCLC 5–6",
     "for": ["You finished A2 or you can hold a simple conversation.",
             "You want to start practising TEF/TCF-style tasks.",
             "You need more fluency and confidence when you speak."],
     "learn": ["Giving and defending an opinion",
               "Conditional, subjunctive basics and complex sentences",
               "Connectors to structure a speech or a text",
               "Understanding radio, interviews and longer texts",
               "Writing articles, letters and short argued texts",
               "First timed practice on the 4 test skills"],
     "can": ["Explain a problem and suggest a solution",
             "Follow the main ideas of a radio segment or article",
             "Write a clear, structured text of 150–200 words",
             "Speak for a few minutes on a familiar topic"]},
    {"code": "B2", "slug": "b2", "name": "Upper-Intermediate + exam prep", "title": "B2 French + TEF/TCF Canada Prep",
     "tagline": "Reach NCLC 7 in all four skills — and walk into the test ready.",
     "out": "Aim for NCLC 7 in all 4 skills on TEF Canada or TCF Canada.",
     "nclc": "NCLC 7+",
     "for": ["You are at B1 level or higher.",
             "Your test date is coming up, or you want to book it.",
             "You need NCLC 7 in all four skills for Express Entry."],
     "learn": ["Argued speaking: convincing, negotiating, nuancing",
               "Formal writing: letters, opinion texts, summaries",
               "Advanced listening: fast speech, Canadian and European accents",
               "Exam strategy for each section of TEF Canada and TCF Canada",
               "Timed mock exams under real test conditions",
               "Personal feedback on your speaking and writing tasks"],
     "can": ["Argue and defend a point of view in speaking and writing",
             "Understand most news, interviews and work conversations",
             "Manage your time on every section of the test",
             "Target NCLC 7 or higher in listening, reading, speaking and writing"]},
]

FAQ_ALL = [
    ("Getting started", [
        ("I have zero French. Can I really reach NCLC 7?",
         "Yes. Most of our students start from zero. The path goes A1 → A2 → B1 → B2, and B2 includes targeted TEF/TCF Canada preparation. Your speed depends on your starting point, how many hours you study and how much you practise between classes. Your free assessment gives you a personal time estimate."),
        ("How long does it take to reach B2 / NCLC 7?",
         f"Each level usually takes {C['level_duration']} of classes, so going from zero to B2 is a project of several months. Your free assessment gives you an estimate based on your level and your availability."),
        ("What happens during the free assessment?",
         f"The assessment is {C['assessment_format']}. You get your current level, a time estimate to reach B2, and the recommended format for you. It is free, with no obligation."),
        ("Do I need to buy books?",
         "No. All course materials are included and shared online."),
    ]),
    ("Classes & schedule", [
        ("Are classes online or in person?",
         "Classes are online first, so you can join from anywhere in Canada: Brampton, Mississauga, Scarborough, Surrey, Calgary or a small town. All you need is a phone or laptop and a stable connection."),
        ("I work full time. When are classes held?",
         "We offer evening and weekend classes for people who work. You tell us your availability when you book your free assessment."),
        ("How big are the groups?",
         "Groups have 5 to 8 people, so you speak in every class. Private classes are also available if you prefer one-on-one."),
        ("Group or private — which is better for me?",
         "Group classes are more affordable and give you speaking practice with others on the same path. Private classes move at your pace and fit tight deadlines or irregular schedules. We recommend one after your assessment."),
    ]),
    ("Tests & immigration", [
        ("Should I take TEF Canada or TCF Canada?",
         "Both are accepted by IRCC for Express Entry and use the same NCLC scale. The formats are different. We help you choose based on your strengths, test dates and test centres near you. See our <a href=\"/tef-tcf/\">TEF & TCF Canada guide</a>."),
        ("Do you guarantee permanent residence?",
         "No. Nobody can honestly guarantee PR or a specific test score. We prepare you for the French test and help you reach the best score you can. Immigration decisions are made by IRCC."),
        ("Do you give immigration advice?",
         "No. French4PR provides French language training only. For immigration advice, speak to a licensed immigration consultant (RCIC) or a lawyer. You can check a consultant on the College of Immigration and Citizenship Consultants register."),
        ("How long are TEF/TCF results valid for Express Entry?",
         "IRCC accepts language test results that are less than two years old when you submit your profile and your application. Plan your test date with this in mind."),
    ]),
    ("Pricing & payment", [
        ("How much do classes cost?",
         "Group classes are $239/month, private classes $359/month and the private fast-track $539/month. See the <a href=\"/pricing/\">pricing page</a>. We confirm the right plan for you after your free assessment."),
    ]),
]
FAQ_HOME = [FAQ_ALL[0][1][0], FAQ_ALL[2][1][0], FAQ_ALL[1][1][1], FAQ_ALL[2][1][1], FAQ_ALL[0][1][2]]

# ------------------------------------------------------------- LAYOUT --------
NAV = [("/program/", "Program"), ("/tef-tcf/", "TEF & TCF"), ("/pricing/", "Pricing"), ("/about/", "About"), ("/faq/", "FAQ")]

ORG = {
    "@type": "EducationalOrganization", "@id": url("/#org"), "name": "French4PR",
    "url": url("/"), "logo": url("/assets/img/logo-full.png"), "image": url("/assets/img/og-image.jpg"),
    "slogan": "French is your key to Canadian PR",
    "description": "Online French classes from zero to B2 to prepare for TEF Canada and TCF Canada and reach NCLC 7 for Express Entry.",
    "areaServed": {"@type": "Country", "name": "Canada"},
    "sameAs": [re.sub(r"[\[\]]", "", C["instagram"]), re.sub(r"[\[\]]", "", C["facebook"])],
}

def analytics():
    out = []
    if C["ga4_id"]:
        out.append(f'<script async src="https://www.googletagmanager.com/gtag/js?id={C["ga4_id"]}"></script>'
                   f'<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments)}}gtag("js",new Date());gtag("config","{C["ga4_id"]}");</script>')
    if C["meta_pixel_id"]:
        out.append("<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};"
                   "if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];"
                   "s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');"
                   f"fbq('init','{C['meta_pixel_id']}');fbq('track','PageView');</script>")
    return "\n".join(out)

def header(path):
    links = "".join(f'<li><a href="{h}"{" aria-current=\"page\"" if path.startswith(h) else ""}>{t}</a></li>' for h, t in NAV)
    mlinks = links + '<li><a href="/contact/">Contact</a></li>'
    cta = "" if path.startswith("/free-assessment") else '<a class="btn btn--red" href="/free-assessment/" data-cta="header">Free Assessment</a>'
    return f'''<a class="skip" href="#main">Skip to content</a>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="/" aria-label="French4PR home"><img src="/assets/img/key.png" width="62" height="28" alt=""><span>French<b>4</b>PR</span></a>
    <nav class="nav" aria-label="Main"><ul>{links}</ul></nav>
    <div class="header-cta">{cta}
      <button class="burger" aria-expanded="false" aria-controls="mobile-nav" aria-label="Menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
    </div>
  </div>
  <nav class="mobile-nav" id="mobile-nav" aria-label="Mobile"><ul>{mlinks}</ul></nav>
</header>'''

def footer():
    lv = "".join(f'<li><a href="/program/{l["slug"]}/">{l["code"]} – {l["name"].split(" +")[0]}</a></li>' for l in LEVELS)
    return f'''<footer class="site-footer">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <div class="footer-logo">French<b>4</b>PR</div>
        <p>French is your key to Canadian PR. Online French classes from zero to B2, with TEF Canada & TCF Canada preparation, everywhere in Canada.</p>
        <p><a href="{wa_link()}" rel="noopener" target="_blank">WhatsApp: {ph(C["whatsapp_display"])}</a>{f'<br><a href="mailto:{esc(C["email"])}">{C["email"]}</a>' if C["show_email"] else ""}</p>
      </div>
      <div><h3>Program</h3><ul><li><a href="/program/">The 4-step path</a></li>{lv}</ul></div>
      <div><h3>Prepare</h3><ul><li><a href="/tef-tcf/">TEF & TCF Canada</a></li><li><a href="/free-assessment/">Free assessment</a></li><li><a href="/pricing/">Pricing</a></li><li><a href="/faq/">FAQ</a></li></ul></div>
      <div><h3>French4PR</h3><ul><li><a href="/about/">About</a></li><li><a href="/contact/">Contact</a></li><li><a href="{esc(C["instagram"])}" rel="noopener" target="_blank">Instagram</a></li><li><a href="{esc(C["facebook"])}" rel="noopener" target="_blank">Facebook</a></li></ul></div>
    </div>
    <div class="disclaimer">
      <p><strong>French4PR provides French language training only. We do not provide immigration advice.</strong> We do not guarantee permanent residence or any test score. For immigration advice, consult a licensed immigration consultant (RCIC) or lawyer. TEF Canada and TCF Canada are trademarks of their respective owners; French4PR is not affiliated with them or with IRCC.</p>
      <p>© {date.today().year} French4PR · <a href="/privacy/">Privacy Policy</a> · <a href="/terms/">Terms</a></p>
    </div>
  </div>
</footer>
<a class="wa-float" href="{wa_link()}" target="_blank" rel="noopener" aria-label="Chat with us on WhatsApp">{WA_SVG}</a>'''

def cta_band(title="Not sure where to start?", text="Get your free French assessment. In one short session you'll know your level, how long it takes to reach B2, and the best plan for you.", btn="Get my free assessment", where="band"):
    return f'''<section class="section section--tight"><div class="wrap"><div class="cta-band">
  <div class="mini-ladder" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
  <h2>{title}</h2><p>{text}</p>
  <a class="btn btn--red btn--lg" href="/free-assessment/" data-cta="{where}">{btn}</a>
</div></div></section>'''

def crumbs(items):
    lis = "".join(f'<li><a href="{h}">{t}</a></li>' if h else f'<li aria-current="page">{t}</li>' for h, t in items)
    return f'<nav class="crumbs" aria-label="Breadcrumb"><ol>{lis}</ol></nav>'

def crumbs_ld(items, path):
    els = [{"@type": "ListItem", "position": i + 1, "name": t, "item": url(h or path)} for i, (h, t) in enumerate(items)]
    return {"@type": "BreadcrumbList", "itemListElement": els}

def faq_ld(pairs):
    strip = lambda s: re.sub(r"<[^>]+>", "", re.sub(r"[\[\]]", "", s))
    return {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in pairs]}

def faq_html(pairs):
    return '<div class="faq">' + "".join(f'<details><summary>{q}</summary><div class="ans"><p>{ph(a)}</p></div></details>' for q, a in pairs) + "</div>"

def ladder(active=None, captions=True):
    order = [l["code"] for l in LEVELS]
    lis = []
    for i, l in enumerate(LEVELS):
        cls = ""
        if active:
            ai = order.index(active)
            cls = ' class="is-active"' if i == ai else (' class="is-done"' if i < ai else "")
        cap = (f'<div class="cap"><strong>{l["name"].split(" +")[0]}</strong><span class="out">{l["out"]}</span><br><span class="dur">{ph(C["level_duration"])}</span></div>'
               if captions else "")
        lis.append(f'<li{cls}><a href="/program/{l["slug"]}/" aria-label="{l["title"]}"><div class="barwrap"><div class="bar"><span class="lvl">{l["code"]}</span><span class="nm">{l["nclc"]}</span></div></div>{cap}</a></li>')
    return f'<div class="ladder{" ladder--active" if active else ""}"><ol>{"".join(lis)}</ol></div>'

def page(path, title, desc, body, schema=None, noindex=False, preload=None):
    canonical = url(path)
    graph = [ORG] + (schema or [])
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)
    pre = f'<link rel="preload" as="image" href="{preload[0]}" imagesrcset="{preload[1]}" imagesizes="{preload[2]}" fetchpriority="high">' if preload else ""
    robots = "noindex, follow" if noindex else "index, follow, max-image-preview:large"
    cfg = json.dumps({"calendlyUrl": C["calendly_url"], "formEndpoint": C["form_endpoint"]})
    return f'''<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="{robots}">
<link rel="canonical" href="{canonical}">
<meta name="theme-color" content="#12213F">
<meta property="og:type" content="website">
<meta property="og:site_name" content="French4PR">
<meta property="og:locale" content="en_CA">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{url('/assets/img/og-image.jpg')}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/img/icon-192.png">
<link rel="apple-touch-icon" href="/assets/img/icon-180.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
{pre}
<link rel="stylesheet" href="/assets/css/style.css">
<script type="application/ld+json">{ld}</script>
<script>window.F4PR={cfg};</script>
{analytics()}
</head>
<body>
{header(path)}
<main id="main">
{body}
</main>
{footer()}
<script src="/assets/js/main.js" defer></script>
</body>
</html>'''

PAGES = {}
def add(path, *a, **k):
    PAGES[path] = page(path, *a, **k)

def page_hero(items, h1, lead, extra=""):
    return f'<section class="page-hero"><div class="wrap">{crumbs(items)}<h1>{h1}</h1><p class="lead">{lead}</p>{extra}</div></section>'

# --------------------------------------------------------------- HOME --------
D = C["draws"]
hero_srcset = "/assets/img/student-train-480.webp 480w, /assets/img/student-train-800.webp 800w, /assets/img/student-train-1024.webp 1024w"
hero_sizes = "(min-width: 900px) 460px, 100vw"
why = [("users", "Small groups of 5 to 8", "You speak in every class, not once a week. Private classes are also available."),
       ("clock", "Evenings & weekends", "Built for people who work full time. Join from your phone or laptop, anywhere in Canada."),
       ("target", "Trained for the test", "Listening, reading, writing and speaking: we train the 4 skills exactly as TEF and TCF Canada test them."),
       ("compass", "We get your journey", "Your teacher understands work permits, PGWPs and deadlines. We plan around your timeline.")]
testimonials = ""
if C["show_testimonials"] and C["testimonials"]:
    cards = "".join(f'<figure class="card"><blockquote>“{t["quote"]}”</blockquote><figcaption><strong>{t["name"]}</strong>, {t["city"]} · reached {t["level"]}</figcaption></figure>' for t in C["testimonials"])
    testimonials = f'<section class="section"><div class="wrap"><h2 class="center">Allez! Their French, their path</h2><div class="grid grid--3 mt-2">{cards}</div></div></section>'

home = f'''
<section class="hero"><div class="wrap">
  <div>
    <span class="eyebrow">Online French classes for PR · Canada-wide</span>
    <h1>French is your key to <span class="accent">Canadian PR</span></h1>
    <p class="lead">From zero to B2. Prepare for TEF Canada &amp; TCF Canada and reach NCLC 7 — step by step, with evening and weekend classes built for people who work.</p>
    <div class="btn-row">
      <a class="btn btn--red btn--lg" href="/free-assessment/" data-cta="hero">Get my free assessment</a>
      <a class="link-arrow" href="/program/">See the program</a>
    </div>
    <ul class="pills" aria-label="Highlights"><li class="pill">TEF Canada</li><li class="pill">TCF Canada</li><li class="pill">Online classes</li><li class="pill pill--goal">Goal: NCLC 7</li></ul>
  </div>
  <div class="hero-media">
    <img src="/assets/img/student-train-800.webp" srcset="{hero_srcset}" sizes="{hero_sizes}" width="800" height="1000" alt="Young woman learning French phrases on her phone during her commute" fetchpriority="high">
    <div class="hero-badge"><div class="mini-ladder" aria-hidden="true"><i></i><i></i><i></i><i></i></div><p><strong>A1 → A2 → B1 → B2</strong><br>One clear path to NCLC 7</p></div>
  </div>
</div></section>

<section class="section section--grey"><div class="wrap">
  <span class="eyebrow">The opportunity</span>
  <h2>Your CRS too low? French can put you in a different line.</h2>
  <p class="lead">Express Entry runs draws reserved for candidates with strong French. Their CRS cut-offs have been far lower than in regular draws.</p>
  <div class="stats">
    <div class="stat stat--hl"><div class="num">{D["french_range"]}</div><p class="lbl">{D["french_label"]}</p><p>CRS cut-off range, {D["as_of"]}</p></div>
    <div class="stat"><div class="num">{D["general_range"]}</div><p class="lbl">{D["general_label"]}</p><p>CRS cut-off range, same period</p></div>
  </div>
  <p class="source">Source: <a href="{D["source"]}" rel="noopener" target="_blank">IRCC – Express Entry rounds of invitations</a>. Data checked {D["checked"]}. Cut-offs change with every draw; past draws don't predict future ones.</p>
</div></section>

<section class="section"><div class="wrap">
  <span class="eyebrow">Your path</span>
  <h2>4 steps from zero to NCLC 7</h2>
  <p class="lead">Every level has a clear goal. Click a step to see what you'll learn and who it's for. B2 includes full TEF/TCF Canada preparation.</p>
  {ladder()}
  <p class="mt-2"><a class="link-arrow" href="/program/">See the full program</a></p>
</div></section>

<section class="section section--grey"><div class="wrap">
  <span class="eyebrow">How it works</span>
  <h2>Start in 3 simple steps</h2>
  <div class="grid grid--3 mt-2">
    <div class="card"><span class="step-n">1</span><h3>Free assessment</h3><p>A short session to find your real level in French, even if it's zero.</p></div>
    <div class="card"><span class="step-n">2</span><h3>Your plan</h3><p>Group or private, evenings or weekends: we build a plan around your job and your permit timeline.</p></div>
    <div class="card"><span class="step-n">3</span><h3>Classes + mock exams</h3><p>Level by level, with test-style practice and mock exams until you're ready for NCLC 7.</p></div>
  </div>
</div></section>

<section class="section"><div class="wrap">
  <span class="eyebrow">Why French4PR</span>
  <h2>A coach for your French, focused on one goal</h2>
  <div class="grid grid--4 mt-2">{"".join(f'<div class="card"><div class="icon">{ICONS[i]}</div><h3>{t}</h3><p>{d}</p></div>' for i, t, d in why)}</div>
</div></section>
{testimonials}
<section class="section section--grey"><div class="wrap">
  <h2 class="center">Questions? Bonjour, we have answers.</h2>
  {faq_html(FAQ_HOME)}
  <p class="center mt-2"><a class="link-arrow" href="/faq/">See all questions</a></p>
</div></section>
{cta_band(where="home-final")}
'''
add("/", "French Classes for PR in Canada | TEF & TCF Canada Prep | French4PR",
    "Online French classes for Canadian PR, from zero to B2. Prepare for TEF Canada & TCF Canada and reach NCLC 7 for Express Entry. Free level assessment.",
    home, schema=[{"@type": "WebSite", "@id": url("/#site"), "url": url("/"), "name": "French4PR", "publisher": {"@id": url("/#org")}, "inLanguage": "en-CA"},
                  faq_ld(FAQ_HOME)],
    preload=("/assets/img/student-train-800.webp", hero_srcset, hero_sizes))

# ------------------------------------------------------------ PROGRAM -------
def course_ld(l, path):
    return {"@type": "Course", "@id": url(path + "#course"), "name": l["title"],
            "description": f'{l["tagline"]} {l["out"]}', "url": url(path),
            "provider": {"@id": url("/#org")}, "inLanguage": "fr", "educationalLevel": l["code"],
            "teaches": l["learn"], "coursePrerequisites": l["for"][0],
            "hasCourseInstance": {"@type": "CourseInstance", "courseMode": "Online", "courseWorkload": "PT3H"}}

prog = page_hero([("/", "Home"), (None, "Program")], "The French4PR program: zero to B2 in 4 steps",
                 "One path, four levels, one goal: NCLC 7 in all four skills on TEF Canada or TCF Canada. You start where you are today, and you always know the next step.",
                 ladder())
prog += f'''
<section class="section section--grey"><div class="wrap">
  <h2>What each level gets you</h2>
  <div class="grid grid--4 mt-2">{"".join(f'<div class="card"><span class="tag">{l["code"]} · {l["nclc"]}</span><h3>{l["name"]}</h3><p>{l["tagline"]}</p><p><strong>Duration:</strong> {ph(C["level_duration"])}</p><a class="link-arrow" href="/program/{l["slug"]}/">Explore {l["code"]}</a></div>' for l in LEVELS)}</div>
  <p class="source">NCLC values are indicative targets, not a guarantee. Your official level comes only from TEF Canada or TCF Canada results.</p>
</div></section>
<section class="section"><div class="wrap split">
  <div>
    <h2>Two formats, same path</h2>
    <h3>Small group classes</h3>
    <p>Learn in a group of 5 to 8 future permanent residents, all on the same goal. Evenings and weekends. The most affordable way to progress, from $239/month.</p>
    <h3>Private classes</h3>
    <p>One-on-one, at your pace, on your schedule. Ideal if your permit expires soon or your test date is already booked.</p>
    <p><a class="link-arrow" href="/pricing/">See pricing</a></p>
  </div>
  <img src="/assets/img/class-group-1000.webp" srcset="/assets/img/class-group-640.webp 640w, /assets/img/class-group-1000.webp 1000w, /assets/img/class-group-1312.webp 1312w" sizes="(min-width:900px) 540px, 100vw" width="1000" height="914" loading="lazy" alt="Adult learners in a small French class practising useful everyday phrases">
</div></section>
<section class="section section--grey"><div class="wrap">
  <h2>What a typical class looks like</h2>
  <div class="grid grid--4 mt-2">
    <div class="card"><div class="icon">{ICONS["mic"]}</div><h3>Warm-up</h3><p>Short speaking round on a real-life topic. Everyone talks.</p></div>
    <div class="card"><div class="icon">{ICONS["book"]}</div><h3>New skill</h3><p>One clear grammar or vocabulary point, explained in English when needed.</p></div>
    <div class="card"><div class="icon">{ICONS["ear"]}</div><h3>Practice</h3><p>Listening, reading and writing tasks modelled on the test.</p></div>
    <div class="card"><div class="icon">{ICONS["pen"]}</div><h3>Feedback</h3><p>Personal corrections and homework to keep progressing between classes.</p></div>
  </div>
</div></section>
{cta_band(title="Which level are you?", text="Don't guess. Your free assessment places you on the right step and tells you how long the path will take.", where="program")}'''
add("/program/", "French Program for Canadian PR: A1 to B2 + TEF/TCF Prep | French4PR",
    "A 4-step online French program from A1 to B2 for Canadian PR. Small groups, evening and weekend classes, and TEF Canada / TCF Canada preparation to reach NCLC 7.",
    prog, schema=[crumbs_ld([("/", "Home"), (None, "Program")], "/program/"),
                  {"@type": "ItemList", "name": "French4PR program levels", "itemListElement": [{"@type": "ListItem", "position": i + 1, "item": course_ld(l, f"/program/{l['slug']}/")} for i, l in enumerate(LEVELS)]}])

for i, l in enumerate(LEVELS):
    path = f"/program/{l['slug']}/"
    nxt = LEVELS[i + 1] if i + 1 < len(LEVELS) else None
    nxt_html = (f'<div class="card card--featured"><span class="tag">Next step</span><h3>{nxt["title"]}</h3><p>{nxt["tagline"]}</p><a class="link-arrow" href="/program/{nxt["slug"]}/">Go to {nxt["code"]}</a></div>'
                if nxt else '<div class="card card--featured"><span class="tag">Final step</span><h3>Your TEF or TCF Canada test</h3><p>After B2, you take the official test and add your results to your Express Entry profile.</p><a class="link-arrow" href="/tef-tcf/">Read the test guide</a></div>')
    items = [("/", "Home"), ("/program/", "Program"), (None, l["code"])]
    b = page_hero(items, l["title"], f'{l["tagline"]} Target: <strong>{l["nclc"]}</strong>.',
                  f'<ul class="pills"><li class="pill">Duration: {ph(C["level_duration"])}</li><li class="pill">Online · group or private</li><li class="pill{" pill--goal" if l["code"]=="B2" else ""}">{l["nclc"]}</li></ul>' + ladder(active=l["code"], captions=False))
    b += f'''
<section class="section"><div class="wrap grid grid--2">
  <div><h2>Is {l["code"]} for you?</h2><ul class="keylist">{"".join(f"<li>{x}</li>" for x in l["for"])}</ul></div>
  <div><h2>What you'll learn</h2><ul class="keylist">{"".join(f"<li>{x}</li>" for x in l["learn"])}</ul></div>
</div></section>
<section class="section section--grey"><div class="wrap">
  <h2>At the end of {l["code"]}, you can…</h2>
  <div class="grid grid--4 mt-2">{"".join(f'<div class="card"><p class="mb-0"><strong>{x}</strong></p></div>' for x in l["can"])}</div>
</div></section>
<section class="section"><div class="wrap grid grid--2">
  <div><h2>Format &amp; duration</h2><p><strong>Duration:</strong> {ph(C["level_duration"])} per level, depending on your rhythm.</p><p><strong>Formats:</strong> small group (evenings / weekends) or private classes, 100% online.</p><p><strong>Price:</strong> see <a href="/pricing/">pricing</a>.</p></div>
  {nxt_html}
</div></section>
{cta_band(title=f"Not sure you're ready for {l['code']}?", text="Your free assessment tells you exactly where to start, so you don't waste weeks on the wrong level.", where=f"level-{l['slug']}")}'''
    seo_titles = {
        "A1": ("Beginner French Classes Online (A1) for Canadian PR | French4PR", "Start French from zero with online A1 beginner classes built for Canadian PR. Evening and weekend small groups, first step toward NCLC 7 and TEF/TCF Canada."),
        "A2": ("A2 Elementary French Classes Online | Path to NCLC 7 | French4PR", "Online A2 French classes for future permanent residents: past tenses, everyday conversations, short emails. Step 2 on the path to NCLC 7."),
        "B1": ("B1 Intermediate French Classes Online | TEF/TCF Canada Path | French4PR", "Online B1 French classes: opinions, longer texts and first TEF/TCF Canada-style practice. Step 3 toward NCLC 7 for Express Entry."),
        "B2": ("B2 French + TEF Canada & TCF Canada Preparation Online | French4PR", "Online B2 French and TEF Canada / TCF Canada preparation to target NCLC 7 in all 4 skills. Mock exams, exam strategy and personal feedback."),
    }
    t, d = seo_titles[l["code"]]
    add(path, t, d, b, schema=[crumbs_ld(items, path), course_ld(l, path)])

# ------------------------------------------------------------ TEF / TCF -----
tef_items = [("/", "Home"), (None, "TEF & TCF Canada")]
tef = page_hero(tef_items, "TEF Canada &amp; TCF Canada: the French tests for Express Entry",
                "Both tests are accepted by IRCC for permanent residence. To qualify for most French-language Express Entry draws, you need <strong>NCLC 7 or higher in all four skills</strong>. Here's what that means.",
                '<ul class="pills"><li class="pill">TEF Canada</li><li class="pill">TCF Canada</li><li class="pill pill--goal">Objective: NCLC 7</li></ul>')
tef += f'''
<section class="section"><div class="wrap">
  <h2>The 4 skills you are tested on</h2>
  <p class="lead">Each skill gets its own NCLC level. Your weakest skill decides whether you reach NCLC 7 "in all four", so we train all of them.</p>
  <div class="grid grid--4 mt-2">
    <div class="card"><div class="icon">{ICONS["ear"]}</div><h3>Listening</h3><p>Compréhension orale: understand conversations, announcements, interviews.</p></div>
    <div class="card"><div class="icon">{ICONS["book"]}</div><h3>Reading</h3><p>Compréhension écrite: understand messages, articles and documents.</p></div>
    <div class="card"><div class="icon">{ICONS["pen"]}</div><h3>Writing</h3><p>Expression écrite: write messages, stories and argued texts.</p></div>
    <div class="card"><div class="icon">{ICONS["mic"]}</div><h3>Speaking</h3><p>Expression orale: get information, convince and debate with an examiner.</p></div>
  </div>
</div></section>
<section class="section section--grey"><div class="wrap">
  <h2>Minimum scores for NCLC 7</h2>
  <p class="lead">These are the minimum scores IRCC converts to NCLC 7 for each skill.</p>
  <div class="table-wrap"><table>
    <caption class="skip">Minimum TEF Canada and TCF Canada scores for NCLC 7</caption>
    <thead><tr><th scope="col">Skill</th><th scope="col">TEF Canada*</th><th scope="col">TCF Canada</th></tr></thead>
    <tbody>
      <tr><th scope="row">Listening</th><td class="hl">249</td><td class="hl">458</td></tr>
      <tr><th scope="row">Reading</th><td class="hl">207</td><td class="hl">453</td></tr>
      <tr><th scope="row">Writing</th><td class="hl">310</td><td class="hl">10 / 20</td></tr>
      <tr><th scope="row">Speaking</th><td class="hl">310</td><td class="hl">10 / 20</td></tr>
    </tbody>
  </table></div>
  <p class="source">* TEF Canada: IRCC uses the "former equivalence score" (équivalence ancien score) shown on your results, not the score out of 699. Always confirm on the official <a href="https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/operational-bulletins-manuals/standard-requirements/language-requirements/test-equivalency-charts.html" rel="noopener" target="_blank">IRCC language test equivalency charts</a>. Last checked {D["checked"]}.</p>
</div></section>
<section class="section"><div class="wrap">
  <h2>TEF or TCF Canada: which one should you take?</h2>
  <div class="table-wrap mt-2"><table>
    <thead><tr><th scope="col"></th><th scope="col">TEF Canada</th><th scope="col">TCF Canada</th></tr></thead>
    <tbody>
      <tr><th scope="row">Run by</th><td>Le français des affaires (CCI Paris Île-de-France)</td><td>France Éducation international</td></tr>
      <tr><th scope="row">Accepted for Express Entry</th><td>Yes</td><td>Yes</td></tr>
      <tr><th scope="row">Results scale</th><td>Scores per skill, converted to NCLC</td><td>Scores per skill (writing &amp; speaking out of 20), converted to NCLC</td></tr>
      <tr><th scope="row">Validity for IRCC</th><td>2 years</td><td>2 years</td></tr>
      <tr><th scope="row">Best if…</th><td>Test dates and centres near you suit your timeline</td><td>Test dates and centres near you suit your timeline</td></tr>
    </tbody>
  </table></div>
  <p class="mt-2">Both tests lead to the same NCLC levels, and IRCC treats them the same. The real differences are the format of each task, the test dates available near you, and which format suits your strengths. We help you choose during your assessment and train you on the format you pick.</p>
</div></section>
<section class="section section--grey"><div class="wrap grid grid--2">
  <div><h2>How to register for the test</h2>
    <ul class="keylist">
      <li>Find a TEF Canada centre on the <a href="https://www.lefrancaisdesaffaires.fr/" rel="noopener" target="_blank">Le français des affaires</a> website.</li>
      <li>Find a TCF Canada centre on the <a href="https://www.france-education-international.fr/" rel="noopener" target="_blank">France Éducation international</a> website.</li>
      <li>Read the official <a href="https://www.canada.ca/en/immigration-refugees-citizenship/services/immigrate-canada/express-entry/documents/language-requirements/language-testing.html" rel="noopener" target="_blank">IRCC language test requirements</a>.</li>
      <li>Book early: popular centres in the Greater Toronto Area fill up weeks ahead.</li>
    </ul></div>
  <div class="note"><p><strong>Remember:</strong> French4PR prepares you for the test. We are not a test centre and we don't give immigration advice. For your Express Entry strategy, talk to a licensed consultant (RCIC) or lawyer.</p></div>
</div></section>
{cta_band(title="How far are you from NCLC 7?", text="Find out in one free session: your current level, the skills to work on, and a realistic timeline.", where="tef-tcf")}'''
add("/tef-tcf/", "TEF Canada vs TCF Canada: NCLC 7 Score Chart & Prep | French4PR",
    "TEF Canada and TCF Canada explained: the 4 skills, minimum scores for NCLC 7, which test to choose for Express Entry, and how to register.",
    tef, schema=[crumbs_ld(tef_items, "/tef-tcf/")])

# ------------------------------------------------------------- PRICING ------
pr_items = [("/", "Home"), (None, "Pricing")]
PLANS = C["plans"]
def plan_card(p):
    feat = " card--featured" if p.get("featured") else ""
    tag = f'<span class="tag">{p["tag"]}</span>' if p.get("tag") else '<span class="tag" aria-hidden="true" style="visibility:hidden">&nbsp;</span>'
    return f'''<div class="card plan{feat}">{tag}<h3>{p["name"]}</h3>
<p class="price">${p["price"]} <small>/ month</small></p><p class="price-note">Billed monthly · CAD</p>
<dl class="plan-stats"><div><dt>Classes / month</dt><dd>{p["classes"]}</dd></div><div><dt>Est. time to B2*</dt><dd>{p["time_to_b2"]}</dd></div></dl>
<ul class="keylist">{"".join(f"<li>{x}</li>" for x in p["features"])}</ul></div>'''
cards = "".join(plan_card(p) for p in PLANS)
pricing = page_hero(pr_items, "Simple, transparent pricing", "Clear monthly prices, no surprises. Same goal for every plan: A1 to B2 and NCLC 7. Your plan is confirmed after your free assessment.")
pricing += f'''
<section class="section section--grey"><div class="wrap"><div class="grid grid--3">{cards}</div>
<p class="source">Prices in CAD, taxes extra if applicable. * Estimated time from zero to B2. It depends on your starting level (your free assessment tells you) and on your practice between classes.</p></div></section>
<section class="section"><div class="wrap">{faq_html([FAQ_ALL[1][1][3], FAQ_ALL[3][1][0], FAQ_ALL[2][1][1]])}</div></section>
{cta_band(title="Not sure which plan fits?", text="Start with the free assessment. We'll recommend the format that fits your level, your schedule and your timeline.", where="pricing")}'''
add("/pricing/", "French Class Prices for PR | Group & Private Classes from $239 | French4PR",
    "Online French classes for Canadian PR from $239/month: small groups of 5 to 8, private 1:1 or fast-track classes, A1 to B2 and TEF/TCF Canada prep. Free assessment.",
    pricing,
    schema=[crumbs_ld(pr_items, "/pricing/")])

# ------------------------------------------------------- FREE ASSESSMENT ----
fa_items = [("/", "Home"), (None, "Free Assessment")]
opt = lambda xs: "".join(f'<option value="{v}">{t}</option>' for v, t in xs)
assess = f'''
<section class="page-hero"><div class="wrap split">
  <div>
    {crumbs(fa_items)}
    <h1>Free French Assessment</h1>
    <p class="lead">Know your level and your path to NCLC 7. Free, no obligation.</p>
    <div class="benefits">
      <div class="benefit"><span class="step-n">1</span><div><strong>Your current level</strong><br>From zero to B2: where you really are today.</div></div>
      <div class="benefit"><span class="step-n">2</span><div><strong>Your time to B2</strong><br>A realistic estimate based on your schedule.</div></div>
      <div class="benefit"><span class="step-n">3</span><div><strong>Your recommended plan</strong><br>Group or private, and which level to start with.</div></div>
    </div>
    <p class="note mb-0"><strong>How it works:</strong> {ph(C["assessment_format"])}. Fill in the form (2 short steps), then pick a time in the calendar.</p>
  </div>
  <div id="assessment" class="form-card">
    <div class="progress" aria-hidden="true"><span class="on"></span><span></span><span></span></div>
    <form id="assessment-form" novalidate>
      <input type="hidden" name="form" value="free-assessment">
      <input type="hidden" name="_subject" value="New free assessment request – French4PR">
      <input type="hidden" name="_template" value="table"><input type="hidden" name="_captcha" value="false">
      <div class="hp" aria-hidden="true"><label>Leave empty <input type="text" name="_honey" tabindex="-1" autocomplete="off"></label></div>
      <div data-step="1">
        <p class="step-label">Step 1 of 3 · About you</p>
        <h2 class="mt-0" style="font-size:1.5rem">Bonjour! Let's get to know you</h2>
        <div class="fields">
          <div class="field"><label for="f-name">First and last name</label><input id="f-name" name="name" type="text" autocomplete="name" required></div>
          <div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" autocomplete="email" required></div>
          <div class="field"><label for="f-phone">Phone / WhatsApp</label><input id="f-phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required></div>
          <div class="field"><label for="f-city">City</label><input id="f-city" name="city" type="text" autocomplete="address-level2" placeholder="e.g. Brampton" required></div>
        </div>
        <div class="form-nav"><span></span><button type="button" class="btn btn--red" data-next>Continue</button></div>
      </div>
      <div data-step="2" hidden>
        <p class="step-label">Step 2 of 3 · Your goal</p>
        <h2 class="mt-0" style="font-size:1.5rem">Your situation and your French</h2>
        <div class="fields fields--2">
          <div class="field"><label for="f-status">Current status</label><select id="f-status" name="status" required><option value="">Choose…</option>{opt([("work-permit","Work permit"),("pgwp","PGWP"),("study-permit","Study permit"),("other","Other")])}</select></div>
          <div class="field"><label for="f-expiry">Permit expiry <span class="opt">(optional)</span></label><input id="f-expiry" name="permit_expiry" type="month"></div>
          <div class="field"><label for="f-level">Your French today</label><select id="f-level" name="level" required><option value="">Choose…</option>{opt([("zero","Zero / beginner"),("A1","A1"),("A2","A2"),("B1","B1"),("B2","B2")])}</select></div>
          <div class="field"><label for="f-format">Preferred format <span class="opt">(optional)</span></label><select id="f-format" name="format"><option value="">Choose…</option>{opt([("group","Group"),("private","Private"),("unsure","Not sure yet")])}</select></div>
        </div>
        <div class="fields mt-2">
          <div class="field"><fieldset><legend>Availability <span class="opt">(optional)</span></legend><div class="checks">
            <label><input type="checkbox" name="availability" value="weekday-evenings">Weekday evenings</label>
            <label><input type="checkbox" name="availability" value="weekends">Weekends</label>
            <label><input type="checkbox" name="availability" value="daytime">Daytime</label></div></fieldset></div>
          <div class="field"><label for="f-source">How did you hear about us? <span class="opt">(optional)</span></label><select id="f-source" name="source"><option value="">Choose…</option>{opt([("instagram","Instagram"),("facebook","Facebook"),("friend","A friend"),("google","Google"),("consultant","Immigration consultant"),("other","Other")])}</select></div>
          <div class="field"><label class="consent"><input type="checkbox" name="consent" value="yes" required><span>I agree that French4PR may contact me by email and WhatsApp about my assessment and classes. I can unsubscribe at any time. See our <a href="/privacy/">Privacy Policy</a>.</span></label></div>
        </div>
        <div class="form-nav"><button type="button" class="btn btn--ghost" data-back>Back</button><button type="submit" class="btn btn--red">Choose my time slot</button></div>
      </div>
    </form>
    <div id="step-calendar" hidden>
      <p class="step-label">Step 3 of 3 · Book your slot</p>
      <h2 class="mt-0" style="font-size:1.5rem">Merci! Now pick a time that works for you</h2>
      <div id="calendar-embed" class="calendar-embed"><p class="note">{ph("[Calendar placeholder: add your Calendly link in build.py → calendly_url]")}<br>Prefer to book by message? <a href="{wa_link("Bonjour! I just filled in the free assessment form. I'd like to book my slot.")}" target="_blank" rel="noopener">Message us on WhatsApp</a>.</p></div>
    </div>
  </div>
</div></section>
<section class="section section--grey"><div class="wrap">
  <h2 class="center">After you book</h2>
  <div class="grid grid--4 mt-2">
    <div class="card"><h3>Confirmation</h3><p>You get a confirmation by email and WhatsApp right away.</p></div>
    <div class="card"><h3>Reminders</h3><p>We remind you 24 hours and 1 hour before your session.</p></div>
    <div class="card"><h3>Your assessment</h3><p>A friendly session. No stress: it's not a test you can fail.</p></div>
    <div class="card"><h3>Your plan</h3><p>By email: your level, your plan to B2 and your sign-up link.</p></div>
  </div>
  <p class="center source">French4PR provides French language training only. We do not provide immigration advice.</p>
</div></section>'''
add("/free-assessment/", "Free French Level Assessment for Canadian PR | French4PR",
    "Book your free French assessment: find your level, your time to reach B2 / NCLC 7, and the best plan for TEF Canada or TCF Canada. No obligation.",
    assess, schema=[crumbs_ld(fa_items, "/free-assessment/"),
                    {"@type": "Service", "name": "Free French level assessment", "provider": {"@id": url("/#org")}, "areaServed": "CA",
                     "offers": {"@type": "Offer", "price": "0", "priceCurrency": "CAD"}}])

ty = f'''<section class="section"><div class="wrap center">
  <div class="mini-ladder" aria-hidden="true" style="justify-content:center;margin:0 auto 20px"><i></i><i></i><i></i><i></i></div>
  <h1>C'est parti! Your assessment is booked.</h1>
  <p class="lead">Check your email and WhatsApp for your confirmation. We'll remind you 24 hours and 1 hour before.</p>
  <p>While you wait, see where your path goes:</p>
  <div class="btn-row" style="justify-content:center"><a class="btn btn--ghost" href="/program/">See the program</a><a class="btn btn--ghost" href="/tef-tcf/">TEF &amp; TCF guide</a></div>
</div></section>
<script>try{{if(window.gtag)gtag('event','assessment_booked_thankyou');}}catch(e){{}}</script>'''
add("/free-assessment/thank-you/", "Assessment booked | French4PR", "Your free French assessment is booked.", ty, noindex=True)

# --------------------------------------------------------------- ABOUT ------
ab_items = [("/", "Home"), (None, "About")]
about = page_hero(ab_items, "Bonjour, I'm your French coach", "French4PR exists for one reason: to help people who already built their life in Canada reach the French level that opens the door to PR.")
about += f'''
<section class="section"><div class="wrap split">
  <div class="prose">
    <h2>Why I created French4PR</h2>
    <p>{ph("[Write in the first person: who you are, where you're from, how you started teaching French, and the moment you saw that French could change an immigrant's path to PR.]")}</p>
    <p>I meet the same story every week: you work hard, you pay taxes, your CRS is just below the cut-off, and your permit is running out. French is a real second chance, but only with a clear plan and a teacher who keeps you on track.</p>
    <h2>My background</h2>
    <ul class="keylist"><li>{ph("[Degree(s) in French / teaching French as a foreign language (FLE)]")}</li><li>{ph("[Years of experience, types of learners]")}</li><li>{ph("[Experience with TEF/TCF preparation]")}</li></ul>
  </div>
  <div><img src="/assets/img/class-group-1000.webp" srcset="/assets/img/class-group-640.webp 640w, /assets/img/class-group-1000.webp 1000w" sizes="(min-width:900px) 540px, 100vw" width="1000" height="914" loading="lazy" alt="Small group of adult learners in a French class">
  <p class="source">{ph("[Replace with a real photo of the teacher and students.]")}</p></div>
</div></section>
<section class="section section--grey"><div class="wrap">
  <h2>The method</h2>
  <div class="grid grid--3 mt-2">
    <div class="card"><div class="icon">{ICONS["target"]}</div><h3>One goal, visible</h3><p>NCLC 7 in all four skills. Every class connects to that goal, and you always know which step you're on.</p></div>
    <div class="card"><div class="icon">{ICONS["mic"]}</div><h3>Speak from day one</h3><p>Small groups mean real speaking time. English is used to explain, French is used to practise.</p></div>
    <div class="card"><div class="icon">{ICONS["laptop"]}</div><h3>Built for your life</h3><p>Online, evenings and weekends, so classes fit around shifts, jobs and family.</p></div>
  </div>
</div></section>
{cta_band(title="Let's start with where you are", text="Book your free assessment and let's build your path to NCLC 7 together. Allez!", where="about")}'''
add("/about/", "About French4PR | Your French Coach for Canadian PR",
    "Meet the teacher behind French4PR and the method: small online groups, a clear A1→B2 path and TEF/TCF Canada training built for immigrants aiming for PR.",
    about, schema=[crumbs_ld(ab_items, "/about/"), {"@type": "AboutPage", "url": url("/about/"), "about": {"@id": url("/#org")}}])

# ----------------------------------------------------------------- FAQ ------
fq_items = [("/", "Home"), (None, "FAQ")]
faq_body = page_hero(fq_items, "Frequently asked questions", "Everything you want to know about our classes, the TEF/TCF Canada tests and how French can help your Express Entry profile.")
faq_body += '<section class="section section--grey"><div class="wrap">' + "".join(f'<div class="faq-group"><h2>{g}</h2>{faq_html(qs)}</div>' for g, qs in FAQ_ALL) + "</div></section>"
faq_body += cta_band(title="Still have a question?", text="The fastest way to get answers about your own situation is the free assessment. Or write to us on WhatsApp.", where="faq")
add("/faq/", "FAQ: French Classes for PR, NCLC 7, TEF & TCF Canada | French4PR",
    "Answers about French classes for Canadian PR: how long to reach NCLC 7, TEF vs TCF Canada, schedules, group sizes, prices, and what we do (and don't) promise.",
    faq_body, schema=[crumbs_ld(fq_items, "/faq/"), faq_ld([p for _, qs in FAQ_ALL for p in qs])])

# ------------------------------------------------------------- CONTACT ------
ct_items = [("/", "Home"), (None, "Contact")]
contact = page_hero(ct_items, "Contact us", "Questions about classes, schedules or prices? WhatsApp is the fastest way to reach us, or send us a message with the form.")
contact += f'''
<section class="section"><div class="wrap grid grid--2">
  <div>
    <a class="btn btn--wa btn--lg" href="{wa_link()}" target="_blank" rel="noopener">{WA_SVG.replace('<svg ', '<svg style="width:24px;height:24px;fill:#fff" ')} Chat on WhatsApp</a>
    <h2 class="mt-2" style="font-size:1.4rem">Other ways to reach us</h2>
    <p><strong>WhatsApp:</strong> {ph(C["whatsapp_display"])}<br>{f'<strong>Email:</strong> <a href="mailto:{esc(C["email"])}">{C["email"]}</a><br>' if C["show_email"] else ""}<strong>Hours:</strong> {ph(C["reply_hours"])}</p>
    <p><strong>Want to know your level?</strong> Skip the back-and-forth: <a href="/free-assessment/">book your free assessment</a>.</p>
  </div>
  <div class="form-card">
    <form id="contact-form">
      <input type="hidden" name="form" value="contact">
      <input type="hidden" name="_subject" value="New contact message – French4PR">
      <input type="hidden" name="_template" value="table"><input type="hidden" name="_captcha" value="false">
      <div class="fields">
        <div class="field"><label for="c-name">Name</label><input id="c-name" name="name" type="text" autocomplete="name" required></div>
        <div class="field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="c-msg">Your message</label><textarea id="c-msg" name="message" required></textarea></div>
        <div class="field"><label class="consent"><input type="checkbox" name="consent" value="yes" required><span>I agree that French4PR may reply to me by email or WhatsApp. See our <a href="/privacy/">Privacy Policy</a>.</span></label></div>
      </div>
      <div class="form-nav"><button type="submit" class="btn btn--ghost">Send message</button></div>
    </form>
    <div id="contact-ok" hidden><h3>Merci! Message received.</h3><p>We'll get back to you within 24 hours.</p></div>
  </div>
</div></section>'''
add("/contact/", "Contact French4PR | WhatsApp & Email",
    "Contact French4PR about online French classes for Canadian PR and TEF/TCF Canada preparation. Message us on WhatsApp or email.",
    contact, schema=[crumbs_ld(ct_items, "/contact/"), {"@type": "ContactPage", "url": url("/contact/")}])

# --------------------------------------------------------------- LEGAL ------
legal_note = '<p class="note">' + ph("[Draft template. Have it reviewed by a Canadian lawyer before launch.]") + "</p>"
privacy = page_hero([("/", "Home"), (None, "Privacy Policy")], "Privacy Policy", f"Last updated: {TODAY}")
privacy += f'''<section class="section"><div class="wrap prose">{legal_note}
<h2>Who we are</h2><p>French4PR ("we", "us") offers online French language training. Contact: our <a href="/contact/">contact page</a> or WhatsApp.</p>
<h2>What we collect</h2><p>When you fill in our assessment or contact forms, we collect your name, email, phone/WhatsApp number, city, immigration status category, permit expiry month (optional), French level, preferences and how you heard about us. We also collect technical data through cookies and analytics tools (Google Analytics, Meta Pixel).</p>
<h2>Why we collect it</h2><ul><li>To schedule and run your free assessment and your classes;</li><li>To contact you by email or WhatsApp about your assessment and our classes, with your consent;</li><li>To prioritize appointments (for example, when a permit expires soon);</li><li>To measure and improve our website and advertising.</li></ul>
<h2>Consent and withdrawal</h2><p>We collect, use and disclose personal information with your consent, in line with the Personal Information Protection and Electronic Documents Act (PIPEDA). You can withdraw consent or unsubscribe from our messages at any time by replying "STOP" or writing to our <a href="/contact/">contact page</a>, in accordance with Canada's Anti-Spam Legislation (CASL).</p>
<h2>Sharing</h2><p>We never sell your information. We use service providers to run this website, forms, scheduling (e.g. Calendly), messaging (WhatsApp) and analytics. These providers may store data outside Canada.</p>
<h2>Retention and security</h2><p>We keep your information only as long as needed for the purposes above, and we protect it with reasonable safeguards.</p>
<h2>Your rights</h2><p>You can ask to access or correct your personal information, or to have it deleted, by writing to our <a href="/contact/">contact page</a>.</p>
</div></section>'''
add("/privacy/", "Privacy Policy | French4PR", "How French4PR collects, uses and protects your personal information (PIPEDA, CASL).", privacy, schema=[])
terms = page_hero([("/", "Home"), (None, "Terms")], "Terms of Use", f"Last updated: {TODAY}")
terms += f'''<section class="section"><div class="wrap prose">{legal_note}
<h2>Our service</h2><p>French4PR provides French language training only. <strong>We do not provide immigration advice</strong>, and we are not affiliated with Immigration, Refugees and Citizenship Canada (IRCC), TEF Canada or TCF Canada.</p>
<h2>No guarantee</h2><p>We do not guarantee permanent residence, an invitation to apply, or any test score. Results depend on each learner's work, starting level and the test itself. Express Entry information on this site is general, may change, and should be checked on official IRCC sources.</p>
<h2>Bookings, payments and cancellations</h2><p>{ph("[Payment terms, cancellation and refund policy, missed classes policy.]")}</p>
<h2>Website content</h2><p>All content on this site belongs to French4PR and may not be copied without permission.</p>
<h2>Contact</h2><p>our <a href="/contact/">contact page</a></p>
</div></section>'''
add("/terms/", "Terms of Use | French4PR", "Terms of use for French4PR's French language training services.", terms, schema=[])

nf = '''<section class="section"><div class="wrap center"><h1>Oups! Page not found.</h1><p class="lead">This page doesn't exist, but your path to NCLC 7 does.</p>
<div class="btn-row" style="justify-content:center"><a class="btn btn--red" href="/free-assessment/">Get my free assessment</a><a class="link-arrow" href="/">Back to home</a></div></div></section>'''
add("/404/", "Page not found | French4PR", "Page not found.", nf, noindex=True)

# --------------------------------------------------------------- WRITE ------
for path, content in PAGES.items():
    if path == "/404/":
        fp = os.path.join(OUT, "404.html")
    else:
        d = os.path.join(OUT, path.strip("/"))
        os.makedirs(d, exist_ok=True)
        fp = os.path.join(d, "index.html")
    with open(fp, "w", encoding="utf-8") as f:
        f.write(content)

priority = {"/": "1.0", "/free-assessment/": "0.9", "/program/": "0.9", "/tef-tcf/": "0.9"}
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
for p in PAGES:
    if p in ("/404/", "/free-assessment/thank-you/"):
        continue
    sm.append(f"  <url><loc>{url(p)}</loc><lastmod>{TODAY}</lastmod><priority>{priority.get(p, '0.6' if p in ('/privacy/', '/terms/') else '0.8')}</priority></url>")
sm.append("</urlset>")
open(os.path.join(OUT, "sitemap.xml"), "w").write("\n".join(sm))
open(os.path.join(OUT, "robots.txt"), "w").write(f"User-agent: *\nAllow: /\nDisallow: /free-assessment/thank-you/\n\nSitemap: {url('/sitemap.xml')}\n")
open(os.path.join(OUT, "site.webmanifest"), "w").write(json.dumps({
    "name": "French4PR", "short_name": "French4PR", "start_url": "/", "display": "browser", "background_color": "#FFFFFF", "theme_color": "#12213F",
    "icons": [{"src": "/assets/img/icon-192.png", "sizes": "192x192", "type": "image/png"}, {"src": "/assets/img/icon-512.png", "sizes": "512x512", "type": "image/png"}]}))
print(f"Built {len(PAGES)} pages into {OUT}")
