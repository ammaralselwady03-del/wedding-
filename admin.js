const SUPA_URL="https://ojfnqfjbeknsiustzjpx.supabase.co";
const SUPA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZm5xZmpiZWtuc2l1c3R6anB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNDczMjgsImV4cCI6MjEwMjYyMzMyOH0.hZ-AzI_n-v9nnGqjI57zrHTVqa_m3W-NRxKRXaW5fGU";
// الجلسة تبقى بالتاب (الريفرش لا يخرجك)، وتُمسح عند إغلاق المتصفح
if(typeof supabase==="undefined"){alert("تعذّر تحميل مكتبة الاتصال. تأكد من الإنترنت أو أوقف منع التتبّع بالمتصفح ثم أعد التحميل.");throw new Error("supabase not loaded");}
const sb=supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:true,autoRefreshToken:true,storage:window.sessionStorage}});
const $=id=>document.getElementById(id);
const show=id=>{["login","home","responses","design","passView","owner"].forEach(x=>{const e=$(x);if(e)e.classList.add("hidden");});const t=$(id);if(t)t.classList.remove("hidden");};
const SITE_ROOT=location.origin+location.pathname.replace(/[^/]*$/,"");
const USER_DOMAIN="@gmail.com";
const toEmail=u=>u.toLowerCase().trim()+USER_DOMAIN;
let INV=null, RESP=[], previewReady=false, CARD_TYPE="wedding";

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
  await sb.rpc("consume_invite_code",{p_code:code,p_user:u,p_pass:p}); // يخزّن اليوزر/الباس
  const {data:inv}=await sb.from("invitations").insert({data:{}}).select().single();
  INV=inv||null;
  afterLogin();
});
$("logout").addEventListener("click",async()=>{await sb.auth.signOut();INV=null;show("login");});

async function afterLogin(){
  const {data:userData}=await sb.auth.getUser();
  const uid=userData?.user?.id;
  let {data}=await sb.from("invitations").select("*").eq("owner",uid).limit(1);  if(!data||!data.length){const {data:inv}=await sb.from("invitations").insert({data:{}}).select().single();data=inv?[inv]:[];}
  if(data&&data.length){INV=data[0];try{const {data:t}=await sb.rpc("my_card_type");CARD_TYPE=t||"wedding";}catch(e){CARD_TYPE="wedding";}show("home");}else{$("loginErr").textContent="صار خطأ بتحميل الدعوة";show("login");}
}
async function checkSession(){const {data}=await sb.auth.getSession();if(data&&data.session){afterLogin();}else{show("login");}}
checkSession();

/* ===== تنقّل ===== */
$("goResponses").addEventListener("click",()=>{show("responses");loadResponses();});
$("goDesign").addEventListener("click",()=>{show("design");loadSettings();});
$("goPass").addEventListener("click",()=>{$("passErr").textContent="";$("passOk").textContent="";$("newPass").value="";$("newPass2").value="";show("passView");});
$("dlCard").addEventListener("click",()=>{if(!INV.slug){alert("احفظ التصميم أولاً ليتولّد الرابط");return;}window.open(SITE_ROOT+INV.slug+"?save=1","_blank");});
$("backFromResp").addEventListener("click",()=>show("home"));
$("backFromDesign").addEventListener("click",async()=>{clearTimeout(saveTimer);await autoSave();show("home");});
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
const DEF_COLORS={bg:"#FBF3E7",card:"#F3E6D3",gold:"#B08C55",green:"#6E2C3B",ink:"#4A2E33",muted:"#6E2C3B"};
function applyCardTypeUI(){
  const henna=(CARD_TYPE==="henna");
  const q=$("quranWrap"); if(q)q.style.display=henna?"none":"";
  const hi=$("hennaIntroWrap"); if(hi)hi.style.display=henna?"":"none";
  const sg=$("showGroomWrap"); if(sg)sg.style.display=henna?"":"none";
  const dtLabel=$("f_datetime")?$("f_datetime").previousElementSibling:null;
  if(dtLabel&&dtLabel.tagName==="LABEL")dtLabel.textContent=henna?"تاريخ ووقت الحنة":"تاريخ ووقت العرس";
}
function loadSettings(){
  const c=INV.data||{}, cp=c.couple||{}, t=c.text||{}, m=c.media||{}, col=c.colors||{}, sh=c.show||{};
  $("f_lang").value=(c.lang==="en")?"en":"ar";
  $("f_groomTitle").value=cp.groomTitle||"";$("f_groom").value=cp.groom||"";
  $("f_groomFatherTitle").value=cp.groomFatherTitle||"";$("f_groomFather").value=cp.groomFather||"";
  $("f_groomRel").value=cp.groomRel||"";
  $("f_brideTitle").value=cp.brideTitle||"";$("f_bride").value=cp.bride||"";
  $("f_brideFatherTitle").value=cp.brideFatherTitle||"";$("f_brideFather").value=cp.brideFather||"";
  $("f_brideRel").value=cp.brideRel||"";
  $("f_datetime").value=(c.datetime||"2026-08-24T19:00:00").slice(0,16);
  lockDateUI(!!c.dateLocked);
  lockSlugUI(!!c.slugLocked);
  $("f_blessing").value=t.blessing||"";
  $("f_bismillah").value=(c.bismillah!==undefined)?c.bismillah:"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
  $("f_verse").value=(c.verse!==undefined)?c.verse:"﴿ وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً ﴾";
  $("f_show_bismillah").checked=(sh.bismillah!==false);
  $("f_show_verse").checked=(sh.verse!==false);
  $("f_show_dividers").checked=(sh.dividers!==false);
  $("f_show_cardbox").checked=(sh.cardBox===true);
  $("f_hennaIntro").value=c.hennaIntro||"";
  $("f_show_groom").checked=(sh.groom!==false);
  applyCardTypeUI();
  $("f_footer").value=t.footer||"";
  $("f_venueName").value=t.venueName||"";$("f_venueSub").value=t.venueSub||"";
  $("f_mapUrl").value=m.mapUrl||"";
  $("f_notePhoto").value=t.notePhoto||"";$("f_noteKids").value=t.noteKids||"";
  $("f_couplePhoto").value=m.couplePhoto||"";$("f_gallery").value=(m.gallery||[]).join("\n");$("f_music").value=m.music||"";$("f_video").value=m.video||"";
  { const vp=$("videoPreview"); if(m.video){vp.src=m.video;vp.style.display="block";}else{vp.style.display="none";vp.removeAttribute("src");} $("videoStatus").textContent=""; }
  { const pv=$("couplePhotoPreview"); if(m.couplePhoto){pv.src=m.couplePhoto;pv.style.display="block";}else{pv.style.display="none";} $("couplePhotoStatus").textContent=""; }
  renderGalleryThumbs(); $("galleryStatus").textContent="";
  if(m.music){ $("musicPreview").src=m.music; $("musicPreview").style.display="block"; }
  const _fix=v=>(v&&String(v).toUpperCase()==="#C68A93")?"#6E2C3B":v;
  $("c_bg").value=col.bg||DEF_COLORS.bg;$("c_card").value=col.card||DEF_COLORS.card;$("c_gold").value=_fix(col.gold)||DEF_COLORS.gold;
  $("c_green").value=col.green||DEF_COLORS.green;$("c_ink").value=col.ink||DEF_COLORS.ink;$("c_muted").value=_fix(col.muted)||DEF_COLORS.muted;

  // لا نعرض الروابط العشوائية (inv-xxxx) بالحقل حتى يقدر يكتب اسم من عنده
  $("f_slug").value=(INV.slug && !/^inv-/.test(INV.slug)) ? INV.slug : "";
  $("slugErr").textContent="";
  if(INV.slug){$("designLink").value=SITE_ROOT+"s/"+INV.slug;$("designLinkBox").style.display="block";}
  else{$("designLinkBox").style.display="none";}

  // المعاينة الحيّة (غير مربوطة برابط)
  previewReady=false;
  $("preview").src="index.html?preview=1";
}

function lockDateUI(locked){
  const el=$("f_datetime"); if(el){el.disabled=!!locked;el.readOnly=!!locked;}
  const note=$("dateLockNote"); if(note)note.style.display=locked?"block":"none";
}
function lockSlugUI(locked){
  const el=$("f_slug"); if(el){el.disabled=!!locked;el.readOnly=!!locked;}
  const note=$("slugLockNote"); if(note)note.style.display=locked?"block":"none";
}
function collectData(){
  return {
    lang:$("f_lang").value,
    couple:{
      groomTitle:$("f_groomTitle").value,groom:$("f_groom").value,
      groomFatherTitle:$("f_groomFatherTitle").value,groomFather:$("f_groomFather").value,groomRel:$("f_groomRel").value,
      brideTitle:$("f_brideTitle").value,bride:$("f_bride").value,
      brideFatherTitle:$("f_brideFatherTitle").value,brideFather:$("f_brideFather").value,brideRel:$("f_brideRel").value
    },
    datetime:($("f_datetime").value||"2026-08-24T19:00")+":00",
    dateLocked:(INV&&INV.data&&INV.data.dateLocked)||false,
    slugLocked:(INV&&INV.data&&INV.data.slugLocked)||false,
    cardType:CARD_TYPE,
    hennaIntro:$("f_hennaIntro").value,
    show:{bismillah:$("f_show_bismillah").checked,verse:$("f_show_verse").checked,dividers:$("f_show_dividers").checked,groom:$("f_show_groom").checked,cardBox:$("f_show_cardbox").checked},
    bismillah:$("f_bismillah").value,
    verse:$("f_verse").value,
    text:{blessing:$("f_blessing").value,venueName:$("f_venueName").value,venueSub:$("f_venueSub").value,
      notePhoto:$("f_notePhoto").value,noteKids:$("f_noteKids").value,footer:$("f_footer").value},
    media:{mapUrl:$("f_mapUrl").value,couplePhoto:$("f_couplePhoto").value,music:$("f_music").value,video:$("f_video").value,
      gallery:$("f_gallery").value.split("\n").map(s=>s.trim()).filter(Boolean),
      shareImage:(INV&&INV.data&&INV.data.media&&INV.data.media.shareImage)||""},
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
/* ===== الحفظ التلقائي ===== */
function setSaveStatus(t){const el=$("autoSaveStatus");if(el)el.textContent=t;}
let saving=false, pending=false;
async function autoSave(){
  if(!INV){return;}
  if(saving){pending=true;return;}
  saving=true;
  const data=collectData();
  setSaveStatus("جارٍ الحفظ…");
  const {error}=await sb.from("invitations").update({data,updated_at:new Date().toISOString()}).eq("id",INV.id);
  saving=false;
  if(error){setSaveStatus("تعذّر الحفظ");console.error(error);return;}
  INV.data=data;
  setSaveStatus("✓ محفوظ");
  if(pending){pending=false;autoSave();}
}

let pvTimer=null, saveTimer=null;
$("design").addEventListener("input",()=>{
  clearTimeout(pvTimer);pvTimer=setTimeout(pushPreview,250);
  setSaveStatus("…");
  clearTimeout(saveTimer);saveTimer=setTimeout(autoSave,800);
});
$("design").addEventListener("change",()=>{clearTimeout(saveTimer);saveTimer=setTimeout(autoSave,300);});

/* توليد الرابط من الأسماء */
function slugify(s){return String(s||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}
function randSlug(){return "inv-"+Math.random().toString(36).slice(2,8);}
async function slugTaken(slug){
  const {data}=await sb.from("invitations").select("id").eq("slug",slug).neq("id",INV.id).limit(1);
  return !!(data&&data.length);
}
// يبني الرابط من الحقل اللي كتبه العريس؛ لو فاضي يبقى القديم أو عشوائي
async function ensureSlug(){
  const wanted=slugify($("f_slug").value);
  if(!wanted){
    // اسم مخصّص محذوف => رابط عشوائي جديد
    if(INV.slug && !/^inv-/.test(INV.slug)){
      let slug=randSlug();
      while(await slugTaken(slug))slug=randSlug();
      await sb.from("invitations").update({slug}).eq("id",INV.id);
      INV.slug=slug;return slug;
    }
    if(INV.slug)return INV.slug;
    let slug=randSlug();
    while(await slugTaken(slug))slug=randSlug();
    await sb.from("invitations").update({slug}).eq("id",INV.id);
    INV.slug=slug;return slug;
  }
  // نفس الرابط الحالي: ما في داعي نغيّر
  if(wanted===INV.slug)return INV.slug;
  // رابط جديد: نتأكد إنه فريد (نضيف -2, -3 لو محجوز)
  let slug=wanted,n=1;
  while(await slugTaken(slug)){n++;slug=wanted+"-"+n;}
  await sb.from("invitations").update({slug}).eq("id",INV.id);
  INV.slug=slug;return slug;
}
$("f_music_file").addEventListener("change", async (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const status = $("musicUploadStatus");
  status.textContent = "جارٍ الرفع...";
  const ext = file.name.split(".").pop();
  const path = `${INV.id}-${Date.now()}.${ext}`;
  const { error } = await sb.storage.from("wedding-music").upload(path, file, { upsert:true });
  if(error){ status.textContent = "صار خطأ بالرفع، حاول مرة ثانية"; console.error(error); return; }
  const { data } = sb.storage.from("wedding-music").getPublicUrl(path);
  $("f_music").value = data.publicUrl;
  status.textContent = "✓ تم رفع الملف";
  const preview = $("musicPreview");
  preview.src = data.publicUrl;
  preview.style.display = "block";
  pushPreview();
});

/* رفع فيديو من الجهاز */
$("f_video_file").addEventListener("change", async (e)=>{
  const file=e.target.files[0]; if(!file||!INV) return;
  const status=$("videoStatus"); status.textContent="جارٍ رفع الفيديو... (قد يأخذ وقتاً حسب الحجم)";
  const ext=(file.name.split(".").pop()||"mp4").toLowerCase();
  const path=`${INV.id}-video-${Date.now()}.${ext}`;
  const {error}=await sb.storage.from("share").upload(path,file,{upsert:true,contentType:file.type});
  if(error){status.textContent="صار خطأ بالرفع، حاول مرة ثانية";console.error(error);return;}
  const {data}=sb.storage.from("share").getPublicUrl(path);
  $("f_video").value=data.publicUrl;
  const vp=$("videoPreview"); vp.src=data.publicUrl; vp.style.display="block";
  status.textContent="✓ تم رفع الفيديو";
  pushPreview(); clearTimeout(saveTimer); saveTimer=setTimeout(autoSave,300);
});

/* رفع صورة العروسين من الجهاز */
$("f_couplePhoto_file").addEventListener("change", async (e)=>{
  const file=e.target.files[0]; if(!file||!INV) return;
  const status=$("couplePhotoStatus"); status.textContent="جارٍ الرفع...";
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
  const path=`${INV.id}-couple-${Date.now()}.${ext}`;
  const {error}=await sb.storage.from("share").upload(path,file,{upsert:true,contentType:file.type});
  if(error){status.textContent="صار خطأ بالرفع، حاول مرة ثانية";console.error(error);return;}
  const {data}=sb.storage.from("share").getPublicUrl(path);
  $("f_couplePhoto").value=data.publicUrl;
  const pv=$("couplePhotoPreview"); pv.src=data.publicUrl; pv.style.display="block";
  status.textContent="✓ تم رفع الصورة";
  pushPreview(); clearTimeout(saveTimer); saveTimer=setTimeout(autoSave,300);
});

/* رفع صور المعرض (متعددة) — تُضاف للموجود */
function renderGalleryThumbs(){
  const box=$("galleryPreview"); if(!box)return;
  const urls=$("f_gallery").value.split("\n").map(s=>s.trim()).filter(Boolean);
  box.innerHTML=urls.map(u=>`<img src="${u}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid var(--line)">`).join("");
  $("clearGallery").style.display=urls.length?"inline-block":"none";
}
$("f_gallery_file").addEventListener("change", async (e)=>{
  const files=[...e.target.files]; if(!files.length||!INV) return;
  const status=$("galleryStatus"); status.textContent=`جارٍ رفع ${files.length} صورة...`;
  const urls=$("f_gallery").value.split("\n").map(s=>s.trim()).filter(Boolean);
  let done=0;
  for(const file of files){
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase();
    const path=`${INV.id}-g-${Date.now()}-${Math.random().toString(36).slice(2,6)}.${ext}`;
    const {error}=await sb.storage.from("share").upload(path,file,{upsert:true,contentType:file.type});
    if(!error){ const {data}=sb.storage.from("share").getPublicUrl(path); urls.push(data.publicUrl); done++; }
    else console.error(error);
  }
  $("f_gallery").value=urls.join("\n");
  renderGalleryThumbs();
  status.textContent=`✓ تم رفع ${done} صورة`;
  e.target.value="";
  pushPreview(); clearTimeout(saveTimer); saveTimer=setTimeout(autoSave,300);
});
$("clearGallery").addEventListener("click",()=>{
  $("f_gallery").value=""; renderGalleryThumbs(); $("galleryStatus").textContent="";
  pushPreview(); clearTimeout(saveTimer); saveTimer=setTimeout(autoSave,300);
});
$("saveBtn").addEventListener("click",async()=>{
  // تحقّق اسم الرابط: لو العريس كتب شي بس ما طلع منه رابط صالح
  $("slugErr").textContent="";
  const rawSlug=$("f_slug").value.trim();
  const cleanSlug=slugify(rawSlug);
  if(rawSlug && (!cleanSlug || cleanSlug.length<2)){
    $("slugErr").textContent="اسم الرابط لازم يكون أحرف إنجليزية/أرقام (حرفين على الأقل)";
    return;
  }
  const data=collectData();
  $("savedMsg").textContent="جارٍ الحفظ...";
  const {error}=await sb.from("invitations").update({data,updated_at:new Date().toISOString()}).eq("id",INV.id);
  if(error){$("savedMsg").textContent="صار خطأ بالحفظ";console.error(error);return;}
  INV.data=data;
  await ensureSlug();
  // قفل تاريخ العرس وحساب انتهاء الكود
  if(!INV.data.dateLocked && $("f_datetime").value){
    const dt=$("f_datetime").value+":00";
    try{ await sb.rpc("set_wedding_date",{p_dt:dt}); }catch(e){console.error(e);}
    INV.data.dateLocked=true;
    await sb.from("invitations").update({data:INV.data}).eq("id",INV.id);
    lockDateUI(true);
  }
  // قفل اسم الرابط لو صار مخصّصاً (غير عشوائي)
  if(!INV.data.slugLocked && INV.slug && !/^inv-/.test(INV.slug)){
    INV.data.slugLocked=true;
    await sb.from("invitations").update({data:INV.data}).eq("id",INV.id);
    lockSlugUI(true);
  }
  const shareLink=SITE_ROOT+"s/"+INV.slug;
  $("f_slug").value=(INV.slug && !/^inv-/.test(INV.slug)) ? INV.slug : "";
  $("designLink").value=shareLink;$("designLinkBox").style.display="block";
  $("savedMsg").textContent="✓ تم الحفظ، جارٍ تجهيز صورة المشاركة…";
  await generateShareImage();
  $("savedMsg").textContent="✓ تم الحفظ";
  setTimeout(()=>$("savedMsg").textContent="",2500);
  pushPreview();
});

async function generateShareImage(){
  if(!INV||!INV.id)return;
  try{
    const d=INV.data||{}, c=d.couple||{};
    const gi=(c.groom||"").trim()[0]||"", bi=(c.bride||"").trim()[0]||"";
    const el=$("shareCard"); if(!el)return;
    const henna=(CARD_TYPE==="henna");
    const showGroom=henna?((d.show||{}).groom!==false):true;
    $("shMono").textContent=(showGroom&&gi)?(gi+" & "+bi):bi;
    $("shNames").textContent=(showGroom?((c.groom||"")+" & "+(c.bride||"")):(c.bride||"")).trim();
    const shType=document.getElementById("shType"); if(shType)shType.textContent=henna?"دعوة حنّة":"دعوة زفاف";
    if(typeof htmlToImage==="undefined")return;
    try{ if(document.fonts&&document.fonts.ready) await document.fonts.ready; }catch(_){}
    const blob=await htmlToImage.toBlob(el,{pixelRatio:1,width:1200,height:630,backgroundColor:"#FBF3E7",cacheBust:true});
    if(!blob)return;
    const path=INV.id+".png";
    const up=await sb.storage.from("share").upload(path,blob,{upsert:true,contentType:"image/png"});
    if(up.error){console.error("share upload:",up.error);return;}
    const {data:pub}=sb.storage.from("share").getPublicUrl(path);
    if(!pub||!pub.publicUrl)return;
    d.media=d.media||{}; d.media.shareImage=pub.publicUrl;
    await sb.from("invitations").update({data:d}).eq("id",INV.id);
    INV.data=d;
  }catch(e){console.error("generateShareImage:",e);}
}

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
  let days=parseInt($("codeDays").value,10); if(isNaN(days))days=7; days=Math.max(0,days);
  const type=$("codeType")?$("codeType").value:"wedding";
  let code=randCode();
  const {data:ok,error}=await sb.rpc("admin_add_code",{p_code:code,p_days:days,p_type:type});
  if(error||!ok){$("genMsg").textContent="صار خطأ، حاول مرة ثانية";console.error(error);return;}
  $("genMsg").textContent="كود جديد ("+(type==="henna"?"حنة":"عرس")+"): "+code+(days>0?` (ينتهي بعد ${days} يوم من التاريخ)`:" (بلا انتهاء)");
  loadCodes();
});

let ALL_CODES=[];
async function loadCodes(){
  try{ await sb.rpc("purge_expired"); }catch(e){}
  const {data,error}=await sb.rpc("admin_list_codes");
  if(error){$("codesTbl").innerHTML="<tr><td>تعذّر التحميل</td></tr>";console.error(error);return;}
  ALL_CODES=data||[];
  renderCodes();
}
function renderCodes(){
  const tbl=$("codesTbl");
  const term=($("codeSearch")?$("codeSearch").value:"").trim().toLowerCase();
  const list=ALL_CODES.filter(c=>!term || (c.code||"").toLowerCase().includes(term) || (c.username||"").toLowerCase().includes(term));
  let rows=`<tr><th>الكود</th><th>النوع</th><th>المستخدم</th><th>كلمة المرور</th><th>تاريخ العرس</th><th>المتبقّي</th><th>الحالة</th><th></th></tr>`;
  if(!list.length){rows+=`<tr><td colspan="8" style="text-align:center;color:var(--muted)">لا يوجد نتائج</td></tr>`;}
  list.forEach(c=>{
    const st=c.used?`<span class="badge n">مستخدم</span>`:`<span class="badge y">متاح</span>`;
    const typ=(c.card_type==="henna")?`<span class="badge y">حنة</span>`:`<span class="badge n">عرس</span>`;
    const uname=c.username?esc(c.username):"—";
    const upass=c.userpass?esc(c.userpass):"—";
    let wed="—";
    if(c.wedding_date){
      const d=new Date(c.wedding_date);
      wed=`${d.toLocaleDateString("ar-EG")} <button class="btn ghost cancel-date" data-code="${esc(c.code)}" style="padding:4px 10px;margin-inline-start:6px">إلغاء</button>`;
    }
    let left="—";
    if(c.wedding_date && c.expires_at){
      const ms=new Date(c.expires_at).getTime()-Date.now();
      if(ms<=0){ left=`<span style="color:#9C4A3C;font-weight:700">منتهٍ</span>`; }
      else{ const days=Math.ceil(ms/86400000); const col=days<=3?"#9C4A3C":"var(--green)"; left=`<span style="color:${col};font-weight:700">${days} يوم</span>`; }
    }else if(c.used){ left=`<span style="color:var(--muted)">بانتظار التاريخ</span>`; }
    const actions=`${c.used?`<button class="btn ghost unlock-slug" data-code="${esc(c.code)}" style="padding:6px 12px;margin-inline-end:6px">فتح الرابط</button>`:""}<button class="btn danger del-account" data-code="${esc(c.code)}" data-user="${esc(c.username||'')}" data-used="${c.used?1:0}" style="padding:6px 14px">حذف الحساب</button>`;
    rows+=`<tr>
      <td style="font-weight:700">${esc(c.code)}</td>
      <td>${typ}</td>
      <td>${uname}</td>
      <td style="font-family:monospace">${upass}</td>
      <td>${wed}</td>
      <td>${left}</td>
      <td>${st}</td>
      <td style="white-space:nowrap">${actions}</td>
    </tr>`;
  });
  tbl.innerHTML=rows;
  tbl.querySelectorAll(".del-account").forEach(b=>b.addEventListener("click",async()=>{
    const used=b.dataset.used==="1";
    const msg=used
      ? `حذف حساب ${b.dataset.user?`"${b.dataset.user}"`:"هذا العريس"} نهائياً؟ رح تنمسح دعوته وكل ردود الحضور، وما بينفع تراجع.`
      : `حذف الكود ${b.dataset.code}؟`;
    if(!confirm(msg))return;
    const {error}=await sb.rpc("admin_delete_account",{p_code:b.dataset.code});
    if(error){alert("صار خطأ بالحذف");console.error(error);return;}
    loadCodes();
  }));
  tbl.querySelectorAll(".cancel-date").forEach(b=>b.addEventListener("click",async()=>{
    if(!confirm("إلغاء تاريخ العرس؟ رح يقدر العريس يدخل تاريخ جديد، وعدّاد انتهاء الكود يوقف لحينها."))return;
    await sb.rpc("admin_cancel_date",{p_code:b.dataset.code});
    loadCodes();
  }));
  tbl.querySelectorAll(".unlock-slug").forEach(b=>b.addEventListener("click",async()=>{
    if(!confirm("فتح تعديل اسم الرابط لهذا العريس؟ رح يقدر يغيّر اسم رابط الدعوة من جديد."))return;
    const {error}=await sb.rpc("admin_unlock_slug",{p_code:b.dataset.code});
    if(error){alert("صار خطأ");console.error(error);return;}
    alert("تم فتح تعديل الرابط لهذا العريس.");
  }));
}
