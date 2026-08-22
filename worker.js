/**
 * RaCon <-> KoboToolbox CORS Proxy
 * ---------------------------------
 * Worker ini hanya meneruskan (proxy) permintaan GET dari app RaCon ke
 * server KoboToolbox, lalu menambahkan header CORS supaya browser tidak
 * memblokir responsnya. Tidak menyimpan data apa pun.
 *
 * CARA DEPLOY (gratis, ~5 menit):
 * 1. Buka https://dash.cloudflare.com -> daftar/login (gratis).
 * 2. Di sidebar kiri, klik "Workers & Pages" -> "Create" -> "Create Worker".
 * 3. Beri nama bebas, misal "racon-kobo-proxy" -> klik "Deploy" (pakai kode default dulu).
 * 4. Setelah deploy, klik "Edit code" -> hapus semua isi editor -> tempel (paste)
 *    seluruh isi file ini -> klik "Deploy" / "Save and deploy".
 * 5. Salin URL Worker kamu, formatnya seperti:
 *    https://racon-kobo-proxy.<username-cloudflare-kamu>.workers.dev
 * 6. Di kode RaCon (RaCon_Platform_App_IndividuMasyarakat.html), cari KOBO_CONFIG,
 *    lalu ganti nilai `serverUrl` dari 'https://kf.kobotoolbox.org' menjadi URL
 *    Worker kamu di atas (TANPA garis miring "/" di akhir).
 * 7. (Opsional, kalau form kamu tidak mau publik) Isi KOBO_TOKEN di bagian
 *    "Environment Variables" pada pengaturan Worker, dengan API token akun
 *    Kobo kamu (Kobo dashboard -> ikon profil -> Account Settings -> API Token).
 *    Kalau ini diisi, form BOLEH kamu set kembali ke privat (matikan "Anyone can
 *    view submissions") karena Worker inilah yang akan otentikasi ke Kobo, bukan
 *    browser pengguna -- lebih aman untuk data kesehatan sensitif.
 */

const KOBO_SERVER = 'https://kf.kobotoolbox.org';

export default {
  async fetch(request, env) {
    // Tangani preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const url = new URL(request.url);

    // Hanya izinkan path yang memang dipakai app RaCon, supaya Worker ini
    // tidak disalahgunakan jadi proxy umum ke seluruh internet.
    if (!url.pathname.startsWith('/api/v2/assets/')) {
      return new Response('Not allowed', { status: 403, headers: corsHeaders() });
    }

    const koboUrl = KOBO_SERVER + url.pathname + url.search;

    const headers = {};
    // KOBO_TOKEN diisi lewat Environment Variables di dashboard Cloudflare
    // (Settings -> Variables), TIDAK ditulis langsung di sini / di kode publik.
    if (env.KOBO_TOKEN) {
      headers['Authorization'] = 'Token ' + env.KOBO_TOKEN;
    }

    try {
      const koboRes = await fetch(koboUrl, { headers });
      const body = await koboRes.text();
      return new Response(body, {
        status: koboRes.status,
        headers: {
          'Content-Type': koboRes.headers.get('Content-Type') || 'application/json',
          ...corsHeaders()
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Proxy gagal menghubungi server Kobo', detail: String(err) }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...corsHeaders() }
      });
    }
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
}
