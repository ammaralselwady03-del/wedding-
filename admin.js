const SUPA_URL="https://ojfnqfjbeknsiustzjpx.supabase.co";
const SUPA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZm5xZmpiZWtuc2l1c3R6anB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNDczMjgsImV4cCI6MjEwMjYyMzMyOH0.hZ-AzI_n-v9nnGqjI57zrHTVqa_m3W-NRxKRXaW5fGU";
const sb=supabase.createClient(SUPA_URL,SUPA_KEY,{auth:{persistSession:true,autoRefreshToken:true,storage:window.sessionStorage}});
const $=id=>document.getElementById(id);
const show=id=>{["login","home","responses","design","passView"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden");};
const SITE_ROOT=location.origin+location.pathname.replace(/[^/]*$/,"");

let INV=null; // دعوة المستخدم الحالية

/* ===== الدخول ===== */
async function checkSession(){
  const {data}=await sb.auth.getSession();
  if(data && data.session){ afterLogin(); } else { show("login"); }
}
// اليوزرنيم يُخزّن داخلياً كإيميل شكلي
const USER_DOMAIN="@gmail.com";
const toEmail=u=>u.toLowerCase().trim()+USER_DOMAIN;

// تبديل تبويبات دخول/تسجيل
$("tabLogin").addEventListener("click",()=>{
  $("tabLogin").classList.add("active");$("tabSignup").classList.remove("active");
  $("loginForm").classList.remove("hidden");$("signupForm").classList.add("hidden");
});
$("tabSignup").addEventListener("click",()=>{
  $("tabSignup").classList.add("active");$("tabLogin").classList.remove("active");
  $("signupForm").classList.remove("hidden");$("loginForm").classList.add("hidden");
});

// دخول
$("loginBtn").addEventListener("click",async()=>{
  $("loginErr").textContent="";
  const u=$("loginUser").value.trim();
  if(!u){$("loginErr").textContent="اكتب اسم المستخدم";return;}
  const {error}=await sb.auth.signInWithPassword({email:toEmail(u),password:$("loginPass").value});
  if(error){$("loginErr").textContent="اسم المستخدم أو كلمة المرور غير صحيحة";return;}
  afterLogin();
});

// إنشاء حساب (بكود سري)
$("signupBtn").addEventListener("click",async()=>{
  $("signupErr").textContent="";
  const code=$("suCode").value.trim();
  const u=$("suUser").value.trim().toLowerCase();
  const p=$("suPass").value;
  if(!/^[a-z0-9_]{3,20}$/.test(u)){$("signupErr").textContent="اسم المستخدم: أحرف إنجليزية صغيرة وأرقام وشرطة سفلية (3-20)";return;}
  if(p.length<6){$("signupErr").textContent="كلمة المرور 6 أحرف على الأقل";return;}
  // فحص الكود
  const {data:ok,error:cErr}=await sb.rpc("check_invite_code",{p_code:code});
  if(cErr||!ok){$("signupErr").textContent="كود التسجيل غير صحيح";return;}
  // إنشاء الحساب
  const {error}=await sb.auth.signUp({email:toEmail(u),password:p});
  if(error){
    $("signupErr").textContent=(error.message||"").includes("already")?"اسم المستخدم مأخوذ":"صار خطأ، حاول مرة ثانية";
    return;
  }
  // دخول مباشر (في حال لم تُفتح جلسة تلقائياً)
  await sb.auth.signInWithPassword({email:toEmail(u),password:p});
  // إنشاء دعوة فارغة له
  const {data:inv}=await sb.from("invitations").insert({data:{}}).select().single();
  INV=inv||null;
  afterLogin();
});

$("logout").addEventListener("click",logout);
async function logout(){await sb.auth.signOut();INV=null;show("login");}

/* بعد الدخول: هات دعوته (أو أنشئ واحدة إن لم توجد) */
async function afterLogin(){
  let {data}=await sb.from("invitations").select("*").limit(1);
  if(!data || !data.length){
    const {data:inv}=await sb.from("invitations").insert({data:{}}).select().single();
    data=inv?[inv]:[];
  }
  if(data && data.length){ INV=data[0]; enterHome(); }
  else { $("loginErr").textContent="صار خطأ بتحميل الدعوة"; show("login"); }
}

/* توليد رابط (slug) من أسماء العروسين الإنجليزية */
function slugify(s){return String(s||"").toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}
async function ensureSlug(){
  if(INV.slug) return INV.slug;
  let base=(slugify($("f_groomEn").value)+"-"+slugify($("f_brideEn").value)).replace(/^-+|-+$/g,"");
  if(!base||base==="-") base="invitation";
  let slug=base, n=1;
  while(true){
    const {data}=await sb.from("invitations").select("id").eq("slug",slug).neq("id",INV.id).limit(1);
    if(!data||!data.length) break;
    n++; slug=base+"-"+n;
  }
  await sb.from("invitations").update({slug}).eq("id",INV.id);
  INV.slug=slug;
  return slug;
}

/* ===== الرئيسية ===== */
function enterHome(){
  if(INV.slug){
    $("inviteLink").value=SITE_ROOT+INV.slug;
    $("preview").src=SITE_ROOT+INV.slug+"?t="+Date.now();
  }else{
    $("inviteLink").value="سيظهر الرابط بعد إدخال أسماء العروسين (بالإنجليزي) والحفظ";
  }
  show("home");
}
$("goResponses").addEventListener("click",()=>{show("responses");loadResponses();});
$("goDesign").addEventListener("click",()=>{show("design");loadSettings();});
$("goPass").addEventListener("click",()=>{$("passErr").textContent="";$("passOk").textContent="";$("newPass").value="";$("newPass2").value="";show("passView");});
$("backFromResp").addEventListener("click",()=>show("home"));
$("backFromDesign").addEventListener("click",()=>show("home"));
$("backFromPass").addEventListener("click",()=>show("home"));

function copyText(text, btn){
  const done=()=>{const t=btn.textContent;btn.textContent="✓ تم";setTimeout(()=>btn.textContent="نسخ",1500);};
  if(navigator.clipboard && window.isSecureContext){
    navigator.clipboard.writeText(text).then(done).catch(()=>fallback());
  }else{ fallback(); }
  function fallback(){
    const ta=document.createElement("textarea");
    ta.value=text; ta.style.position="fixed"; ta.style.opacity="0";
    document.body.appendChild(ta); ta.focus(); ta.select();
    try{ document.execCommand("copy"); done(); }catch(e){ alert("انسخ الرابط يدوياً:\n"+text); }
    document.body.removeChild(ta);
  }
}
$("copyLink").addEventListener("click",()=>copyText($("inviteLink").value,$("copyLink")));
$("copyDesignLink").addEventListener("click",()=>copyText($("designLink").value,$("copyDesignLink")));

/* تحميل الردود PDF (نافذة طباعة → حفظ كـ PDF) */
$("dlResp").addEventListener("click",()=>{
  if(!RESP.length){alert("لا توجد ردود بعد");return;}
  const esc2=s=>String(s).replace(/[&<>]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
  const coming=RESP.filter(r=>r.attending);
  const guests=coming.reduce((s,r)=>s+(r.guests_count||0),0);
  const names=(INV.data&&INV.data.couple)?`${INV.data.couple.groomAr||""} و ${INV.data.couple.brideAr||""}`:"";
  let rows="";
  RESP.forEach((r,i)=>{
    rows+=`<tr>
      <td>${i+1}</td>
      <td>${esc2(r.name)}</td>
      <td style="direction:ltr">${esc2(r.phone)}</td>
      <td>${r.attending?"حاضر":"معتذر"}</td>
      <td>${r.attending?(r.guests_count||1):"—"}</td>
      <td>${esc2(r.message||"")}</td>
    </tr>`;
  });
  const html=`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
    <title>ردود الحضور${names?" — "+esc2(names):""}</title>
    <style>
      *{font-family:"Segoe UI",Tahoma,sans-serif}
      body{padding:28px;color:#3E3025}
      h1{color:#2E4A3A;text-align:center;margin:0 0 6px}
      .sub{text-align:center;color:#8A785F;margin-bottom:18px}
      .sum{background:#F3EAD9;border:1px solid #D9BC85;border-radius:10px;padding:12px;text-align:center;margin-bottom:16px}
      .sum b{color:#2E4A3A;font-size:1.2rem}
      table{width:100%;border-collapse:collapse;font-size:.9rem}
      th,td{border:1px solid #D9BC85;padding:8px 10px;text-align:start}
      th{background:#2E4A3A;color:#F3EAD9}
      tr:nth-child(even){background:#FAF5EC}
      @media print{.noprint{display:none}}
      .noprint{text-align:center;margin-bottom:16px}
      button{background:#2E4A3A;color:#fff;border:0;border-radius:50px;padding:10px 22px;font-size:1rem;cursor:pointer}
    </style></head><body>
    <div class="noprint"><button onclick="window.print()">🖨️ طباعة / حفظ PDF</button></div>
    <h1>ردود الحضور</h1>
    ${names?`<div class="sub">${esc2(names)}</div>`:""}
    <div class="sum">عدد الردود: <b>${RESP.length}</b> &nbsp;•&nbsp; حاضرون: <b>${coming.length}</b> &nbsp;•&nbsp; إجمالي الأشخاص: <b>${guests}</b></div>
    <table>
      <tr><th>#</th><th>الاسم</th><th>الهاتف</th><th>الحضور</th><th>العدد</th><th>الرسالة</th></tr>
      ${rows}
    </table>
    </body></html>`;
  const w=window.open("","_blank");
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(()=>{ try{ w.print(); }catch(e){} }, 500);
});

/* تحميل صورة الكرت — يفتح الدعوة بوضع الحفظ */
$("dlCard").addEventListener("click",()=>{
  if(!INV.slug){alert("احفظ التصميم أولاً (أسماء العروسين) ليتولّد الرابط، ثم حاول");return;}
  window.open(SITE_ROOT+INV.slug+"?save=1","_blank");
});

/* ===== تغيير كلمة المرور ===== */
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
let RESP=[];
async function loadResponses(){
  const {data,error}=await sb.from("rsvp").select("*").eq("invitation_id",INV.id).order("created_at",{ascending:false});
  if(error){$("summary").textContent="تعذّر تحميل الردود";console.error(error);return;}
  RESP=data||[];
  const coming=data.filter(r=>r.attending);
  const guests=coming.reduce((s,r)=>s+(r.guests_count||0),0);
  $("summary").innerHTML=`عدد الردود: <b>${data.length}</b> &nbsp;•&nbsp; حاضرون: <b>${coming.length}</b> &nbsp;•&nbsp; إجمالي الأشخاص: <b>${guests}</b>`;
  let rows=`<tr><th>الاسم</th><th>الهاتف</th><th>الحضور</th><th>العدد</th><th>الرسالة</th></tr>`;
  data.forEach(r=>{
    const badge=r.attending?`<span class="badge y">حاضر</span>`:`<span class="badge n">معتذر</span>`;
    rows+=`<tr><td>${esc(r.name)}</td><td>${esc(r.phone)}</td><td>${badge}</td><td>${r.attending?(r.guests_count||1):"—"}</td><td class="msg">${esc(r.message||"")}</td></tr>`;
  });
  $("tbl").innerHTML=rows;
}

/* ===== التصميم ===== */
const DEF_COLORS={bg:"#EFE4D6",card:"#F7F0E5",gold:"#B8924E",green:"#2E4A3A",ink:"#3E3025",muted:"#8A785F"};
function loadSettings(){
  if(INV.slug){
    const link=SITE_ROOT+INV.slug;
    $("designLink").value=link;
    $("designLinkBox").style.display="block";
    $("preview").src=link+"?t="+Date.now();
  }else{
    $("designLinkBox").style.display="none";
    $("preview").removeAttribute("src");
  }
  const c=INV.data||{}, ar=c.ar||{}, en=c.en||{}, m=c.media||{}, cp=c.couple||{}, col=c.colors||{}, sh=c.show||{};
  $("f_groomAr").value=cp.groomAr||""; $("f_brideAr").value=cp.brideAr||"";
  $("f_groomEn").value=cp.groomEn||""; $("f_brideEn").value=cp.brideEn||"";
  $("f_groomFatherAr").value=cp.groomFatherAr||""; $("f_brideFatherAr").value=cp.brideFatherAr||"";
  $("f_groomFatherEn").value=cp.groomFatherEn||""; $("f_brideFatherEn").value=cp.brideFatherEn||"";
  $("f_datetime").value=(c.datetime||"2026-08-24T19:00:00").slice(0,16);
  const setPair=(k)=>{$("f_ar_"+k).value=ar[k]||"";$("f_en_"+k).value=en[k]||"";};
  ["blessing","footer","venueName","venueSub","notePhoto","noteKids"].forEach(setPair);
  $("f_bismillah").value=(c.bismillah!==undefined)?c.bismillah:"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
  $("f_verse").value=(c.verse!==undefined)?c.verse:"﴿ وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً ﴾";
  $("f_show_bismillah").checked=(sh.bismillah!==false);
  $("f_show_verse").checked=(sh.verse!==false);
  $("f_mapUrl").value=m.mapUrl||""; $("f_mapEmbed").value=m.mapEmbed||"";
  $("f_couplePhoto").value=m.couplePhoto||"";
  $("f_gallery").value=(m.gallery||[]).join("\n");
  $("f_music").value=m.music||"";
  $("c_bg").value=col.bg||DEF_COLORS.bg; $("c_card").value=col.card||DEF_COLORS.card;
  $("c_gold").value=col.gold||DEF_COLORS.gold; $("c_green").value=col.green||DEF_COLORS.green;
  $("c_ink").value=col.ink||DEF_COLORS.ink; $("c_muted").value=col.muted||DEF_COLORS.muted;
}
$("saveBtn").addEventListener("click",async()=>{
  const getPair=(k)=>({ar:$("f_ar_"+k).value,en:$("f_en_"+k).value});
  const keys=["blessing","footer","venueName","venueSub","notePhoto","noteKids"];
  const ar={},en={};
  keys.forEach(k=>{const p=getPair(k);ar[k]=p.ar;en[k]=p.en;});
  const data={
    couple:{groomAr:$("f_groomAr").value,brideAr:$("f_brideAr").value,groomEn:$("f_groomEn").value,brideEn:$("f_brideEn").value,
      groomFatherAr:$("f_groomFatherAr").value,brideFatherAr:$("f_brideFatherAr").value,
      groomFatherEn:$("f_groomFatherEn").value,brideFatherEn:$("f_brideFatherEn").value},
    datetime:($("f_datetime").value||"2026-08-24T19:00")+":00",
    bismillah:$("f_bismillah").value,
    verse:$("f_verse").value,
    show:{bismillah:$("f_show_bismillah").checked,verse:$("f_show_verse").checked},
    ar,en,
    media:{mapUrl:$("f_mapUrl").value,mapEmbed:$("f_mapEmbed").value,couplePhoto:$("f_couplePhoto").value,music:$("f_music").value,gallery:$("f_gallery").value.split("\n").map(s=>s.trim()).filter(Boolean)},
    colors:{bg:$("c_bg").value,card:$("c_card").value,gold:$("c_gold").value,green:$("c_green").value,ink:$("c_ink").value,muted:$("c_muted").value}
  };
  $("savedMsg").textContent="جارٍ الحفظ...";
  const {error}=await sb.from("invitations").update({data,updated_at:new Date().toISOString()}).eq("id",INV.id);
  if(error){$("savedMsg").textContent="صار خطأ بالحفظ";console.error(error);return;}
  INV.data=data;
  // ولّد الرابط من الأسماء (أول مرة فقط)
  await ensureSlug();
  const link=SITE_ROOT+INV.slug;
  $("inviteLink").value=link;
  $("designLink").value=link;
  $("designLinkBox").style.display="block";
  $("preview").src=link+"?t="+Date.now();
  $("savedMsg").textContent="✓ تم الحفظ";
  setTimeout(()=>$("savedMsg").textContent="",2500);
});

checkSession();
