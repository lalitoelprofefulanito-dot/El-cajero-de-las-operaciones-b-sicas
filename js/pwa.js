/*
 * El cajero de las Operaciones Básicas — pwa.js
 * Autor: Prof. Eduardo Kantún Martínez · Licencia MIT
 *
 * 1) Registra el service worker (funciona sin internet tras la primera visita).
 * 2) Si la página tiene #btn-instalar / #aviso-ios / #ya-instalada, maneja la instalación:
 *    Android/Chrome → botón "Instalar" (evento beforeinstallprompt).
 *    iPhone/iPad    → instrucciones manuales (Apple no ofrece aviso automático).
 */

// sw.js vive en la raíz del sitio; se calcula desde este archivo (js/pwa.js) para que funcione
// igual desde el portal (/) que desde el juego (/juego/) y dentro de la subcarpeta de GitHub Pages.
const urlSW = new URL('../sw.js', import.meta.url);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(urlSW, { scope: new URL('../', import.meta.url).pathname }).catch(() => {
      /* sin service worker la app sigue funcionando en línea */
    });
  });
}

const boton = document.getElementById('btn-instalar');
const avisoIOS = document.getElementById('aviso-ios');
const yaInstalada = document.getElementById('ya-instalada');

const enModoApp = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

if (enModoApp) {
  if (yaInstalada) yaInstalada.hidden = false;
} else if (esIOS) {
  if (avisoIOS) avisoIOS.hidden = false;
} else if (boton) {
  let aviso = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    aviso = e;
    boton.hidden = false;
  });
  boton.addEventListener('click', async () => {
    if (!aviso) return;
    aviso.prompt();
    await aviso.userChoice;
    aviso = null;
    boton.hidden = true;
  });
  window.addEventListener('appinstalled', () => {
    boton.hidden = true;
    if (yaInstalada) yaInstalada.hidden = false;
  });
}
