// صفحة مشاركة: تُخرج وسوم المعاينة (Open Graph) لواتساب/الشبكات،
// وتحوّل الزائر الحقيقي إلى صفحة الدعوة. لا تلمس صفحة الدعوة الأصلية.
const SUPA_URL = "https://ojfnqfjbeknsiustzjpx.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qZm5xZmpiZWtuc2l1c3R6anB4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNDczMjgsImV4cCI6MjEwMjYyMzMyOH0.hZ-AzI_n-v9nnGqjI57zrHTVqa_m3W-NRxKRXaW5fGU";

function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];});}

module.exports = async (req, res) => {
  const slug = ((req.query && req.query.slug) || "").toString();
  let title = "دعوة زفاف";
  let desc = "يتشرّفان بدعوتكم لحضور حفل الزفاف";
  let img = "";

  try {
    const url = SUPA_URL + "/rest/v1/invitations?slug=eq." + encodeURIComponent(slug) + "&select=data";
    const r = await fetch(url, { headers: { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } });
    const rows = await r.json();
    const d = (rows && rows[0] && rows[0].data) ? rows[0].data : {};
    const c = d.couple || {};
    const groom = (c.groom || "").trim();
    const bride = (c.bride || "").trim();
    const henna = (d.cardType === "henna");
    const grad = (d.cardType === "graduation");
    const gb = (d.cardType === "gradbook");
    const showGroom = henna ? ((d.show||{}).groom !== false) : ((grad||gb) ? false : true);
    const label = henna ? "دعوة حنّة" : (grad ? "دعوة حفلة تخرج" : (gb ? "دفتر تخرج" : "دعوة زفاف"));
    const names = (showGroom && groom) ? (groom + " & " + bride).trim() : bride;
    if (groom || bride) title = names + " | " + label; else title = label;
    const t = d.text || {};
    const bits = [];
    if (t.venueName) bits.push(t.venueName);
    if (t.venueSub) bits.push(String(t.venueSub).split("\n")[0]);
    if (bits.length) desc = bits.join(" — ");
    if (d.media && d.media.shareImage) img = d.media.shareImage;
  } catch (e) { /* تجاهل، نُخرج قيم افتراضية */ }

  const dest = "/" + encodeURIComponent(slug);
  const imgTags = img
    ? '<meta property="og:image" content="' + esc(img) + '">\n' +
      '<meta property="og:image:width" content="1200">\n' +
      '<meta property="og:image:height" content="630">\n' +
      '<meta name="twitter:image" content="' + esc(img) + '">'
    : "";

  const html =
'<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width, initial-scale=1">' +
'<meta property="og:type" content="website">' +
'<meta property="og:title" content="' + esc(title) + '">' +
'<meta property="og:description" content="' + esc(desc) + '">' +
imgTags +
'<meta name="twitter:card" content="summary_large_image">' +
'<meta name="twitter:title" content="' + esc(title) + '">' +
'<meta name="twitter:description" content="' + esc(desc) + '">' +
'<meta http-equiv="refresh" content="0;url=' + dest + '">' +
'<title>' + esc(title) + '</title></head>' +
'<body><script>location.replace(' + JSON.stringify(dest) + ');</scr' + 'ipt>' +
'<p style="font-family:sans-serif;text-align:center;margin-top:40px">جارٍ فتح الدعوة… <a href="' + dest + '">اضغط هنا</a></p>' +
'</body></html>';

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).send(html);
};
