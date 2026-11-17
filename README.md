# Humo antes que llamas

Experiencia web interactiva para el **Desafío 2 (Big Data + IA)**: incendios forestales en la comarca andina (El Bolsón, Epuyén, Lago Puelo) y cómo la **detección temprana con IA** podría reducir la superficie quemada.

Autor: **Santiago Stroppiana** · 2026

🌐 **Sitio publicado:** <https://santiagostroppiana.github.io/humo-antes-que-llamas/>
📦 **Repositorio:** <https://github.com/SantiagoStroppiana/humo-antes-que-llamas>

> ⚠️ Los datos del problema son reales y están citados. La simulación es un **modelo ilustrativo**: sirve para comparar escenarios, no para predecir.

## Recorrido de la página

| # | Sección | Qué muestra |
|---|---|---|
| 1 | **El problema** | 4 datos clave con fuente. **45 veranos de clima real** de El Bolsón (gráfico interactivo con tendencia). **Incendios registrados por satélite** (mapa y tabla de NASA EONET, más una consulta en vivo). |
| 2 | **La solución** | Cómo funcionaría la detección temprana con IA (cámaras, visión por computadora, satélites, operador, brigada), el Big Data detrás, sus límites (incluida la privacidad) y lo que hace falta además de la IA. |
| 3 | **Simulación** | Clima de **días reales** de incendios (o el de hoy, en vivo), controles, 5 retos con lección, dos mapas sin IA y con IA, gráfico en el tiempo, historial y link para compartir. |
| 4 | **2040** | Proyección del bosque quemado con y sin IA, que crece según la **tendencia medida** de días de peligro, y una carta de ficción desde 2040. |
| 5 | **Fuentes** | APIs usadas y referencias con links. |

## Datos reales y APIs

| Fuente | Uso | Cómo |
|---|---|---|
| **Open-Meteo Historical Weather API** (reanálisis ERA5, CC BY 4.0) | 16.526 días de clima de El Bolsón (dic. 1980 – feb. 2026), resumidos por verano. | Procesado una vez e incluido en la página (`CLIMATE`). |
| **Open-Meteo Historical Weather API** | Clima de los días en que empezaron 4 incendios reales, en su lugar. | Procesado e incluido (`REAL_DAYS`). |
| **Open-Meteo Forecast API** | Clima de hoy en El Bolsón. | Consulta en vivo al tocar «Hoy (en vivo)». |
| **Open-Meteo Elevation API** (Copernicus DEM) + **OpenTopoData** (SRTM 90 m) | Relieve sombreado del mapa satelital: grilla de 61 × 87 puntos cada 0,025°. | Procesado e incluido (`ELEV`). OpenTopoData completó los últimos 907 puntos cuando Open-Meteo llegó a su límite por hora. |
| **OpenStreetMap** vía API Overpass (ODbL) | Lagos, límite Argentina–Chile y rutas principales. | Contornos armados, filtrados (lagos > 0,8 km²), simplificados (Douglas-Peucker) e incluidos (`GEO`). |
| **NASA EONET v3** (fuentes GDACS y PDC) | 7 eventos de incendio en la zona (2019–2026) con superficie estimada. | Incluidos en la página (`EONET_EVENTS`), más una consulta en vivo de incendios activos. |

Las consultas en vivo son opcionales: sin internet, la página funciona igual con los datos incluidos.

### Qué muestran los datos (veranos dic–feb, El Bolsón)

| Indicador | 1981–1990 | 2017–2026 | Tendencia |
|---|---|---|---|
| Temperatura máxima media | 21,9 °C | 24,1 °C | +0,65 °C por década |
| Días con máxima ≥ 30 °C | 5,0 | 13,5 | +2,6 días por década |
| Días de peligro (máx ≥ 27 °C y humedad mín ≤ 25%) | 8,4 | 16,6 | +2,5 días por década |
| Lluvia del verano | 170 mm | 149 mm | débil (R² ≈ 0,01) |

Los «días de peligro» son un criterio simple propio, no un índice oficial. ERA5 promedia celdas de ~25 km, así que suaviza los extremos locales.

### Días reales usados en la simulación

| Día | Lugar | Máx. | Humedad mín. | Viento máx. / ráfaga | Lluvia 14 días | → Simulación |
|---|---|---|---|---|---|---|
| 9/3/2021 | Las Golondrinas | 27,9 °C | 22% | 11,8 / 59 km/h NO | 3,6 mm | 35 km/h NO, muy seca |
| 15/1/2025 | Epuyén | 21,9 °C | 38% | 21,5 / 58,3 km/h O | 5,0 mm | 40 km/h O, moderada |
| 30/1/2025 | Mallín Ahogado | 29 °C | 14% | 14,4 / 52,9 km/h NO | 8,8 mm | 35 km/h NO, extrema |
| 4/1/2026 | El Hoyo / Epuyén | 31,6 °C | 14% | 12,6 / 46,8 km/h O | 5,4 mm | 30 km/h O, extrema |

- **Viento efectivo** = (viento máximo + ráfaga máxima) / 2, redondeado a 5 km/h. El reanálisis subestima el viento sostenido en la montaña, y la ráfaga sola exageraría.
- **Sequedad (1–5)** = 1 + redondeo de la suma de tres puntajes:
  - lluvia de 14 días: < 5 mm → 2; < 20 mm → 1;
  - humedad mínima: < 20% → 1,5; < 35% → 0,75;
  - máxima: > 28 °C → 1; > 22 °C → 0,5.

## El modelo de simulación

- **Mapa:** grilla de 90 × 60 celdas de 4 ha (18 × 12 km), inspirada en la comarca. **No es un mapa real.** Inflamabilidad relativa: nativo 1,0 · pino 1,4 · matorral 1,1 · mallín 0,35 · interfaz 0,85 · agua y roca 0. Cada celda urbana tiene 5 viviendas.
- **Propagación:** cada paso equivale a 10 min y la simulación corta a las 72 h.
  `p = 0,13 · combustible · sequedad · e^(0,9·viento/30·cosθ) · e^(6·Δaltura) · (0,75 si es diagonal)`.
  Con viento de 25 km/h o más hay pavesas a 2–5 celdas. Los dos mapas usan el mismo azar (un hash determinístico).
- **Detección sin IA:** 30 min + 6 min por celda de distancia a las casas (máximo 4 h), o antes si el fuego supera las 160 ha.
- **Detección con IA:**
  - Si una cámara ve el foco (radio de 3,2 km), se confirma a los 10 min + 2 min por cada falsa alarma diaria.
  - Si no, lo detecta el satélite cada 180 min, cuando el foco mide 16 ha o más.
  - Las falsas alarmas suman una demora promedio: `(1 − e^(−fa·90/1440)) × 60 min`.
- **Combate:** se apagan hasta `min(16, 5 + 2·horas) × (1 − viento/140)` celdas del frente por paso.
- **Proyección 2040:**
  - Se calculan las hectáreas promedio por foco de 30 focos simulados.
  - Los focos por temporada (6 en 2026, ajustable) crecen como la **regresión lineal de los días de peligro medidos**: ×1,23 en 2040 respecto de 2026.
  - Bosque inicial de 150.000 ha (supuesto) y sin regeneración.

## Decisiones tomadas sin consultar

- Los datos históricos y de días reales se **procesaron una vez y se incluyeron en la página**. Así carga rápido, funciona sin internet y no depende de que la API esté disponible. Las consultas en vivo se agregan como complemento.
- **NASA EONET:** algunos eventos quedan abiertos en su base aunque el fuego ya terminó (por ejemplo, El Bolsón de enero de 2025). La consulta en vivo solo cuenta como activos los eventos de los últimos 30 días y aclara cuántos viejos ignoró.
- **Mapa propio en vez de una librería de mapas:** usar Leaflet con mosaicos externos rompería la idea de que la página funcione sin conexión. El mapa se dibuja con datos reales de relieve y de OpenStreetMap incluidos en el archivo, con la proporción real a 42° S (124 × 238 km).
- Las distancias de la tabla satelital se calculan al pueblo de referencia más cercano. Las posiciones son aproximadas.
- **No se usa NASA FIRMS ni Global Forest Watch** porque requieren una clave personal, que en una página pública quedaría expuesta.
- Saqué de la versión anterior lo redundante: los escenarios rápidos (los reemplazan los días reales y los retos), el dato de Epuyén 2025 (ya está en la simulación) y las explicaciones repetidas del modelo.
- **Diseño de centro de operaciones:** fondo carbón (#0B0D0E), paneles separados por bordes de 1 px, sin sombras ni esquinas redondeadas, etiquetas técnicas en mayúsculas y colores de estado sobrios: verde (#2EA043) para sistema activo o fuego controlado, ámbar (#D29922) para alertas y detección, y rojo (#E5484D) solo para fuego crítico. La simulación funciona como un tablero: visores con marcas de registro, métricas de la diferencia en vivo y una **consola de eventos** con lo que realmente ocurre en el modelo (ignición, detección, llegada de la brigada, umbrales de hectáreas, control). No se muestran «porcentajes de confianza de la IA» porque el modelo no los calcula.
- **Tipografías de Google Fonts** (Space Grotesk, IBM Plex Sans y JetBrains Mono). Es la única dependencia externa de diseño: sin internet, la página usa las fuentes del sistema y funciona igual.
- Sin cookies, seguimiento ni almacenamiento local.

## Estructura del código

Todo está en `index.html`:
- `<style>`: diseño responsive y modo oscuro automático.
- `<script id="core">`: el modelo sin DOM (terreno, cámaras, autómata celular, datos climáticos, proyección). Se puede probar con Node.
- Segundo `<script>`: la interfaz (controles, mapas en canvas, gráficos, días reales, mapa satelital y consultas en vivo).

`og.png` es la imagen de vista previa para redes. Se generó con la misma simulación.

## Publicar cambios

```bash
git add -A
git commit -m "Describe el cambio"
git push
```

GitHub Pages publica la nueva versión en uno o dos minutos.
