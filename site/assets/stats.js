// stats.js -- Celaville CTW ("Letters from the Booth")
// Pure formatting/lookup helpers, no DOM. Loaded before slides.js so its
// exports (fmtHours, ordinal, DEPTS, deptOf, dateLabel) are ready the moment
// buildSlides() runs. Nothing in here touches document/window.

/* Minutes -> "12h 40m" / "45m" / "3h". Never shows "0h 0m" -- a shift with 0
   minutes logged still reads as something, not a blank. */
function fmtHours(mins){
  mins = Math.max(0, Math.round(Number(mins) || 0));
  var h = Math.floor(mins / 60), m = mins % 60;
  if(h <= 0) return m + 'm';
  if(m === 0) return h + 'h';
  return h + 'h ' + m + 'm';
}

/* 1 -> "1st", 2 -> "2nd", 11 -> "11th", 21 -> "21st" ... */
function ordinal(n){
  n = Math.round(Number(n) || 0);
  var s = ['th','st','nd','rd'], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* The nine core-team departments this thank-you covers. `color` is one of
   the exact brand hexes also used by the backend payload's own dept.color,
   so a badge painted from DEPTS always matches whatever P.dept.color says.
   `glyph` names a small marginalia doodle (drawn in slides.js/styles.css)
   standing in for an icon -- booth, clipboard, tent, crate, map, megaphone,
   pen, stamp, scroll -- never a stock icon-font glyph. */
var DEPTS = {
  OSR:               { label:'Office of Student Relations', short:'OSR',        color:'#D94F40', glyph:'booth'     },
  PROJECT_MANAGERS:  { label:'Project Managers',             short:'PMs',        color:'#5E8F6B', glyph:'clipboard' },
  PROGRAMS:          { label:'Programs',                     short:'Programs',   color:'#9FD0EB', glyph:'tent'      },
  LOGISTICS:         { label:'Logistics',                    short:'Logistics',  color:'#E4B64A', glyph:'crate'     },
  RECSTRAT:          { label:'Recruitment Strategy',         short:'RecStrat',   color:'#A8C59A', glyph:'map'       },
  DIGIC:             { label:'Digital Communications',       short:'DigiCom',    color:'#F3BF8D', glyph:'megaphone' },
  PROD_DESIGN:       { label:'Production & Design',          short:'ProdDesign', color:'#D94F40', glyph:'pen'       },
  DOCPUB:            { label:'Documentation & Publicity',    short:'DocPub',     color:'#5E8F6B', glyph:'stamp'     },
  FACULTY:           { label:'Faculty',                      short:'Faculty',    color:'#4F4036', glyph:'scroll'    }
};

/* Looks a dept up by key, tolerating the payload's own {key,label,short,
   color} shape taking priority -- deptOf() is a fallback/enrichment lookup,
   never a source of truth over what the payload itself already says. */
function deptOf(key){
  return DEPTS[key] || { label: String(key || 'Core Team'), short: String(key || 'Core Team'), color:'#4F4036', glyph:'scroll' };
}

/* ISO date ("2026-08-29") -> "Sat, Aug 29". Falls back to the raw string on
   anything unparsable rather than throwing or printing "Invalid Date". */
var DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function dateLabel(iso){
  if(!iso) return '';
  var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  if(!m) return String(iso);
  var d = new Date(Date.UTC(+m[1], +m[2]-1, +m[3]));
  if(isNaN(d.getTime())) return String(iso);
  return DOW[d.getUTCDay()] + ', ' + MON[d.getUTCMonth()] + ' ' + d.getUTCDate();
}
