const SUPA_URL="https://ojfnqfjbeknsiustzjpx.supabase.co";
const SUPA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZm5xZmpiZWtuc2l1c3R6anB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNDczMjgsImV4cCI6MjEwMjYyMzMyOH0.hZ-AzI_n-v9nnGqjI57zrHTVqa_m3W-NRxKRXaW5fGU";
const sb=supabase.createClient(SUPA_URL,SUPA_KEY);

// تاريخ انتهاء الدعوة (اتركه "" لتبقى دائماً)
const EXPIRY="";

const DEFAULTS={
  lang:"ar",
  couple:{groomTitle:"",groom:"العريس",groomFatherTitle:"",groomFather:"",brideTitle:"",bride:"العروس",brideFatherTitle:"",brideFather:""},
  datetime:"2026-08-24T19:00:00",
  show:{bismillah:true,verse:true,dividers:true},
  bismillah:"بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  verse:"﴿ وَمِنْ آيَاتِهِ أَنْ خَلَقَ لَكُم مِّنْ أَنفُسِكُمْ أَزْوَاجًا لِّتَسْكُنُوا إِلَيْهَا وَجَعَلَ بَيْنَكُم مَّوَدَّةً وَرَحْمَةً ﴾",
  text:{blessing:"",venueName:"",venueSub:"",notePhoto:"",noteKids:"",footer:""},
  media:{mapUrl:"",mapEmbed:"",music:"",couplePhoto:"",gallery:[]},
  colors:{bg:"#FBF3E7",card:"#F3E6D3",gold:"#B08C55",green:"#6E2C3B",ink:"#4A2E33",muted:"#C68A93"}
};

const LABELS={
  ar:{tapToOpen:"المس الختم لفتح الدعوة",blessing:"وبكل الحب والفرح يتشرفان بدعوتكم لمشاركتهما فرحة الزفاف",
    willing:"﴿ وذلك بمشيئة الله تعالى ﴾",venueName:"اسم الصالة",venueSub:"",mapBtn:"الموقع على الخرائط",
    notePhoto:"نرجو عدم التصوير",noteKids:"نتمنى نوماً هنيئاً لأطفالكم",countdownTitle:"باقٍ على الفرح",
    lblDays:"يوم",lblHours:"ساعة",lblMins:"دقيقة",lblSecs:"ثانية",galleryTitle:"لحظاتنا",
    footer:"بحضوركم تكتمل فرحتنا ❤",done:"🎉 بدأ الفرح — ألف مبروك",
    rTitle:"تأكيد الحضور",rName:"الاسم",rPhone:"رقم الهاتف",rQ:"هل ستحضر؟",rYes:"نتشرف بالحضور",rNo:"نعتذر عن الحضور",
    rCount:"عدد الحاضرين",rMsg:"رسالة للعروسين (اختياري)",rSend:"إرسال التأكيد",rSending:"جارٍ الإرسال...",
    rThanks:"شكراً لتأكيدك 🌸 نراكم في الفرح",rThanksNo:"شكراً لإعلامنا، سنفتقد وجودكم 🤍",
    rErrName:"فضلاً اكتب الاسم",rErrPhone:"فضلاً اكتب رقم الهاتف",rErrAtt:"فضلاً اختر إن كنت ستحضر",rErrSend:"صار خطأ، حاول مرة ثانية"},
  en:{tapToOpen:"Tap the seal to open",blessing:"With love and joy, request the honour of your presence at their wedding",
    willing:"By the grace of God",venueName:"Venue name",venueSub:"",mapBtn:"Open in Maps",
    notePhoto:"Kindly no photography",noteKids:"We wish your little ones a restful night",countdownTitle:"Counting down to the joy",
    lblDays:"Days",lblHours:"Hours",lblMins:"Minutes",lblSecs:"Seconds",galleryTitle:"Our Moments",
    footer:"Your presence completes our joy ❤",done:"🎉 The celebration has begun — Congratulations",
    rTitle:"RSVP",rName:"Name",rPhone:"Phone number",rQ:"Will you attend?",rYes:"Joyfully accept",rNo:"Regretfully decline",
    rCount:"Number of guests",rMsg:"Message to the couple (optional)",rSend:"Send RSVP",rSending:"Sending...",
    rThanks:"Thank you 🌸 See you at the celebration",rThanksNo:"Thank you for letting us know 🤍",
    rErrName:"Please enter your name",rErrPhone:"Please enter your phone",rErrAtt:"Please choose whether you'll attend",rErrSend:"Something went wrong, please try again"}
};

let CONFIG=JSON.parse(JSON.stringify(DEFAULTS));
let INVITATION_ID=null, timer=null, audio=null, attending=null, curDone="";

function mergeInto(base,over){
  if(!over) return base;
  for(const k in over){
    const v=over[k];
    if(v && typeof v==="object" && !Array.isArray(v)){ base[k]=base[k]||{}; mergeInto(base[k],v); }
    else if(v!==undefined && v!==null && v!==""){ base[k]=v; }
  }
  return base;
}
const $=id=>document.getElementById(id);
const txt=(id,v)=>{const el=$(id);if(el)el.textContent=v;};
const showEl=(id,on)=>{const el=$(id);if(el)el.style.display=on?"":"none";};

/* فاصل راقي بسيط: خط ذهبي رفيع + معيّن صغير (currentColor = الذهبي) */
const FLORAL_SVG=`<svg viewBox="0 0 260 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="fadeL" x1="0" x2="1"><stop offset="0" stop-color="currentColor" stop-opacity="0"/><stop offset="1" stop-color="currentColor" stop-opacity=".55"/></linearGradient>
    <linearGradient id="fadeR" x1="0" x2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".55"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient>
  </defs>
  <line x1="24" y1="10" x2="112" y2="10" stroke="url(#fadeL)" stroke-width="1"/>
  <line x1="148" y1="10" x2="236" y2="10" stroke="url(#fadeR)" stroke-width="1"/>
  <circle cx="119" cy="10" r="1.4" fill="currentColor" opacity=".65"/>
  <circle cx="141" cy="10" r="1.4" fill="currentColor" opacity=".65"/>
  <path d="M130 3.5 L134.5 10 L130 16.5 L125.5 10 Z" fill="none" stroke="currentColor" stroke-width="1.1"/>
</svg>`;

/* يدرج الفاصل بين الأقسام الظاهرة فقط (يُحترم خيار الإظهار) */
function insertFlorals(){
  const card=document.querySelector(".invite-card");
  if(!card)return;
  card.querySelectorAll(".floral").forEach(f=>f.remove());
  if((CONFIG.show||{}).dividers===false)return;
  const anchors=["bismillah","verse","blessing","coupleRow","infoRow","notesRow"];
  let prevShown=false;
  anchors.forEach(id=>{
    const el=$(id);
    if(!el)return;
    const shown=el.style.display!=="none" && getComputedStyle(el).display!=="none";
    if(shown){
      if(prevShown){
        const div=document.createElement("div");
        div.className="floral";
        div.innerHTML=FLORAL_SVG;
        card.insertBefore(div,el);
      }
      prevShown=true;
    }
  });
}
function joinTitle(t,n){ n=(n||"").trim(); if(!n) return ""; t=(t||"").trim(); return t?t+" "+n:n; }

function hex2rgb(h){h=h.replace("#","");if(h.length===3)h=h.split("").map(c=>c+c).join("");return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function rgb2hex(r,g,b){const t=x=>Math.max(0,Math.min(255,Math.round(x))).toString(16).padStart(2,"0");return"#"+t(r)+t(g)+t(b);}
function lighten(h,a){const[r,g,b]=hex2rgb(h);return rgb2hex(r+(255-r)*a,g+(255-g)*a,b+(255-b)*a);}
function darken(h,a){const[r,g,b]=hex2rgb(h);return rgb2hex(r*(1-a),g*(1-a),b*(1-a));}
function rgba(h,a){const[r,g,b]=hex2rgb(h);return`rgba(${r},${g},${b},${a})`;}
function applyColors(c){const s=document.documentElement.style;s.setProperty("--bg",c.bg);s.setProperty("--bg-2",darken(c.bg,.06));s.setProperty("--card",c.card);s.setProperty("--gold",c.gold);s.setProperty("--gold-soft",lighten(c.gold,.28));s.setProperty("--green",c.green);s.setProperty("--ink",c.ink);s.setProperty("--muted",c.muted);s.setProperty("--line",rgba(c.gold,.35));}

function formatDateTime(iso){
  const[dp,tp="00:00"]=String(iso).split("T");
  const[Y,Mo,Da]=dp.split("-").map(Number);
  const[H,Mi]=tp.split(":").map(Number);
  const d=new Date(Y,(Mo||1)-1,Da||1,H||0,Mi||0);
  const toAr=s=>String(s).replace(/[0-9]/g,x=>"٠١٢٣٤٥٦٧٨٩"[x]);
  const pad=n=>String(n).padStart(2,"0");
  const h12=((H+11)%12)+1;
  return{
    en:{day:new Intl.DateTimeFormat("en-GB",{weekday:"long"}).format(d),date:new Intl.DateTimeFormat("en-GB",{day:"numeric",month:"long",year:"numeric"}).format(d),time:`${h12}:${pad(Mi)} ${H<12?"AM":"PM"}`},
    ar:{day:"يوم "+new Intl.DateTimeFormat("ar",{weekday:"long"}).format(d),date:new Intl.DateTimeFormat("ar-u-nu-arab",{day:"numeric",month:"long",year:"numeric"}).format(d),time:`الساعة ${toAr(h12)}:${toAr(pad(Mi))} ${H<12?"صباحاً":"مساءً"}`}
  };
}

/* ===== بناء نموذج تأكيد الحضور (مرة واحدة) ===== */
function buildRsvp(){
  $("rsvpBlock").innerHTML=`
    <h2 class="section-title" id="rTitle"></h2>
    <div class="rsvp-card">
      <div id="rsvpForm">
        <label class="rsvp-lbl" id="rLblName"></label>
        <input class="rsvp-in" id="rsvpName" type="text">
        <label class="rsvp-lbl" id="rLblPhone"></label>
        <input class="rsvp-in" id="rsvpPhone" type="tel" inputmode="tel">
        <div class="rsvp-lbl" id="rLblQ"></div>
        <div class="att-row">
          <button type="button" class="att-btn yes" id="attYes"></button>
          <button type="button" class="att-btn no" id="attNo"></button>
        </div>
        <div id="countRow">
          <label class="rsvp-lbl" id="rLblCount"></label>
          <input class="rsvp-in" id="rsvpCount" type="number" min="1" value="1">
        </div>
        <label class="rsvp-lbl" id="rLblMsg"></label>
        <textarea class="rsvp-in" id="rsvpMsg" rows="3"></textarea>
        <div class="rsvp-err" id="rsvpErr"></div>
        <button type="button" class="rsvp-send" id="rsvpSend"></button>
      </div>
      <div id="rsvpDone" class="rsvp-done" style="display:none"></div>
    </div>`;
  $("attYes").addEventListener("click",()=>{attending=true;$("attYes").classList.add("active");$("attNo").classList.remove("active");$("countRow").style.display="block";});
  $("attNo").addEventListener("click",()=>{attending=false;$("attNo").classList.add("active");$("attYes").classList.remove("active");$("countRow").style.display="none";});
  $("rsvpSend").addEventListener("click",submitRsvp);
}
function renderRsvpLang(lang){
  const L=LABELS[lang];
  txt("rTitle",L.rTitle);txt("rLblName",L.rName);txt("rLblPhone",L.rPhone);txt("rLblQ",L.rQ);
  txt("attYes",L.rYes);txt("attNo",L.rNo);txt("rLblCount",L.rCount);txt("rLblMsg",L.rMsg);txt("rsvpSend",L.rSend);
}
async function submitRsvp(){
  const lang=(CONFIG.lang==="en")?"en":"ar", L=LABELS[lang], errBox=$("rsvpErr"), btn=$("rsvpSend");
  const name=$("rsvpName").value.trim(), phone=$("rsvpPhone").value.trim(), message=$("rsvpMsg").value.trim();
  errBox.textContent="";
  if(!name){errBox.textContent=L.rErrName;return;}
  if(!phone){errBox.textContent=L.rErrPhone;return;}
  if(attending===null){errBox.textContent=L.rErrAtt;return;}
  const guests_count=attending?Math.max(1,parseInt($("rsvpCount").value||"1",10)):0;
  if(!INVITATION_ID){errBox.textContent=L.rErrSend;return;}
  btn.disabled=true;btn.textContent=L.rSending;
  const {error}=await sb.from("rsvp").insert({invitation_id:INVITATION_ID,name,phone,attending,guests_count,message});
  btn.disabled=false;btn.textContent=L.rSend;
  if(error){errBox.textContent=L.rErrSend;console.error(error);return;}
  $("rsvpForm").style.display="none";
  const done=$("rsvpDone");done.style.display="block";done.textContent=attending?L.rThanks:L.rThanksNo;
}

/* ===== عرض المحتوى (يتكرر في المعاينة) ===== */
function renderAll(){
  const d=CONFIG, lang=(d.lang==="en")?"en":"ar", L=LABELS[lang], cp=d.couple||{}, T=d.text||{};
  document.documentElement.lang=lang;
  document.documentElement.dir=(lang==="ar")?"rtl":"ltr";
  document.body.classList.toggle("lang-en",lang==="en");
  applyColors(d.colors||DEFAULTS.colors);

  const gi=(cp.groom||"").trim()[0]||"", bi=(cp.bride||"").trim()[0]||"";
  const mono=$("mono");mono.textContent=gi+" & "+bi;
  mono.style.fontFamily=(lang==="ar")?'"Aref Ruqaa",serif':'"Cormorant Garamond",serif';

  txt("hint",L.tapToOpen);
  document.title=(cp.groom||"")+" & "+(cp.bride||"");

  const showB=(d.show||{}).bismillah!==false, showV=(d.show||{}).verse!==false;
  if(showB && d.bismillah){$("bismillah").textContent=d.bismillah;$("bismillah").style.display="block";}else{$("bismillah").style.display="none";}
  if(showV && d.verse){$("verse").textContent=d.verse;$("verse").style.display="block";}else{$("verse").style.display="none";}

  txt("blessing",T.blessing||L.blessing);

  txt("groom",cp.groom||"");txt("bride",cp.bride||"");
  txt("groomTitle",cp.groomTitle||"");showEl("groomTitle",!!(cp.groomTitle||"").trim());
  txt("brideTitle",cp.brideTitle||"");showEl("brideTitle",!!(cp.brideTitle||"").trim());
  const gf=joinTitle(cp.groomFatherTitle,cp.groomFather), bf=joinTitle(cp.brideFatherTitle,cp.brideFather);
  txt("groomFather",gf);showEl("groomFather",!!gf);
  txt("brideFather",bf);showEl("brideFather",!!bf);

  txt("willing",L.willing);
  txt("venueName",T.venueName||L.venueName);
  $("venueSub").innerHTML=(T.venueSub||L.venueSub||"").replace(/\n/g,"<br>");

  const DT=formatDateTime(d.datetime||DEFAULTS.datetime);
  txt("dayValue",DT[lang].day);txt("dateValue",DT[lang].date);txt("timeValue",DT[lang].time);

  let _mapUrl=((d.media&&d.media.mapUrl)||"").trim();
  if(_mapUrl && !/^https?:\/\//i.test(_mapUrl)) _mapUrl="https://"+_mapUrl;
  const _mb=$("mapBtn");
  if(_mapUrl){ _mb.textContent="📍 "+L.mapBtn; _mb.href=_mapUrl; _mb.style.display=""; }
  else { _mb.style.display="none"; _mb.removeAttribute("href"); }
  txt("notePhoto",T.notePhoto||L.notePhoto);txt("noteKids",T.noteKids||L.noteKids);
  txt("countdownTitle",L.countdownTitle);
  txt("lblDays",L.lblDays);txt("lblHours",L.lblHours);txt("lblMins",L.lblMins);txt("lblSecs",L.lblSecs);
  txt("galleryTitle",L.galleryTitle);
  $("footer").innerHTML=(T.footer||L.footer).replace("❤",'<span class="heart">❤</span>');
  curDone=L.done;

  renderMedia(d.media||{});
  renderRsvpLang(lang);
  startCountdown(d.datetime||DEFAULTS.datetime);
  insertFlorals();
}

function renderMedia(m){
  const cp=$("couplePhoto");
  if(m.couplePhoto){cp.style.display="block";cp.innerHTML=`<img src="${m.couplePhoto}" alt="">`;}else{cp.style.display="none";cp.innerHTML="";}
  const gs=$("gallerySection"),grid=$("gallery");
  if(Array.isArray(m.gallery)&&m.gallery.length){
    gs.style.display="block";
    grid.innerHTML=m.gallery.map(s=>`<img src="${s}" alt="" loading="lazy">`).join("");
    const lb=$("lightbox"),lbImg=$("lightboxImg");
    grid.querySelectorAll("img").forEach(img=>img.addEventListener("click",()=>{lbImg.src=img.src;lb.classList.add("open");}));
  }else{gs.style.display="none";grid.innerHTML="";}
  const me=$("mapEmbed");
  if(me){me.style.display="none";me.innerHTML="";}
  const mb=$("musicBtn");
  if(m.music){audio=$("audio");audio.src=m.music;audio.load();mb.style.display="flex";}else{mb.style.display="none";}
}

function startCountdown(iso){
  if(timer)clearInterval(timer);
  const target=new Date(iso).getTime();
  const pad=n=>String(n).padStart(2,"0");
  function tick(){
    const diff=target-Date.now();
    if(diff<=0){$("countdown").innerHTML=`<div class="cd-done">${curDone}</div>`;clearInterval(timer);return;}
    $("days").textContent=Math.floor(diff/86400000);
    $("hours").textContent=pad(Math.floor((diff%86400000)/3600000));
    $("mins").textContent=pad(Math.floor((diff%3600000)/60000));
    $("secs").textContent=pad(Math.floor((diff%60000)/1000));
  }
  const cd=$("countdown");
  if(!cd.querySelector(".cd-box")){cd.innerHTML=`
    <div class="cd-box"><div class="cd-num" id="days">--</div><div class="cd-label" id="lblDays"></div></div>
    <div class="cd-box"><div class="cd-num" id="hours">--</div><div class="cd-label" id="lblHours"></div></div>
    <div class="cd-box"><div class="cd-num" id="mins">--</div><div class="cd-label" id="lblMins"></div></div>
    <div class="cd-box"><div class="cd-num" id="secs">--</div><div class="cd-label" id="lblSecs"></div></div>`;
    const lang=(CONFIG.lang==="en")?"en":"ar",L=LABELS[lang];
    txt("lblDays",L.lblDays);txt("lblHours",L.lblHours);txt("lblMins",L.lblMins);txt("lblSecs",L.lblSecs);
  }
  tick();timer=setInterval(tick,1000);
}

/* ===== الإعداد لمرة واحدة ===== */
function setupOnce(){
  buildRsvp();
  $("lightbox").addEventListener("click",()=>$("lightbox").classList.remove("open"));
  $("musicBtn").addEventListener("click",()=>{
    if(!audio)return;
    if(audio.paused){audio.play().then(()=>{$("musicBtn").textContent="⏸";}).catch(e=>console.error("music",e));}
    else{audio.pause();$("musicBtn").textContent="♪";}
  });
  const cover=$("cover");
  $("seal").addEventListener("click",()=>{
    if(cover.classList.contains("open"))return;
    cover.classList.add("open");
    document.body.classList.remove("locked");
    document.body.classList.add("opened");
    if(audio){audio.play().then(()=>{$("musicBtn").textContent="⏸";}).catch(()=>{});}
    setTimeout(()=>{cover.style.display="none";},1200);
  });
}
function openCoverForPreview(){
  const cover=$("cover");cover.style.display="none";
  document.body.classList.remove("locked");
  document.body.classList.add("opened");
}
function showExpired(){document.body.className="";document.body.innerHTML="";document.body.style.background="#fff";document.documentElement.style.background="#fff";}

/* ===== التشغيل ===== */
async function boot(){
  sb.rpc("purge_expired").then(()=>{}).catch(()=>{}); // تنظيف الأكواد المنتهية وحساباتها (بصمت)
  const slug=decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g,"").split("/").pop()||"");
  if(!slug||slug.endsWith(".html")){showExpired();return;}
  try{
    const {data,error}=await sb.from("invitations").select("id,data").eq("slug",slug).limit(1);
    if(error){console.warn(error);showExpired();return;}
    if(!data||!data.length){showExpired();return;}
    INVITATION_ID=data[0].id;
    if(data[0].data)mergeInto(CONFIG,data[0].data);
  }catch(e){console.warn(e);showExpired();return;}
  setupOnce();
  renderAll();
  enableSaveImage();
}

function enableSaveImage(){
  if(!/[?&]save/.test(location.search))return;
  const hc=document.createElement("script");hc.src="https://cdn.jsdelivr.net/npm/html-to-image@1.11.13/dist/html-to-image.js";document.head.appendChild(hc);
  const btn=document.createElement("button");btn.textContent="⬇ حفظ صورة الكرت";
  btn.style.cssText="position:fixed;bottom:16px;inset-inline-end:16px;z-index:1500;background:var(--gold);color:#3A2817;border:0;border-radius:50px;padding:12px 20px;font-family:inherit;font-weight:700;cursor:pointer;box-shadow:0 8px 22px rgba(0,0,0,.25)";
  document.body.appendChild(btn);
  btn.addEventListener("click",async()=>{
    const cover=$("cover");if(cover)cover.style.display="none";
    document.body.classList.remove("locked");
    const card=document.querySelector(".invite-card");card.style.opacity="1";card.style.transform="none";
    if(typeof htmlToImage==="undefined"){alert("جارٍ التحميل، انتظر ثانية وحاول");return;}
    btn.textContent="جارٍ الحفظ...";
    try{
      try{ if(document.fonts&&document.fonts.ready) await document.fonts.ready; }catch(_){}
      const bg=getComputedStyle(document.body).backgroundColor;
      const dataUrl=await htmlToImage.toPng(card,{pixelRatio:2,backgroundColor:bg,cacheBust:true});
      const a=document.createElement("a");a.download="wedding-card.png";a.href=dataUrl;a.click();
    }catch(e){console.error(e);alert("تعذّر حفظ الصورة");}
    btn.textContent="⬇ حفظ صورة الكرت";
  });
}

/* وضع المعاينة داخل اللوحة: يستقبل البيانات مباشرة ولا يقرأ من الرابط */
function initPreview(){
  setupOnce();
  openCoverForPreview();
  window.addEventListener("message",ev=>{
    if(ev.data && ev.data.type==="preview"){
      CONFIG=JSON.parse(JSON.stringify(DEFAULTS));
      mergeInto(CONFIG,ev.data.data||{});
      renderAll();
      openCoverForPreview();
    }
  });
  try{ if(window.parent) window.parent.postMessage({type:"preview-ready"},"*"); }catch(e){}
}

if(new URLSearchParams(location.search).has("preview")){
  initPreview();
}else if(EXPIRY && Date.now()>new Date(EXPIRY).getTime()){
  showExpired();
}else{
  boot();
}
