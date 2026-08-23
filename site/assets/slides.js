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
// countUp() (defined at the bottom of this file) and .donut[data-p]
// elements with animateDonuts() (app.js), and fires bar-chart/ladder-bar/
// vbar width|height transitions off the `.slide.on` class. None of that
// wiring is touched here -- only the markup/copy running through it.

function esc(s){return (s==null?'':String(s)).replace(/[&<>"]/g,function(c){
  return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function plural(n,a,b){return n===1?a:(b||a+'s');}

/* ── chart builders (generic, reused from the pre-redesign deck; the visual
   skin lives entirely in styles.css, none of this markup shape changed) ── */

function chartRow(label,valText,pct,cls){
  var w=Math.max(Number(pct)||0,2);
  return '<div class="chart-row">'+
    '<div class="chart-head"><span class="chart-label">'+label+'</span>'+
    (valText?'<span class="chart-val">'+valText+'</span>':'')+'</div>'+
    '<div class="chart-track"><i class="chart-fill'+(cls?' '+cls:'')+'" style="--w:'+w+'%"></i></div>'+
  '</div>';
}

function donut(part,whole,headline,caption,cls){
  var pct = whole>0 ? Math.round((part/whole)*100) : 0;
  return '<div class="donutwrap">'+
    '<div class="donut'+(cls?' '+cls:'')+'" data-p="'+pct+'" style="--p:'+pct+'">'+
      '<span class="mid"><b>'+part+'</b><s>of '+whole+'</s></span>'+
    '</div>'+
    '<div class="donutside">'+
      '<div class="big-n">'+headline+'</div>'+
      (caption?'<div class="cap">'+caption+'</div>':'')+
    '</div></div>';
}

function gauge(pct,headline,caption,cls){
  pct = Math.max(0,Math.min(100,Math.round(Number(pct)||0)));
  return '<div class="donutwrap">'+
    '<div class="donut'+(cls?' '+cls:'')+'" data-p="'+pct+'" style="--p:'+pct+'">'+
      '<span class="mid"><b>'+pct+'</b><s>%</s></span>'+
    '</div>'+
    '<div class="donutside">'+
      '<div class="big-n">'+headline+'</div>'+
      (caption?'<div class="cap">'+caption+'</div>':'')+
    '</div></div>';
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

function vbars(rows){
  var max=0; rows.forEach(function(r){ if(r.value>max) max=r.value; });
  return '<div class="vbars">'+rows.map(function(r){
    var h = max>0 ? Math.max(Math.round((r.value/max)*100),4) : 4;
    return '<div class="vbar'+(r.me?' me':'')+'">'+
      '<span class="vnum">'+r.value+'</span>'+
      '<span class="vcol" style="--h:'+h+'%"></span>'+
      '<span class="vlab">'+esc(r.label)+'</span>'+
    '</div>';
  }).join('')+'</div>';
}

function lineChart(pts){
  if(!pts || pts.length<2) return '';
  var maxY=0; pts.forEach(function(p){ if(p.y>maxY) maxY=p.y; });
  if(maxY<=0) maxY=1;
  var n=pts.length;
  var xy=pts.map(function(p,i){
    return { x:(i/(n-1))*100, y:100-((p.y/maxY)*88)-6 };
  });
  var line=xy.map(function(p,i){ return (i?'L':'M')+p.x.toFixed(2)+' '+p.y.toFixed(2); }).join(' ');
  var area=line+' L100 100 L0 100 Z';
  var dots=xy.map(function(p){
    return '<i class="ldot" style="left:'+p.x.toFixed(2)+'%;top:'+p.y.toFixed(2)+'%"></i>';
  }).join('');
  return '<div class="linewrap">'+
    '<div class="lineplot">'+
      '<svg class="linechart" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">'+
        '<line class="grid" x1="0" y1="50" x2="100" y2="50"/>'+
        '<path class="area" d="'+area+'"/>'+
        '<path class="ln" d="'+line+'"/>'+
      '</svg>'+dots+
    '</div>'+
    '<div class="lineaxis"><span>'+esc(pts[0].x)+'</span><span>'+esc(pts[n-1].x)+'</span></div>'+
  '</div>';
}

function chartPair(label,youText,youPct,batchText,batchPct){
  return '<div class="chart-row">'+
    '<div class="chart-head"><span class="chart-label">'+label+'</span>'+
    '<span class="chart-val">'+youText+'</span></div>'+
    '<div class="chart-track"><i class="chart-fill" style="--w:'+Math.max(Number(youPct)||0,2)+'%"></i></div>'+
    '<div class="chart-track thin"><i class="chart-fill ghost" style="--w:'+Math.max(Number(batchPct)||0,2)+'%"></i></div>'+
    '<div class="chart-sub">'+batchText+'</div>'+
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
    case 'booth': // a little booth/tent outline -- RecWeek's own booth
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

/* ── the shift-window calendar strip (slide 4) ────────────────────────────
   RecWeek + Welcome Week 2026 ran 2026-08-24 through 2026-09-09 inclusive
   (17 days). Every day in that window gets one cell; days this person
   actually worked light up in coral. Covered days come from P.grid (each
   row carries its own `date`) when present, otherwise from
   totals.firstDate/lastDate alone (a plain start/end highlight, no
   per-day detail to draw from). */
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
    '<p class="shiftgrid-caption">Aug 24 &rarr; Sep 9, 2026</p>';
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
  marginalia('stamp','cover-stamp')+
  '<p class="kicker">RecWeek &amp; Welcome Week <span class="cn">&middot;</span> Aug 24 &ndash; Sep 9, 2026</p>'+
  '<h1>A letter,<br>just for the booth crew.</h1>'+
  '<h2>Hi '+esc(P.nickname||P.firstName||P.name)+'.</h2>'+
  '<p>This one’s just for the team &mdash; the ~42 of you who ran the booth, not the hundreds who walked past it.</p>'+
  '<p class="sm">Every line in here came from your own timesheet.</p>');

/* 2 -- your name in the credits */
(function(){
  var faculty = !!P.isFaculty;
  add(6500,
    '<p class="kicker">'+(faculty?'Faculty credit':'Your name in the credits')+'</p>'+
    '<h1 class="letter-name">'+esc(P.name)+'</h1>'+
    (P.dept ? deptBadge(P.dept) : '')+
    (P.position ? '<p class="role-line">'+esc(P.position)+(P.isHead?' <span class="hl">&middot; team lead</span>':'')+'</p>' : '')+
    '<p class="sm">'+(faculty
      ? 'You didn’t have to show up for this one. You did anyway, and the team noticed.'
      : 'Somewhere on a signup sheet, a schedule, a group chat &mdash; your name was on this.')+'</p>',
    'v-persona');
})();

/* 3 -- the headline number */
if(P.totals){
  add(7000,
    '<p class="kicker">The headline number</p>'+
    '<p class="big" data-count="'+(P.totals.shifts||0)+'">0</p>'+
    '<h2 style="margin-top:2px">'+plural(P.totals.shifts||0,'shift')+' at the booth</h2>'+
    '<p class="letter-lede">That’s <span class="hl">'+esc(fmtHours(P.totals.minutes))+'</span> on the ground, across two straight weeks.</p>'+
    '<p class="sm">Not a metric. A record of you being there.</p>');
}

/* 4 -- days you showed up */
if(P.totals && P.totals.days){
  add(7500,
    '<p class="kicker">Days you showed up</p>'+
    '<p class="big sm-num" data-count="'+P.totals.days+'">0</p>'+
    '<h2 style="margin-top:2px">'+plural(P.totals.days,'day')+' you were here</h2>'+
    shiftGrid(P)+
    '<p class="sm">'+
      (P.totals.firstDate ? 'First shift on <span class="hl">'+esc(dateLabel(P.totals.firstDate))+'</span>. ' : '')+
      (P.totals.lastDate ? 'Last one on <span class="hl">'+esc(dateLabel(P.totals.lastDate))+'</span>.' : '')+
    '</p>');
}

/* 5 -- RecWeek vs Welcome Week */
if(P.byEvent && (P.byEvent.RECWEEK || P.byEvent.WELCOMEWEEK)){
  var rw=P.byEvent.RECWEEK||{shifts:0,minutes:0}, ww=P.byEvent.WELCOMEWEEK||{shifts:0,minutes:0};
  add(7500,
    '<p class="kicker">Two weeks, one you</p>'+
    '<h2>RecWeek vs. Welcome Week</h2>'+
    '<div class="chart">'+
      chartRow('RecWeek', rw.shifts+' '+plural(rw.shifts,'shift')+' &middot; '+fmtHours(rw.minutes), rw.shifts+ww.shifts>0?(rw.shifts/(rw.shifts+ww.shifts)*100):0)+
      chartRow('Welcome Week', ww.shifts+' '+plural(ww.shifts,'shift')+' &middot; '+fmtHours(ww.minutes), rw.shifts+ww.shifts>0?(ww.shifts/(rw.shifts+ww.shifts)*100):0, 'leaf')+
    '</div>'+
    '<p class="sm">Bar length is your own split between the two &mdash; not a comparison against anyone else.</p>');
}

/* 6 -- what you did */
if(P.byRole && P.byRole.length){
  var rows=P.byRole.map(function(r){
    return chartRow(esc(r.role), r.shifts+' '+plural(r.shifts,'shift'), r.pct, 'sky');
  }).join('');
  add(7500,
    '<p class="kicker">What you did</p>'+
    '<h2>Mostly '+esc(P.topRole||(P.byRole[0]&&P.byRole[0].role)||'the booth')+'</h2>'+
    '<div class="chart">'+rows+'</div>'+
    '<p class="sm">Every role you covered, by how much of your time it took.</p>');
}

/* 7 -- your longest day */
if(P.longestDay && P.longestDay.date){
  var ld=P.longestDay;
  var slots = (ld.slots||[]).map(function(s){ return '<div class="tl-row"><span class="tl-node"></span><div class="tl-name">'+esc(s)+'</div></div>'; }).join('');
  add(7500,
    '<p class="kicker">Your longest day</p>'+
    '<h2>'+esc(dateLabel(ld.date))+'</h2>'+
    '<p class="letter-lede">'+esc(fmtHours(ld.minutes))+' in one day. Here’s how it broke down:</p>'+
    (slots ? '<div class="timeline">'+slots+'</div>' : '')+
    '<p class="sm">The day the schedule asked the most of you, and you gave it.</p>');
}

/* 8 -- earliest / latest */
if(P.earliestStart || P.latestEnd){
  add(7000,
    '<p class="kicker">Open to close</p>'+
    '<h2>You were there for both ends of it</h2>'+
    '<div class="chart">'+
      (P.earliestStart ? chartRow('Earliest you clocked in', esc(P.earliestStart), 100, 'sky') : '')+
      (P.latestEnd ? chartRow('Latest you clocked out', esc(P.latestEnd), 100) : '')+
    '</div>'+
    '<p class="sm">'+
      (P.earliestStart ? 'You were there when the doors opened at <span class="hl">'+esc(P.earliestStart)+'</span>. ' : '')+
      (P.latestEnd ? 'And still there past <span class="hl">'+esc(P.latestEnd)+'</span>.' : '')+
    '</p>');
}

/* 9 -- you're one of N */
if(P.standout){
  var st=P.standout;
  add(7500,
    '<p class="kicker">One of the ones who showed up</p>'+
    '<h2>'+esc(st.headline)+'</h2>'+
    (st.sub ? '<p class="letter-lede">'+esc(st.sub)+'</p>' : '')+
    (st.count && st.n ? gauge(Math.round((st.count/st.n)*100), st.count+' of '+st.n, 'on the core team') : '')+
    '<p class="sm">Out of everyone who ran this with you, that’s where you stood.</p>');
}

/* 10 -- your department */
if(P.deptStats && P.dept){
  var ds=P.deptStats;
  add(8000,
    '<p class="kicker">Your department</p>'+
    '<h2>'+esc(P.dept.label||P.dept.short||'Your team')+'</h2>'+
    '<div class="card" style="border-color:'+esc(P.dept.color||'')+'">'+
      '<p class="sm" style="margin:0">'+ds.headcount+' '+plural(ds.headcount,'person','people')+'; '+
      ds.shifts+' '+plural(ds.shifts,'shift')+' logged together; '+esc(fmtHours(ds.minutes))+' on the ground as a team.</p>'+
    '</div>'+
    (ds.yourSharePct ? gauge(ds.yourSharePct, 'Your share', 'of the department’s total hours', 'leaf') : '')+
    '<p class="sm">You weren’t carrying this alone. Here’s the department that had your back.</p>');
}

/* 11 -- the whole team, in one number. Always renders. */
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
    '<p class="letter-lede">Across '+(tm.days||0)+' '+plural(tm.days||0,'day')+' and '+(tm.events||0)+' '+plural(tm.events||0,'event')+
      ', that’s roughly '+esc(fmtHours(tm.avgMinutes))+' from each of you, on average.</p>'+
    '<p class="sm">Forty-two-ish people chose to show up for this. This is what that looked like, added up.</p>');
}

/* 12 -- the personal message. Always renders; an empty message gets a warm
   fallback line rather than a gap. Longest duration in the deck -- this is
   the emotional centerpiece, per spec. */
(function(){
  var nick = esc(P.nickname || P.firstName || P.name);
  var hasMessage = !!(P.message && String(P.message).trim());
  add(11000,
    marginalia('lanyard','msg-marg')+
    '<p class="kicker">A note, just for you</p>'+
    (hasMessage
      ? '<blockquote class="letter-message">'+esc(P.message).replace(/\n+/g,'</p><p>')+'</blockquote>'
      : '<p class="letter-message">'+nick+', we haven’t written your note yet &mdash; but we wanted you to know this page is waiting for it. Thank you for everything, in the meantime.</p>')+
    '<p class="letter-signoff">&mdash; the rest of the booth crew</p>',
    'v-persona');
})();

/* 13 -- thank you + share card. Always renders. */
(function(){
  var recap=[];
  if(P.totals) recap.push(['Shifts', (P.totals.shifts||0)+' &middot; '+esc(fmtHours(P.totals.minutes))]);
  if(P.dept) recap.push(['Department', esc(P.dept.label||P.dept.short||'')]);
  if(P.standout) recap.push(['Standout', esc(P.standout.headline)]);
  if(P.team) recap.push(['The whole crew', (P.team.people||0)+' people, '+esc(fmtHours(P.team.minutes))]);

  add(0,
    marginalia('tile','thanks-marg')+
    '<p class="kicker">Thank you, from all of us</p>'+
    '<h2>'+esc(P.nickname||P.firstName||P.name)+', this letter is done. You aren’t.</h2>'+
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
