// app.js -- Letters from the Booth
// The engine: fetch bootstrap, slide DOM construction from S[], show()/
// next()/prev(), the swipe/spring/rubber physics, keydown + hold-to-pause
// handlers, and the loader-to-first-slide reveal transition. Physics
// constants (HYST/COMMIT/FLICK, stiffness/damping) are UNCHANGED from the
// original Wrapped build -- tuned, not touched, by this migration.
//
// Boot order: index.html loads api.js, slides.js, share.js, then this file.
// boot() (bottom of this file) is the only top-level side effect: it reads
// ?id=/?mock= from location.search, fetches the payload via api.js, calls
// buildSlides(payload) (slides.js) to populate S[], calls buildDom() below
// to render it, and only then dismisses the loader. Everything downstream
// of that point -- show/next/prev, the swipe handlers -- is unchanged in
// spirit from the original inline <script> this file was extracted from.

var LOAD_T0 = (window.performance && performance.now) ? performance.now() : Date.now();
var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* navigator.vibrate is Android-only (Safari has never implemented it) --
   that's fine as a progressive enhancement, guarded here in one place. */
function vibrate(pattern){
  if(!REDUCED && navigator.vibrate){ try{ navigator.vibrate(pattern); }catch(e){} }
}

var slidesEl=document.getElementById('slides'),
    barsEl=document.getElementById('bars'),
    hintEl=document.getElementById('hint'),
    idx=0,timer=null,started=false;
var slideEls=[], barEls=[];

/* ── DOM construction from S[] ─────────────────────────────────────────────
   Unchanged from the original top-level script; it just couldn't run until
   the payload existed, which used to be guaranteed by the time this parsed
   (server-side templating). Now it's called by boot() once buildSlides()
   (slides.js) has populated S. */
function buildDom(){
  S.forEach(function(s,i){
    var d=document.createElement('section');
    var isRecap=(i===S.length-1);
    d.className='slide'+(s.cls?' '+s.cls:'')+(isRecap?' recap':'');
    d.innerHTML='<div class="inner">'+s.html+'</div>';
    slidesEl.appendChild(d);
    var b=document.createElement('div');
    b.className='bar';b.innerHTML='<i></i>';
    barsEl.appendChild(b);
  });
  slideEls=slidesEl.children; barEls=barsEl.children;

  /* Once a child's entrance "rise" animation finishes, mark it .settled so
     the CSS rule releases transform back to the normal cascade (see the
     comment on that rule in styles.css). Delegated on #slides rather than
     per-element, since slides are built once up front. */
  slidesEl.addEventListener('animationend', function(e){
    if(e.animationName==='rise') e.target.classList.add('settled');
  });
}

/* ── round 2, item 5: screen-reader companion ─────────────────────────────
   Mirrors each slide's kicker + heading into the visually-hidden #slidelive
   region (index.html) so a reader following along by ear hears the same
   beats show() puts on screen, every time the slide changes. */
var liveEl = document.getElementById('slidelive');
function announceSlide(i){
  if(!liveEl || !slideEls[i]) return;
  var root = slideEls[i];
  var kicker = root.querySelector('.kicker');
  var heading = root.querySelector('h1,h2,h3');
  var parts = [];
  if(kicker) parts.push(kicker.textContent.trim());
  if(heading) parts.push(heading.textContent.trim());
  liveEl.textContent = parts.length ? parts.join(' — ') : ('Slide '+(i+1)+' of '+S.length);
}

/* ── round 2, item 1: browser history integration ─────────────────────────
   Slide 0 is left alone entirely -- it's the page's own natural load state,
   so browser back from there exits the page, which is exactly right. The
   FIRST time the reader moves off it, one pushState plants a single new
   history entry; every slide after that replaces that same entry instead of
   growing a 24-deep stack. That means a hardware/gesture back from any
   slide N>0 lands on slide 0 in one hop (not a step-by-step unwind) and a
   second back from there leaves the page -- the cadence the brief's own
   parenthetical calls out as the one that feels right for a swipe deck this
   long. suppressHistoryPush guards the one call site (the popstate handler
   below) that must drive show() WITHOUT re-writing history it just came from. */
var historyStarted = false, suppressHistoryPush = false;
function updateHistoryForSlide(i){
  if(suppressHistoryPush || !window.history || !history.pushState) return;
  if(i===0) return; // slide 0 keeps whatever entry is already there -- see above
  try{
    if(!historyStarted){ historyStarted = true; history.pushState({slide:i}, '', location.href); }
    else history.replaceState({slide:i}, '', location.href);
  }catch(e){}
}
window.addEventListener('popstate', function(e){
  var target = (e.state && typeof e.state.slide==='number') ? e.state.slide : 0;
  suppressHistoryPush = true;
  show(target);
  suppressHistoryPush = false;
});

/* ── round 2, item 4: first-open swipe hint ───────────────────────────────
   A one-time, self-dismissing cue that the deck is swipeable. Gated on a
   localStorage flag set the instant this runs (so even a reload this same
   session won't replay it) and skipped outright under reduced motion --
   the flag still gets set in that case, per the brief, so it's not
   perpetually "pending". pointer-events:none (styles.css) and its own
   automatic cleanup mean it can never sit in the way of a real tap/swipe. */
var SWIPE_HINT_KEY = 'celaville_swiped_hint_v1';
function maybeShowSwipeHint(){
  try{
    if(localStorage.getItem(SWIPE_HINT_KEY)) return;
    localStorage.setItem(SWIPE_HINT_KEY, '1');
  }catch(e){ return; } // no localStorage (private mode etc) -- skip, nothing to gate on
  if(REDUCED) return;
  var hint = document.createElement('div');
  hint.className = 'swipe-hint';
  hint.setAttribute('aria-hidden','true');
  hint.innerHTML = '<i></i><i></i><i></i>';
  frameEl.appendChild(hint);
  var done=false;
  function cleanup(){ if(done) return; done=true; if(hint.parentNode) hint.parentNode.removeChild(hint); }
  hint.addEventListener('animationend', cleanup);
  setTimeout(cleanup, 3200); // safety net if animationend never fires
}

function show(i){
  if(i<0) i=0;
  if(i>=S.length) i=S.length-1;
  // Cancel any pending auto-advance FIRST, before deciding which path below
  // runs -- applyScrollState() (which used to own this) only fires inside
  // apply(), and for a break-slide transition apply() is deferred into
  // document.startViewTransition()'s async callback rather than running
  // synchronously. A stale timer left armed during that setup window can
  // fire mid-transition and call show() again on top of this one, landing
  // on the wrong slide. Clearing it here, before either branch, closes that
  // race regardless of which path this call takes.
  clearTimeout(timer);
  var prevIdx=idx;
  var isBreak = (S[i].cls||'').indexOf('v-break')>-1;
  var wasBreak = slideEls[prevIdx] ? slideEls[prevIdx].classList.contains('v-break') : false;
  function apply(){
    idx=i;
    // clear .settled so re-entering a slide (back/replay) replays its
    // entrance instead of snapping straight to the settled resting state
    Array.prototype.forEach.call(slideEls[i].querySelectorAll('.inner > .settled'), function(el){
      el.classList.remove('settled');
    });
    for(var j=0;j<slideEls.length;j++){
      slideEls[j].classList.toggle('on',j===i);
      barEls[j].classList.toggle('done',j<i);
      barEls[j].classList.remove('active');
      barEls[j].querySelector('i').style.animation='none';
    }
    // restart the active bar animation
    var dur=S[i].dur;
    if(dur>0){
      var bi=barEls[i].querySelector('i');
      void bi.offsetWidth;
      bi.style.animation='';
      barEls[i].style.setProperty('--dur',dur+'ms');
      barEls[i].classList.add('active');
    } else {
      barEls[i].classList.add('done');
    }
    // Full-bleed act breaks need light frame chrome (see #frame.on-break).
    frameEl.classList.toggle('on-break', isBreak);
    CelavilleAPI.ping(TOK, i+1, S.length);
    slideEls[i].scrollTop=0;
    Array.prototype.forEach.call(slideEls[i].querySelectorAll('[data-count]'),countUp);
    applyScrollState(true);
    if(slideEls[i].classList.contains('v-persona')) vibrate(30);
    if(i===S.length-1) vibrate([0,14,110,14,240,18]); // little celebratory pattern for reaching the recap
    updateHistoryForSlide(i);
    announceSlide(i);
    if(i!==0){
      // Leaving slide 0 for any reason (swipe, tap, keyboard, popstate) is
      // exactly when the one-time hint has done its job -- clear it so it
      // can never survive a swipe back to slide 0 and sit there stale.
      var h=frameEl.querySelector('.swipe-hint');
      if(h && h.parentNode) h.parentNode.removeChild(h);
    }
  }
  // View Transitions API, scoped to act breaks only: #village and #bars keep
  // their view-transition-name (styles.css) so they persist unchanged across
  // the cross-fade, and only the slide content actually transitions. Normal
  // slide-to-slide navigation never reaches this branch -- the pointer-driven
  // spring in the swipe system below is the interaction language there and
  // stays untouched.
  if(!REDUCED && document.startViewTransition && (isBreak || wasBreak)){
    document.startViewTransition(apply);
  } else {
    apply();
  }
}

/* A slide taller than the screen is one the reader has to scroll through,
   and auto-advancing out from under them is the fastest way to lose the
   content -- so those slides wait for a tap and say so. Split out of show()
   because the iframe can be resized after a slide is already on screen,
   which would leave this decision stale. */
function applyScrollState(restartTimer){
  var el=slideEls[idx], dur=S[idx].dur;
  var scrolls=el.scrollHeight>el.clientHeight+4;
  // The recap is exempt: every row on it is a .card and every action is a
  // .btn, both opaque, so there was never a plain-text-over-ground collision
  // to fix here (unlike the platform ladder, which is bar labels and a
  // paragraph with nothing behind them). Locking it anyway flattened the
  // scene that's supposed to show through as the story's last beat, which
  // read as "why did the last page turn white" -- a regression, not a fix,
  // since nothing here actually needed the opaque background.
  el.classList.toggle('scroll-locked', scrolls && !el.classList.contains('recap'));
  if(scrolls){ barEls[idx].classList.remove('active'); barEls[idx].classList.add('done'); }
  if(restartTimer||scrolls){
    clearTimeout(timer);
    if(dur>0 && !scrolls) timer=setTimeout(function(){show(idx+1);},dur);
  }
  hintEl.textContent=scrolls?'scroll · then tap to continue':'tap to continue · hold to pause';
  hintEl.style.display=(idx===S.length-1)?'none':'';
}

function next(){ if(idx<S.length-1) show(idx+1); }
function prev(){ show(idx-1); }
function replay(){ show(0); }

/* tap left third = back, rest = forward; ignored if the gesture was a scroll
   or landed on a real control */
var frameEl=document.getElementById('frame'), moved=false;
frameEl.addEventListener('click',function(e){
  if(moved){moved=false;return;}
  if(e.target.closest('a,button')) return;
  var r=frameEl.getBoundingClientRect();
  (e.clientX-r.left < r.width*0.34) ? prev() : next();
});
document.getElementById('shareclose').addEventListener('click',function(e){
  e.stopPropagation(); closeShare();
});
/* The overlay lives inside #frame, whose click handler advances the slide,
   so every tap in here must stop propagating -- otherwise saving the card
   also skips the reader forward. Tapping the backdrop closes: a click that
   lands on the <dialog> element itself (not a descendant) is a backdrop
   click, since the dialog's own box is exactly its content box. */
document.getElementById('sharewrap').addEventListener('click',function(e){
  e.stopPropagation();
  if(e.target.id==='sharewrap') closeShare();
});
document.getElementById('sharedl').addEventListener('click',function(e){ e.stopPropagation(); });
/* <dialog> already closes on Esc natively (fires 'cancel' then closes) --
   this just keeps our own bookkeeping (classList fallback path) consistent
   on engines without real <dialog> support. */
document.getElementById('sharewrap').addEventListener('cancel',function(e){
  e.preventDefault(); closeShare();
});

document.addEventListener('keydown',function(e){
  // Don't drive the deck from behind an open overlay.
  var sw=document.getElementById('sharewrap');
  if(sw.open || sw.classList.contains('on')){
    if(e.key==='Escape') closeShare();
    return;
  }
  if(e.key==='ArrowRight'||e.key===' ') {e.preventDefault();next();}
  if(e.key==='ArrowLeft') prev();
});

/* hold to pause */
function pauseAuto(){ document.body.classList.add('paused'); clearTimeout(timer); }
function resumeAuto(){
  if(!document.body.classList.contains('paused')) return;
  document.body.classList.remove('paused');
  // resume with a short remaining window (never on slides the reader scrolls)
  clearTimeout(timer);
  var sc=slideEls[idx].scrollHeight>slideEls[idx].clientHeight+4;
  if(S[idx].dur>0 && !sc) timer=setTimeout(function(){show(idx+1);},2200);
  hintEl.textContent=sc?'scroll · then tap to continue':'tap to continue · hold to pause';
}
var holdT=null;
function holdStart(){ holdT=setTimeout(pauseAuto,260); }
function holdEnd(){ clearTimeout(holdT); resumeAuto(); }
['touchstart','mousedown'].forEach(function(ev){document.addEventListener(ev,holdStart,{passive:true});});
['touchend','mouseup','touchcancel'].forEach(function(ev){document.addEventListener(ev,holdEnd,{passive:true});});

/* System UI taking over the screen -- a screenshot, pulling down
   notifications, switching apps -- never touches the page, so the
   touch-based hold-to-pause above never fires and the auto-advance timer
   keeps running underneath the reader's hands. Pausing on blur/hidden and
   resuming with that same short grace window on the way back covers all of
   those without needing to know which one just happened. */
window.addEventListener('blur', pauseAuto);
window.addEventListener('focus', resumeAuto);
document.addEventListener('visibilitychange', function(){
  document.hidden ? pauseAuto() : resumeAuto();
});

/* ── the swipe ─────────────────────────────────────────────────────────────
   The card tracks the pointer 1:1, resists at the ends of the story instead
   of stopping dead, and hands its release velocity to a spring -- so a
   flick throws the page and a half-hearted drag falls back. Vertical
   scrolling on tall slides is untouched: the horizontal axis has to win by
   10px before anything is captured, and once the axis is decided it does
   not change mid-gesture. UNCHANGED physics constants -- do not touch. */
var HYST=10, COMMIT=0.34, FLICK=520;

function project(v, rate){ rate=rate||0.998; return (v/1000)*rate/(1-rate); }

/* Critically damped by default (no overshoot); a flick passes bounce>0 so
   the throw carries a little overshoot, which is the only place it feels
   right. */
function spring(from,to,v0,bounce,onFrame,onEnd){
  /* stiffness/damping are in s^-2 / s^-1, so every quantity below is in
     px and px/s and dt is in seconds. v0 arrives as px/s and is used as-is:
     dividing it by 1000 here (an earlier mistake) made it 1000x too small,
     which silently threw away the whole point of the velocity handoff. */
  var stiff=bounce>0?170:210, damp=bounce>0?20:29;   /* 2*sqrt(210)=29 -> critical */
  var x=from, v=v0, t0=null, raf=null;
  function step(ts){
    if(t0===null) t0=ts;
    var dt=Math.min((ts-t0)/1000,1/30); t0=ts;
    var a=-stiff*(x-to)-damp*v;
    v+=a*dt; x+=v*dt;
    if(Math.abs(x-to)<0.5 && Math.abs(v)<30){ onFrame(to); onEnd&&onEnd(); return; }
    onFrame(x);
    raf=requestAnimationFrame(step);
  }
  raf=requestAnimationFrame(step);
  return function cancel(){ if(raf) cancelAnimationFrame(raf); };
}

/* Progressive resistance past the first / last slide (Apple's rubber-band). */
function rubber(over,dim){ var c=0.55; return (over*dim*c)/(dim+c*Math.abs(over)); }

var g={id:null,x0:0,y0:0,axis:null,dx:0,el:null,hist:[],cancelSpring:null,w:520};

function setDrag(el,px){
  if(!el) return;
  el.style.transform = px ? 'translate3d('+px.toFixed(2)+'px,0,0)' : '';
  el.style.opacity = px ? String(Math.max(0.55, 1-Math.abs(px)/(g.w*1.7))) : '';
}
function endDrag(el){
  if(!el) return;
  el.style.transform=''; el.style.opacity=''; el.style.willChange='';
}

slidesEl.addEventListener('pointerdown', function(e){
  if(e.pointerType==='mouse' && e.button!==0) return;
  if(e.target.closest('a,button')) return;
  if(g.cancelSpring){ g.cancelSpring(); g.cancelSpring=null; }
  g.id=e.pointerId; g.x0=e.clientX; g.y0=e.clientY; g.axis=null; g.dx=0;
  g.el=slideEls[idx]; g.hist=[{x:e.clientX,t:e.timeStamp}];
  g.w=frameEl.getBoundingClientRect().width||520;
});

slidesEl.addEventListener('pointermove', function(e){
  if(g.id!==e.pointerId) return;
  var dx=e.clientX-g.x0, dy=e.clientY-g.y0;
  if(g.axis===null){
    if(Math.abs(dx)<HYST && Math.abs(dy)<HYST) return;
    /* Decide once. A gesture that started vertical stays a scroll for its
       whole life, which is what stops the card twitching mid-scroll. */
    g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if(g.axis==='x'){
      moved=true;
      try{ slidesEl.setPointerCapture(e.pointerId); }catch(err){}
      if(g.el) g.el.style.willChange='transform,opacity';
      clearTimeout(timer);                 /* don't auto-advance mid-gesture */
      clearTimeout(holdT);                 /* and don't read it as a hold    */
      document.body.classList.remove('paused');
    }
  }
  if(g.axis!=='x') return;
  g.hist.push({x:e.clientX,t:e.timeStamp});
  if(g.hist.length>6) g.hist.shift();
  /* At either end of the story there is nowhere to go, so resist. */
  var atStart = idx===0 && dx>0, atEnd = idx===S.length-1 && dx<0;
  g.dx = (atStart||atEnd) ? rubber(dx, g.w) : dx;
  if(!REDUCED) setDrag(g.el, g.dx);
  e.preventDefault();
}, {passive:false});

function finishDrag(e){
  if(g.id!==e.pointerId) return;
  var el=g.el, dx=g.dx, axis=g.axis;
  g.id=null; g.el=null; g.axis=null; g.dx=0;
  if(axis!=='x'){ return; }

  /* Velocity from the last few samples, not just the final pair. */
  var h=g.hist, v=0;
  if(h.length>1){
    var a=h[0], b=h[h.length-1], dt=(b.t-a.t)||16;
    v=(b.x-a.x)/dt*1000;
  }
  var projected = dx + project(v);
  var goNext = projected < -g.w*COMMIT || v < -FLICK;
  var goPrev = projected >  g.w*COMMIT || v >  FLICK;
  if(idx===0) goPrev=false;
  if(idx===S.length-1) goNext=false;

  if(goNext || goPrev){
    // 10ms tick the instant the commit resolves, so the haptic lands with
    // the spring's start rather than with show() landing moments later.
    vibrate(10);
    var to = goNext ? -g.w : g.w;
    if(REDUCED){ endDrag(el); goNext?next():prev(); return; }
    g.cancelSpring = spring(dx, to, v, 0.15, function(x){ setDrag(el,x); }, function(){
      endDrag(el);
      goNext ? next() : prev();
    });
  } else {
    if(REDUCED || !dx){ endDrag(el); applyScrollState(false); return; }
    /* Fell short: spring home from wherever the finger left it. */
    g.cancelSpring = spring(dx, 0, v, 0, function(x){ setDrag(el,x); }, function(){
      endDrag(el); applyScrollState(false);
    });
  }
}
slidesEl.addEventListener('pointerup', finishDrag);
slidesEl.addEventListener('pointercancel', function(e){
  if(g.id!==e.pointerId) return;
  var el=g.el; g.id=null; g.el=null; g.axis=null;
  if(!REDUCED && g.dx) g.cancelSpring=spring(g.dx,0,0,0,function(x){setDrag(el,x);},function(){endDrag(el);});
  else endDrag(el);
  g.dx=0;
});

/* ── theme-color: sky-to-ground, not sky-inside-a-box ────────────────────
   Impossible under Apps Script HtmlService, where the browser chrome
   belongs to script.google.com. On a real origin the chrome itself can
   bleed into the loader's sky gradient, then swap to parchment once the
   loader clears -- driven off the same timeout that adds #loader.gone. */
var THEME_COLOR_PAPER = '#FFFCF7';
function setThemeColor(hex){
  var m = document.querySelector('meta[name="theme-color"]');
  if(m) m.setAttribute('content', hex);
}

/* ── boot: fetch the payload, then build and reveal ──────────────────────
   Replaces the old server-templated `var P = <?!= payload ?>` with a real
   network round trip (api.js). revealFromLoader() waits for BOTH the fetch
   to resolve AND LOAD_MIN to elapse, then reveals immediately -- so a fast
   response still holds for one full second (long enough to read as an
   intentional first scene, not a flicker), but a slow cold-start Apps
   Script response is never padded with EXTRA artificial waiting once the
   data is actually back. Previously a flat 3000ms regardless of how fast
   the fetch returned. */
var loaderEl=document.getElementById('loader');
var LOAD_MIN=1000; // keep in sync with the 1s in .ldr-bar > i's animation
var RUSH_MS=1100;  // keep in sync with .ldr-rush's 1.1s animation

function showLoaderError(message){
  if(!loaderEl) return;
  loaderEl.classList.add('error');
  var content = loaderEl.querySelector('.ldr-content');
  if(content){
    content.innerHTML =
      '<p class="ldr-title" style="flex-direction:column;gap:10px;text-align:center;max-width:78%">'+
        '<span>We couldn’t load your Wrapped.</span>'+
        '<span class="sm" style="font-family:Montserrat;font-weight:600;font-size:13px;opacity:.8">'+
          (message||'Check your connection and try again.')+
        '</span>'+
      '</p>'+
      '<button class="btn" style="width:auto;padding:12px 22px;margin-top:6px" onclick="location.reload()">Try again</button>';
  }
}

function revealFromLoader(){
  var elapsed=((window.performance && performance.now) ? performance.now() : Date.now())-LOAD_T0;
  setTimeout(function(){
    // Slide zero is settled behind the loader before any class below
    // touches it, so whichever exit plays, there's already ground to land
    // on.
    show(0);
    setThemeColor(THEME_COLOR_PAPER);
    var slide0=slideEls[0];
    var villageEl=document.getElementById('village');
    if(!loaderEl){ return; }
    if(REDUCED){
      loaderEl.classList.add('gone');
    } else {
      // Pulled-in start state applied while the loader is still fully
      // opaque, so there's no flash of it snapping into place -- then
      // forced-reflow + rAF so the browser paints that start state before
      // .ldr-land changes the target, which is what makes it a transition
      // instead of an instant jump.
      [villageEl, slide0].forEach(function(el){ el.classList.add('ldr-fall'); });
      void villageEl.offsetWidth;
      requestAnimationFrame(function(){ requestAnimationFrame(function(){
        [villageEl, slide0].forEach(function(el){ el.classList.add('ldr-land'); });
      }); });
      loaderEl.classList.add('done');           // fades the title/walker/bar,
      setTimeout(function(){                    // starts the cloud rush, then
        loaderEl.classList.add('gone');         // the whole loader clears once
      }, RUSH_MS);                               // the clouds have passed.
    }
    loaderEl.addEventListener('transitionend',function done(e){
      // .ldr-content fades too and that transition bubbles here -- only
      // remove the loader once it's the loader's own opacity that finished.
      if(e.target!==loaderEl) return;
      loaderEl.removeEventListener('transitionend',done);
      loaderEl.remove();
      [villageEl, slide0].forEach(function(el){ el.classList.remove('ldr-fall','ldr-land'); });
      maybeShowSwipeHint(); // one-time, slide-one-only -- see its own comment above
    });
  }, Math.max(0, LOAD_MIN-elapsed));
}

var TOK = null;

function boot(){
  var qs = new URLSearchParams(location.search);
  TOK = qs.get('id') || '';
  var mock = qs.get('mock');

  if(loaderEl){
    // Swallow taps on the loader itself so an eager first tap doesn't land
    // on #frame's click handler underneath and skip straight to slide two.
    loaderEl.addEventListener('click',function(e){ e.stopPropagation(); });
  }

  if(!TOK && !mock){
    showLoaderError('This link is missing its code. Ask for a fresh Wrapped link.');
    return;
  }

  CelavilleAPI.loadPayload(TOK, mock).then(function(payload){
    buildSlides(payload);
    buildDom();
    revealFromLoader();
  }).catch(function(err){
    showLoaderError(err && err.userMessage ? err.userMessage : 'Something went wrong loading your data.');
  });
}

if(loaderEl){
  boot();
} else {
  // No loader in the markup at all (shouldn't happen in production) --
  // still go through the same boot path, just without the reveal timing.
  boot();
}
