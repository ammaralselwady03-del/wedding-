const SUPA_URL="https://ojfnqfjbeknsiustzjpx.supabase.co";
const SUPA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZm5xZmpiZWtuc2l1c3R6anB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNDczMjgsImV4cCI6MjEwMjYyMzMyOH0.hZ-AzI_n-v9nnGqjI57zrHTVqa_m3W-NRxKRXaW5fGU";
// الجلسة تبقى بالتاب (الريفرش لا يخرجك)، وتُمسح عند إغلاق المتصفح
const sb=supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:true,autoRefreshToken:true,storage:window.sessionStorage}});
const $=id=>document.getElementById(id);
const show=id=>{["login","home","responses","design","passView","owner"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden");};
const SITE_ROOT=location.origin+location.pathname.replace(/[^/]*$/,"");
const USER_DOMAIN="@gmail.com";
const toEmail=u=>u.toLowerCase().trim()+USER_DOMAIN;
let INV=null, RESP=[], previewReady=false;

/* ===== تبويبات الدخول ===== */
$("tabLogin").addEventListener("click",()=>{$("tabLogin").classList.add("active");$("tabSignup").classList.remove("active");$("loginForm").classList.remove("hidden");$("signupForm").classList.add("hidden");});
$("tabSignup").addEventListener("click",()=>{$("tabSignup").classList.add("active");$("tabLogin").classList.remove("active");$("signupForm").classList.remove("hidden");$("loginForm").classList.add("hidden");});

$("loginBtn").addEventListener("click",async()=>{
  $("loginErr").textContent="";
  const u=$("loginUser").value.trim();
  if(!u){$("loginErr").textContent="اكتب اسم المستخدم";return;}
  const {error}=await sb.auth.signInWithPassword({email:toEmail(u),password:$("loginPass").value});
  if(error){$("loginErr").textContent="اسم المستخدم أو كلمة المرور غير صحيحة";return;}
  afterLogin();
});
$("signupBtn").addEventListener("click",async()=>{
  $("signupErr").textContent="";
  const code=$("suCode").value.trim(), u=$("suUser").value.trim().toLowerCase(), p=$("suPass").value;
  if(!/^[a-z0-9_]{3,20}$/.test(u)){$("signupErr").textContent="اسم المستخدم: أحرف إنجليزية صغيرة وأرقام (3-20)";return;}
  if(p.length<6){$("signupErr").textContent="كلمة المرور 6 أحرف على الأقل";return;}
  const {data:ok,error:cErr}=await sb.rpc("check_invite_code",{p_code:code});
  if(cErr||!ok){$("signupErr").textContent="كود التسجيل غير صحيح أو مستخدم";return;}
  const {error}=await sb.auth.signUp({email:toEmail(u),password:p});
  if(error){$("signupErr").textContent=(error.message||"").includes("already")?"اسم المستخدم مأخوذ":"صار خطأ، حاول مرة ثانية";return;}
  await sb.auth.signInWithPassword({email:toEmail(u),password:p});
  await sb.rpc("consume_invite_code",{p_code:code}); // الكود يصير مستخدماً بعد نجاح التسجيل
  const {data:inv}=await sb.from("invitations").insert({data:{}}).select().single();
  INV=inv||null;
  afterLogin();
});
$("logout").addEventListener("click",async()=>{await sb.auth.signOut();INV=null;show("login");});

async function afterLogin(){
  let {data}=await sb.from("invitations").select("*").limit(1);
  if(!data||!data.length){const {data:inv}=await sb.from("invitations").insert({data:{}}).select().single();data=inv?[inv]:[];}
  if(data&&data.length){INV=data[0];show("home");}else{$("loginErr").textContent="صار خطأ بتحميل الدعوة";show("login");}
}
async function checkSession(){const {data}=await sb.auth.getSession();if(data&&data.session){afterLogin();}else{show("login");}}
checkSession();

/* ===== تنقّل ===== */
$("goResponses").addEventListener("click",()=>{show("responses");loadResponses();});
$("goDesign").addEventListener("click",()=>{show("design");loadSettings();});
$("goPass").addEventListener("click",()=>{$("passErr").textContent="";$("passOk").textContent="";$("newPass").value="";$("newPass2").value="";show("passView");});
$("dlCard").addEventListener("click",()=>{if(!INV.slug){alert("احفظ التصميم أولاً ليتولّد الرابط");return;}window.open(SITE_ROOT+INV.slug+"?save=1","_blank");});
$("backFromResp").addEventListener("click",()=>show("home"));
$("backFromDesign").addEventListener("click",()=>show("home"));
$("backFromPass").addEventListener("click",()=>show("home"));

/* ===== نسخ ===== */
function copyText(text,btn){
  const done=()=>{btn.textContent="✓ تم";setTimeout(()=>btn.textContent="نسخ",1500);};
  if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(text).then(done).catch(fb);}else{fb();}
  function fb(){const ta=document.createElement("textarea");ta.value=text;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();try{document.execCommand("copy");done();}catch(e){alert("انسخ الرابط يدوياً:\n"+text);}document.body.removeChild(ta);}
}
$("copyDesignLink").addEventListener("click",()=>copyText($("designLink").value,$("copyDesignLink")));

/* ===== كلمة المرور ===== */
$("savePass").addEventListener("click",async()=>{
  $("passErr").textContent="";$("passOk").textContent="";
  const p1=$("newPass").value,p2=$("newPass2").value;
  if(p1.length<6){$("passErr").textContent="كلمة المرور 6 أحرف على الأقل";return;}
  if(p1!==p2){$("passErr").textContent="كلمتا المرور غير متطابقتين";return;}
  const {error}=await sb.auth.updateUser({password:p1});
  if(error){$("passErr").textContent="صار خطأ، حاول مرة ثانية";console.error(error);return;}
  $("passOk").textContent="✓ تم تغيير كلمة المرور";
});

/* ===== الردود ===== */
function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function loadResponses(){
  const {data,error}=await sb.from("rsvp").select("*").eq("invitation_id",INV.id).order("created_at",{ascending:false});
  if(error){$("summary").textContent="تعذّر تحميل الردود";console.error(error);return;}
  RESP=data||[];
  const coming=RESP.filter(r=>r.attending), guests=coming.reduce((s,r)=>s+(r.guests_count||0),0);
  $("summary").innerHTML=`عدد الردود: <b>${RESP.length}</b> &nbsp;•&nbsp; حاضرون: <b>${coming.length}</b> &nbsp;•&nbsp; إجمالي الأشخاص: <b>${guests}</b>`;
  let rows=`<tr><th>الاسم</th><th>الهاتف</th><th>الحضور</th><th>العدد</th><th>الرسالة</th></tr>`;
  RESP.forEach(r=>{const badge=r.attending?`<span class="badge y">حاضر</span>`:`<span class="badge n">معتذر</span>`;rows+=`<tr><td>${esc(r.name)}</td><td>${esc(r.phone)}</td><td>${badge}</td><td>${r.attending?(r.guests_count||1):"—"}</td><td class="msg">${esc(r.message||"")}</td></tr>`;});
  $("tbl").innerHTML=rows;
}
$("dlResp").addEventListener("click",()=>{
  if(!RESP.length){alert("لا توجد ردود بعد");return;}
  const e2=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  const coming=RESP.filter(r=>r.attending), guests=coming.reduce((s,r)=>s+(r.guests_count||0),0);
  const cp=(INV.data&&INV.data.couple)||{}, names=(cp.groom||"")+" و "+(cp.bride||"");
  let rows="";RESP.forEach((r,i)=>{rows+=`<tr><td>${i+1}</td><td>${e2(r.name)}</td><td style="direction:ltr">${e2(r.phone)}</td><td>${r.attending?"حاضر":"معتذر"}</td><td>${r.attending?(r.guests_count||1):"—"}</td><td>${e2(r.message||"")}</td></tr>`;});
  const html=`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>ردود الحضور</title><style>*{font-family:"Segoe UI",Tahoma,sans-serif}body{padding:28px;color:#3E3025}h1{color:#2E4A3A;text-align:center;margin:0 0 6px}.sub{text-align:center;color:#8A785F;margin-bottom:18px}.sum{background:#F3EAD9;border:1px solid #D9BC85;border-radius:10px;padding:12px;text-align:center;margin-bottom:16px}.sum b{color:#2E4A3A;font-size:1.2rem}table{width:100%;border-collapse:collapse;font-size:.9rem}th,td{border:1px solid #D9BC85;padding:8px 10px;text-align:start}th{background:#2E4A3A;color:#F3EAD9}tr:nth-child(even){background:#FAF5EC}.noprint{text-align:center;margin-bottom:16px}button{background:#2E4A3A;color:#fff;border:0;border-radius:50px;padding:10px 22px;font-size:1rem;cursor:pointer}@media print{.noprint{display:none}}</style></head><body><div class="noprint"><button onclick="window.print()">🖨️ طباعة / حفظ PDF</button></div><h1>ردود الحضور</h1>${names.trim()!=="و"?`<div class="sub">${e2(names)}</div>`:""}<div class="sum">عدد الردود: <b>${RESP.length}</b> &nbsp;•&nbsp; حاضرون: <b>${coming.length}</b> &nbsp;•&nbsp; إجمالي الأشخاص: <b>${guests}</b></div><table><tr><th>#</th><th>الاسم</th><th>الهاتف</th><th>الحضور</th><th>العدد</th><th>الرسالة</th></tr>${rows}</table></body></html>`;
  const w=window.open("","_blank");w.document.write(html);w.document.close();w.focus();setTimeout(()=>{try{w.print();}catch(e){}},500);
});

/* ===== التصميم ===== */
const DEF_COLORS={bg:"#EFE4D6",card:"#F7F0E5",gold:"#B8924E",green:"#2E4A3A",ink:"#3E3025",muted:"#8A785F"};
function loadSettings(){
  const c=INV.data||{}, cp=c.couple||{}, t=c.text||{}, m=c.media||{}, col=c.colors||{}, sh=c.show||{};
  $("f_lang").value=(c.lang==="en")?"en":"ar";
  $("f_groomTitle").value=cp.groomTitle||"";$("f_groom").value=cp.groom||"";
  $("f_groomFatherTitle").value=cp.groomFatherTitle||"";$("f_groomFather").value=cp.groomFather||"";
  $("f_brideTitle").value=cp.brideTitle||"";$("f_bride").value=cp.bride||"";
  $("f_brideFatherTitle").value=cp.brideFatherTitle||"";$("f_brideFather").value=cp.brideFather||"";
  $("f_datetime").value=(c.datetime||"2026-08-24T19:00:00").slice(0,16);
  $("f_blessing").value=t.blessing||"";
  $("f_bismillah").value=(c.bismillah!==undefined)?c.bismillah:"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
  $("f_verse").value=(c.verse!==undefined)?c.verse:"﴿ وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً ﴾";
  $("f_show_bismillah").checked=(sh.bismillah!==false);
  $("f_show_verse").checked=(sh.verse!==false);
  $("f_footer").value=t.footer||"";
  $("f_venueName").value=t.venueName||"";$("f_venueSub").value=t.venueSub||"";
  $("f_mapUrl").value=m.mapUrl||"";$("f_mapEmbed").value=m.mapEmbed||"";
  $("f_notePhoto").value=t.notePhoto||"";$("f_noteKids").value=t.noteKids||"";
  $("f_couplePhoto").value=m.couplePhoto||"";$("f_gallery").value=(m.gallery||[]).join("\n");$("f_music").value=m.music||"";
  $("c_bg").value=col.bg||DEF_COLORS.bg;$("c_card").value=col.card||DEF_COLORS.card;$("c_gold").value=col.gold||DEF_COLORS.gold;
  $("c_green").value=col.green||DEF_COLORS.green;$("c_ink").value=col.ink||DEF_COLORS.ink;$("c_muted").value=col.muted||DEF_COLORS.muted;

  if(INV.slug){$("designLink").value=SITE_ROOT+INV.slug;$("designLinkBox").style.display="block";}
  else{$("designLinkBox").style.display="none";}

  // المعاينة الحيّة (غير مربوطة برابط)
  previewReady=false;
  $("preview").src="index.html?preview=1";
}

function collectData(){
  return {
    lang:$("f_lang").value,
    couple:{
      groomTitle:$("f_groomTitle").value,groom:$("f_groom").value,
      groomFatherTitle:$("f_groomFatherTitle").value,groomFather:$("f_groomFather").value,
      brideTitle:$("f_brideTitle").value,bride:$("f_bride").value,
      brideFatherTitle:$("f_brideFatherTitle").value,brideFather:$("f_brideFather").value
    },
    datetime:($("f_datetime").value||"2026-08-24T19:00")+":00",
    show:{bismillah:$("f_show_bismillah").checked,verse:$("f_show_verse").checked},
    bismillah:$("f_bismillah").value,
    verse:$("f_verse").value,
    text:{blessing:$("f_blessing").value,venueName:$("f_venueName").value,venueSub:$("f_venueSub").value,
      notePhoto:$("f_notePhoto").value,noteKids:$("f_noteKids").value,footer:$("f_footer").value},
    media:{mapUrl:$("f_mapUrl").value,mapEmbed:$("f_mapEmbed").value,couplePhoto:$("f_couplePhoto").value,music:$("f_music").value,
      gallery:$("f_gallery").value.split("\n").map(s=>s.trim()).filter(Boolean)},
    colors:{bg:$("c_bg").value,card:$("c_card").value,gold:$("c_gold").value,green:$("c_green").value,ink:$("c_ink").value,muted:$("c_muted").value}
  };
}

/* بثّ المعاينة الحيّة */
function pushPreview(){
  if(!previewReady)return;
  try{$("preview").contentWindow.postMessage({type:"preview",data:collectData()},"*");}catch(e){}
}
window.addEventListener("message",ev=>{
  if(ev.data&&ev.data.type==="preview-ready"){previewReady=true;pushPreview();}
});
let pvTimer=null;
$("design").addEventListener("input",()=>{clearTimeout(pvTimer);pvTimer=setTimeout(pushPreview,250);});

/* توليد الرابط من الأسماء */
function slugify(s){return String(s||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}
function randSlug(){return "inv-"+Math.random().toString(36).slice(2,8);}
async function ensureSlug(){
  if(INV.slug)return INV.slug;
  let base=(slugify($("f_groom").value)+"-"+slugify($("f_bride").value)).replace(/^-+|-+$/g,"");
  if(!base||base==="-")base=randSlug();
  let slug=base,n=1;
  while(true){
    const {data}=await sb.from("invitations").select("id").eq("slug",slug).neq("id",INV.id).limit(1);
    if(!data||!data.length)break;
    n++;slug=base+"-"+n;
  }
  await sb.from("invitations").update({slug}).eq("id",INV.id);
  INV.slug=slug;return slug;
}

$("saveBtn").addEventListener("click",async()=>{
  const data=collectData();
  $("savedMsg").textContent="جارٍ الحفظ...";
  const {error}=await sb.from("invitations").update({data,updated_at:new Date().toISOString()}).eq("id",INV.id);
  if(error){$("savedMsg").textContent="صار خطأ بالحفظ";console.error(error);return;}
  INV.data=data;
  await ensureSlug();
  const link=SITE_ROOT+INV.slug;
  $("designLink").value=link;$("designLinkBox").style.display="block";
  $("savedMsg").textContent="✓ تم الحفظ";
  setTimeout(()=>$("savedMsg").textContent="",2500);
  pushPreview();
});

/* ===== شاشة المالك (إدارة الأكواد) — 3 ضغطات على زر دخول ===== */
let clickTimes=[];
$("loginBtn").addEventListener("click",()=>{
  const now=Date.now();
  clickTimes.push(now);
  clickTimes=clickTimes.filter(t=>now-t<900);
  if(clickTimes.length>=3){ clickTimes=[]; openOwner(); }
});
function openOwner(){
  $("ownErr").textContent=""; $("ownUser").value=""; $("ownPass").value="";
  $("ownerLogin").classList.remove("hidden"); $("ownerPanel").classList.add("hidden");
  show("owner");
}
$("ownerBack").addEventListener("click",()=>show("login"));

$("ownLoginBtn").addEventListener("click",async()=>{
  $("ownErr").textContent="";
  const u=$("ownUser").value.trim();
  if(!u){$("ownErr").textContent="اكتب اسم المستخدم";return;}
  const {error}=await sb.auth.signInWithPassword({email:toEmail(u),password:$("ownPass").value});
  if(error){$("ownErr").textContent="بيانات الدخول غير صحيحة";return;}
  const {data:owner}=await sb.rpc("am_i_owner");
  if(!owner){$("ownErr").textContent="هذا الحساب ليس مالكاً";await sb.auth.signOut();return;}
  $("ownerLogin").classList.add("hidden");
  $("ownerPanel").classList.remove("hidden");
  loadCodes();
});

function randCode(){
  const A="ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s="";
  for(let i=0;i<6;i++) s+=A[Math.floor(Math.random()*A.length)];
  return s;
}
$("genCode").addEventListener("click",async()=>{
  $("genMsg").textContent="";
  const days=parseInt($("codeDays").value||"0",10)||0;
  let code=randCode();
  const {data:ok,error}=await sb.rpc("admin_add_code",{p_code:code,p_days:days});
  if(error||!ok){$("genMsg").textContent="صار خطأ، حاول مرة ثانية";console.error(error);return;}
  $("genMsg").textContent="كود جديد: "+code+(days>0?` (صالح ${days} يوم)`:" (بلا انتهاء)");
  loadCodes();
});

async function loadCodes(){
  await sb.rpc("purge_expired").catch(()=>{}); // نظّف المنتهي قبل العرض
  const {data,error}=await sb.rpc("admin_list_codes");
  const tbl=$("codesTbl");
  if(error){tbl.innerHTML="<tr><td>تعذّر التحميل</td></tr>";console.error(error);return;}
  let rows=`<tr><th>الكود</th><th>الحالة</th><th>ينتهي</th><th></th></tr>`;
  (data||[]).forEach(c=>{
    const st=c.used?`<span class="badge n">مستخدم</span>`:`<span class="badge y">متاح</span>`;
    let exp="—";
    if(c.expires_at){
      const d=new Date(c.expires_at), past=d.getTime()<Date.now();
      exp=`<span style="color:${past?'#9C4A3C':'var(--muted)'}">${d.toLocaleDateString("ar-EG")}${past?" (منتهٍ)":""}</span>`;
    }
    rows+=`<tr><td style="font-weight:700">${esc(c.code)}</td><td>${st}</td><td>${exp}</td><td><button class="btn ghost del-code" data-code="${esc(c.code)}" style="padding:6px 14px">حذف</button></td></tr>`;
  });
  tbl.innerHTML=rows;
  tbl.querySelectorAll(".del-code").forEach(b=>b.addEventListener("click",async()=>{
    if(!confirm("حذف الكود "+b.dataset.code+"؟"))return;
    await sb.rpc("admin_delete_code",{p_code:b.dataset.code});
    loadCodes();
  }));
}
