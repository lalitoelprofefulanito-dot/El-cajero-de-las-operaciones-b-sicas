/*
 * Pruebas de js/logica.js — se ejecutan con:  npm test   (o: node --test tests/)
 * Autor: Prof. Eduardo Kantún Martínez
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fichasIniciales, valor, descomponer, recibir, canjePendiente, canjear,
  pasoResta, desagrupar, pagar, haGanado, crearPartida, aplicar, esPartidaValida,
} from '../js/logica.js';

const F = (amarillas, rojas, azules) => ({ amarillas, rojas, azules });

/** Resuelve un turno de suma completo (con canjes) — útil para los casos límite. */
function sumarConCanjes(f, n) {
  let x = recibir(f, n);
  while (canjePendiente(x)) x = canjear(x);
  return x;
}
/** Resuelve un pago de resta completo (con desagrupaciones). */
function restarConDesagrupar(f, n) {
  let x = f;
  let paso;
  while ((paso = pasoResta(x, n)).startsWith('desagrupar')) x = desagrupar(x, paso);
  return pagar(x, n);
}

test('valores de las fichas: amarilla = 100', () => {
  assert.equal(valor(F(1, 0, 0)), 100);
  assert.equal(valor(F(0, 1, 0)), 10);
  assert.equal(valor(F(0, 0, 1)), 1);
  assert.deepEqual(descomponer(100), { c: 1, d: 0, u: 0 });
  assert.deepEqual(descomponer(47), { c: 0, d: 4, u: 7 });
});

test('fichas iniciales', () => {
  assert.equal(valor(fichasIniciales('suma')), 0);
  assert.deepEqual(fichasIniciales('resta'), F(1, 0, 0));
  assert.throws(() => fichasIniciales('multiplicación'));
});

test('caso límite 99 + 3 = 102 con doble canje', () => {
  const x = sumarConCanjes(F(0, 9, 9), 3);
  assert.deepEqual(x, F(1, 0, 2));
  assert.equal(valor(x), 102);
  assert.equal(haGanado('suma', x), true);
});

test('canje: 10 azules → 1 roja; 10 rojas → 1 amarilla', () => {
  assert.equal(canjePendiente(F(0, 0, 9)), null);
  assert.equal(canjePendiente(F(0, 3, 12)), 'azules');
  assert.deepEqual(canjear(F(0, 3, 12)), F(0, 4, 2));
  assert.deepEqual(canjear(F(0, 10, 0)), F(1, 0, 0));
  assert.throws(() => canjear(F(0, 0, 5)));
});

test('caso límite 100 − 4 = 96', () => {
  const { fichas, pagado } = restarConDesagrupar(F(1, 0, 0), 4);
  assert.deepEqual(fichas, F(0, 9, 6));
  assert.equal(pagado, 4);
});

test('caso límite 100 − 12 = 88', () => {
  const pasos = [];
  let x = F(1, 0, 0);
  let paso;
  while ((paso = pasoResta(x, 12)).startsWith('desagrupar')) { pasos.push(paso); x = desagrupar(x, paso); }
  assert.deepEqual(pasos, ['desagrupar-amarilla', 'desagrupar-roja']);
  assert.deepEqual(pagar(x, 12).fichas, F(0, 8, 8));
});

test('resta sin desagrupar cuando sí alcanza: 47 − 12 = 35', () => {
  assert.equal(pasoResta(F(0, 4, 7), 12), 'pagar');
  assert.deepEqual(pagar(F(0, 4, 7), 12).fichas, F(0, 3, 5));
});

test('caso límite: último turno con más puntos que fichas (5 − 9 → paga 5 y llega a 0)', () => {
  assert.equal(pasoResta(F(0, 0, 5), 9), 'pagar-todo');
  const r = pagar(F(0, 0, 5), 9);
  assert.deepEqual(r.fichas, F(0, 0, 0));
  assert.equal(r.pagado, 5);
  assert.equal(haGanado('resta', r.fichas), true);
  // exactamente lo que tiene también es "pagar todo"
  assert.equal(pasoResta(F(0, 1, 2), 12), 'pagar-todo');
});

test('no se puede pagar sin desagrupar antes', () => {
  assert.throws(() => pagar(F(1, 0, 0), 4));
  assert.throws(() => desagrupar(F(0, 0, 5), 'desagrupar-roja'));
});

test('resta: las azules nunca pasan de 9 después de pagar (invariante)', () => {
  let x = F(1, 0, 0);
  for (const n of [2, 12, 7, 11, 3, 9, 6, 10, 4, 8, 5, 12, 12]) {
    if (valor(x) === 0) break;
    x = restarConDesagrupar(x, n).fichas;
    assert.ok(x.azules <= 9 && x.rojas <= 10, JSON.stringify(x));
  }
});

test('partida de suma completa en solitario, con contar y verificar', () => {
  let p = crearPartida({ modo: 'suma' });
  let turnos = 0;
  while (p.fase !== 'fin') {
    p = aplicar(p, { tipo: 'tirar', dados: [6, 6] });
    assert.equal(p.fase, 'contar');
    p = aplicar(p, { tipo: 'contar', respuesta: 11 });
    assert.equal(p.aviso, 'contar-incorrecto');
    p = aplicar(p, { tipo: 'contar', respuesta: '12' });
    while (p.fase === 'canje') p = aplicar(p, { tipo: 'canjear' });
    assert.equal(p.fase, 'verificar');
    p = aplicar(p, { tipo: 'verificar', respuesta: valor(p.jugadores[0].fichas) });
    turnos++;
  }
  assert.equal(turnos, 9); // 9 × 12 = 108
  assert.equal(p.ganador, 0);
  assert.equal(p.jugadores[0].registro.length, 9);
  assert.equal(p.jugadores[0].registro.at(-1).total, 108);
  assert.equal(p.jugadores[0].registro[0].verificado, true);
});

test('verificación con error queda registrada como "necesitó más intentos"', () => {
  let p = crearPartida({ modo: 'suma', contar: false });
  p = aplicar(p, { tipo: 'tirar', dados: [3, 4] });
  assert.equal(p.fase, 'verificar');
  p = aplicar(p, { tipo: 'verificar', respuesta: 6 });
  assert.equal(p.aviso, 'verificar-incorrecto');
  p = aplicar(p, { tipo: 'verificar', respuesta: 7 });
  const fila = p.jugadores[0].registro[0];
  assert.equal(fila.verificado, false);
  assert.equal(fila.intentos, 1);
});

test('partida de resta completa a 2 jugadores, sin contar ni verificar, 1 dado', () => {
  let p = crearPartida({ modo: 'resta', jugadores: 2, numDados: 1, contar: false, verificar: false });
  let guard = 0;
  while (p.fase !== 'fin' && guard++ < 1000) {
    if (p.fase === 'tirar') p = aplicar(p, { tipo: 'tirar', dados: [6] });
    else if (p.fase === 'desagrupar') p = aplicar(p, { tipo: 'desagrupar' });
    else if (p.fase === 'pagar') p = aplicar(p, { tipo: 'pagar' });
    else assert.fail(`fase inesperada ${p.fase}`);
  }
  assert.equal(p.ganador, 0); // empieza el jugador 1: 17 turnos de 6 → llega a 0 primero
  assert.equal(valor(p.jugadores[0].fichas), 0);
  assert.equal(p.jugadores[0].registro.at(-1).pagado, 4); // 100 − 16×6 = 4 → paga todo
  assert.equal(p.jugadores[1].registro.length, 16);
});

test('suma sin verificar cierra el turno al terminar los canjes', () => {
  let p = crearPartida({ modo: 'suma', contar: false, verificar: false });
  p = aplicar(p, { tipo: 'tirar', dados: [5, 5] });
  assert.equal(p.fase, 'canje');
  p = aplicar(p, { tipo: 'canjear' });
  assert.equal(p.fase, 'tirar');
  assert.equal(p.jugadores[0].registro[0].total, 10);
});

test('acciones fuera de fase no cambian las fichas', () => {
  const p = crearPartida({ modo: 'suma' });
  const q = aplicar(p, { tipo: 'canjear' });
  assert.equal(q.aviso, 'fuera-de-fase');
  assert.deepEqual(q.jugadores, p.jugadores);
  assert.throws(() => aplicar(p, { tipo: 'tirar', dados: [7, 1] }));
  assert.throws(() => aplicar(p, { tipo: 'tirar', dados: [3] })); // pide 2 dados
});

test('validación de partidas guardadas', () => {
  assert.equal(esPartidaValida(crearPartida({ modo: 'resta' })), true);
  assert.equal(esPartidaValida(null), false);
  assert.equal(esPartidaValida({ version: 1, modo: 'suma', jugadores: [{ fichas: { amarillas: -1, rojas: 0, azules: 0 } }], fase: 'tirar' }), false);
});
