/*
 * El cajero de las Operaciones Básicas — logica.js
 * Autor: Prof. Eduardo Kantún Martínez
 * Basado en: SEP/RILEC (1991), "Juega y Aprende: El cajero de 1 a 6".
 * Licencia del código: MIT.
 *
 * Regla de diseño: este módulo SOLO calcula. No toca la pantalla, no usa
 * localStorage ni Math.random. Por eso se puede probar por separado
 * (ver tests/logica.test.js).
 *
 * Fichas:  azul = 1 (unidad) · roja = 10 (decena) · amarilla = 100 (centena)
 */

export const VALOR = Object.freeze({ azules: 1, rojas: 10, amarillas: 100 });
export const META_SUMA = 100;
export const META_RESTA = 0;

/* ---------- Fichas ---------- */

export function fichasIniciales(modo) {
  if (modo === 'suma') return { amarillas: 0, rojas: 0, azules: 0 };
  if (modo === 'resta') return { amarillas: 1, rojas: 0, azules: 0 };
  throw new Error(`Modo desconocido: ${modo}`);
}

export function valor(f) {
  return f.amarillas * VALOR.amarillas + f.rojas * VALOR.rojas + f.azules * VALOR.azules;
}

/** Descompone un número en centenas, decenas y unidades (tablero C-D-U). */
export function descomponer(n) {
  return { c: Math.floor(n / 100), d: Math.floor((n % 100) / 10), u: n % 10 };
}

export function sumarDados(dados) {
  return dados.reduce((s, d) => s + d, 0);
}

/* ---------- Suma: recibir y canjear ---------- */

/** El cajero entrega n fichas azules. */
export function recibir(f, n) {
  return { ...f, azules: f.azules + n };
}

/** ¿Qué canje falta? 'azules' (10 azules → 1 roja), 'rojas' (10 rojas → 1 amarilla) o null. */
export function canjePendiente(f) {
  if (f.azules >= 10) return 'azules';
  if (f.rojas >= 10) return 'rojas';
  return null;
}

/** Hace UN canje (el que esté pendiente). */
export function canjear(f) {
  const tipo = canjePendiente(f);
  if (tipo === 'azules') return { ...f, azules: f.azules - 10, rojas: f.rojas + 1 };
  if (tipo === 'rojas') return { ...f, rojas: f.rojas - 10, amarillas: f.amarillas + 1 };
  throw new Error('No hay canje pendiente');
}

/* ---------- Resta: desagrupar y pagar ---------- */

/**
 * Siguiente paso para pagar n:
 *  'pagar-todo'          → tiene n o menos: paga todo y llega a 0 (último turno)
 *  'desagrupar-roja'     → 1 roja → 10 azules
 *  'desagrupar-amarilla' → 1 amarilla → 10 rojas
 *  'pagar'               → ya alcanzan las fichas de cada columna
 */
export function pasoResta(f, n) {
  if (valor(f) <= n) return 'pagar-todo';
  const u = n % 10;
  const d = Math.floor(n / 10);
  if (f.azules < u) return f.rojas > 0 ? 'desagrupar-roja' : 'desagrupar-amarilla';
  if (f.rojas < d) return 'desagrupar-amarilla';
  return 'pagar';
}

export function desagrupar(f, tipo) {
  if (tipo === 'desagrupar-roja') {
    if (f.rojas < 1) throw new Error('No hay rojas para desagrupar');
    return { ...f, rojas: f.rojas - 1, azules: f.azules + 10 };
  }
  if (tipo === 'desagrupar-amarilla') {
    if (f.amarillas < 1) throw new Error('No hay amarillas para desagrupar');
    return { ...f, amarillas: f.amarillas - 1, rojas: f.rojas + 10 };
  }
  throw new Error(`Desagrupación desconocida: ${tipo}`);
}

/** Paga n (requiere que pasoResta devuelva 'pagar' o 'pagar-todo'). Devuelve fichas y lo pagado. */
export function pagar(f, n) {
  const paso = pasoResta(f, n);
  if (paso === 'pagar-todo') {
    return { fichas: { amarillas: 0, rojas: 0, azules: 0 }, pagado: valor(f) };
  }
  if (paso !== 'pagar') throw new Error(`Falta desagrupar antes de pagar (${paso})`);
  return {
    fichas: { ...f, rojas: f.rojas - Math.floor(n / 10), azules: f.azules - (n % 10) },
    pagado: n,
  };
}

export function haGanado(modo, f) {
  return modo === 'suma' ? valor(f) >= META_SUMA : valor(f) === META_RESTA;
}

/* ---------- Partida (máquina de estados pura) ---------- */

/*
 * Fases de un turno:
 *   suma:  tirar → contar → [canje]* → verificar → (siguiente turno | fin)
 *   resta: tirar → contar → [desagrupar]* → pagar → verificar → (siguiente | fin)
 * "contar" se salta si opciones.contar = false; "verificar" si opciones.verificar = false.
 */

export function crearPartida({ modo, jugadores = 1, numDados = 2, contar = true, verificar = true }) {
  if (![1, 2].includes(jugadores)) throw new Error('Jugadores debe ser 1 o 2');
  if (![1, 2].includes(numDados)) throw new Error('Dados debe ser 1 o 2');
  return {
    version: 1,
    modo,
    opciones: { numDados, contar, verificar },
    jugadores: Array.from({ length: jugadores }, () => ({ fichas: fichasIniciales(modo), registro: [] })),
    turno: 0,
    fase: 'tirar',
    dados: [],
    cantidad: 0,
    pagado: 0,
    intentos: 0,
    aviso: null,
    ganador: null,
  };
}

const jugadorActual = (p) => p.jugadores[p.turno];

function conFichas(p, fichas) {
  const jugadores = p.jugadores.map((j, i) => (i === p.turno ? { ...j, fichas } : j));
  return { ...p, jugadores };
}

/** Fase que sigue después de saber cuánto recibir/pagar o después de un canje/desagrupación. */
function faseDespuesDeMover(p) {
  const f = jugadorActual(p).fichas;
  if (p.modo === 'suma') return canjePendiente(f) ? 'canje' : faseVerificar(p);
  const paso = pasoResta(f, p.cantidad);
  return paso.startsWith('desagrupar') ? 'desagrupar' : 'pagar';
}

const faseVerificar = (p) => (p.opciones.verificar ? 'verificar' : 'cerrar');

function entregarOCobrar(p) {
  let q = { ...p, intentos: 0, aviso: null };
  if (p.modo === 'suma') q = conFichas(q, recibir(jugadorActual(q).fichas, q.cantidad));
  q = { ...q, fase: faseDespuesDeMover(q) };
  return q.fase === 'cerrar' ? cerrarTurno(q, null) : q;
}

function cerrarTurno(p, verificado) {
  const j = jugadorActual(p);
  const fila = {
    dados: [...p.dados],
    cantidad: p.cantidad,
    pagado: p.modo === 'resta' ? p.pagado : null,
    total: valor(j.fichas),
    verificado, // true = acertó a la primera · false = necesitó más intentos · null = sin verificación
    intentos: p.intentos,
  };
  let q = {
    ...p,
    jugadores: p.jugadores.map((x, i) => (i === p.turno ? { ...x, registro: [...x.registro, fila] } : x)),
  };
  if (haGanado(q.modo, j.fichas)) return { ...q, fase: 'fin', ganador: q.turno, aviso: null };
  return {
    ...q,
    turno: (q.turno + 1) % q.jugadores.length,
    fase: 'tirar',
    dados: [],
    cantidad: 0,
    pagado: 0,
    intentos: 0,
    aviso: null,
  };
}

/**
 * Aplica una acción y devuelve el nuevo estado (nunca modifica el anterior).
 * Acciones: {tipo:'tirar', dados:[..]} · {tipo:'contar', respuesta} · {tipo:'canjear'}
 *           {tipo:'desagrupar'} · {tipo:'pagar'} · {tipo:'verificar', respuesta}
 * Una acción fuera de su fase devuelve el mismo estado con aviso 'fuera-de-fase'.
 */
export function aplicar(p, accion) {
  const fuera = { ...p, aviso: 'fuera-de-fase' };
  const f = p.jugadores[p.turno].fichas;

  switch (accion.tipo) {
    case 'tirar': {
      if (p.fase !== 'tirar') return fuera;
      const dados = accion.dados;
      if (dados.length !== p.opciones.numDados || dados.some((d) => !Number.isInteger(d) || d < 1 || d > 6)) {
        throw new Error('Dados inválidos');
      }
      const q = { ...p, dados: [...dados], cantidad: sumarDados(dados), pagado: 0, intentos: 0, aviso: null };
      return q.opciones.contar ? { ...q, fase: 'contar' } : entregarOCobrar(q);
    }
    case 'contar': {
      if (p.fase !== 'contar') return fuera;
      if (Number(accion.respuesta) !== p.cantidad) {
        return { ...p, intentos: p.intentos + 1, aviso: 'contar-incorrecto' };
      }
      return entregarOCobrar(p);
    }
    case 'canjear': {
      if (p.fase !== 'canje') return fuera;
      const tipo = canjePendiente(f);
      const q = conFichas(p, canjear(f));
      const fase = faseDespuesDeMover(q);
      const r = { ...q, fase, aviso: tipo === 'azules' ? 'canje-azules' : 'canje-rojas' };
      return fase === 'cerrar' ? cerrarTurno(r, null) : r;
    }
    case 'desagrupar': {
      if (p.fase !== 'desagrupar') return fuera;
      const paso = pasoResta(f, p.cantidad);
      const q = conFichas(p, desagrupar(f, paso));
      return { ...q, fase: faseDespuesDeMover(q), aviso: paso };
    }
    case 'pagar': {
      if (p.fase !== 'pagar') return fuera;
      const todo = pasoResta(f, p.cantidad) === 'pagar-todo';
      const { fichas, pagado } = pagar(f, p.cantidad);
      const q = { ...conFichas(p, fichas), pagado, aviso: todo ? 'pago-todo' : null };
      return q.opciones.verificar ? { ...q, fase: 'verificar' } : cerrarTurno(q, null);
    }
    case 'verificar': {
      if (p.fase !== 'verificar') return fuera;
      if (Number(accion.respuesta) !== valor(f)) {
        return { ...p, intentos: p.intentos + 1, aviso: 'verificar-incorrecto' };
      }
      return cerrarTurno(p, p.intentos === 0);
    }
    default:
      throw new Error(`Acción desconocida: ${accion.tipo}`);
  }
}

/** Valida un estado guardado (por si localStorage trae algo viejo o dañado). */
export function esPartidaValida(p) {
  return (
    !!p &&
    p.version === 1 &&
    (p.modo === 'suma' || p.modo === 'resta') &&
    Array.isArray(p.jugadores) &&
    p.jugadores.length >= 1 &&
    p.jugadores.length <= 2 &&
    p.jugadores.every(
      (j) => j && j.fichas && ['amarillas', 'rojas', 'azules'].every((k) => Number.isInteger(j.fichas[k]) && j.fichas[k] >= 0)
    ) &&
    ['tirar', 'contar', 'canje', 'desagrupar', 'pagar', 'verificar', 'fin'].includes(p.fase)
  );
}
