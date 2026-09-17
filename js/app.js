(function () {
  'use strict';

  const C = window.CONFIG;
  const byId = (id) => document.getElementById(id);

  const DATA = {
    ccz: 'data/ccz.geojson',
    us: 'data/us_areas.geojson',
    isa: 'data/isa_areas.geojson',
    overlaps: 'data/overlaps.geojson',
  };

  // Which map layers each toggle controls, and which layer answers hover/tap.
  // Order sets hover priority: overlaps first, then US areas, then ISA areas.
  const CATEGORIES = [
    { key: 'overlaps', source: 'overlaps', query: 'overlap-fill', layers: ['overlap-fill', 'overlap-hover'] },
    { key: 'us', source: 'us', query: 'us-fill', layers: ['us-fill', 'us-edge', 'us-hover'] },
    { key: 'isa', source: 'isa', query: 'isa-fill', layers: ['isa-fill', 'isa-line', 'isa-hover'] },
  ];
  const LEGEND_ORDER = ['us', 'isa', 'overlaps'];
  const ISA_KIND_ORDER = ['application', 'exploration', 'reserved', 'apei'];

  const visible = {};
  LEGEND_ORDER.forEach((key) => { visible[key] = C.layers[key].visible !== false; });

  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  let map = null;
  let layersReady = false; // toggles can be used before the map data arrives
  let current = null;      // what the popup is showing: { cat, ids, key }

  /* ------------------------------------------------------------ panel */

  byId('title').textContent = C.text.title;
  byId('deck').textContent = C.text.deck;
  byId('hint').textContent = canHover ? C.text.hintHover : C.text.hintTap;
  byId('footnote').textContent = C.text.footnote;
  byId('sources').textContent = C.text.sources;

  // Layer colors from config, for the popup strips in css/style.css
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--us-color', C.layers.us.color);
  rootStyle.setProperty('--isa-color', C.layers.isa.fill);
  rootStyle.setProperty('--overlap-color', C.layers.overlaps.fill);

  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // Legend icons: rounded squares drawn the way each layer looks on the map
  function swatch(key) {
    const L = C.layers;
    let body = '';
    if (key === 'us') {
      const gap = L.us.hatchTile / Math.SQRT2;
      body = `<defs>
          <pattern id="swatch-hatch" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="${gap}" stroke="${L.us.color}" stroke-width="${L.us.hatchWidth * 2}"/>
          </pattern>
        </defs>
        <rect x="0.5" y="0.5" width="17" height="17" rx="3.5" fill="url(#swatch-hatch)"
          stroke="${L.us.color}" stroke-width="${L.us.edgeWidth > 0 ? 1 : 0}"/>`;
    } else if (key === 'isa') {
      body = `<rect x="0.5" y="0.5" width="17" height="17" rx="3.5" fill="${L.isa.fill}"
        stroke="${L.isa.outline}" stroke-width="1"/>`;
    } else if (key === 'overlaps') {
      body = `<rect width="18" height="18" rx="4" fill="${L.overlaps.fill}"/>`;
    } else if (key === 'ccz') {
      body = `<rect width="18" height="18" rx="4" fill="${L.water}"/>
        <rect width="18" height="18" rx="4" fill="${L.ccz.fill}" fill-opacity="${L.ccz.fillOpacity}"/>
        <rect x="2.5" y="2.5" width="13" height="13" rx="2" fill="none"
          stroke="${L.ccz.outline}" stroke-opacity="${L.ccz.outlineOpacity}" stroke-width="1.2"/>`;
    }
    return `<svg class="swatch" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">${body}</svg>`;
  }

  const CHECK = `<svg width="11" height="9" viewBox="0 0 11 9" aria-hidden="true">
    <path d="M1 4.5 4 7.5 10 1.5" fill="none" stroke="#fff" stroke-width="1.8"
      stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const list = byId('layer-list');
  LEGEND_ORDER.forEach((key) => {
    const L = C.layers[key];
    const row = document.createElement('label');
    row.className = 'layer' + (visible[key] ? '' : ' is-off');
    row.innerHTML = `
      <input type="checkbox" ${visible[key] ? 'checked' : ''} data-key="${key}">
      <span class="check">${CHECK}</span>
      ${swatch(key)}
      <span class="layer-text">
        <span class="layer-name">${esc(L.label)}</span>
        ${L.note ? `<span class="layer-note">${esc(L.note)}</span>` : ''}
      </span>`;
    list.appendChild(row);
  });
  // The CCZ is background only: listed in the legend, never switched off
  const cczRow = document.createElement('div');
  cczRow.className = 'layer is-static';
  cczRow.innerHTML = `<span></span>${swatch('ccz')}
    <span class="layer-text"><span class="layer-name">${esc(C.layers.ccz.label)}</span></span>`;
  list.appendChild(cczRow);
  wireToggles();

  /* ------------------------------------------------------------ map */

  const token = window.MAPBOX_ACCESS_TOKEN;
  if (!token || typeof mapboxgl === 'undefined') {
    const msg = document.createElement('p');
    msg.className = 'map-message';
    msg.textContent = C.text.missingToken;
    byId('map').appendChild(msg);
    return;
  }

  mapboxgl.accessToken = token;
  map = new mapboxgl.Map({
    container: 'map',
    style: C.map.style,
    bounds: C.map.bounds,
    fitBoundsOptions: { padding: C.map.padding },
    projection: 'mercator',
    minZoom: C.map.minZoom,
    maxZoom: C.map.maxZoom,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    cooperativeGestures: C.map.cooperativeGestures,
    attributionControl: false,
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
  // Bottom-left controls stack upwards, so miles go in first to sit under kilometres
  map.addControl(new mapboxgl.ScaleControl({ maxWidth: 110, unit: 'imperial' }), 'bottom-left');
  map.addControl(new mapboxgl.ScaleControl({ maxWidth: 110, unit: 'metric' }), 'bottom-left');
  map.addControl(new mapboxgl.AttributionControl({ compact: false }), 'bottom-right');
  window.__MAP__ = map; // for tuning from the console

  // Keep the whole CCZ framed while the page settles or the embed resizes,
  // until the reader moves the map themselves
  let readerMoved = false;
  const frame = () => {
    if (!readerMoved) map.fitBounds(C.map.bounds, { padding: C.map.padding, duration: 0 });
  };
  ['dragstart', 'zoomstart'].forEach((type) => map.on(type, (e) => {
    if (e.originalEvent) readerMoved = true;
  }));
  map.on('resize', frame);

  const loadJSON = (url) => fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    return r.json();
  });
  const dataReady = Promise.all([DATA.ccz, DATA.us, DATA.isa, DATA.overlaps].map(loadJSON));

  // Every US and ISA area by id, so overlap popups can name their members
  const areas = new Map();
  const overlapsById = new Map();

  map.on('load', () => {
    frame();
    (C.map.hideStyleLayers || []).forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
    });

    dataReady.then(([ccz, us, isa, overlaps]) => {
      us.features.concat(isa.features).forEach((f) => areas.set(f.properties.id, f.properties));
      overlaps.features.forEach((f) => overlapsById.set(f.properties.id, f.properties));
      addLayers(ccz, us, isa, overlaps);
      layersReady = true;
      wirePointer();
    }).catch((err) => console.error('Could not load map data', err));
  });

  // One tile of thin diagonal lines, drawn at 2x for sharp screens
  function hatchTile(color, tile, width) {
    const ratio = 2;
    const px = tile * ratio;
    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = color;
    ctx.lineWidth = width * ratio;
    ctx.beginPath();
    // the diagonal plus its two corner pieces, so neighbouring tiles join up
    [[0, px, px, 0], [-px, px, px, -px], [0, 2 * px, 2 * px, 0]].forEach(([x1, y1, x2, y2]) => {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
    });
    ctx.stroke();
    return { image: ctx.getImageData(0, 0, px, px), pixelRatio: ratio };
  }

  function addLayers(ccz, us, isa, overlaps) {
    const L = C.layers;
    const hovered = ['boolean', ['feature-state', 'hover'], false];
    const vis = (key) => (visible[key] ? 'visible' : 'none');

    map.addSource('ccz', { type: 'geojson', data: ccz });
    map.addSource('isa', { type: 'geojson', data: isa, promoteId: 'id' });
    map.addSource('us', { type: 'geojson', data: us, promoteId: 'id' });
    map.addSource('overlaps', { type: 'geojson', data: overlaps, promoteId: 'id' });

    // CCZ background
    map.addLayer({
      id: 'ccz-fill', type: 'fill', source: 'ccz',
      paint: { 'fill-color': L.ccz.fill, 'fill-opacity': L.ccz.fillOpacity },
    });
    map.addLayer({
      id: 'ccz-line', type: 'line', source: 'ccz',
      paint: { 'line-color': L.ccz.outline, 'line-opacity': L.ccz.outlineOpacity, 'line-width': L.ccz.outlineWidth },
    });

    // ISA areas: washed-out solid grey
    map.addLayer({
      id: 'isa-fill', type: 'fill', source: 'isa', layout: { visibility: vis('isa') },
      paint: { 'fill-color': L.isa.fill, 'fill-opacity': L.isa.fillOpacity },
    });
    map.addLayer({
      id: 'isa-line', type: 'line', source: 'isa', layout: { visibility: vis('isa') },
      paint: { 'line-color': L.isa.outline, 'line-width': L.isa.outlineWidth },
    });

    // US areas: thin diagonal hatching in one color
    const hatch = hatchTile(L.us.color, L.us.hatchTile, L.us.hatchWidth);
    map.addImage('us-hatch', hatch.image, { pixelRatio: hatch.pixelRatio });
    map.addLayer({
      id: 'us-fill', type: 'fill', source: 'us', layout: { visibility: vis('us') },
      paint: { 'fill-pattern': 'us-hatch' },
    });

    // Overlaps: the accent, solid over the hatching
    map.addLayer({
      id: 'overlap-fill', type: 'fill', source: 'overlaps', layout: { visibility: vis('overlaps') },
      paint: { 'fill-color': L.overlaps.fill, 'fill-opacity': L.overlaps.fillOpacity },
    });

    // Hairline edge of the US areas, kept visible across the overlaps
    map.addLayer({
      id: 'us-edge', type: 'line', source: 'us', layout: { visibility: vis('us') },
      paint: { 'line-color': L.us.color, 'line-width': L.us.edgeWidth, 'line-opacity': L.us.edgeWidth > 0 ? 1 : 0 },
    });

    // Outline of the area under the cursor
    const hoverLine = (id, source, color, key) => map.addLayer({
      id, type: 'line', source, layout: { visibility: vis(key) },
      paint: {
        'line-color': color,
        'line-width': L.hover.width,
        'line-opacity': ['case', hovered, 1, 0],
      },
    });
    hoverLine('isa-hover', 'isa', L.hover.color, 'isa');
    hoverLine('overlap-hover', 'overlaps', L.hover.color, 'overlaps');
    hoverLine('us-hover', 'us', L.us.color, 'us');
  }

  function wireToggles() {
    list.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.addEventListener('change', () => {
        const key = input.dataset.key;
        visible[key] = input.checked;
        input.closest('.layer').classList.toggle('is-off', !input.checked);
        if (!layersReady) return; // addLayers() reads `visible` when the data arrives
        const cat = CATEGORIES.find((c) => c.key === key);
        cat.layers.forEach((id) => map.setLayoutProperty(id, 'visibility', input.checked ? 'visible' : 'none'));
        if (current && current.cat.key === key) clearPick();
      });
    });
  }

  /* ------------------------------------------------------------ hover and tap */

  const fmt = (n) => Number(n).toLocaleString('en-US');
  const areaText = (p) => `${fmt(p.area_km2)} km² (${fmt(p.area_mi2)} mi²)`;

  // Federal Register line for a US application, or null to leave it out
  function federalRegister(company, areaName) {
    const fr = company.federalRegister;
    if (fr === undefined) return null;
    let date = fr;
    if (fr && typeof fr === 'object') {
      const prefix = Object.keys(fr).find((k) => (areaName || '').startsWith(k));
      date = prefix ? fr[prefix] : false;
    }
    return date ? C.labels.posted.replace('{date}', date) : C.labels.notPosted;
  }

  function describe(p) {
    if (p.group === 'us') {
      const co = C.companies[p.company] || { name: p.company };
      return {
        group: 'us',
        title: co.name,
        body: C.governingBodies.us,
        status: co.status,
        federalRegister: federalRegister(co, p.area_name),
      };
    }
    const kind = C.isaKinds[p.kind] || {};
    const co = p.company ? C.companies[p.company] || { name: p.company } : null;
    return {
      group: 'isa',
      title: co ? co.name : kind.title,
      body: C.governingBodies.isa,
      status: (co && co.status) || kind.status,
      federalRegister: null,
    };
  }

  function areaHTML(p) {
    const d = describe(p);
    const row = (label, value, cls = '') => (value
      ? `<dt>${esc(label)}</dt><dd class="${cls}">${esc(value)}</dd>` : '');
    return `<div class="pop-item is-${d.group}">
      <div class="pop-band">${esc(d.group === 'us' ? C.labels.usBand : C.labels.isaBand)}</div>
      <h3 class="pop-title">${esc(d.title)}</h3>
      <dl class="pop-rows">
        ${row(C.labels.areaName, p.area_name)}
        ${row(C.labels.status, d.status)}
        ${row(C.labels.federalRegister, d.federalRegister)}
        ${row(C.labels.area, areaText(p), 'nowrap')}
      </dl></div>`;
  }

  function overlapHTML(p) {
    const members = p.members.split('|').map((id) => areas.get(id)).filter(Boolean);
    const items = members.map((m) => {
      const d = describe(m);
      const meta = [m.area_name, d.body].filter(Boolean).join(' · ');
      return `<li><span class="m-company">${esc(d.title)}</span><span class="m-meta">${esc(meta)}</span></li>`;
    }).join('');
    return `<div class="pop-item is-overlap">
      <div class="pop-band">${esc(C.labels.overlapBand)}</div>
      <dl class="pop-rows"><dt>${esc(C.labels.area)}</dt><dd class="nowrap">${esc(areaText(p))}</dd></dl>
      <ul class="pop-members">${items}</ul></div>`;
  }

  // Features under a point, from the highest-priority visible category
  function pick(point) {
    for (const cat of CATEGORIES) {
      if (!visible[cat.key]) continue;
      const found = map.queryRenderedFeatures(point, { layers: [cat.query] });
      if (!found.length) continue;
      const ids = [...new Set(found.map((f) => f.properties.id))];
      if (cat.key === 'isa') {
        ids.sort((a, b) => ISA_KIND_ORDER.indexOf(areas.get(a).kind) - ISA_KIND_ORDER.indexOf(areas.get(b).kind));
      }
      return { cat, ids: ids.slice(0, 3) };
    }
    return null;
  }

  function popupHTML(hit) {
    if (hit.cat.key === 'overlaps') return overlapHTML(overlapsById.get(hit.ids[0]));
    return hit.ids.map((id) => areaHTML(areas.get(id))).join('');
  }

  const popup = new mapboxgl.Popup({
    closeButton: !canHover,
    closeOnClick: false,
    offset: 14,
    maxWidth: '310px',
    className: 'area-popup' + (canHover ? ' is-hover' : ''),
  });

  function setHover(hit, on) {
    hit.ids.forEach((id) => map.setFeatureState({ source: hit.cat.source, id }, { hover: on }));
  }

  function clearPick() {
    if (current) setHover(current, false);
    current = null;
    popup.remove();
    map.getCanvas().style.cursor = '';
  }

  function show(hit, lngLat) {
    const key = hit.cat.key + ':' + hit.ids.join(',');
    if (!current || current.key !== key) {
      if (current) setHover(current, false);
      current = { ...hit, key };
      setHover(current, true);
      popup.setHTML(popupHTML(hit));
      // lets the close button match the strip it sits on
      CATEGORIES.forEach((c) => popup.removeClassName(`shows-${c.key}`));
      popup.addClassName(`shows-${hit.cat.key}`);
    }
    popup.setLngLat(lngLat);
    if (!popup.isOpen()) popup.addTo(map);
  }

  function wirePointer() {
    if (canHover) {
      let pending = null;
      map.on('mousemove', (e) => {
        const first = !pending;
        pending = e;
        if (!first) return;
        requestAnimationFrame(() => {
          const ev = pending;
          pending = null;
          const hit = pick(ev.point);
          if (!hit) { clearPick(); return; }
          map.getCanvas().style.cursor = 'pointer';
          show(hit, ev.lngLat);
        });
      });
      map.getCanvas().addEventListener('mouseleave', clearPick);
    } else {
      map.on('click', (e) => {
        const hit = pick(e.point);
        if (hit) show(hit, e.lngLat);
        else clearPick();
      });
      popup.on('close', () => {
        if (current) setHover(current, false);
        current = null;
      });
    }
  }
})();
