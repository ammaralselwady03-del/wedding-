// بروكسي صور: يجيب صورة من Supabase ويرجّعها من نفس دومين الموقع
// حتى تقدر مكتبة التصوير (html-to-image) تقرأها بدون مشكلة CORS.
module.exports = async (req, res) => {
  const u = ((req.query && req.query.u) || "").toString();
  // أمان: نسمح فقط بروابط Supabase
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\//i.test(u)) {
    res.status(400).send("bad url");
    return;
  }
  try {
    const r = await fetch(u);
    if (!r.ok) { res.status(502).send("fetch failed"); return; }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader("Content-Type", r.headers.get("content-type") || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.status(200).send(buf);
  } catch (e) {
    res.status(500).send("error");
  }
};
