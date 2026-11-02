/*
 * El cajero de las Operaciones Básicas — registro.js
 * Autor: Prof. Eduardo Kantún Martínez · Licencia MIT
 *
 * Registro de 3 columnas (dados · total · verificación del cajero) y su
 * exportación como imagen PNG para entregarla como evidencia de juego en casa.
 * Se eligió imagen (no PDF) porque se comparte directo por WhatsApp/correo
 * y funciona sin internet y sin bibliotecas externas.
 */
import { descomponer } from './logica.js';

export const NOMBRE_MODO = { suma: 'Cajero de la Suma', resta: 'Cajero de la Resta' };

export function etiquetaJugador(partida, i) {
  return partida.jugadores.length === 1 ? 'Tú' : `Jugador ${i + 1}`;
}

/* ---------- Textos de cada celda (compartidos por la tabla y la imagen) ---------- */

function textoDados(fila, modo) {
  const op = fila.dados.length > 1 ? `${fila.dados.join(' + ')} = ${fila.cantidad}` : `${fila.cantidad}`;
  const verbo = modo === 'suma' ? 'recibe' : 'paga';
  if (modo === 'resta' && fila.pagado !== fila.cantidad) return `${op} · paga ${fila.pagado} (todo lo que tenía)`;
  return `${op} · ${verbo} ${fila.cantidad}`;
}

function textoTotal(fila) {
  const { c, d, u } = descomponer(fila.total);
  return `${fila.total}  (${c} C · ${d} D · ${u} U)`;
}

function textoVerificacion(fila) {
  if (fila.verificado === null) return '— (sin verificación)';
  if (fila.verificado) return '✓ a la primera';
  return `✓ después de ${fila.intentos + 1} intentos`;
}

/* ---------- Tabla en pantalla ---------- */

export function pintarRegistro({ contenedor, pestanas, partida, seleccionado, alElegir }) {
  const varios = partida.jugadores.length > 1;
  pestanas.hidden = !varios;
  pestanas.replaceChildren();
  if (varios) {
    partida.jugadores.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.textContent = etiquetaJugador(partida, i);
      b.setAttribute('aria-selected', String(i === seleccionado));
      b.addEventListener('click', () => alElegir(i));
      pestanas.append(b);
    });
  }

  const filas = partida.jugadores[seleccionado].registro;
  if (filas.length === 0) {
    const p = document.createElement('p');
    p.className = 'vacio';
    p.textContent = 'Aquí aparecerá cada turno en cuanto termine.';
    contenedor.replaceChildren(p);
    return;
  }

  const tabla = document.createElement('table');
  tabla.className = 'tabla-registro';
  const enc = tabla.createTHead().insertRow();
  ['Turno', 'Dados', 'Total', 'Verificación del cajero'].forEach((t) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = t;
    enc.append(th);
  });
  const cuerpo = tabla.createTBody();
  filas.forEach((fila, i) => {
    const tr = cuerpo.insertRow();
    tr.insertCell().textContent = String(i + 1);
    tr.insertCell().textContent = textoDados(fila, partida.modo);
    const total = tr.insertCell();
    const { c, d, u } = descomponer(fila.total);
    const cdu = document.createElement('small');
    cdu.className = 'cdu-fila';
    cdu.textContent = `${c} C · ${d} D · ${u} U`;
    total.append(document.createElement('strong'), cdu);
    total.firstChild.textContent = String(fila.total);
    const v = tr.insertCell();
    v.textContent = textoVerificacion(fila);
    if (fila.verificado === true) v.className = 'ok';
    if (fila.verificado === false) v.className = 'intentos';
  });
  contenedor.replaceChildren(tabla);
}

/* ---------- Exportar como imagen ---------- */

function fechaLarga(fecha) {
  return fecha.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
}

function dibujarImagen(partida, nombre, fecha) {
  const W = 1000;
  const FILA = 40;
  const columnas = [
    { titulo: 'Turno', ancho: 90 },
    { titulo: 'Dados', ancho: 360 },
    { titulo: 'Total', ancho: 250 },
    { titulo: 'Verificación del cajero', ancho: 260 },
  ];
  const x0 = 20;
  const bloques = partida.jugadores.map((j) => j.registro.length);
  const alto = 230 + bloques.reduce((s, n) => s + 70 + FILA * (Math.max(n, 1) + 1), 0) + 80;

  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = alto;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, W, alto);
  g.fillStyle = '#1d4ed8';
  g.fillRect(0, 0, W, 90);
  g.fillStyle = '#ffffff';
  g.font = 'bold 34px system-ui, Arial, sans-serif';
  g.fillText('El cajero de las Operaciones Básicas', x0, 56);

  g.fillStyle = '#1f2937';
  g.font = '22px system-ui, Arial, sans-serif';
  const op = partida.opciones;
  g.fillText(
    `${NOMBRE_MODO[partida.modo]} · ${partida.jugadores.length === 1 ? '1 jugador' : '2 jugadores'} · ${op.numDados} ${op.numDados === 1 ? 'dado' : 'dados'}`,
    x0, 130
  );
  g.fillText(`Fecha: ${fechaLarga(fecha)}`, x0, 162);
  g.fillText(`Nombre: ${nombre || '________________________'}`, x0, 194);

  let y = 230;
  partida.jugadores.forEach((j, idx) => {
    g.font = 'bold 24px system-ui, Arial, sans-serif';
    const gano = partida.fase === 'fin' && partida.ganador === idx;
    g.fillText(`${etiquetaJugador(partida, idx)}${gano ? '  ★ llegó a la meta' : ''}`, x0, y + 30);
    y += 50;

    const pintarFila = (celdas, encabezado) => {
      let x = x0;
      celdas.forEach((texto, c) => {
        g.fillStyle = encabezado ? '#dbeafe' : '#ffffff';
        g.fillRect(x, y, columnas[c].ancho, FILA);
        g.strokeStyle = '#94a3b8';
        g.strokeRect(x, y, columnas[c].ancho, FILA);
        g.fillStyle = '#1f2937';
        g.font = `${encabezado ? 'bold ' : ''}19px system-ui, Arial, sans-serif`;
        g.fillText(texto, x + 8, y + 26, columnas[c].ancho - 14);
        x += columnas[c].ancho;
      });
      y += FILA;
    };

    pintarFila(columnas.map((c) => c.titulo), true);
    if (j.registro.length === 0) pintarFila(['—', 'Sin turnos todavía', '', ''], false);
    j.registro.forEach((fila, i) =>
      pintarFila([String(i + 1), textoDados(fila, partida.modo), textoTotal(fila), textoVerificacion(fila)], false)
    );
    y += 20;
  });

  g.fillStyle = '#4b5563';
  g.font = '16px system-ui, Arial, sans-serif';
  g.fillText('Basado en «Juega y Aprende: El cajero de 1 a 6», SEP/RILEC (1991).', x0, alto - 46);
  g.fillText('Diseño y desarrollo: Prof. Eduardo Kantún Martínez.', x0, alto - 22);
  return cv;
}

/**
 * Genera el PNG y lo comparte (menú de compartir del celular) o lo descarga.
 * Devuelve 'compartido' | 'descargado' | 'cancelado'.
 */
export async function exportarRegistro(partida, nombre) {
  const fecha = new Date();
  const cv = dibujarImagen(partida, nombre.trim(), fecha);
  const blob = await new Promise((ok) => cv.toBlob(ok, 'image/png'));
  const dia = fecha.toISOString().slice(0, 10);
  const archivo = new File([blob], `registro-cajero-${partida.modo}-${dia}.png`, { type: 'image/png' });

  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: 'Registro de El Cajero' });
      return 'compartido';
    } catch (e) {
      if (e.name === 'AbortError') return 'cancelado';
      // si compartir falla por otra razón, se descarga
    }
  }
  const url = URL.createObjectURL(archivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = archivo.name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'descargado';
}
