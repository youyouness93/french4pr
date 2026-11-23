/* French4PR — site script (no dependencies) */
(function () {
  var CFG = window.F4PR || {};

  /* Mobile menu */
  var burger = document.querySelector('.burger');
  var mnav = document.getElementById('mobile-nav');
  if (burger && mnav) {
    burger.addEventListener('click', function () {
      var open = mnav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* FormData -> JSON (multi-value fields like availability are joined) */
  function toJSON(fd) {
    var o = {};
    fd.forEach(function (v, k) { o[k] = o[k] ? o[k] + ', ' + v : v; });
    return JSON.stringify(o);
  }

  /* Analytics helpers: safe no-ops until GA4 / Meta Pixel IDs are set */
  function track(gaEvent, gaParams, fbEvent) {
    try { if (window.gtag) window.gtag('event', gaEvent, gaParams || {}); } catch (e) {}
    try { if (window.fbq && fbEvent) window.fbq('track', fbEvent); } catch (e) {}
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a');
    if (!a) return;
    if (a.matches('[data-cta]')) track('cta_click', { location: a.getAttribute('data-cta') });
    if (a.href && a.href.indexOf('wa.me') > -1) track('whatsapp_click', {}, 'Contact');
  });

  /* Free assessment: 2-step form -> calendar -> thank-you */
  var form = document.getElementById('assessment-form');
  if (form) {
    var steps = form.querySelectorAll('[data-step]');
    var bars = document.querySelectorAll('.progress span');
    var current = 1;

    function show(n) {
      current = n;
      steps.forEach(function (s) { s.hidden = +s.getAttribute('data-step') !== n; });
      bars.forEach(function (b, i) { b.classList.toggle('on', i < n); });
      var first = form.querySelector('[data-step="' + n + '"] input, [data-step="' + n + '"] select');
      document.getElementById('assessment').scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (first) setTimeout(function () { first.focus({ preventScroll: true }); }, 350);
    }

    function validate(n) {
      var ok = true;
      form.querySelectorAll('[data-step="' + n + '"] [required]').forEach(function (el) {
        var f = el.closest('.field') || el.parentNode;
        var err = f.querySelector('.error');
        var valid = el.type === 'checkbox' ? el.checked : el.checkValidity() && el.value.trim() !== '';
        f.classList.toggle('invalid', !valid);
        if (!valid) {
          ok = false;
          if (!err) { err = document.createElement('p'); err.className = 'error'; f.appendChild(err); }
          err.textContent = el.type === 'email' ? 'Please enter a valid email.' : el.type === 'checkbox' ? 'Please check this box to continue.' : 'This field is required.';
        } else if (err) err.remove();
      });
      if (!ok) { var bad = form.querySelector('.invalid input, .invalid select'); if (bad) bad.focus(); }
      return ok;
    }

    form.querySelector('[data-next]').addEventListener('click', function () {
      if (validate(1)) { show(2); track('assessment_step_1_complete'); }
    });
    form.querySelector('[data-back]').addEventListener('click', function () { show(1); });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(2)) return;
      if (form.querySelector('.hp input').value) return; // spam honeypot
      var btn = form.querySelector('[type=submit]');
      btn.disabled = true; btn.textContent = 'Sending…';
      var data = new FormData(form);
      var done = function () { track('generate_lead', { form: 'free_assessment' }, 'Lead'); openCalendar(data); };
      var sends = [];
      // 1) Email notification (FormSubmit)
      if (CFG.formEndpoint && CFG.formEndpoint.indexOf('http') === 0) {
        sends.push(fetch(CFG.formEndpoint, { method: 'POST', body: toJSON(data), headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }));
      }
      // 2) Member area database (Supabase): the request appears in the admin space
      if (CFG.supabaseUrl && CFG.supabaseKey) sends.push(saveRequest(data));
      // Never block the booking step, whatever happens to the requests
      Promise.all(sends.map(function (p) { return p.catch(function () {}); })).then(done);
    });

    function saveRequest(fd) {
      var month = fd.get('permit_expiry');
      var label = function (map, v) { return v ? (map[v] || v) : null; };
      var row = {
        full_name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'), city: fd.get('city'),
        immigration_status: label({ 'work-permit': 'Work permit', pgwp: 'PGWP', 'study-permit': 'Study permit', other: 'Other' }, fd.get('status')),
        permit_expiry: /^\d{4}-\d{2}$/.test(month || '') ? month + '-01' : null,
        french_level: fd.get('level') || null,
        preferred_format: label({ group: 'Group', private: 'Private', unsure: 'Not sure' }, fd.get('format')),
        availability: fd.getAll('availability').map(function (v) { return label({ 'weekday-evenings': 'Weekday evenings', weekends: 'Weekends', daytime: 'Daytime' }, v); }),
        source: label({ instagram: 'Instagram', facebook: 'Facebook', friend: 'A friend', google: 'Google', consultant: 'Immigration consultant', other: 'Other' }, fd.get('source')),
        consent: fd.get('consent') === 'yes'
      };
      return fetch(CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/assessment_requests', {
        method: 'POST',
        headers: { apikey: CFG.supabaseKey, Authorization: 'Bearer ' + CFG.supabaseKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(row)
      });
    }

    function openCalendar(data) {
      steps.forEach(function (s) { s.hidden = true; });
      bars.forEach(function (b) { b.classList.add('on'); });
      var cal = document.getElementById('step-calendar');
      cal.hidden = false;
      cal.scrollIntoView({ behavior: 'smooth', block: 'start' });
      var holder = document.getElementById('calendar-embed');
      if (!CFG.calendlyUrl || CFG.calendlyUrl.indexOf('http') !== 0) return; // placeholder shown
      var url = CFG.calendlyUrl + (CFG.calendlyUrl.indexOf('?') > -1 ? '&' : '?') +
        'hide_gdpr_banner=1&primary_color=c8102e' +
        '&name=' + encodeURIComponent(data.get('name') || '') +
        '&email=' + encodeURIComponent(data.get('email') || '') +
        '&a1=' + encodeURIComponent(data.get('phone') || '');
      holder.innerHTML = '';
      var iframe = document.createElement('iframe');
      iframe.src = url; iframe.title = 'Book your free assessment';
      iframe.style.cssText = 'width:100%;height:760px;border:0';
      holder.appendChild(iframe);
    }

    /* Calendly fires postMessage events; "event_scheduled" = conversion */
    window.addEventListener('message', function (e) {
      if (!e.data || typeof e.data.event !== 'string' || e.data.event.indexOf('calendly.') !== 0) return;
      if (e.data.event === 'calendly.event_scheduled') {
        track('assessment_booked', { value: 1, currency: 'CAD' }, 'Schedule');
        setTimeout(function () { window.location.href = '/free-assessment/thank-you/'; }, 600);
      }
    });
  }

  /* Contact form */
  var cform = document.getElementById('contact-form');
  if (cform) {
    cform.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!cform.checkValidity()) { cform.reportValidity(); return; }
      var ok = document.getElementById('contact-ok');
      var fin = function () { cform.hidden = true; ok.hidden = false; track('contact_form_submit', {}, 'Contact'); };
      if (CFG.formEndpoint && CFG.formEndpoint.indexOf('http') === 0) {
        fetch(CFG.formEndpoint, { method: 'POST', body: toJSON(new FormData(cform)), headers: { 'Content-Type': 'application/json', Accept: 'application/json' } }).then(fin).catch(fin);
      } else fin();
    });
  }
})();
