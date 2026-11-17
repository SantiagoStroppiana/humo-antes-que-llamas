"use strict";
// Clima de días reales de incendios (Open-Meteo Historical Weather API, ERA5).
// Datos del día en que empezó cada incendio, en su lugar, de la Historical Weather API (ERA5).
// rain = lluvia de los 14 días previos.
const REAL_DAYS = [
  { label: '9/3/2021 · Las Golondrinas', place: 'Las Golondrinas (Lago Puelo)', tmax: 27.9, rh: 22, wmax: 11.8, gust: 59, dir: 313, rain: 3.6 },
  { label: '15/1/2025 · Epuyén', place: 'Epuyén', tmax: 21.9, rh: 38, wmax: 21.5, gust: 58.3, dir: 285, rain: 5.0 },
  { label: '30/1/2025 · El Bolsón', place: 'Mallín Ahogado (El Bolsón)', tmax: 29, rh: 14, wmax: 14.4, gust: 52.9, dir: 311, rain: 8.8 },
  { label: '4/1/2026 · El Hoyo / Epuyén', place: 'entre El Hoyo y Epuyén (evento GDACS de 9.640 ha)', tmax: 31.6, rh: 14, wmax: 12.6, gust: 46.8, dir: 266, rain: 5.4 }
];
