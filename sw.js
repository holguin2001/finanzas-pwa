/* ─── Finanzas PWA – Service Worker ─── */
/* v58: reorganiza el modal "Metodos y categorias" (antes "Metodos de pago" -- se
   renombra el titulo y el boton del menu de avatar porque ya no es solo eso) en
   secciones con separadores: Metodos de pago, Categorias-Gasto, Categorias-Ingreso,
   Categorias-Ahorro; cada item ahora muestra un circulo de icono con su color en vez
   de un simple punto. Se amplia PRESET_COLORS de 12 a 24 tonos con mejor cobertura de
   matices. Se agrega selector manual de icono (nuevo campo `icono` en el documento,
   opcional; "AUTO" borra el campo con FieldValue.delete() y vuelve a la deteccion por
   palabra clave existente) con 8 iconos nuevos en CAT_ICONS (gift, plane, phone,
   coffee, trending, dollar, book, piggy) ademas de los 13 que ya existian.
   getMetodoIcon() ahora prioriza el icono guardado manualmente antes de la deteccion
   automatica por nombre. */
const CACHE  = 'finanzas-v58';
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
