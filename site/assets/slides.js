// slides.js -- Celaville CTW ("Letters from the Booth")
// Per-slide content builders and the S[] slide table. Depends only on the
// payload passed into buildSlides() plus the pure helpers in stats.js
// (fmtHours/ordinal/DEPTS/deptOf/dateLabel, loaded before this file).
//
// Mechanical contract this file must keep (read from the pre-redesign
// app.js/index.html, preserved on purpose): buildSlides(payload) populates
// the module-level S[] array of {dur, html, cls} via add(); app.js's
// buildDom() wraps each entry's html in a <section class="slide ..."><div
// class="inner">...</div></section>, animates [data-count] elements with
// countUp() (defined at the bottom of this file), and fires the meter's
// width transition off the `.slide.on` class (a plain [style="--w:N%"] +
// CSS-transition pattern -- no per-chart JS driver, unlike the old conic-
// gradient .donut/animateDonuts() this replaced). A `cls` of 'v-break' also
// gets light frame chrome via #frame.on-break (app.js), for a full-bleed
// slide. None of that wiring is touched here -- only the markup/copy
// running through it.

function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function plural(n,a,b){return n===1?a:(b||a+'s');}

/* ── chart builders (meter is new for the bolder-color pass; the visual
   skin lives entirely in styles.css, this only builds markup) ── */

/* A bold horizontal meter -- replaces the old conic-gradient ring (`donut`/
   `gauge`, both removed). A single ratio against a limit is a meter's job,
   not a 2-slice pie -- the ring version also buried its number in 23px text
   inside a thin track, which read as small and unclear at a glance. This
   puts the number at 28px next to the label, and the track itself is thick
   enough to read as a deliberate bar rather than a decorative circle. */
function meter(pct,headline,caption,cls){
  pct = Math.max(0,Math.min(100,Math.round(Number(pct)||0)));
  return '<div class="meterwrap">'+
    '<div class="meter-head"><span class="meter-label">'+headline+'</span>'+
      '<span class="meter-pct'+(cls?' '+cls:'')+'">'+pct+'%</span></div>'+
    '<div class="meter-track"><i class="meter-fill'+(cls?' '+cls:'')+'" style="--w:'+pct+'%"></i></div>'+
    (caption?'<p class="meter-cap">'+caption+'</p>':'')+
  '</div>';
}

function pictoRow(sentence,frac,pct,count,cls){
  var filled = (Number(count)>0) ? Math.max(1,Math.min(10,Math.round(pct/10))) : 0;
  var icons='';
  for(var i=0;i<10;i++){
    icons += '<i class="picto-icon'+(i<filled?' on'+(cls?' '+cls:''):'')+
      '" style="--d:'+(i*40)+'ms" aria-hidden="true">'+
      '<svg viewBox="0 0 20 24"><circle cx="10" cy="6" r="5"/>'+
      '<path d="M1 23c0-6.6 4-11 9-11s9 4.4 9 11"/></svg></i>';
  }
  return '<div class="picto-row">'+
    '<p class="picto-sentence">'+sentence+'</p>'+
    '<div class="picto-grid">'+icons+'</div>'+
    (frac?'<p class="picto-frac">'+frac+'</p>':'')+
  '</div>';
}


/* ── marginalia: small hand-drawn-style doodles in the letter's margins.
   Plain inline SVG, ink-stroke only (no fill besides the two accent colors),
   so they read as a quick pen sketch rather than clipart. Named by the same
   `glyph` vocabulary DEPTS (stats.js) uses, plus a few standalone ones
   (lanyard, stamp, kite) for slides that aren't department-specific. */
function marginalia(name,cls){
  var body='';
  switch(name){
    case 'booth': // a little booth/tent outline -- used only as OSR's dept glyph
      body='<path d="M6 38 L6 20 L32 8 L58 20 L58 38" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'+
        '<path d="M6 20 L32 8 L58 20" fill="none" stroke="var(--ctw-coral)" stroke-width="2.4" stroke-linejoin="round"/>'+
        '<rect x="24" y="26" width="16" height="12" fill="none" stroke="currentColor" stroke-width="1.6"/>'+
        '<line x1="6" y1="38" x2="58" y2="38" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
      break;
    case 'tile': // a mahjong tile with two pips
      body='<rect x="14" y="8" width="36" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>'+
        '<circle cx="26" cy="23" r="4.5" fill="var(--ctw-coral)"/>'+
        '<circle cx="38" cy="23" r="4.5" fill="none" stroke="currentColor" stroke-width="1.6"/>';
      break;
    case 'lanyard': // a lanyard + card, hung at an angle
      body='<path d="M24 4 Q30 2 36 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'+
        '<line x1="24" y1="4" x2="20" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'+
        '<line x1="36" y1="4" x2="40" y2="22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'+
        '<rect x="14" y="22" width="32" height="24" rx="3" transform="rotate(-4 30 34)" fill="none" stroke="currentColor" stroke-width="2"/>'+
        '<circle cx="30" cy="31" r="5" transform="rotate(-4 30 34)" fill="none" stroke="var(--ctw-coral)" stroke-width="1.6"/>';
      break;
    case 'stamp': // a scalloped postage stamp
      body='<path d="M10 10h40v34H10z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3.4"/>'+
        '<rect x="14" y="14" width="32" height="26" fill="none" stroke="currentColor" stroke-width="2"/>'+
        '<path d="M20 30 L27 22 L33 28 L40 18" fill="none" stroke="var(--ctw-coral)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
      break;
    case 'clipboard':
      body='<rect x="14" y="8" width="32" height="38" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>'+
        '<rect x="22" y="4" width="16" height="8" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>'+
        '<line x1="20" y1="22" x2="40" y2="22" stroke="currentColor" stroke-width="1.6"/>'+
        '<line x1="20" y1="30" x2="36" y2="30" stroke="var(--ctw-coral)" stroke-width="1.6"/>'+
        '<line x1="20" y1="38" x2="32" y2="38" stroke="currentColor" stroke-width="1.6"/>';
      break;
    case 'cake': // a birthday candle, for the "about you" slide
      body='<line x1="30" y1="4" x2="30" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'+
        '<path d="M27 4 Q30 0 33 4 Q30 8 27 4Z" fill="var(--ctw-coral)" stroke="none"/>'+
        '<path d="M10 40 L10 22 Q10 16 16 16 L44 16 Q50 16 50 22 L50 40Z" fill="none" stroke="currentColor" stroke-width="2"/>'+
        '<path d="M10 30 Q16 26 22 30 T34 30 T46 30" fill="none" stroke="var(--ctw-coral)" stroke-width="1.6"/>';
      break;
    case 'kite': // a diamond kite with a bowed tail, from the brand book's kite motif
      body='<path d="M30 2 L48 20 L30 38 L12 20 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'+
        '<line x1="30" y1="2" x2="30" y2="38" stroke="currentColor" stroke-width="1.4"/>'+
        '<line x1="12" y1="20" x2="48" y2="20" stroke="currentColor" stroke-width="1.4"/>'+
        '<path d="M30 38 Q34 41 30 44 Q26 41 30 38Z" fill="var(--ctw-coral)" stroke="none"/>'+
        '<path d="M30 44 Q34 47 30 50 Q26 47 30 44Z" fill="none" stroke="currentColor" stroke-width="1.4"/>';
      break;
    case 'lantern': // a paper lantern, from the brand book's lantern motif
      body='<line x1="30" y1="2" x2="30" y2="9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'+
        '<rect x="20" y="9" width="20" height="5" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/>'+
        '<path d="M20 14 Q12 24 20 36 Q30 42 40 36 Q48 24 40 14 Z" fill="var(--ctw-coral)" opacity=".18" stroke="currentColor" stroke-width="2"/>'+
        '<path d="M18 20 Q30 24 42 20 M17 28 Q30 32 43 28" fill="none" stroke="currentColor" stroke-width="1.2" opacity=".6"/>'+
        '<rect x="24" y="36" width="12" height="4" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/>'+
        '<line x1="30" y1="40" x2="30" y2="46" stroke="var(--ctw-coral)" stroke-width="1.6" stroke-linecap="round"/>';
      break;
    case 'ayi': // Ayi, the brand mascot -- a simple round-eared panda bust
      body='<circle cx="18" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="2"/>'+
        '<circle cx="42" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="2"/>'+
        '<path d="M14 42 Q10 22 30 22 Q50 22 46 42 Z" fill="none" stroke="currentColor" stroke-width="2"/>'+
        '<circle cx="21" cy="30" r="2.6" fill="currentColor"/>'+
        '<circle cx="39" cy="30" r="2.6" fill="currentColor"/>'+
        '<circle cx="17" cy="35" r="4" fill="var(--ctw-coral)" opacity=".45"/>'+
        '<circle cx="43" cy="35" r="4" fill="var(--ctw-coral)" opacity=".45"/>'+
        '<path d="M26 37 Q30 40 34 37" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>';
      break;
    default: // scroll: a rolled letter, the fallback flourish
      body='<path d="M10 16 Q10 10 16 10 H44 Q50 10 50 16 V40 Q50 46 44 46 H16 Q10 46 10 40 Z" fill="none" stroke="currentColor" stroke-width="2"/>'+
        '<line x1="18" y1="20" x2="42" y2="20" stroke="currentColor" stroke-width="1.5"/>'+
        '<line x1="18" y1="27" x2="42" y2="27" stroke="currentColor" stroke-width="1.5"/>'+
        '<line x1="18" y1="34" x2="34" y2="34" stroke="var(--ctw-coral)" stroke-width="1.5"/>';
  }
  return '<svg class="marg'+(cls?' '+cls:'')+'" viewBox="0 0 60 50" width="44" height="37" aria-hidden="true">'+body+'</svg>';
}

/* A department badge: coloured ribbon tab + label, painted from the
   payload's own dept.color when it has one, falling back to DEPTS
   (stats.js) by key so a thin payload still gets a sensible look. */
function deptBadge(dept){
  if(!dept) return '';
  var known = dept.key ? deptOf(dept.key) : null;
  var color = dept.color || (known && known.color) || '#4F4036';
  var label = dept.label || (known && known.label) || dept.short || 'Core Team';
  var glyph = (known && known.glyph) || 'scroll';
  return '<div class="deptbadge" style="--dc:'+esc(color)+'">'+
    marginalia(glyph,'deptbadge-marg')+
    '<span class="deptbadge-label">'+esc(label)+'</span>'+
  '</div>';
}

/* ── the shift-window calendar strip ──────────────────────────────────────
   RecWeek + Welcome Week 2026 ran 2026-08-24 through 2026-09-09 inclusive
   (17 days). Every day in that window gets one cell; days this person
   actually worked light up in coral. Covered days come from P.grid (each
   row carries its own `date`) when present, otherwise from
   totals.firstDate/lastDate alone (a plain start/end highlight, no
   per-day detail to draw from). Works the same whether 1 day or all 17 are
   lit -- there's no "empty" state to apologize for here, just cells. */
function shiftGrid(P){
  var WINDOW_START = Date.UTC(2026,7,24), WINDOW_END = Date.UTC(2026,8,9); // months are 0-based
  var covered = {};
  if(P.grid && P.grid.length){
    P.grid.forEach(function(g){ if(g.date) covered[g.date]=true; });
  } else if(P.totals && P.totals.firstDate){
    covered[P.totals.firstDate]=true;
    if(P.totals.lastDate) covered[P.totals.lastDate]=true;
  }
  var cells='', d=WINDOW_START, i=0;
  while(d<=WINDOW_END){
    var dt=new Date(d);
    var iso=dt.getUTCFullYear()+'-'+String(dt.getUTCMonth()+1).padStart(2,'0')+'-'+String(dt.getUTCDate()).padStart(2,'0');
    var on = !!covered[iso];
    cells+='<i class="sg-cell'+(on?' on':'')+'" style="--d:'+(i*22)+'ms" title="'+esc(dateLabel(iso))+'"></i>';
    d+=86400000; i++;
  }
  return '<div class="shiftgrid" aria-hidden="true">'+cells+'</div>'+
    '<p class="shiftgrid-caption">Aug 24 to Sep 9, 2026</p>';
}

/* Splits a personal message into slide-sized chunks so the reader never has
   to scroll a slide -- the "Personalized Messages" sheet column this comes
   from can hold anything from one line to several paragraphs, and the
   message slide has a fixed, non-scrolling viewport (per spec: "do not let
   the user scroll"). Paragraph breaks (blank lines) are preferred split
   points; a paragraph longer than maxChars on its own is further split on
   sentence boundaries so a chunk never cuts a sentence in half. A single
   sentence longer than maxChars is left whole rather than broken mid-word --
   that's a rare, deliberately-tolerated overflow, not a silent truncation. */
function splitMessageChunks(text, maxChars){
  maxChars = maxChars || 240;
  var paras = String(text).split(/\n\s*\n/).map(function(p){ return p.trim(); }).filter(Boolean);
  if(!paras.length) paras = [String(text).trim()];

  var chunks = [], cur = '';
  function flush(){ if(cur){ chunks.push(cur); cur=''; } }
  // Appends one already-fits-alone unit (a paragraph short enough to stand
  // on its own, or one sentence of a paragraph that wasn't), joining it
  // onto the in-progress chunk when there's room or starting a fresh one
  // when there isn't. This is the one place text actually gets added to a
  // chunk -- both branches below route through it, so a paragraph that
  // needed sentence-splitting is subject to the exact same fits/doesn't-fit
  // decision as one that didn't, regardless of what's already in `cur`.
  function addUnit(unit, sep){
    if(!cur){ cur = unit; }
    else if((cur+sep+unit).length<=maxChars){ cur += sep+unit; }
    else { flush(); cur = unit; }
  }

  paras.forEach(function(para){
    if(para.length<=maxChars){
      addUnit(para, '\n\n');
    } else {
      // A paragraph long enough to need splitting still STARTS a new
      // paragraph relative to whatever's already in `cur` -- only the
      // sentences after the first are continuations of it. Joining that
      // first sentence with ' ' (as if it were mid-paragraph) is exactly
      // what was silently erasing the paragraph break the previous
      // paragraph earned: the real symptom was two full paragraphs
      // (typed as separate blocks, blank line between them) rendering as
      // one run-on paragraph the moment the second one was long enough to
      // need sentence-splitting.
      var sentences = (para.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [para])
        .map(function(s){ return s.trim(); }).filter(Boolean);
      sentences.forEach(function(s, i){ addUnit(s, i===0 ? '\n\n' : ' '); });
    }
  });
  flush();
  return chunks;
}

/* ── slide builders ──────────────────────────────────────── */

var S=[];
var P=null;
function add(dur,html,cls){S.push({dur:dur,html:html,cls:cls||''});}

function buildSlides(payload){
  P = payload;
  S.length = 0;

/* 1 -- cover. Never guarded: this is the letter's own front page. */
add(6000,
  marginalia('kite','cover-stamp')+
  '<p class="kicker">RecWeek &amp; Welcome Week <span class="cn">&middot;</span> Aug 24 &ndash; Sep 9, 2026</p>'+
  '<h1>A thank-you letter,<br>for the Celaville team.</h1>'+
  '<h2>Hi '+esc(P.nickname||P.firstName||P.name)+'.</h2>'+
  '<p>You were one of about 42 people who made Celaville happen this year. Here’s your part of it.</p>'+
  '<p class="sm">Every number here comes from your own sign-ups and shifts.</p>');

/* 2 -- your name in the credits */
(function(){
  var faculty = !!P.isFaculty;
  add(6500,
    '<p class="kicker">'+(faculty?'Faculty credit':'Your name in the credits')+'</p>'+
    '<h1 class="letter-name">'+esc(P.name)+'</h1>'+
    (P.dept ? deptBadge(P.dept) : '')+
    (P.position ? '<p class="role-line">'+esc(P.position)+(P.isHead?' <span class="hl">&middot; team lead</span>':'')+'</p>' : '')+
    '<p class="sm">'+(faculty
      ? 'You didn’t have to show up for this one. You did anyway, and the whole team noticed.'
      : 'You signed up, and you showed up. That’s the whole job, and you nailed it.')+'</p>',
    'v-persona');
})();

/* 3 -- about you: year, course, birthday. Guarded on P.personal existing at
   all (faculty rows typically won't have one); builds only the pieces that
   are actually present, so a partial record doesn't render a broken half. */
if(P.personal && (P.personal.yearLevel || P.personal.course || (P.personal.birthdayMonthDay && P.personal.birthYear))){
  var per = P.personal;
  var yearCourse = '';
  if(per.yearLevel && per.course) yearCourse = ordinal(per.yearLevel)+' Year, '+esc(per.course);
  else if(per.course) yearCourse = esc(per.course);
  else if(per.yearLevel) yearCourse = ordinal(per.yearLevel)+' Year';

  var yearShareBlock='';
  if(per.birthYearShare && per.birthYearShare.count>0){
    var ys=per.birthYearShare;
    yearShareBlock = pictoRow(
      ys.pct+'% of the team was born in '+ys.year+'.',
      ys.count+' of '+ys.n,
      ys.pct, ys.count, 'peach');
  }

  add(6500,
    marginalia('cake','about-marg')+
    '<p class="kicker">A few things about you</p>'+
    (yearCourse ? '<h2>'+yearCourse+'</h2>' : '')+
    (per.birthdayMonthDay ? '<p class="letter-lede">Born '+esc(per.birthdayMonthDay)+(per.birthYear?', '+per.birthYear:'')+'.</p>' : '')+
    yearShareBlock+
    '<p class="sm">Celaville pulled together people at every year level and every course, and you were right in the mix.</p>');
}

/* 4 -- what you gave: total shifts, hours, days present, and the shift-
   window calendar. The RecWeek/Welcome Week split and role breakdown that
   used to live here (folded in from the old standalone "how it broke down"
   slide) were cut again on request -- back to just the shift-count facts,
   nothing that reads as a schedule report. The closing line holds
   regardless of whether the count is 1 or 14; there's no "you should have
   done more" reading available here. */
if(P.totals){
  add(7500,
    '<p class="kicker">What you gave</p>'+
    '<p class="big" data-count="'+(P.totals.shifts||0)+'">0</p>'+
    '<h2 style="margin-top:2px">'+plural(P.totals.shifts||0,'shift')+' across RecWeek and Welcome Week</h2>'+
    '<p class="letter-lede">'+esc(fmtHours(P.totals.minutes))+' on the ground'+(P.totals.days?', over '+P.totals.days+' '+plural(P.totals.days,'day'):'')+'.</p>'+
    (P.totals.days ? shiftGrid(P) : '')+
    '<p class="sm">'+
      (P.totals.firstDate ? 'You started on '+esc(dateLabel(P.totals.firstDate))+'. ' : '')+
      (P.totals.lastDate && P.totals.lastDate!==P.totals.firstDate ? 'Still showing up by '+esc(dateLabel(P.totals.lastDate))+'.' : '')+
    '</p>'+
    '<p class="sm">Thank you for choosing to be there!</p>');
}

/* 4.5 -- zoom out to the project itself, right after the personal shift
   count. This is the direct counterweight to slide 4: a "what you gave"
   number can look small in isolation, especially for someone who only took
   a shift or two, so before anything comparative shows up (department
   share, team totals) this slide answers "and what did that feed into."
   Every number here is org-wide and identical for all 42 of you -- it isn't
   trying to rank or compare anyone, just to show the thing your shift was
   actually part of. Guarded on P.impact existing so an older cached payload
   (frozen before this slide existed) just skips it instead of rendering a
   broken half-slide. */
if(P.impact){
  var im = P.impact;
  add(8000,
    marginalia('stamp','impact-marg')+
    '<p class="kicker">Bigger than one shift</p>'+
    '<h2>Here’s what your shift helped make happen</h2>'+
    '<div class="statgrid">'+
      '<div class="statbox"><div class="n">'+im.applicants+'</div><div class="k">People applied</div></div>'+
      '<div class="statbox"><div class="n">'+im.attendees+'</div><div class="k">People showed up</div></div>'+
      '<div class="statbox"><div class="n">'+im.gamePlayers+'</div><div class="k">People played</div></div>'+
    '</div>'+
    '<p class="letter-lede">'+im.attendees+' came through the doors across '+im.attendeeDays+' event days. '+
      im.gamePlayers+' jumped into the mini-games for '+im.gamesPlayed+' games in all, and '+im.tourneyPlayers+
      ' more filled out '+im.tourneyTeams+' tournament teams.</p>'+
    '<p class="sm">'+im.applicants+' people applied to be part of this. '+im.accepted+' of them made it into the group, and '+
      im.paymentVerified+' made it all the way to being official members.</p>'+
    '<p class="sm">'+im.futureInterested+' of '+im.futureSurveyed+' people we surveyed said they now want to join a future Core Team, because of what they saw this year.</p>'+
    '<p class="sm">You helped make every one of those numbers real, and that’s yours to be proud of.</p>');
}

/* 4.7 -- a pure breather, no data at all: right after two stat-heavy slides
   in a row (what-you-gave, the impact numbers) and before three more coming
   up (standout, department, team), the deck needed one beat that's just
   feeling, not another card of numbers. Uses the 'v-break' class app.js
   already had wired up for a full-bleed treatment (frameEl.on-break) but
   never actually used -- see styles.css for the color treatment. Always
   renders; nothing here depends on the payload. */
add(5000,
  '<h2>Celaville was loud, colorful, and a little chaotic.</h2>'+
  '<p class="letter-lede">So were you. That’s not a bad thing. That’s the whole point.</p>',
  'v-break');

/* 5 -- you're one of N. The standout fact can come from shift history, but
   just as often from year level, course, or department overlap (Code.gs
   picks whichever is rarest) -- so someone with only a shift or two still
   gets something specific and true about them here, not just a shift
   count restated. */
if(P.standout && P.standout.headline){
  var st=P.standout;
  // A pictogram here, not the gauge/ring the department slide uses just
  // after this one -- "N of the team share this with you" is a proportion
  // of people, which a dot grid reads more plainly than a ring does; the
  // department slide's stat (your individual share of its total hours) is
  // a single ratio, where a ring is the right call. Different data shapes,
  // different chart.
  add(7000,
    '<p class="kicker">One fun fact about you</p>'+
    '<h2>'+esc(st.headline)+'</h2>'+
    (st.count && st.n ? pictoRow(st.sub?esc(st.sub):'', st.count+' of '+st.n, Math.round((st.count/st.n)*100), st.count, 'sky')
      : (st.sub ? '<p class="letter-lede">'+esc(st.sub)+'</p>' : ''))+
    '<p class="sm">And that’s true across the whole team, not just your department.</p>');
}

/* 6 -- your department. The card's background is tinted from the payload's
   own dept.color (same color-mix formula deptBadge already uses) instead of
   the plain cream every other card gets -- one section of the deck gets to
   carry the department's actual color, not just a border line of it. */
if(P.deptStats && P.dept){
  var ds=P.deptStats;
  var deptColor=esc(P.dept.color||'#4F4036');
  add(8000,
    '<p class="kicker">Your department</p>'+
    '<h2>'+esc(P.dept.label||P.dept.short||'Your team')+'</h2>'+
    '<div class="card" style="border-color:'+deptColor+';background:linear-gradient(165deg, color-mix(in srgb, '+deptColor+' 14%, var(--paper-hi)), color-mix(in srgb, '+deptColor+' 6%, var(--paper)))">'+
      '<p class="sm" style="margin:0">'+ds.headcount+' '+plural(ds.headcount,'person','people')+', '+
      ds.shifts+' '+plural(ds.shifts,'shift')+' put in together, '+esc(fmtHours(ds.minutes))+' on the ground as a team.</p>'+
    '</div>'+
    // A ring gauge reads fine when it's mostly full, but a ring that's
    // mostly empty reads as "here's how little of this was you" -- exactly
    // the apologizing-for-thin-data problem the earlier split-bar routes
    // around for its own chart. Below this floor, the plain sentence
    // carries the same information (you were part of a department, not the
    // whole of it) without a visual that does the opposite of what a
    // thank-you is for. The floor is arbitrary but generous: even a fifth
    // of a department's hours is a real share, not a rounding error.
    (ds.yourSharePct>=15 ? meter(ds.yourSharePct, 'Your share', 'of the department’s total hours', 'leaf') : '')+
    '<p class="sm">That’s your department, and what a year to be part of it.</p>');
}

/* 7 -- the whole team, in one number. Always renders. */
if(P.team){
  var tm=P.team;
  add(8500,
    '<p class="kicker">Zoom all the way out</p>'+
    '<h2>The whole team, in one number</h2>'+
    '<div class="statgrid">'+
      '<div class="statbox"><div class="n">'+(tm.people||0)+'</div><div class="k">People</div></div>'+
      '<div class="statbox"><div class="n">'+(tm.shifts||0)+'</div><div class="k">Shifts</div></div>'+
      '<div class="statbox"><div class="n">'+esc(fmtHours(tm.minutes))+'</div><div class="k">Hours</div></div>'+
    '</div>'+
    // Deliberately not "...from each of you, on average" -- an average
    // stated right next to someone's own (possibly much smaller) number
    // invites them to do the subtraction themselves. This states the same
    // total without handing anyone that comparison.
    '<p class="letter-lede">Across '+(tm.days||0)+' '+plural(tm.days||0,'day')+' and '+(tm.events||0)+' '+plural(tm.events||0,'event')+
      ', that’s what '+(tm.people||0)+' of you built together.</p>'+
    '<p class="sm">Forty-two-ish people chose to show up for this. Here’s what that adds up to.</p>');
}

/* 8 -- the personal message, pulled from the roster sheet's "Personalized
   Messages" column. Always renders at least one slide; an empty message
   gets a warm fallback line rather than a gap. Longest duration of any
   single-chunk slide in the deck -- this is the emotional centerpiece, per
   spec.
   That column can hold anything from one line to several paragraphs, and
   the deck's slides don't scroll -- so a message longer than
   splitMessageChunks' per-slide budget becomes several consecutive
   "note" slides instead of one overflowing one. Only the LAST chunk signs
   off; earlier chunks are marked as continuing rather than repeating the
   sign-off, which would read as several different people writing one
   note. */
(function(){
  var nick = esc(P.nickname || P.firstName || P.name);
  var hasMessage = !!(P.message && String(P.message).trim());
  var SIGNOFF = '<p class="letter-signoff">From Arianne and Keene, your PMs.</p>';

  if(hasMessage){
    var chunks = splitMessageChunks(P.message, 240);
    chunks.forEach(function(chunk, i){
      var isFirst = i===0, isLast = i===chunks.length-1;
      add(isLast ? 11000 : 6500,
        (isFirst ? marginalia('lantern','msg-marg') : '')+
        '<p class="kicker">'+(isFirst?'A note, just for you':'The note continues')+'</p>'+
        // Two passes, in this order: a blank line between paragraphs becomes
        // a real paragraph break first, then whatever single `\n`s are left
        // -- a soft line break someone typed inside one paragraph, not a
        // new paragraph -- become <br>s. Reversed, the single-\n pass would
        // also fire on the doubled newlines just consumed by the first one.
        '<blockquote class="letter-message">'+esc(chunk).replace(/\n\n+/g,'</p><p>').replace(/\n/g,'<br>')+'</blockquote>'+
        (isLast ? SIGNOFF : ''),
        'v-persona');
    });
  } else {
    add(11000,
      marginalia('lantern','msg-marg')+
      '<p class="kicker">A note, just for you</p>'+
      '<p class="letter-message">'+nick+', we haven’t written your note yet, but this page will be ready the moment we do. Thank you for everything in the meantime.</p>'+
      SIGNOFF,
      'v-persona');
  }
})();

/* 9 -- thank you + share card. Always renders. */
(function(){
  var recap=[];
  if(P.totals) recap.push(['Shifts', (P.totals.shifts||0)+' &middot; '+esc(fmtHours(P.totals.minutes))]);
  if(P.dept) recap.push(['Department', esc(P.dept.label||P.dept.short||'')]);
  if(P.standout) recap.push(['Standout', esc(P.standout.headline)]);
  if(P.team) recap.push(['The whole team', (P.team.people||0)+' people, '+esc(fmtHours(P.team.minutes))]);

  add(0,
    marginalia('ayi','thanks-marg')+
    '<p class="kicker">Thank you, from all of us</p>'+
    '<h2>Thank you for being part of Celaville this year, '+esc(P.nickname||P.firstName||P.name)+'!</h2>'+
    '<div style="margin-bottom:14px">'+
      recap.map(function(x){
        return '<div class="card" style="padding:10px 14px;margin-bottom:7px"><div class="row">'+
          '<span class="rowlabel" style="font-weight:600;opacity:.65;font-size:13.5px">'+x[0]+'</span>'+
          '<span class="rowval" style="font-size:14.5px;text-align:right">'+x[1]+'</span></div></div>';
      }).join('')+
    '</div>'+
    '<button class="btn" onclick="openShare()">Save your card</button>'+
    '<button class="btn ghost" style="margin-top:10px" onclick="replay()">Read it again</button>');
})();
}

/* -- number/ring animation helper --------------------------------------
   countUp lives here (not app.js) per the file split: it's a per-slide
   content-rendering helper, invoked by app.js's show() on every element
   carrying a [data-count] attribute. Unchanged from the pre-redesign deck. */
function countUp(el){
  var target=parseInt(el.getAttribute('data-count'),10);
  if(isNaN(target)) return;
  var t0=null, dur=900;
  function step(ts){
    if(!t0) t0=ts;
    var k=Math.min((ts-t0)/dur,1);
    el.textContent=Math.round(target*(1-Math.pow(1-k,3)));
    if(k<1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
