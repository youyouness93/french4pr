# French4PR — static website

- `build.py`: all the content and the **CONFIG** block (prices, WhatsApp, email, Calendly, form endpoint, GA4, Meta Pixel, draw figures, durations). Edit it, then run `python3 build.py`.
- `site/`: the finished site. Upload it as is to Netlify / Cloudflare Pages / Vercel / any host. `404.html`, `sitemap.xml`, `robots.txt` included.
- Anything shown on a **yellow background** on the site is a placeholder `[...]` still to fill in.
- Testimonials: hidden until `show_testimonials = True` with real testimonials.
- Conversions: `generate_lead` (form sent), `assessment_booked` (Calendly slot booked → GA4 + Meta "Schedule"), `whatsapp_click`, `cta_click`.
- Local preview: `cd site && python3 -m http.server 8000` → http://localhost:8000
