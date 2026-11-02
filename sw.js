/*
 * El cajero de las Operaciones Básicas — sw.js (service worker)
 * Autor: Prof. Eduardo Kantún Martínez · Licencia MIT
 *
 * IMPORTANTE: cada vez que cambies cualquier archivo del juego, sube el número
 * de VERSION (cajero-v1 → cajero-v2 …). Así los celulares descargan la versión nueva.
 */
const VERSION = 'cajero-v1';

// Rutas relativas a este archivo: funcionan en https://USUARIO.github.io/cajero-operaciones-basicas/
const ARCHIVOS = [
  './',
  './index.html',
  './guia.html',
  './juego/',
  './juego/index.html',
  './css/estilos.css',
  './js/logica.js',
  './js/interfaz.js',
  './js/registro.js',
  './js/pwa.js',
  './manifest.webmanifest',
  './icons/192.png',
  './icons/512.png',
  './icons/maskable-512.png',
  './icons/qr.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((claves) => Promise.all(claves.filter((k) => k.startsWith('cajero-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Primero la copia guardada (rápido y sin internet); si no existe, la red.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((guardada) => {
      if (guardada) return guardada;
      return fetch(req).catch(() =>
        req.mode === 'navigate' ? caches.match('./juego/') : Response.error()
      );
    })
  );
});
