const CACHE_NAME = 'canal7-v846';
const SHARE_CACHE = 'canal7-share';
const ASSETS = [
  './',
  './index.html',
  './plan-feux.html',
  './manifest.json',
  './icon192.png',
  './icon512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== SHARE_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);

  // ── Web Share Target (Android) : réception d'un contact partagé (.vcf) ──
  if (req.method === 'POST' && url.searchParams.has('share-target')) {
    e.respondWith((async () => {
      let text = '';
      try {
        const form = await req.formData();
        const file = form.get('contact');
        if (file && typeof file.text === 'function') text = await file.text();
        if (!text) text = String(form.get('text') || '');
      } catch (err) { /* ignore */ }
      try {
        const cache = await caches.open(SHARE_CACHE);
        await cache.put('shared-contact', new Response(text || '', { headers: { 'Content-Type': 'text/plain' } }));
      } catch (err) { /* ignore */ }
      return Response.redirect('./index.html?shared=contact', 303);
    })());
    return;
  }

  if (req.url.includes('nominatim.openstreetmap.org')) return;
  if (req.url.includes('api.open-meteo.com')) return;
  if (req.url.includes('archive-api.open-meteo.com')) return;
  if (req.url.includes('api.anthropic.com')) return;

  const isHTML = req.mode === 'navigate'
    || url.pathname === '/' || url.pathname.endsWith('/')
    || url.pathname.endsWith('index.html');

  if (isHTML) {
    // Les pages HTML sont précachées à l'install (ASSETS). On ne les réécrit JAMAIS
    // depuis une navigation : c'est ce qui corrompait index.html quand on ouvrait plan-feux.html.
    const isPlanFeux = url.pathname.endsWith('plan-feux.html');
    const key = isPlanFeux ? './plan-feux.html' : './index.html';
    e.respondWith(
      fetch(req).catch(() => caches.match(key).then(c => c || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(resp => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        }
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
