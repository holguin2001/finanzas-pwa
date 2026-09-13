/* ─── Finanzas PWA – Service Worker ─── */
/* v53: correcciones de ajuste fino en el header y en Historial movil -- (1) marca+titulo
   y el toggle de tema+avatar vuelven a compartir el mismo renglon en pantallas angostas
   (se habia roto al separar las stats del header en v52, quedaban en 2 filas); (2) las
   4 tarjetas de totales de Historial (Ingresos/Gastos/Ahorros/Balance) pasan a una
   cuadricula 2x2 mas compacta en movil en vez de apilarse en 1 columna ocupando media
   pantalla. */
const CACHE  = 'finanzas-v53';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.ico',
  './icon.svg',
  './icon-32.png',
  './icon-192.png',
  './icon-512.png',
  /* SDK de Firebase (versión fija = cacheable de forma segura) */
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js'
];

/* Caché todo al instalar */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* Eliminar cachés viejas y tomar control de inmediato */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Cache-first para el shell de la app y el SDK de Firebase.
   Las peticiones a Firestore API (googleapis.com) las deja pasar;
   Firestore maneja su propio caché offline vía IndexedDB.          */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  /* Dejar pasar las llamadas a la API de Firestore/Auth */
  if (url.includes('firestore.googleapis.com') ||
      url.includes('securetoken.googleapis.com') ||
      url.includes('identitytoolkit.googleapis.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE).then(c => c.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
