# El cajero de las Operaciones Básicas 🪙

Juego web instalable (PWA) para practicar **valor posicional, suma y resta con canje y desagrupación**, con fichas que valen 1, 10 y 100.

📲 **Juega e instala:** https://lalitoelprofefulanito-dot.github.io/cajero-operaciones-basicas/

<img src="icons/qr.png" alt="Código QR del juego" width="180">

## Qué incluye (v1.0)

| Función | Detalle |
|---|---|
| Cajero de la Suma | Empieza en 0, recibe azules, canjea 10 azules → 1 roja y 10 rojas → 1 amarilla. Meta: 100. |
| Cajero de la Resta | Empieza con 1 amarilla (100), paga y desagrupa (amarilla → 10 rojas, roja → 10 azules). Meta: 0. |
| Pausa de canje | El juego se detiene, resalta las 10 fichas y explica la regla («10 unidades valen 1 decena»). El canje lo hace el niño o la niña con un botón, no la app sola. |
| Registro de 3 columnas | Dados · total (con C-D-U) · verificación del cajero (a la primera / con cuántos intentos). |
| Rol de cajero | En modo familiar, quien no tira verifica el total. En solitario, la misma persona verifica. |
| Exportar evidencia | El registro se guarda o comparte como imagen PNG (con nombre opcional que no se almacena). |
| Ajustes DUA | 1 o 2 dados, «Yo cuento los puntos» y «El cajero verifica» activables, tablero C-D-U, lectura en voz alta 🔊, fichas distinguibles por color **y forma y número**. |
| Sin internet | Funciona sin conexión después de la primera visita. |
| Privacidad | Solo `localStorage` del dispositivo. Sin nombres, sin analítica, sin servidores. |

## Cómo instalar

- **Android (Chrome):** botón **📲 Instalar** del portal, o menú **⋮** → **Instalar aplicación**.
- **iPhone/iPad (Safari):** botón **Compartir** ⬆️ → **Agregar a pantalla de inicio** → **Agregar**.

## Publicar en GitHub Pages (sin instalar nada)

1. En GitHub, crea el repositorio **público** `cajero-operaciones-basicas` (botón verde **New**, arriba a la izquierda en tu página de repositorios).
2. Dentro del repositorio: **Add file → Upload files**. Arrastra **el contenido** de la carpeta descomprimida (no la carpeta misma: `index.html` debe quedar en la raíz). Incluye la carpeta `.github` y el archivo `.nojekyll`; si tu explorador oculta archivos que empiezan con punto, actívalos (Windows: Explorador → **Vista → Mostrar → Elementos ocultos**; Mac: en Finder presiona **Cmd + Shift + .**).
3. Escribe un mensaje como «Versión 1.0» y pulsa **Commit changes**.
4. **Settings** (pestaña con engrane) → **Pages** (menú izquierdo) → en *Build and deployment*, *Source*: **Deploy from a branch** → Branch: **main** y carpeta **/ (root)** → **Save**.
5. Espera 1–2 minutos y abre la URL de arriba.

### Cada vez que cambies algo

Abre `sw.js` y sube el número de `VERSION` (`cajero-v1` → `cajero-v2`). Si no lo haces, los celulares que ya instalaron la app seguirán viendo la versión guardada.

## Para otros docentes

- `guia.html` (dentro de la app): guía para familias.
- [`docs/guia-docente.md`](docs/guia-docente.md): razonamiento pedagógico, secuencia sugerida y adaptaciones.
- [`docs/instrumento-evaluacion.md`](docs/instrumento-evaluacion.md): instrumento para leer el registro como evidencia.

¿Quieres usarlo con tu grupo? Puedes hacer un *fork* (botón **Fork**, arriba a la derecha) y publicarlo con tu propio usuario. Cambia la URL del QR (`icons/qr.png`) y, si lo adaptas, agrega tu crédito de adaptación junto al del autor.

## Para quien programa

```
index.html            portal: bienvenida, instalar, guía, compartir, créditos
guia.html             guía para familias
juego/index.html      el juego
css/estilos.css
js/logica.js          reglas puras (suma, resta, canje, desagrupar, victoria, máquina de estados)
js/interfaz.js        pantalla, animaciones, guardado local
js/registro.js        tabla de 3 columnas y exportación PNG
js/pwa.js             service worker + botón de instalación
sw.js                 caché versionado para uso sin internet
manifest.webmanifest
tests/logica.test.js  pruebas de la lógica (casos 99+3, 100−4, 100−12, pago final mayor que lo que se tiene)
```

`logica.js` no toca la pantalla: se prueba con `npm test` (Node 20 o superior).

## Créditos

- **Estrategia didáctica original:** SEP / RILEC (1991). *Juega y Aprende. Propuesta para divertirse y trabajar en el aula: El cajero de 1 a 6*.
- **Diseño y desarrollo:** Prof. Eduardo Kantún Martínez.

La propuesta original de SEP/RILEC conserva sus derechos: aquí se cita como fuente y no se reproduce su texto.

## Licencia

Código: [MIT](LICENSE). Materiales didácticos (`guia.html`, `docs/`): [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.es).
