// share.js -- Celaville CTW ("Letters from the Booth")
// drawShareCard() and the share sheet open/close logic. Canvas-rendered at a
// fixed 1080x1920 (native Instagram Stories resolution) so the output is
// identical regardless of the reader's own screen. No html2canvas or any
// other library -- this stays a strict offline-capable static site, so a
// CDN import isn't an option even if one were wanted.

/* Up to four stat tiles for the card, in priority order, each carrying a
   `key` (which icon drawStatIcon_ draws) and a `color` (brand token tinting
   the tile). Built from the same payload shape the slide deck itself reads
   -- shifts/dept/standout/team/longestDay -- so the card only ever shows
   what genuinely applies to this person. */
function shareStats(){
  var out=[];
  if(P.totals) out.push({key:'shifts', label:'Shifts logged', value:(P.totals.shifts||0)+' · '+fmtHours(P.totals.minutes), color:'coral'});
  if(P.dept) out.push({key:'dept', label:'Department', value:(P.dept.label||P.dept.short||''), color: P.dept.color?null:'leaf', hex:P.dept.color});
  if(P.standout) out.push({key:'standout', label:'Standout', value:P.standout.headline, color:'sky'});
  if(P.longestDay && P.longestDay.date) out.push({key:'longestday', label:'Longest day', value:dateLabel(P.longestDay.date)+' · '+fmtHours(P.longestDay.minutes), color:'sage'});
  if(P.team) out.push({key:'team', label:'The whole crew', value:(P.team.people||0)+' people · '+fmtHours(P.team.minutes), color:'yellow'});
  return out.slice(0,4);
}

/* Wraps text to a max width, returning the lines. Canvas has no text
   wrapping of its own. */
function wrapText(ctx,text,maxW){
  var words=String(text).split(' '), lines=[], cur='';
  for(var i=0;i<words.length;i++){
    var test=cur?cur+' '+words[i]:words[i];
    if(ctx.measureText(test).width>maxW && cur){ lines.push(cur); cur=words[i]; }
    else cur=test;
  }
  if(cur) lines.push(cur);
  return lines;
}

function roundRectPath(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r[0],y);
  ctx.lineTo(x+w-r[1],y); ctx.quadraticCurveTo(x+w,y,x+w,y+r[1]);
  ctx.lineTo(x+w,y+h-r[2]); ctx.quadraticCurveTo(x+w,y+h,x+w-r[2],y+h);
  ctx.lineTo(x+r[3],y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r[3]);
  ctx.lineTo(x,y+r[0]); ctx.quadraticCurveTo(x,y,x+r[0],y);
  ctx.closePath();
}

/* #RRGGBB -> rgba(...) string, for a brand hex dropped in at a given alpha
   for a tile wash without keeping a second rgba copy of every color. */
function hexA_(hex,a){
  var h=String(hex).replace('#','');
  if(h.length!==6) return 'rgba(79,64,54,'+a+')';
  var r=parseInt(h.substring(0,2),16), g=parseInt(h.substring(2,4),16), b=parseInt(h.substring(4,6),16);
  return 'rgba('+r+','+g+','+b+','+a+')';
}

/* A scalloped postmark medallion in the top-right corner, echoing the same
   motif drawn in the page chrome (index.html's #postmark) -- kept through
   this redesign on purpose, since a stamped postmark fits a letter card
   far better than it ever fit a village postcard. */
function drawPostmark_(x,W,H){
  var r=30, cx=W-46-r, cy=46+r;
  x.save();
  x.fillStyle='#FBF6EC';
  var n=8;
  for(var i=0;i<n;i++){
    var a=(-88+(i/(n-1))*86)*Math.PI/180;
    var px=cx+Math.cos(a)*r, py=cy+Math.sin(a)*r;
    x.beginPath(); x.arc(px,py,6,0,Math.PI*2); x.fill();
  }
  x.strokeStyle='rgba(79,64,54,.28)'; x.lineWidth=2;
  x.beginPath(); x.arc(cx-8,cy+14,24,0,Math.PI*2); x.stroke();
  x.beginPath(); x.moveTo(cx-46,cy-4); x.lineTo(cx+14,cy+22); x.stroke();
  x.beginPath(); x.moveTo(cx-40,cy+6); x.lineTo(cx+20,cy+32); x.stroke();
  x.restore();
}

/* One small ink-line glyph per stat category -- this project's own
   iconography (a ticket stub, a small roofline, a sparkle, a sun-over-
   clock, a cluster of people) rather than the old village persona icons.
   Unrecognized/future keys fall through to a plain diamond. */
function drawStatIcon_(x,key,cx,cy,r,fill,ink){
  x.save();
  x.lineJoin='round'; x.lineCap='round';
  x.fillStyle=fill; x.strokeStyle=ink; x.lineWidth=3;
  if(key==='shifts'){
    // a ticket stub with a torn perforated edge
    roundRectPath(x,cx-r,cy-r*0.7,r*2,r*1.4,[6,6,6,6]);
    x.fill(); x.stroke();
    x.strokeStyle=ink; x.lineWidth=1.6; x.setLineDash([3,3]);
    x.beginPath(); x.moveTo(cx-r*0.15,cy-r*0.7); x.lineTo(cx-r*0.15,cy+r*0.7); x.stroke();
    x.setLineDash([]);
  } else if(key==='dept'){
    // a small booth roof + counter
    x.beginPath();
    x.moveTo(cx-r,cy+r*0.15); x.lineTo(cx,cy-r*0.85); x.lineTo(cx+r,cy+r*0.15);
    x.closePath(); x.fill(); x.stroke();
    x.fillStyle=fill;
    roundRectPath(x,cx-r*0.7,cy+r*0.15,r*1.4,r*0.6,[3,3,3,3]);
    x.fill(); x.stroke();
  } else if(key==='standout'){
    // an 8-point sparkle
    x.beginPath();
    for(var i=0;i<8;i++){
      var len=(i%2===0)?r:r*0.42, ang=i*(Math.PI/4)-Math.PI/2;
      var px=cx+Math.cos(ang)*len, py=cy+Math.sin(ang)*len;
      if(i===0) x.moveTo(px,py); else x.lineTo(px,py);
    }
    x.closePath(); x.fill(); x.stroke();
  } else if(key==='longestday'){
    // a small sun over a clock tick
    x.beginPath(); x.arc(cx,cy-r*0.15,r*0.5,0,Math.PI*2); x.fill(); x.stroke();
    x.strokeStyle=ink; x.lineWidth=r*0.1;
    for(var a2=0;a2<8;a2++){
      var ang2=a2*(Math.PI/4);
      x.beginPath();
      x.moveTo(cx+Math.cos(ang2)*r*0.62,cy-r*0.15+Math.sin(ang2)*r*0.62);
      x.lineTo(cx+Math.cos(ang2)*r*0.85,cy-r*0.15+Math.sin(ang2)*r*0.85);
      x.stroke();
    }
  } else if(key==='team'){
    // three small heads -- the whole crew, not just one persona
    [-r*0.5,0,r*0.5].forEach(function(ox,i){
      x.beginPath(); x.arc(cx+ox,cy+(i===1?-r*0.12:r*0.1),r*0.34,0,Math.PI*2);
      x.fillStyle=fill; x.fill(); x.strokeStyle=ink; x.lineWidth=1.8; x.stroke();
    });
  } else {
    x.beginPath();
    x.moveTo(cx,cy-r); x.lineTo(cx+r,cy); x.lineTo(cx,cy+r); x.lineTo(cx-r,cy);
    x.closePath(); x.fill(); x.stroke();
  }
  x.restore();
}

function drawShareCard(){
  var W=1080,H=1920;
  var c=document.createElement('canvas'); c.width=W; c.height=H;
  var x=c.getContext('2d');

  // paper base -- a faint warm gradient standing in for the on-page cream
  // paper texture, plus the wobbly ink frame every other surface uses.
  var bg=x.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#FFFDF7'); bg.addColorStop(1,'#FBF6EC');
  x.fillStyle=bg; x.fillRect(0,0,W,H);

  x.strokeStyle='rgba(79,64,54,.7)'; x.lineWidth=7;
  roundRectPath(x,46,46,W-92,H-92,[24,24,24,24]);
  x.stroke();
  x.strokeStyle='#E8DCC6'; x.lineWidth=3; x.setLineDash([10,12]);
  roundRectPath(x,78,78,W-156,H-156,[18,18,18,18]);
  x.stroke(); x.setLineDash([]);

  drawPostmark_(x,W,H);

  var cx=W/2;
  x.textAlign='center';

  x.fillStyle='#C9493B';
  x.font='700 30px Montserrat, sans-serif';
  x.fillText('RECWEEK & WELCOME WEEK 2026', cx, 216);

  x.fillStyle='#4F4036';
  x.font='400 118px Bevan, Georgia, serif';
  x.fillText('Celaville CTW', cx, 350);

  x.fillStyle='#6B5D51';
  x.font='600 36px Montserrat, sans-serif';
  x.fillText((P.nickname||P.firstName||P.name||'')+'’s thank-you letter', cx, 418);

  // dept badge as the hero line, since there is no single "persona" concept
  // in this payload -- the person's own department + role is the most
  // "them" fact on the card.
  var y=560;
  x.font='800 66px Grandstander, sans-serif';
  x.fillStyle='#4F4036';
  var nameLines=wrapText(x,P.name||'',W-260);
  nameLines.forEach(function(l){ x.fillText(l,cx,y); y+=76; });
  if(P.dept){
    y+=14;
    x.font='700 32px Montserrat, sans-serif';
    x.fillStyle='#527D5E';
    x.fillText((P.dept.label||P.dept.short||'')+(P.position?' · '+P.position:''), cx, y);
  }
  y+=44;
  x.strokeStyle='#D94F40'; x.lineWidth=4; x.lineCap='round';
  x.beginPath(); x.moveTo(cx-70,y); x.lineTo(cx+70,y); x.stroke();
  y+=64;

  // stat grid -- up to four tiles, 2x2, each with its own ink-line icon and
  // brand-color wash.
  var rows=shareStats();
  var COLORS={coral:'#D94F40',leaf:'#5E8F6B',sky:'#9FD0EB',yellow:'#E4B64A',sage:'#A8C59A',peach:'#F3BF8D'};
  var gx=140, gw=W-280, gap=22, colW=(gw-gap)/2, cardH=214;
  x.textAlign='left';
  rows.forEach(function(r,i){
    var col=i%2, row=Math.floor(i/2);
    var bx=gx+col*(colW+gap), by=y+row*(cardH+gap);
    var tint=r.hex || COLORS[r.color] || '#6B5D51';

    roundRectPath(x,bx,by,colW,cardH,[16,16,16,16]);
    x.fillStyle=hexA_(tint,.14); x.fill();
    x.strokeStyle='#4F4036'; x.lineWidth=2.4; x.stroke();
    roundRectPath(x,bx+18,by-9,54,18,[3,3,3,3]);
    x.fillStyle=tint; x.fill();
    x.strokeStyle='#4F4036'; x.lineWidth=1.6; x.stroke();

    drawStatIcon_(x, r.key, bx+52, by+66, 26, tint, '#4F4036');

    x.fillStyle='#6B5D51'; x.font='700 21px Montserrat, sans-serif';
    x.fillText(r.label.toUpperCase(), bx+26, by+112);

    x.fillStyle='#4F4036'; x.font='800 31px Grandstander, sans-serif';
    var vl=wrapText(x,String(r.value),colW-52).slice(0,2);
    var vy=by+152;
    vl.forEach(function(l){ x.fillText(l,bx+26,vy); vy+=37; });
  });
  y += Math.ceil(rows.length/2)*(cardH+gap) + 6;

  // Footer CTA -- a flat paper pill, ink-bordered, sitting on the page
  // itself rather than over any scenery.
  var footerW=W-260, footerH=132, footerGap=48;
  var footerTop=y+footerGap, footerCy=footerTop+footerH/2;
  roundRectPath(x, cx-footerW/2, footerCy-footerH/2, footerW, footerH, [20,20,20,20]);
  x.fillStyle='rgba(255,253,247,.94)'; x.fill();
  x.strokeStyle='#4F4036'; x.lineWidth=2.6; x.stroke();
  x.textAlign='center';
  x.fillStyle='#C9493B'; x.font='800 34px Grandstander, sans-serif';
  x.fillText('Thank you for being part of this.', cx, footerCy-14);
  x.fillStyle='#4F4036'; x.font='600 28px Montserrat, sans-serif';
  x.fillText('From the rest of the Celaville team', cx, footerCy+38);

  return c;
}


/* ── share sheet: open/close ──────────────────────────────────────────────
   The sheet is a native <dialog id="sharewrap"> (index.html), opened with
   showModal() so it lands on the top layer with free Esc-to-close and
   focus trapping. Waits for webfonts first since drawShareCard's canvas
   text would otherwise silently fall back to a system face on a cold
   cache. */
function openShare(){
  var wrap=document.getElementById('sharewrap');
  var img=document.getElementById('shareimg');
  var dl=document.getElementById('sharedl');
  var go=function(){
    var c;
    try { c=drawShareCard(); } catch(e){ return; }
    var url;
    try { url=c.toDataURL('image/png'); } catch(e){ return; }
    img.src=url; dl.href=url;
    if(typeof wrap.showModal==='function'){
      if(!wrap.open) wrap.showModal();
    } else {
      wrap.classList.add('on');
    }
    // Web Share Level 2: hand the real PNG to the OS share sheet directly.
    // The data-URL <a download> above stays live as the desktop /
    // unsupported-browser fallback.
    if(c.toBlob){
      c.toBlob(function(blob){
        if(!blob) return;
        var file;
        try { file=new File([blob],'celaville-ctw.png',{type:'image/png'}); } catch(e){ return; }
        if(navigator.canShare && navigator.canShare({files:[file]})){
          var shareHint=document.getElementById('sharehint');
          if(shareHint) shareHint.textContent='Tip: use Share below to send it straight to Stories.';
          var shareBtn=document.getElementById('sharenative');
          if(shareBtn){
            shareBtn.hidden=false;
            shareBtn.onclick=function(e){
              e.stopPropagation();
              navigator.share({files:[file],title:'My Celaville CTW letter'}).catch(function(){});
            };
          }
        }
      },'image/png');
    }
  };
  if(document.fonts && document.fonts.ready && document.fonts.ready.then) document.fonts.ready.then(go, go);
  else go();
}
function closeShare(){
  var wrap=document.getElementById('sharewrap');
  if(typeof wrap.close==='function' && wrap.open) wrap.close();
  else wrap.classList.remove('on');
}
