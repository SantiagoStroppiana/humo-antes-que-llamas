"use strict";
// Eventos de la API NASA EONET v3 (categoría wildfires, bbox -72.5,-40.5,-70.5,-43.5), consultada en nov. 2026.
const EONET_EVENTS = [
  { d: '2026-01-03', ha: 16194, lat: -42.698, lon: -71.726, src: 'GDACS', url: 'https://www.gdacs.org/report.aspx?eventtype=WF&eventid=1026777' },
  { d: '2026-01-04', ha: 9640, lat: -42.158, lon: -71.499, src: 'GDACS', url: 'https://www.gdacs.org/report.aspx?eventtype=WF&eventid=1026609' },
  { d: '2026-01-05', ha: 5823, lat: -42.685, lon: -71.708, src: 'GDACS', url: 'https://www.gdacs.org/report.aspx?eventtype=WF&eventid=1026701' },
  { d: '2025-11-30', ha: 5291, lat: -42.309, lon: -71.891, src: 'GDACS', url: 'https://www.gdacs.org/report.aspx?eventtype=WF&eventid=1026123' },
  { d: '2025-01-29', ha: null, lat: -41.872, lon: -71.574, src: 'GDACS', url: 'https://www.gdacs.org/report.aspx?eventtype=WF&eventid=1023484' },
  { d: '2021-03-12', ha: null, lat: -42.591, lon: -71.385, src: 'PDC', name: 'Región Patagonia (punto aproximado)' },
  { d: '2019-02-07', ha: null, lat: -41.451, lon: -72.254, src: 'PDC', name: 'Cochamó (Chile)' }
];
