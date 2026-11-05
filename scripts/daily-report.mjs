// Daily visitor report: reads yesterday's numbers from Umami Cloud and emails them via Brevo.
// Secrets come from the environment (GitHub Actions secrets); nothing sensitive is stored in the repo.
const UMAMI_KEY = process.env.UMAMI_API_KEY;
const BREVO_KEY = process.env.BREVO_API_KEY;
const WEBSITE_ID = process.env.UMAMI_WEBSITE_ID || '5b4959e6-32c2-4901-9919-88007c4ef5a2';
const TO = (process.env.REPORT_TO || 'info@ginastravel.co.uk').split(',').map(s=>s.trim()).filter(Boolean);
const FROM = process.env.REPORT_FROM || 'info@ginastravel.co.uk';
const TZ = 'Europe/London';
if(!UMAMI_KEY || !BREVO_KEY){ console.error('Missing UMAMI_API_KEY or BREVO_API_KEY'); process.exit(1); }

// Yesterday in London time
const now = new Date();
const londonDate = d => new Date(d.toLocaleString('en-US',{timeZone:TZ}));
const ld = londonDate(now); ld.setDate(ld.getDate()-1);
const y = ld.getFullYear(), m = ld.getMonth(), d = ld.getDate();
const offsetMs = now.getTime() - londonDate(now).getTime();
const startAt = new Date(y,m,d,0,0,0).getTime() + offsetMs;
const endAt = new Date(y,m,d,23,59,59,999).getTime() + offsetMs;
const weekStart = startAt - 6*24*3600*1000;
const label = new Date(y,m,d).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});

const api = async (path, params={}) => {
  const u = new URL('https://api.umami.is/v1/websites/'+WEBSITE_ID+path);
  Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
  const r = await fetch(u,{headers:{'x-umami-api-key':UMAMI_KEY,'Accept':'application/json'}});
  if(!r.ok) throw new Error('Umami '+path+' '+r.status+' '+(await r.text()).slice(0,200));
  return r.json();
};
const n = v => (v && typeof v==='object') ? (v.value ?? 0) : (v ?? 0);
const stats = await api('/stats',{startAt,endAt,timezone:TZ});
const week = await api('/stats',{startAt:weekStart,endAt,timezone:TZ});
const metric = async type => (await api('/metrics',{startAt,endAt,type,timezone:TZ,limit:6})).map(r=>({name:r.x||'(direct)',count:r.y}));
const [countries, pages, referrers] = await Promise.all([metric('country'),metric('url'),metric('referrer')]);
const cname = new Intl.DisplayNames(['en'],{type:'region'});
const country = c => { try{ return c && c.length===2 ? cname.of(c.toUpperCase()) : (c||'Unknown'); }catch(e){ return c||'Unknown'; } };
const visitors = n(stats.visitors), views = n(stats.pageviews), visits = n(stats.visits), totaltime = n(stats.totaltime), bounces = n(stats.bounces);
const prevVisitors = stats.visitors?.prev ?? stats.visitors?.change ?? null;
const avg = visits ? Math.round(totaltime/visits) : 0;
const fmtTime = s => s>=60 ? Math.floor(s/60)+'m '+(s%60)+'s' : s+'s';
const esc = s => String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const list = (rows, f=x=>x) => rows.length ? rows.map(r=>`<tr><td style="padding:6px 0;color:#141A3F">${esc(f(r.name))}</td><td style="padding:6px 0;text-align:right;font-weight:600;color:#1E2C96">${r.count}</td></tr>`).join('') : '<tr><td style="padding:6px 0;color:#8A8FA8">Nothing recorded</td><td></td></tr>';
const tile = (k,v,sub='') => `<td style="padding:8px"><div style="background:#FBF9F5;border:1px solid #E4E1D8;border-radius:14px;padding:16px;text-align:center"><div style="font-size:30px;font-weight:700;color:#1E2C96;font-family:Arial,sans-serif">${v}</div><div style="font-size:12px;color:#4A5070;margin-top:4px">${k}</div>${sub?`<div style="font-size:11px;color:#8A8FA8;margin-top:2px">${sub}</div>`:''}</div></td>`;
const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:0 auto;color:#141A3F">
<div style="background:#1E2C96;border-radius:18px 18px 0 0;padding:22px 26px;color:#fff"><div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#FFB369;font-weight:700">Daily website report</div><div style="font-size:22px;font-weight:700;margin-top:4px">ginastravel.co.uk</div><div style="font-size:14px;opacity:.85;margin-top:2px">${label}</div></div>
<div style="background:#fff;border:1px solid #E4E1D8;border-top:0;border-radius:0 0 18px 18px;padding:18px 18px 24px">
<table width="100%" cellpadding="0" cellspacing="0"><tr>${tile('Visitors',visitors)}${tile('Page views',views)}${tile('Avg. time on site',fmtTime(avg))}</tr></table>
<table width="100%" cellpadding="0" cellspacing="0"><tr>${tile('Visits',visits)}${tile('Bounces',bounces)}${tile('Visitors, last 7 days',n(week.visitors))}</tr></table>
<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px"><tr>
<td valign="top" style="padding:8px;width:33%"><div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#E0731A;font-weight:700;margin-bottom:6px">Where from</div><table width="100%">${list(countries,country)}</table></td>
<td valign="top" style="padding:8px;width:33%"><div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#E0731A;font-weight:700;margin-bottom:6px">Pages viewed</div><table width="100%">${list(pages)}</table></td>
<td valign="top" style="padding:8px;width:33%"><div style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#E0731A;font-weight:700;margin-bottom:6px">Came via</div><table width="100%">${list(referrers)}</table></td>
</tr></table>
<p style="font-size:12px;color:#8A8FA8;margin:16px 8px 0">Full dashboard: <a href="https://cloud.umami.is" style="color:#1E2C96">cloud.umami.is</a>. Sent automatically every morning.</p>
</div></div>`;
const text = `Daily website report — ginastravel.co.uk — ${label}\nVisitors: ${visitors}\nPage views: ${views}\nVisits: ${visits}\nAvg time: ${fmtTime(avg)}\nVisitors last 7 days: ${n(week.visitors)}\n\nWhere from: ${countries.map(c=>country(c.name)+' '+c.count).join(', ')||'-'}\nPages: ${pages.map(p=>p.name+' '+p.count).join(', ')||'-'}\nReferrers: ${referrers.map(r=>r.name+' '+r.count).join(', ')||'-'}`;
const r = await fetch('https://api.brevo.com/v3/smtp/email',{method:'POST',headers:{'api-key':BREVO_KEY,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({sender:{name:"Gina's Travel website",email:FROM},to:TO.map(email=>({email})),subject:`Website report for ${label}: ${visitors} visitor${visitors===1?'':'s'}`,htmlContent:html,textContent:text})});
if(!r.ok){ console.error('Brevo', r.status, (await r.text()).slice(0,300)); process.exit(1); }
console.log('Report sent for', label, '— visitors:', visitors, 'views:', views);
