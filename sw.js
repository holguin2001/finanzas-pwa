/* ─── Finanzas PWA – Service Worker ─── */
/* v57: las categorias ahora dependen del tipo de movimiento (Gasto/Ingreso/Ahorro).
   Nuevo campo `aplicaA` en cada categoria (metodos con tipo==='otro'); las categorias
   creadas antes de este cambio no lo tienen y se asumen 'gasto' por compatibilidad
   (getCategorias(tipoMov) filtra por eso). El dropdown de Categoria en el formulario
   de Registro ahora se filtra por el tipo seleccionado y se reinicia la seleccion al
   cambiar de tipo (selectTipo). El modal de "Editar categorias/metodos" agrega un
   selector "Aplica a: Gasto/Ingreso/Ahorro" que solo aparece cuando el tipo elegido es
   "Otro" (categoria). Se agrega ensureCategoriasIngreso() con 3 semillas para Ingreso
   (Salario, Ventas, Otros Ingresos); Ahorro arranca sin semillas, se crean a mano. El
   filtro de categoria en Historial sigue mostrando todas sin filtrar por tipo. */
const CACHE  = 'finanzas-v57';
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
