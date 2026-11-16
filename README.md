# Humo antes que llamas

Experiencia web interactiva para el **Desafío 2 (Big Data + IA)**: incendios forestales en la comarca andina (El Bolsón, Epuyén, Lago Puelo) y cómo la **detección temprana con IA** podría reducir la superficie quemada.

Autor: **Santiago Stroppiana** · 2026

> ⚠️ La simulación es un **modelo ilustrativo** con fines educativos. No es una predicción real ni reemplaza los modelos de comportamiento del fuego de los organismos oficiales.

## Cómo abrirla

Hacé doble clic en `index.html`. No necesita servidor ni instalar nada: el HTML, el CSS, el JavaScript y los datos del modelo están todos en ese archivo.
La única conexión externa es **opcional**: el clima en vivo de Open-Meteo. Sin internet, ese panel avisa que no pudo conectarse y todo lo demás funciona igual.

## Estructura

```
FUEGO/
├── index.html   ← toda la experiencia (HTML + CSS + JS en un solo archivo)
└── README.md    ← este documento
```

Secciones de la página:

| # | Sección | Qué hace |
|---|---|---|
| 1 | Hoy | La problemática con datos reales y sus fuentes. Los datos sin balance oficial final están marcados como «a verificar». |
| 2 | Decidí | Clima en vivo de El Bolsón y controles: cámaras, tiempo de respuesta, viento, sequedad y falsas alarmas. |
| 3 | Simulación | Dos mapas lado a lado («sin IA» y «con IA»), 5 retos guiados con lección, gráfico en vivo de hectáreas, historial de corridas y link para compartir el escenario. |
| 4 | 2040 | Proyección del quemado acumulado con gráfico interactivo y tabla. |
| 5 | IA real | Cómo funcionaría el sistema, con qué datos se entrena y sus límites. |
| 6 | Futuro mejor | Carta de ficción desde 2040, las cinco piezas necesarias y tus números. |
| 7 | Fuentes | Lista completa con links. |

Dentro de `index.html`:

| Bloque | Qué contiene |
|---|---|
| `<style>` | Diseño responsive, variables de color y modo oscuro automático. |
| `<script id="core">` | El **modelo**, sin DOM: terreno, cámaras, autómata celular, falsas alarmas y proyección. Se puede probar aparte con Node. |
| `<script>` (segundo) | La **interfaz**: controles, retos, mapas en `<canvas>`, gráficos, historial, compartir y clima. |

## Funciones interactivas

- **Retos guiados (5):** cada uno configura parámetros y foco, corre la simulación y muestra una lección: el mejor caso, la brigada que tarda, el viento extremo, el punto ciego y demasiadas falsas alarmas.
- **Tocar el mapa** para elegir el foco. Al pasar el mouse por una celda, la página dice qué hay ahí, a cuántos km queda de las casas y si una cámara la ve.
- **Gráfico en vivo** de hectáreas quemadas en el tiempo. ▲ marca la detección y ● la llegada de la brigada.
- **Historial** de las últimas 12 corridas, para comparar.
- **🔗 Compartir escenario:** copia un link con los parámetros en la URL (`#esc&c=6&r=60&w=30&d=O&s=4&fa=2&f=3574`). Al abrirlo se carga ese mismo escenario.
- **🌦️ Clima de hoy:** consulta a Open-Meteo y permite aplicar el viento y la sequedad estimada del día a la simulación.

## Publicar en GitHub Pages

### Opción A: desde la web (sin terminal)
1. Entrá a <https://github.com/new>, poné un nombre (por ejemplo `humo-antes-que-llamas`), marcalo como **Public** y apretá **Create repository**.
2. Hacé clic en **uploading an existing file**, arrastrá `index.html` y `README.md`, y apretá **Commit changes**.
3. Andá a **Settings → Pages → Build and deployment**. Elegí **Deploy from a branch**, rama `main`, carpeta `/ (root)` y apretá **Save**.
4. En uno o dos minutos aparece el link: `https://TU-USUARIO.github.io/humo-antes-que-llamas/`.

### Opción B: con la terminal (Git y GitHub CLI)
```bash
gh auth login
gh repo create humo-antes-que-llamas --public --source=. --remote=origin --push
gh api -X POST repos/{owner}/humo-antes-que-llamas/pages -f "source[branch]=main" -f "source[path]=/"
```

## El modelo de simulación

### Mapa
- Grilla de **90 × 60 celdas** de **200 × 200 m (4 ha)**: el mapa cubre 18 × 12 km.
- El terreno se genera con ruido determinístico (siempre es el mismo). Está **inspirado** en la comarca, pero **no es un mapa real**.
- Inflamabilidad relativa: bosque nativo 1,0 · pino 1,4 · matorral 1,1 · mallín 0,35 · interfaz urbana 0,85 · agua y roca 0.
- Cada celda urbana representa **5 viviendas** (supuesto).

### Propagación (autómata celular)
- Cada paso equivale a **10 minutos**. La simulación corta a las **72 h**.
- Probabilidad de que una celda encienda a una vecina:
  `p = 0,13 · combustible · sequedad · e^(0,9 · viento/30 · cosθ) · e^(6 · Δaltura) · (0,75 si es diagonal)`, con un tope de 0,95.
  La sequedad (niveles 1 a 5) vale 0,45 / 0,65 / 0,85 / 1,0 / 1,2.
- **Pavesas:** con viento de 25 km/h o más, pueden saltar brasas a 2–5 celdas en la dirección del viento.
- **Mismo azar en ambos mapas:** el azar sale de un hash de (celda, paso, dirección). Las diferencias vienen solo de la detección y el combate.

### Detección
| Escenario | Regla |
|---|---|
| Sin IA | Aviso de vecinos: `30 min + 6 min × distancia a las casas (celdas)`, con un máximo de 4 h. O antes, si el fuego ya superó las **160 ha**. |
| Con IA: cámara | Foco a ≤ **3,2 km** de una cámara: se confirma a los `10 min + 2 min × falsas alarmas por día`. |
| Con IA: satélite | Si ninguna cámara lo ve: próxima pasada (cada **180 min**), con el foco ≥ **16 ha** (~1 píxel VIIRS de 375 m). |
| Con IA: respaldo | Si nada de lo anterior funcionó, sigue valiendo la regla de aviso vecinal. |

**Falsas alarmas:** con `fa` falsas alarmas por día, la probabilidad de que la brigada esté ocupada atendiendo una cuando llega el fuego real es `1 − e^(−fa · 90/1440)`. Esa probabilidad se convierte en una demora promedio: `probabilidad × 60 min`, que se suma al tiempo de respuesta. Así el reto 5 muestra que la **precisión** del modelo importa tanto como su velocidad.

Las cámaras se ubican con un algoritmo *greedy* (primero la cima que ve más bosque no cubierto, y así hasta 12).

### Combate
La brigada llega después del tiempo de respuesta (más la demora por falsas alarmas, si corresponde). Desde ese momento apaga, en cada paso, hasta
`cap = min(16, 5 + 2 × horas de combate) × (1 − viento/140)` celdas del frente activo.

### Proyección 2040
1. Se simulan **30 focos** fijos con los parámetros elegidos, para obtener las hectáreas promedio por foco con y sin IA.
2. Focos por temporada: 6 en 2026 por defecto (ajustable). Sube linealmente hasta duplicarse en 2050, siguiendo la tendencia del estudio de CONICET (Kitzberger et al., 2022). Es una simplificación: el estudio habla de probabilidad de incendio, no de cantidad de focos.
3. Quemado acumulado = Σ (focos del año × ha promedio por foco), con un tope en el bosque inicial (**150.000 ha**, supuesto). No se modela regeneración.

### Resultados de referencia
Promedio de los 30 focos de prueba (6 cámaras, 60 min de respuesta, 2 falsas alarmas por día, salvo que se indique otra cosa):

| Escenario | Sin IA | Con IA |
|---|---|---|
| Verano típico (30 km/h, muy seco) | ~690 ha/foco | ~260 ha/foco |
| Día extremo (60 km/h del NO, extremo) | ~2.600 ha/foco | ~2.250 ha/foco |
| Día favorable (10 km/h, moderado, 45 min) | ~60 ha/foco | ~30 ha/foco |
| Típico, respuesta de 30 min | ~450 ha/foco | ~110 ha/foco |
| Típico, respuesta de 120 min | ~1.200 ha/foco | ~740 ha/foco |

## Decisiones tomadas sin consultar (y por qué)

- **Mapa inventado e inspirado en la zona**, para no confundirlo con una predicción sobre un lugar real.
- **Parámetros calibrados a mano** para obtener órdenes de magnitud verosímiles. No surgen de un ajuste estadístico.
- **Radio de cámara de 3,2 km**, menor al alcance real. Representa de forma simple que el relieve tapa la visión.
- **«Sin IA» no tiene monitoreo satelital automatizado.** La integración automática de satélites se considera parte del sistema con IA.
- **Falsas alarmas modeladas como demora promedio** (no al azar), para que el resultado sea estable y el reto 5 se pueda repetir.
- **Clima en vivo con Open-Meteo:** gratis, sin clave de acceso, con licencia CC BY 4.0, y no envía datos del usuario. La «sequedad estimada» es un índice propio y simple: lluvia de 14 días, humedad y temperatura. No es el índice oficial de peligro de incendio.
- **No se usa NASA FIRMS en vivo** porque requiere una clave personal (MAP_KEY), que en una página pública quedaría expuesta.
- **El link para compartir** guarda los parámetros en la URL (después de `#`), así que no hace falta servidor.
- **Sin cookies, seguimiento ni almacenamiento local.**

## Fuentes principales

La lista completa, con links, está en la sección **7 · Fuentes** de la página.
