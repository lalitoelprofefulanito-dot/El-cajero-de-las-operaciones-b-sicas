/*
 * El cajero de las Operaciones Básicas — interfaz.js
 * Autor: Prof. Eduardo Kantún Martínez · Licencia MIT
 *
 * Dibuja fichas, dados y botones; anima canjes y desagrupaciones; guarda la
 * partida en localStorage (solo en el dispositivo, sin nombres). Toda regla del
 * juego se delega a logica.js: aquí no se calcula nada que decida quién gana.
 */
import { crearPartida, aplicar, valor, canjePendiente, pasoResta, esPartidaValida } from './logica.js';
import { pintarRegistro, exportarRegistro, etiquetaJugador, NOMBRE_MODO } from './registro.js';

const CLAVE_PARTIDA = 'cajero.partida.v1';
const CLAVE_OPCIONES = 'cajero.opciones.v1';
const TIPOS = ['amarillas', 'rojas', 'azules'];
const NOMBRE = { amarillas: ['amarilla', 'amarillas'], rojas: ['roja', 'rojas'], azules: ['azul', 'azules'] };
const CLASE = { amarillas: 'ficha-amarilla', rojas: 'ficha-roja', azules: 'ficha-azul' };
const ETIQUETA = { amarillas: '100', rojas: '10', azules: '1' };
// Cara del dado → casillas (0-8) de una cuadrícula de 3 × 3 con punto
const PUNTOS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };

const $ = (sel) => document.querySelector(sel);
const movimientoReducido = matchMedia('(prefers-reduced-motion: reduce)');
const esperar = (ms) => new Promise((r) => setTimeout(r, movimientoReducido.matches ? 0 : ms));
const cuantas = (tipo, n) => `${n} ${NOMBRE[tipo][n === 1 ? 0 : 1]}`;

/* localStorage puede fallar (modo privado, almacenamiento lleno): el juego sigue sin guardar. */
const almacen = {
  leer(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  guardar(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin guardado */ } },
};

/* ---------- Estado de la pantalla (no del juego) ---------- */
let partida = null;
let pestana = 0;          // jugador cuyo registro se ve
let ocupado = false;      // evita dobles toques durante animaciones
let pausaCambio = null;   // índice del jugador que acaba de terminar (2 jugadores), o null
let resaltar = null;      // { tipo, cantidad } fichas que se resaltan en la pausa de canje

/* ---------- Utilidad para crear elementos ---------- */
function el(etiqueta, props = {}, ...hijos) {
  const e = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k in e && typeof v !== 'string') e[k] = v;
    else e.setAttribute(k, v);
  }
  e.append(...hijos.filter((h) => h !== null && h !== undefined));
  return e;
}

/* =====================================================================
 * Dibujo
 * ===================================================================== */

const jugadorVisto = () => (pausaCambio !== null ? pausaCambio : partida.turno);
const otro = (i) => (i + 1) % partida.jugadores.length;

function totalMostrado(i) {
  // El marcador usa el último total YA verificado, para no regalar la respuesta del turno en curso.
  const r = partida.jugadores[i].registro;
  return r.length ? r.at(-1).total : (partida.modo === 'suma' ? 0 : 100);
}

function pintarTablero(entrantes = {}) {
  const f = partida.jugadores[jugadorVisto()].fichas;
  const verCDU = $('#ver-cdu').checked;
  const digito = { amarillas: ['C', 'centenas'], rojas: ['D', 'decenas'], azules: ['U', 'unidades'] };

  for (const tipo of TIPOS) {
    const col = $(`.columna[data-tipo="${tipo}"]`);
    const caja = col.querySelector('.fichas');
    const n = f[tipo];
    const nuevas = Math.min(entrantes[tipo] || 0, n);
    const resaltadas = resaltar && resaltar.tipo === tipo ? Math.min(resaltar.cantidad, n) : 0;
    caja.replaceChildren(
      ...Array.from({ length: n }, (_, i) => {
        let clase = `ficha ${CLASE[tipo]}`;
        if (i >= n - nuevas) clase += ' entra';
        if (i >= n - resaltadas) clase += ' resalta';
        return el('i', { class: clase }, ETIQUETA[tipo]);
      })
    );
    col.querySelector('.cuenta').textContent = cuantas(tipo, n);
    col.setAttribute('aria-label', `${cuantas(tipo, n)}, cada una vale ${ETIQUETA[tipo]}`);
    const celda = col.querySelector('.cdu');
    celda.hidden = !verCDU;
    // En el tablero C-D-U se escribe la cantidad de fichas de la columna; si pasa de 9, hay canje pendiente.
    celda.replaceChildren(String(n), el('small', {}, digito[tipo][1]));
  }
  $('#tablero').setAttribute('aria-label', `Tablero: ${TIPOS.map((t) => cuantas(t, f[t])).join(', ')}`);
}

function pintarDados(girando = false, valores = null) {
  const caras = valores || (partida.dados.length ? partida.dados : Array(partida.opciones.numDados).fill(0));
  $('#dados').replaceChildren(
    ...caras.map((c) =>
      el('div', { class: `dado${girando ? ' gira' : ''}`, role: 'img', 'aria-label': c ? `Dado: ${c}` : 'Dado sin tirar' },
        ...Array.from({ length: 9 }, (_, i) => el('span', { class: `punto${(PUNTOS[c] || []).includes(i) ? ' on' : ''}` })))
    )
  );
}

function pintarEncabezado() {
  const varios = partida.jugadores.length > 1;
  const visto = jugadorVisto();
  $('#titulo-juego').textContent = varios
    ? `${NOMBRE_MODO[partida.modo]} · Turno de ${etiquetaJugador(partida, visto)}`
    : NOMBRE_MODO[partida.modo];
  $('#meta').textContent = partida.modo === 'suma' ? '🎯 Meta: llegar a 100' : '🎯 Meta: llegar a 0';
  $('#marcador').hidden = !varios;
  $('#marcador').replaceChildren(
    ...partida.jugadores.map((_, i) =>
      el('span', { class: i === visto ? 'activo' : '' }, `${etiquetaJugador(partida, i)}: ${totalMostrado(i)}`))
  );
  $('#rol-cajero').hidden = !varios;
  $('#rol-cajero').textContent = varios
    ? `🧾 El cajero es ${etiquetaJugador(partida, otro(visto))}: entrega, cobra y verifica.`
    : '';
}

function mensaje(texto, tono = '') {
  const m = $('#mensaje');
  m.textContent = texto;
  m.className = `mensaje ${tono}`;
}

const TEXTO_AVISO = {
  'contar-incorrecto': ['Revisa otra vez los puntos de los dados.', 'ojo'],
  'verificar-incorrecto': ['Ese no es el total. Cuenta otra vez cada columna.', 'ojo'],
  'canje-azules': ['¡Listo! 10 azules se cambiaron por 1 roja.', 'bien'],
  'canje-rojas': ['¡Listo! 10 rojas se cambiaron por 1 amarilla.', 'bien'],
  'desagrupar-roja': ['Cambiaste 1 roja por 10 azules.', 'bien'],
  'desagrupar-amarilla': ['Cambiaste 1 amarilla por 10 rojas.', 'bien'],
  'pago-todo': ['Pagaste todo lo que tenías.', 'bien'],
};

/** Formulario de respuesta numérica (contar puntos o verificar total). */
function formularioRespuesta(etiqueta, boton, alResponder, pista = null) {
  const input = el('input', {
    type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off', id: 'respuesta', maxlength: '3', required: true,
  });
  const form = el('form', {
    class: 'respuesta',
    onsubmit: (e) => {
      e.preventDefault();
      const v = input.value.trim();
      if (/^\d{1,3}$/.test(v)) alResponder(Number(v));
      else input.focus();
    },
  },
  el('label', { for: 'respuesta' }, etiqueta),
  input,
  el('button', { type: 'submit', class: 'btn btn-verde' }, boton));
  return [form, pista ? el('p', { class: 'pista' }, pista) : null];
}

function explicacion(titulo, texto) {
  return el('div', { class: 'explica' }, el('strong', {}, titulo), el('span', {}, texto));
}

function composicion(n) {
  const d = Math.floor(n / 10);
  const u = n % 10;
  const partes = [];
  if (d) partes.push(cuantas('rojas', d));
  if (u || !d) partes.push(cuantas('azules', u));
  return partes.join(' y ');
}

function pintarAcciones() {
  const caja = $('#acciones');
  const p = partida;
  const f = p.jugadores[p.turno].fichas;
  const yo = etiquetaJugador(p, p.turno);
  const varios = p.jugadores.length > 1;
  resaltar = null;

  if (pausaCambio !== null) {
    const siguiente = etiquetaJugador(p, p.turno);
    caja.replaceChildren(el('button', { type: 'button', class: 'btn btn-grande', onclick: () => { pausaCambio = null; pintar(); } },
      `Pasar los dados a ${siguiente} ➜`));
    return;
  }

  switch (p.fase) {
    case 'tirar':
      caja.replaceChildren(el('button', { type: 'button', class: 'btn btn-grande', id: 'btn-tirar', onclick: tirar },
        `🎲 ${varios ? `${yo}: tira` : 'Tirar'} ${p.opciones.numDados === 1 ? 'el dado' : 'los dados'}`));
      break;

    case 'contar':
      caja.replaceChildren(...formularioRespuesta(
        '¿Cuántos puntos salieron?',
        'Listo',
        (r) => ejecutar({ tipo: 'contar', respuesta: r }),
        p.modo === 'suma' ? 'El cajero te dará esa cantidad de fichas azules.' : 'Esa cantidad es lo que vas a pagar al cajero.'
      ));
      break;

    case 'canje': {
      const tipo = canjePendiente(f);
      resaltar = { tipo, cantidad: 10 };
      const [de, a, regla] = tipo === 'azules'
        ? ['azules', 'roja', '10 unidades valen 1 decena']
        : ['rojas', 'amarilla', '10 decenas valen 1 centena'];
      caja.replaceChildren(
        explicacion(`¡Espera! Tienes ${cuantas(tipo, f[tipo])}.`, `${regla}. Cambia 10 ${de} por 1 ${a}.`),
        el('button', { type: 'button', class: 'btn btn-grande', onclick: () => ejecutar({ tipo: 'canjear' }, { [tipo]: 10 }) },
          `Canjear 10 ${de} por 1 ${a}`)
      );
      break;
    }

    case 'desagrupar': {
      const paso = pasoResta(f, p.cantidad);
      const u = p.cantidad % 10;
      const roja = paso === 'desagrupar-roja';
      const falta = f.azules < u
        ? `Tienes que pagar ${cuantas('azules', u)} y tienes ${f.azules}.`
        : `Tienes que pagar ${cuantas('rojas', Math.floor(p.cantidad / 10))} y no tienes ninguna.`;
      const sinRojas = !roja && f.azules < u ? ' No tienes rojas para cambiar, así que primero:' : '';
      resaltar = { tipo: roja ? 'rojas' : 'amarillas', cantidad: 1 };
      caja.replaceChildren(
        explicacion(`Hay que pagar ${p.cantidad}: ${composicion(p.cantidad)}.`,
          `${falta}${sinRojas} ${roja ? '1 decena vale 10 unidades: cambia 1 roja por 10 azules.' : '1 centena vale 10 decenas: cambia 1 amarilla por 10 rojas.'}`),
        el('button', {
          type: 'button', class: 'btn btn-grande btn-rojo',
          onclick: () => ejecutar({ tipo: 'desagrupar' }, { [roja ? 'rojas' : 'amarillas']: 1 }),
        }, roja ? 'Cambiar 1 roja por 10 azules' : 'Cambiar 1 amarilla por 10 rojas')
      );
      break;
    }

    case 'pagar': {
      const todo = pasoResta(f, p.cantidad) === 'pagar-todo';
      const salidas = todo ? { ...f } : { rojas: Math.floor(p.cantidad / 10), azules: p.cantidad % 10 };
      caja.replaceChildren(
        todo
          ? explicacion(`Salió ${p.cantidad}, pero solo tienes ${valor(f)}.`, 'Pagas todo lo que tienes y llegas a 0.')
          : explicacion('Ahora sí alcanza.', `Paga ${p.cantidad}: ${composicion(p.cantidad)}.`),
        el('button', { type: 'button', class: 'btn btn-grande btn-verde', onclick: () => ejecutar({ tipo: 'pagar' }, salidas) },
          todo ? 'Pagar todo' : `Pagar ${p.cantidad} al cajero`)
      );
      break;
    }

    case 'verificar': {
      const pregunta = varios
        ? `Cajero (${etiquetaJugador(p, otro(p.turno))}): ¿cuánto tiene ahora ${yo}?`
        : 'Ahora eres el cajero: ¿cuánto tienes en total?';
      const pista = p.intentos >= 2
        ? `Cuenta así: ${TIPOS.map((t) => `${cuantas(t, f[t])} = ${f[t] * Number(ETIQUETA[t])}`).join(' · ')}. Luego suma.`
        : p.intentos === 1 ? 'Pista: cada amarilla vale 100, cada roja 10 y cada azul 1.' : null;
      caja.replaceChildren(...formularioRespuesta(pregunta, 'Verificar', (r) => ejecutar({ tipo: 'verificar', respuesta: r }), pista));
      break;
    }

    case 'fin':
      caja.replaceChildren(el('button', { type: 'button', class: 'btn btn-grande btn-verde', onclick: nuevaPartida }, 'Jugar otra vez'));
      break;
  }
}

function pintarMensaje() {
  const p = partida;
  if (pausaCambio !== null) {
    mensaje(`✓ ${etiquetaJugador(p, pausaCambio)} terminó su turno con ${totalMostrado(pausaCambio)}.`, 'bien');
    return;
  }
  const aviso = TEXTO_AVISO[p.aviso];
  if (aviso) { mensaje(...aviso); return; }
  if (p.fase === 'tirar') {
    const ultimo = p.jugadores[p.turno].registro.at(-1);
    mensaje(ultimo ? `✓ Turno anotado: tienes ${ultimo.total}.` : '¡A jugar! Tira para empezar.', ultimo ? 'bien' : '');
  } else if (p.fase === 'contar') mensaje(`Salió: ${p.dados.join(' y ')}.`);
  else if (p.fase === 'canje' || p.fase === 'desagrupar' || p.fase === 'pagar') {
    mensaje(p.modo === 'suma' ? `El cajero te entregó ${cuantas('azules', p.cantidad)}.` : `Te toca pagar ${p.cantidad}.`);
  } else if (p.fase === 'verificar') mensaje(p.modo === 'suma' ? 'Ya no hay canjes pendientes.' : 'Pago hecho.');
  else mensaje('');
}

function pintar(entrantes) {
  pintarEncabezado();
  pintarAcciones();          // antes del tablero: define qué fichas se resaltan
  pintarTablero(entrantes);
  if (!$('#dados .gira')) pintarDados();
  pintarMensaje();
  pintarRegistro({
    contenedor: $('#registro'), pestanas: $('#pestanas'), partida, seleccionado: pestana,
    alElegir: (i) => { pestana = i; pintar(); },
  });
  // Que el paso siguiente (explicación + botón) siempre quede a la vista sin tener que desplazarse.
  const acciones = $('#acciones');
  const caja = acciones.getBoundingClientRect();
  if (caja.bottom > innerHeight || caja.top < 0) {
    acciones.scrollIntoView({ block: 'end', behavior: movimientoReducido.matches ? 'auto' : 'smooth' });
  }
  const r = $('#respuesta');
  if (r) r.focus({ preventScroll: true });
}

/* =====================================================================
 * Acciones
 * ===================================================================== */

async function ejecutar(accion, salidas = null) {
  if (ocupado) return;
  ocupado = true;
  try {
    const visto = jugadorVisto();
    const antes = { ...partida.jugadores[visto].fichas };
    const registroAntes = partida.jugadores[partida.turno].registro.length;
    const turnoAntes = partida.turno;

    if (salidas) {
      for (const [tipo, n] of Object.entries(salidas)) {
        const fichas = [...document.querySelectorAll(`.columna[data-tipo="${tipo}"] .ficha`)];
        fichas.slice(-n).forEach((x) => { x.classList.remove('resalta'); x.classList.add('sale'); });
      }
      await esperar(480);
    }

    partida = aplicar(partida, accion);
    almacen.guardar(CLAVE_PARTIDA, partida);

    const cerroTurno = partida.jugadores[turnoAntes].registro.length > registroAntes;
    if (cerroTurno && partida.jugadores.length > 1 && partida.fase !== 'fin') pausaCambio = turnoAntes;

    const despues = partida.jugadores[jugadorVisto()].fichas;
    const entrantes = jugadorVisto() === visto
      ? Object.fromEntries(TIPOS.map((t) => [t, Math.max(0, despues[t] - antes[t])]))
      : {};
    pintar(entrantes);
    if (partida.fase === 'fin') abrirFin();
  } finally {
    ocupado = false;
  }
}

async function tirar() {
  if (ocupado || partida.fase !== 'tirar') return;
  ocupado = true;
  const n = partida.opciones.numDados;
  const azar = () => 1 + Math.floor(Math.random() * 6);
  const finales = Array.from({ length: n }, azar);
  $('#btn-tirar').disabled = true;
  if (!movimientoReducido.matches) {
    for (let i = 0; i < 6; i++) { pintarDados(true, Array.from({ length: n }, azar)); await esperar(90); }
  }
  pintarDados(false, finales);
  ocupado = false;
  await ejecutar({ tipo: 'tirar', dados: finales });
}

function abrirFin() {
  const p = partida;
  const g = p.ganador;
  const turnos = p.jugadores[g].registro.length;
  const meta = p.modo === 'suma' ? 100 : 0;
  $('#fin-titulo').textContent = p.jugadores.length > 1
    ? `🏆 ¡${etiquetaJugador(p, g)} llegó a ${meta}!`
    : `🏆 ¡Llegaste a ${meta}!`;
  $('#fin-texto').textContent = `${p.jugadores.length > 1 ? 'Lo logró' : 'Lo lograste'} en ${turnos} turnos. ` +
    (p.modo === 'suma'
      ? 'Para conversar: ¿en qué turnos hubo canje y por qué 10 azules se cambian por 1 roja?'
      : 'Para conversar: ¿en qué turnos hubo que desagrupar y qué pasó con la amarilla?');
  const d = $('#dlg-fin');
  if (!d.open) d.showModal();
}

function nuevaPartida() {
  $('#dlg-fin').close();
  mostrarInicio();
}

/* =====================================================================
 * Pantallas, opciones y arranque
 * ===================================================================== */

function opcionesDelFormulario() {
  const fd = new FormData($('#form-inicio'));
  return {
    modo: fd.get('modo'),
    jugadores: Number(fd.get('jugadores')),
    numDados: Number(fd.get('dados')),
    contar: fd.has('contar'),
    verificar: fd.has('verificar'),
  };
}

function aplicarOpcionesAlFormulario(o) {
  if (!o) return;
  const form = $('#form-inicio');
  const marcar = (name, v) => { const r = form.querySelector(`[name="${name}"][value="${v}"]`); if (r) r.checked = true; };
  marcar('modo', o.modo);
  marcar('jugadores', o.jugadores);
  marcar('dados', o.numDados);
  form.contar.checked = o.contar !== false;
  form.verificar.checked = o.verificar !== false;
  $('#ver-cdu').checked = !!o.cdu;
}

function mostrarInicio() {
  const guardada = almacen.leer(CLAVE_PARTIDA);
  $('#aviso-continuar').hidden = !(esPartidaValida(guardada) && guardada.fase !== 'fin');
  $('#pantalla-juego').hidden = true;
  $('#pantalla-inicio').hidden = false;
  window.scrollTo(0, 0);
}

function mostrarJuego() {
  $('#pantalla-inicio').hidden = true;
  $('#pantalla-juego').hidden = false;
  pintar();
  window.scrollTo(0, 0);
}

function guardarOpciones(extra = {}) {
  const previas = almacen.leer(CLAVE_OPCIONES) || {};
  almacen.guardar(CLAVE_OPCIONES, { ...previas, ...extra });
}

function leerEnVozAlta() {
  if (!('speechSynthesis' in window)) return;
  const partes = [$('#mensaje').textContent];
  if (!$('#pantalla-juego').hidden) {
    $('#acciones').querySelectorAll('.explica, label, button').forEach((x) => partes.push(x.textContent));
  }
  const voz = new SpeechSynthesisUtterance(partes.filter(Boolean).join('. ').replace(/[🎲🎯🧾🏆✓➜📷]/gu, ''));
  voz.lang = 'es-MX';
  voz.rate = 0.95;
  speechSynthesis.cancel();
  speechSynthesis.speak(voz);
}

function arrancar() {
  aplicarOpcionesAlFormulario(almacen.leer(CLAVE_OPCIONES));

  $('#form-inicio').addEventListener('submit', (e) => {
    e.preventDefault();
    const o = opcionesDelFormulario();
    guardarOpciones(o);
    partida = crearPartida(o);
    almacen.guardar(CLAVE_PARTIDA, partida);
    pestana = 0;
    pausaCambio = null;
    mostrarJuego();
  });

  $('#btn-continuar').addEventListener('click', () => {
    const guardada = almacen.leer(CLAVE_PARTIDA);
    if (!esPartidaValida(guardada)) { mostrarInicio(); return; }
    partida = guardada;
    pestana = 0;
    pausaCambio = null;
    mostrarJuego();
  });

  $('#btn-nueva').addEventListener('click', mostrarInicio);
  $('#ver-cdu').addEventListener('change', (e) => { guardarOpciones({ cdu: e.target.checked }); pintarTablero(); });

  $('#btn-exportar').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    const original = b.textContent;
    b.disabled = true;
    const r = await exportarRegistro(partida, $('#nombre-evidencia').value);
    b.textContent = r === 'descargado' ? '✓ Imagen descargada' : r === 'compartido' ? '✓ Imagen compartida' : original;
    setTimeout(() => { b.textContent = original; b.disabled = false; }, 2500);
  });

  $('#dlg-fin').addEventListener('click', (e) => {
    const a = e.target.closest('[data-accion]')?.dataset.accion;
    if (a === 'exportar') $('#btn-exportar').click();
    if (a === 'nueva') nuevaPartida();
    if (a === 'cerrar') $('#dlg-fin').close();
  });

  $('#btn-acerca').addEventListener('click', () => $('#dlg-acerca').showModal());
  $('#dlg-acerca').addEventListener('click', (e) => {
    if (e.target.closest('[data-accion="cerrar"]') || e.target === e.currentTarget) $('#dlg-acerca').close();
  });

  if ('speechSynthesis' in window) {
    $('#btn-leer').hidden = false;
    $('#btn-leer').addEventListener('click', leerEnVozAlta);
  }

  mostrarInicio();
}

arrancar();
