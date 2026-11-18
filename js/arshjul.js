/* ÅRSHJUL START
   Årshjulet på startsidan. Fristående modul som kan användas av både den svenska
   och den engelska sidan:
     Arshjul.html(opts)  -> HTML för sektionen (sträng)
   Händelser (klick, tangenter, kalenderexport) sköts med delegering på document,
   så modulen behöver ingen separat montering efter att vyn har ritats om.
   opts:
     lang        'sv' | 'en'
     kalender    kalenderdata ({ manader:[{ym,titel,mane,sub,ingress,sasong}], fester:[[namn,text]] })
     today       { y, m, d } (Europe/Stockholm)
     washVars    (säsong) => css-variabler för säsongsytan (valfri)
     seasons     säsongstabell { januari:[färg, mörk, accent, namn], ... } (valfri)
     icsFile     (lista) => data:-URL eller text (befintlig ICS-kod, valfri)
     hogtider    [[titel, startISO, slutISO, not], ...] för "Ta med året hem"
     fixed       namn på de fastslagna högtiderna
     href        (ym) => länk till månaden i Kalenderåret
     moonNames   tolv månadsnamn (valfri, annars standard för språket)
     strings     överstyr texter
*/
(function () {
  'use strict';
  const MN = {
    sv: ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti', 'september', 'oktober', 'november', 'december'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  };
  const MNS = {
    sv: ['jan', 'feb', 'mar', 'apr', 'maj', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  };
  const MOON = {
    sv: ['Ismånen', 'Ljusmånen', 'Savmånen', 'Grodmånen', 'Nässelmånen', 'Den ljusa månen', 'Slåttermånen', 'Bärmånen', 'Skördemånen', 'Svampmånen', 'Mörkermånen', 'Vintermånen'],
    en: ['Ice Moon', 'Light Moon', 'Sap Moon', 'Frog Moon', 'Nettle Moon', 'Bright Moon', 'Haymaking Moon', 'Berry Moon', 'Harvest Moon', 'Mushroom Moon', 'Dark Moon', 'Winter Moon']
  };
  const FIXED = {
    sv: ['Vintersolståndet', 'Kyndelsmäss', 'Valborg', 'Midsommar'],
    en: ['Winter solstice', 'Candlemas', 'Walpurgis Night', 'Midsummer']
  };
  // Säsongsfärger per månad (samma som sajtens SE-tabell): [yta, mörk yta?, accent]
  const SEASON = {
    januari: ['#1C3449', 1, '#E6B65A'], februari: ['#E4DDEB', 0, '#1F4D2E'], mars: ['#4B3646', 1, '#E6B65A'],
    april: ['#C8DCE6', 0, '#1F4D2E'], maj: ['#2C6440', 1, '#F8F2E6'], juni: ['#EBC3CC', 0, '#1F4D2E'],
    juli: ['#F2C744', 0, '#1F4D2E'], augusti: ['#2D2F5A', 1, '#E6B65A'], september: ['#8A3A26', 1, '#F8F2E6'],
    oktober: ['#CF8E2E', 0, '#1C1B17'], november: ['#4A3327', 1, '#E6B65A'], december: ['#5A2129', 1, '#E6B65A']
  };
  const T = {
    sv: {
      eyebrow: 'Årshjulet', h: 'Året på Vreta',
      intro: 'Välj en månad på hjulet. Ytan byter årstid och visar vad som händer på platsen den månaden.',
      hint: 'Med tangentbordet: Tab till hjulet, sedan piltangenterna runt året. Home och End går till januari och december.',
      group: 'Årshjulet: tolv månader. Piltangenterna byter månad.',
      today: 'i dag', todayCap: 'I dag', bookYear: 'i bokens år 2027',
      fest: 'Årsfest', fixedFest: 'Högtid', chosen: 'Vald månad',
      link: m => `${m} i Kalenderåret`,
      hemH: 'Ta med året hem',
      hemP: 'Platsens fyra högtider som kalenderfil: Vintersolståndet, Kyndelsmäss, Valborg och Midsommar. Filen skapas här på sidan.',
      hemBtn: 'Hämta högtiderna (.ics)', hemMore: 'Alla datum i Kalenderåret',
      hemFile: 'vreta-hogtider.ics', saved: f => `Kalenderfilen ${f} är hämtad. Öppna den för att lägga högtiderna i din kalender.`,
      legendFixed: 'fastslagen högtid', legendFest: 'årsfest', legendToday: 'dagens datum',
      hemHref: '#kalenderaret-hem'
    },
    en: {
      eyebrow: 'The wheel of the year', h: 'The year at Vreta',
      intro: 'Choose a month on the wheel. The panel changes season and shows what happens at the place that month.',
      hint: 'With a keyboard: Tab to the wheel, then use the arrow keys to move round the year. Home and End go to January and December.',
      group: 'The wheel of the year: twelve months. Arrow keys change month.',
      today: 'today', todayCap: 'Today', bookYear: 'in the book’s year 2027',
      fest: 'Festival', fixedFest: 'Feast day', chosen: 'Selected month',
      link: m => `${m} in the Calendar Year`,
      hemH: 'Take the year home',
      hemP: 'The four feast days of the place as a calendar file: Winter solstice, Candlemas, Walpurgis Night and Midsummer. The file is created here on the page.',
      hemBtn: 'Download the feast days (.ics)', hemMore: 'All dates in the Calendar Year',
      hemFile: 'vreta-feast-days.ics', saved: f => `The calendar file ${f} has been downloaded. Open it to add the feast days to your calendar.`,
      legendFixed: 'fixed feast day', legendFest: 'festival', legendToday: 'today’s date',
      hemHref: '../#kalenderaret-hem'
    }
  };

  const REG = {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const strip = s => String(s || '').replace(/<[^>]+>/g, '');
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  const two = n => String(n).padStart(2, '0');
  const dim = (y, m) => new Date(y, m, 0).getDate();
  const firstSentences = (s, n) => { const t = strip(s).trim(); const parts = t.match(/[^.!?]+[.!?]+(\s|$)/g) || [t]; return parts.slice(0, n).join('').trim(); };

  // Datum ur festtexten: "5–6 november", "21–26 juni", "slutet av juli", "30 April"
  const MONTHKEYS = {};
  MN.sv.forEach((m, i) => { MONTHKEYS[m.slice(0, 3)] = i + 1; });
  MN.en.forEach((m, i) => { MONTHKEYS[m.slice(0, 3).toLowerCase()] = i + 1; });
  function festDate(txt) {
    const t = strip(txt).toLowerCase();
    const r = t.match(/(\d{1,2})\s*(?:[–-]\s*\d{1,2}\s*)?([a-zåäö]{3,})/);
    if (r && MONTHKEYS[r[2].slice(0, 3)]) return { m: MONTHKEYS[r[2].slice(0, 3)], d: +r[1] };
    const w = t.match(/([a-zåäö]{3,})/g) || [];
    for (const x of w) if (MONTHKEYS[x.slice(0, 3)] && x.length >= 3 && (MN.sv.includes(x) || MN.en.map(s => s.toLowerCase()).includes(x))) {
      return { m: MONTHKEYS[x.slice(0, 3)], d: /slut|late|end/.test(t) ? 25 : /början|early|start/.test(t) ? 5 : 15, approx: 1 };
    }
    return null;
  }
  function festWhen(txt) { return strip(txt).split(/\.\s/)[0].replace(/\.$/, ''); }

  function monthFor(K, today, m) {
    const ms = (K && K.manader) || [];
    let k = ms.find(x => x.ym === `${today.y}-${two(m)}`), ur = false;
    if (!k) { k = ms.find(x => x.ym === `2027-${two(m)}`); ur = true; }
    return { k: k || null, ur, ym: k ? k.ym : `2027-${two(m)}` };
  }

  function model(o) {
    const lang = o.lang === 'en' ? 'en' : 'sv';
    const S = Object.assign({}, T[lang], o.strings || {});
    const moons = o.moonNames || MOON[lang];
    const fixed = o.fixed || FIXED[lang];
    const today = o.today || (() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() + 1, d: d.getDate() }; })();
    const fester = ((o.kalender && o.kalender.fester) || []).map(f => ({ name: strip(f[0]), text: strip(f[1]), when: festWhen(f[1]), at: festDate(f[1]), fixed: fixed.includes(strip(f[0])) })).filter(f => f.at);
    const href = o.href || (ym => (lang === 'en' ? '../' : '') + '#kalenderaret-' + ym);
    return { lang, S, moons, fixed, today, fester, href, o };
  }

  function seasonVars(o, key) {
    if (o.washVars) return o.washVars(key);
    const k = String(key || '').replace('sasong-', '').replace(/-ar2$/, '');
    const e = (o.seasons && o.seasons[k]) || SEASON[k] || SEASON.november;
    return `--g:${e[0]};--t:${e[1] ? '#F8F2E6' : '#1C1B17'};--e:${e[2]};--img:none`;
  }
  function segColor(o, i) {
    const k = MN.sv[i];
    const e = (o.seasons && o.seasons[k]) || SEASON[k];
    return { fill: e[0], ink: e[1] ? '#F8F2E6' : '#1C1B17' };
  }

  // Geometri: mitt (CX, CY), ringen mellan RI och RO
  const CX = 320, CY = 232, RO = 178, RI = 102;
  const VB_WIDE = '0 0 640 464', VB_NARROW = `${CX - 208} ${CY - 208} 416 416`;
  const narrow = () => typeof matchMedia === 'function' && matchMedia('(max-width: 640px)').matches;
  const pt = (a, r) => [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  const f1 = n => n.toFixed(1);
  const angOf = (y, m, d) => (((m - 1) + (d - 0.5) / dim(y, m)) / 12) * 2 * Math.PI - Math.PI / 2;
  function wedge(i, off) {
    const a0 = (i / 12) * 2 * Math.PI - Math.PI / 2, a1 = ((i + 1) / 12) * 2 * Math.PI - Math.PI / 2, am = (a0 + a1) / 2;
    const dx = off * Math.cos(am), dy = off * Math.sin(am);
    const P = (a, r) => { const p = pt(a, r); return `${f1(p[0] + dx)},${f1(p[1] + dy)}`; };
    return `M${P(a0, RO)} A${RO},${RO} 0 0 1 ${P(a1, RO)} L${P(a1, RI)} A${RI},${RI} 0 0 0 ${P(a0, RI)}Z`;
  }

  function labelPos(i, off) { const a = ((i + 0.5) / 12) * 2 * Math.PI - Math.PI / 2; return pt(a, (RI + RO) / 2 + off); }
  function segLabel(M, i) {
    const name = M.lang === 'en' ? MN.en[i] : MN.sv[i];
    const fs = M.fester.filter(f => f.at.m === i + 1).map(f => f.name);
    const isToday = M.today.m === i + 1;
    return `${cap(name)}, ${M.moons[i]}${isToday ? ', ' + M.S.today : ''}${fs.length ? '. ' + fs.join(', ') : ''}`;
  }

  function cardHTML(M, m) {
    const i = m - 1, S = M.S;
    const { k, ur, ym } = monthFor(M.o.kalender, M.today, m);
    const name = cap(M.lang === 'en' ? MN.en[i] : MN.sv[i]);
    let txt = k ? firstSentences(k.ingress, 2) : '';
    if (ur && M.lang === 'sv') txt = txt.replace(/\bI år\b/g, 'I bokens år 2027').replace(/\bi år\b/g, 'i bokens år 2027');
    const fs = M.fester.filter(f => f.at.m === m);
    return `<p class="aj-k"><span>${esc(name)} · ${esc(M.moons[i])}</span>${ur ? `<span class="aj-tag">${esc(S.bookYear)}</span>` : ''}</p>
      ${k && k.sub ? `<h3 class="aj-sub">${esc(strip(k.sub))}</h3>` : ''}
      ${txt ? `<p class="aj-txt">${esc(txt)}</p>` : ''}
      ${fs.map(f => `<p class="aj-fest"><span class="aj-dot${f.fixed ? ' fx' : ''}" aria-hidden="true"></span><span><b>${esc(f.name)}</b> · ${esc(f.when)}<span class="sr"> (${esc(f.fixed ? S.legendFixed : S.legendFest)})</span></span></p>`).join('')}
      <p class="aj-go"><a class="link" href="${esc(M.href(ym))}">${esc(S.link(name))} <span aria-hidden="true">→</span></a></p>`;
  }

  function svgHTML(M, sel) {
    const S = M.S, t = M.today;
    let segs = '', labels = '';
    for (let i = 0; i < 12; i++) {
      const c = segColor(M.o, i), on = i + 1 === sel;
      const lp = labelPos(i, on ? 7 : 0);
      const abbr = (M.lang === 'en' ? MNS.en : MNS.sv)[i];
      segs += `<g class="aj-seg${on ? ' on' : ''}" role="radio" tabindex="${on ? 0 : -1}" aria-checked="${on}" aria-label="${esc(segLabel(M, i))}" data-aj-m="${i + 1}">
        <path class="aj-p" d="${wedge(i, on ? 7 : 0)}" style="fill:${c.fill}"/></g>`;
      labels += `<text x="${f1(lp[0])}" y="${f1(lp[1] + 5.5)}" text-anchor="middle" class="aj-ab" style="fill:${c.ink}" data-aj-ab="${i + 1}">${abbr}</text>`;
    }
    // årsfester: prick (fastslagen) eller ring, med etikett på breda skärmar
    let fest = '';
    M.fester.forEach(f => {
      const a = angOf(t.y, f.at.m, f.at.d), p = pt(a, RO + 14), lp = pt(a, RO + 32);
      const c = Math.cos(a), anchor = Math.abs(c) < 0.28 ? 'middle' : c > 0 ? 'start' : 'end';
      const dy = Math.sin(a) > 0.7 ? 12 : Math.sin(a) < -0.7 ? -2 : 4.5;
      fest += `<circle class="aj-f${f.fixed ? ' fx' : ''}" cx="${f1(p[0])}" cy="${f1(p[1])}" r="5.5"/>`;
      fest += `<text class="aj-fl" x="${f1(lp[0])}" y="${f1(lp[1] + dy)}" text-anchor="${anchor}">${esc(f.name)}</text>`;
    });
    // dagens position
    const ta = angOf(t.y, t.m, t.d), n0 = pt(ta, RO - 7), n1 = pt(ta, RO + 10);
        const needle = `<g class="aj-now" aria-hidden="true"><line x1="${f1(n0[0])}" y1="${f1(n0[1])}" x2="${f1(n1[0])}" y2="${f1(n1[1])}" class="u"/><line x1="${f1(n0[0])}" y1="${f1(n0[1])}" x2="${f1(n1[0])}" y2="${f1(n1[1])}" class="o"/></g>`;
    const tname = (M.lang === 'en' ? MNS.en : MNS.sv)[t.m - 1];
    const centre = `<g class="aj-c" aria-hidden="true"><circle cx="${CX}" cy="${CY}" r="${RI - 7}" class="aj-cd"/>
      <text x="${CX}" y="${CY - 10}" text-anchor="middle" class="aj-cm" data-aj-cm>${esc(M.moons[sel - 1])}</text>
      <text x="${CX}" y="${CY + 14}" text-anchor="middle" class="aj-cn" data-aj-cn>${esc((M.lang === 'en' ? MN.en : MN.sv)[sel - 1].toUpperCase())}</text>
      <text x="${CX}" y="${CY + 38}" text-anchor="middle" class="aj-ct">${esc(S.todayCap)} ${t.d} ${esc((M.lang === 'en' ? MN.en : MN.sv)[t.m - 1])}</text></g>`;
    return `<svg class="aj-svg" viewBox="${narrow() ? VB_NARROW : VB_WIDE}" role="radiogroup" aria-label="${esc(S.group)}" focusable="false">
      <circle cx="${CX}" cy="${CY}" r="${RO + 24}" class="aj-disc"/>
      <circle cx="${CX}" cy="${CY}" r="${RO}" class="aj-rim"/><circle cx="${CX}" cy="${CY}" r="${RI}" class="aj-rim"/>
      <g class="aj-fests" aria-hidden="true">${fest}</g>
      ${segs}<g class="aj-abs" aria-hidden="true">${labels}</g>${needle}${centre}
      <path class="aj-focus h" d="" aria-hidden="true"/><path class="aj-focus r" d="" aria-hidden="true"/></svg>`;
  }

  function html(o) {
    const M = model(o);
    const id = o.id || 'arshjul';
    REG[id] = M;
    const sel = M.today.m;
    const { k } = monthFor(o.kalender, M.today, sel);
    const S = M.S;
    return `<!-- ÅRSHJUL START -->
<section class="aj wash" id="${esc(id)}" aria-labelledby="${esc(id)}-h" style="${seasonVars(o, k ? k.sasong : MN.sv[sel - 1])}" data-aj-sel="${sel}">
 <div class="wrap"><div class="aj-g">
  <div class="aj-w">${svgHTML(M, sel)}
   <p class="aj-leg small" aria-hidden="true"><span><i class="aj-dot fx"></i>${esc(S.legendFixed)}</span><span><i class="aj-dot"></i>${esc(S.legendFest)}</span><span><i class="aj-tick"></i>${esc(S.legendToday)}</span></p></div>
  <div class="aj-pane">
   <span class="eyebrow">${esc(S.eyebrow)}</span>
   <h2 id="${esc(id)}-h">${esc(S.h)}</h2>
   <p>${esc(S.intro)}</p>
   <p class="small aj-hint">${esc(S.hint)}</p>
   <div class="aj-card" data-aj-card>${cardHTML(M, sel)}</div>
   <p class="sr" aria-live="polite" aria-atomic="true" data-aj-live></p>
   <div class="aj-hem">
    <h3>${esc(S.hemH)}</h3>
    <p>${esc(S.hemP)}</p>
    <div class="aj-row"><button type="button" class="btn aj-btn" data-aj-ics="${esc(id)}">${esc(S.hemBtn)}</button><a class="link" href="${esc(o.hemHref || S.hemHref)}">${esc(S.hemMore)} <span aria-hidden="true">→</span></a></div>
    <p class="small" aria-live="polite" data-aj-status></p>
   </div>
  </div>
 </div></div>
</section>
<!-- ÅRSHJUL SLUT -->`;
  }

  function select(sec, m, focus) {
    const M = REG[sec.id]; if (!M) return;
    m = ((m - 1 + 12) % 12) + 1;
    sec.dataset.ajSel = m;
    const { k } = monthFor(M.o.kalender, M.today, m);
    sec.setAttribute('style', seasonVars(M.o, k ? k.sasong : MN.sv[m - 1]));
    sec.querySelectorAll('.aj-seg').forEach(g => {
      const i = +g.dataset.ajM, on = i === m;
      g.classList.toggle('on', on);
      g.setAttribute('aria-checked', String(on));
      g.setAttribute('tabindex', on ? '0' : '-1');
      g.querySelector('.aj-p').setAttribute('d', wedge(i - 1, on ? 7 : 0));
    });
    sec.querySelectorAll('[data-aj-ab]').forEach(t => { const i = +t.dataset.ajAb, lp = labelPos(i - 1, i === m ? 7 : 0); t.setAttribute('x', f1(lp[0])); t.setAttribute('y', f1(lp[1] + 5.5)); });
    const cm = sec.querySelector('[data-aj-cm]'), cn = sec.querySelector('[data-aj-cn]');
    if (cm) cm.textContent = M.moons[m - 1];
    if (cn) cn.textContent = (M.lang === 'en' ? MN.en : MN.sv)[m - 1].toUpperCase();
    sec.querySelector('[data-aj-card]').innerHTML = cardHTML(M, m);
    const fs = M.fester.filter(f => f.at.m === m).map(f => f.name);
    sec.querySelector('[data-aj-live]').textContent = `${M.S.chosen}: ${M.lang === 'en' ? cap(MN.en[m - 1]) : MN.sv[m - 1]}, ${M.moons[m - 1]}${fs.length ? '. ' + fs.join(', ') : ''}.`;
    const g = sec.querySelector(`.aj-seg[data-aj-m="${m}"]`);
    if (focus && g && document.activeElement !== g) g.focus();
    showFocus(sec);
  }

  function showFocus(sec) {
    const rings = sec.querySelectorAll('.aj-focus'); if (!rings.length) return;
    const a = document.activeElement;
    let vis = false;
    try { vis = a && a.classList && a.classList.contains('aj-seg') && sec.contains(a) && a.matches(':focus-visible'); } catch (e) { vis = !!(a && a.classList && a.classList.contains('aj-seg') && sec.contains(a)); }
    const d = vis ? wedge(+a.dataset.ajM - 1, a.classList.contains('on') ? 7 : 0) : '';
    rings.forEach(r => { r.setAttribute('d', d); r.classList.toggle('on', !!vis); });
  }

  function download(id) {
    const M = REG[id]; if (!M) return;
    const list = M.o.hogtider || [];
    let txt = M.o.icsFile ? M.o.icsFile(list) : buildIcs(list, M.lang);
    if (/^data:/.test(txt)) txt = decodeURIComponent(txt.slice(txt.indexOf(',') + 1));
    const blob = new Blob([txt], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = M.S.hemFile; a.hidden = true;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    const st = document.querySelector(`#${CSS.escape(id)} [data-aj-status]`);
    if (st) st.textContent = M.S.saved(M.S.hemFile);
  }
  // Reserv om sidan saknar egen ICS-kod (t.ex. den engelska sidan)
  function buildIcs(list, lang) {
    const e = t => String(t).replace(/\\,/g, ',').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Vreta Solglanta//Arshjulet//' + (lang === 'en' ? 'EN' : 'SV'), 'CALSCALE:GREGORIAN'];
    list.forEach(([t, a, b, note], i) => L.push('BEGIN:VEVENT', `UID:vreta-${i}-${a}@vri.earth`, 'DTSTAMP:20261110T000000Z', `DTSTART;VALUE=DATE:${a.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${b.replace(/-/g, '')}`, `SUMMARY:${e(t + (lang === 'en' ? ' at Vreta' : ' på Vreta'))}`, `DESCRIPTION:${e(note || 'Generated by AI, Directed by MS')}`, 'END:VEVENT'));
    L.push('END:VCALENDAR');
    return L.join('\r\n');
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('click', ev => {
      const t = ev.target;
      if (!t || !t.closest) return;
      const b = t.closest('[data-aj-ics]');
      if (b) { download(b.getAttribute('data-aj-ics')); return; }
      const g = t.closest('.aj-seg');
      if (g) { const sec = g.closest('.aj'); select(sec, +g.dataset.ajM, true); }
    });
    document.addEventListener('keydown', ev => {
      const g = ev.target && ev.target.closest && ev.target.closest('.aj-seg');
      if (!g) return;
      const sec = g.closest('.aj'), m = +g.dataset.ajM;
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[ev.key];
      if (step) { ev.preventDefault(); select(sec, m + step, true); }
      else if (ev.key === 'Home') { ev.preventDefault(); select(sec, 1, true); }
      else if (ev.key === 'End') { ev.preventDefault(); select(sec, 12, true); }
      else if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'Spacebar') { ev.preventDefault(); select(sec, m, true); }
    });
    document.addEventListener('focusin', ev => { const s = ev.target && ev.target.closest && ev.target.closest('.aj'); if (s) showFocus(s); });
    document.addEventListener('focusout', ev => { const s = ev.target && ev.target.closest && ev.target.closest('.aj'); if (s) setTimeout(() => showFocus(s), 0); });
    if (typeof matchMedia === 'function') {
      const mq = matchMedia('(max-width: 640px)');
      const upd = () => document.querySelectorAll('.aj-svg').forEach(s => s.setAttribute('viewBox', mq.matches ? VB_NARROW : VB_WIDE));
      if (mq.addEventListener) mq.addEventListener('change', upd); else if (mq.addListener) mq.addListener(upd);
    }
  }

  const api = { html, select: (id, m) => { const s = document.getElementById(id); if (s) select(s, m, false); }, festDate, version: '1.0' };
  if (typeof window !== 'undefined') window.Arshjul = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
/* ÅRSHJUL SLUT */
