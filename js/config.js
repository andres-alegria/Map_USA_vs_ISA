/* Content and styling for the map.
   Editorial text, company names, statuses and layer colors live here;
   js/app.js holds the logic and should not need editing for copy changes. */

window.CONFIG = {
  /* ---- panel copy ------------------------------------------------------- */
  text: {
    title: 'US deep-sea mining applications overlap areas managed by the ISA',
    deck:
      'Companies have applied under US law for 725,197 km² (280,000 mi²) of the ' +
      'Clarion-Clipperton Zone, in the Pacific Ocean. Of that, 228,832 km² (88,353 mi²) ' +
      'lies on exploration contracts or reserved areas of the International Seabed Authority (ISA).',
    layersHeading: 'Show on the map',
    hintHover: 'Hover over an area to see its details.',
    hintTap: 'Tap an area to see its details.',
    sources:
      'Sources: International Seabed Authority; NOAA and Federal Register notices; company documents.',
    credit: 'Map: Andrés Alegría / Mongabay',
    missingToken: 'The map needs a Mapbox access token. See README.md.',
  },

  /* ---- popup labels ------------------------------------------------------ */
  labels: {
    areaName: 'Area name',
    governingBody: 'Governing body',
    status: 'Status',
    area: 'Area',
    overlap: 'Overlap',
  },
  governingBodies: { us: 'US', isa: 'ISA' },

  /* ---- basemap and view -------------------------------------------------- */
  map: {
    // Same Mapbox style as the Whale Collisions story
    style: 'mapbox://styles/mongabay/cmtkharki000k01qydbisf6f0',
    // Layers in that style that belong to the whales story and are hidden here
    hideStyleLayers: ['Slow_traffic', 'Medium_traffic', 'Fast_traffic'],
    bounds: [[-161, -1], [-110, 24]],  // adjust the starting view here (west/south, east/north)
    padding: 16,                        // adjust space around the starting view (px)
    minZoom: 1.5,
    maxZoom: 9,
    // Ctrl/Cmd + scroll to zoom, two fingers to pan on phones, so the map
    // does not trap page scrolling when embedded in an article
    cooperativeGestures: true,
  },

  /* ---- layer styles and legend ------------------------------------------ */
  layers: {
    us: {
      label: 'US application areas',
      note: 'Applications and licences under US law',
      color: '#530E0D',       // adjust US outline color here
      width: [1.3, 2.4],      // adjust outline width here (at zoom 2 and zoom 7)
      dash: [2.2, 1.3],       // adjust dash and gap length here (multiples of the width)
      visible: true,
    },
    isa: {
      label: 'ISA managed areas',
      note: 'Contracts, reserved areas, applications and protected areas',
      fill: '#D5DAD9',        // adjust ISA fill color here
      fillOpacity: 0.9,       // adjust how solid the ISA fill looks here
      outline: '#9AA6A4',     // adjust the lines between ISA subareas here
      outlineWidth: 0.6,
      visible: true,
    },
    overlaps: {
      label: 'Overlaps',
      note: 'US areas overlapping ISA areas or each other, over 50 km² (19 mi²)',
      fill: '#E86D6D',        // adjust overlap color here
      fillOpacity: 0.95,
      visible: true,
    },
    ccz: {
      label: 'Clarion-Clipperton Zone',
      fill: '#FFFFFF',        // adjust CCZ tint here
      fillOpacity: 0.08,
      outline: '#FFFFFF',     // adjust CCZ outline color here
      outlineOpacity: 0.8,
      outlineWidth: 1.2,
    },
    hover: {
      color: '#092F29',       // adjust the outline of the area under the cursor here
      width: 2.5,
    },
    legendWater: '#428A94',   // ocean color behind the legend swatches; match the basemap
  },

  /* ---- names and statuses ------------------------------------------------ */
  // Keys match the "company" property in data/us_areas.geojson and data/isa_areas.geojson.
  companies: {
    // US applicants and licence holders
    TMC: { name: 'The Metals Company (TMC USA)', status: 'Applied' },
    AMR: { name: 'American Metal Resources', status: 'Applied' },
    SEAX: { name: 'SEAX', status: 'Applied' },
    AOM: { name: 'American Ocean Minerals', status: 'Applied' },
    ECO: { name: 'Eco Minerals', status: 'Applied' },
    LM: { name: 'Lockheed Martin', status: 'Granted' },

    // ISA applicant
    IM: { name: 'Impossible Metals', status: 'Applied' },

    // ISA exploration contractors, keyed by ISA contract ID (sponsoring state in brackets)
    BGRPMN1: { name: 'Federal Institute for Geosciences and Natural Resources (Germany)' },
    BMJPMN1: { name: 'Blue Minerals Jamaica (Jamaica)' },
    CIICPMN1: { name: 'Cook Islands Investment Corporation (Cook Islands)' },
    CMMPMN1: { name: 'China Minmetals Corporation (China)' },
    COMRAPMN1: { name: 'China Ocean Mineral Resources R&D Association (China)' },
    DORDPMN1: { name: 'Deep Ocean Resources Development (Japan)' },
    GSRPMN1: { name: 'Global Sea Mineral Resources (Belgium)' },
    IFREMERPMN1: { name: 'Ifremer (France)' },
    IOMPMN1: { name: 'Interoceanmetal Joint Organization (Bulgaria, Cuba, Czechia, Poland, Russia, Slovakia)' },
    KOREAPMN1: { name: 'Government of the Republic of Korea' },
    MARAWAPMN1: { name: 'Marawa Research and Exploration (Kiribati)' },
    NORIPMN1: { name: 'Nauru Ocean Resources (Nauru)' },
    OMSPMN1: { name: 'Ocean Mineral Singapore (Singapore)' },
    TOMLPMN1: { name: 'Tonga Offshore Mining (Tonga)' },
    UKSRLPMN1: { name: 'UK Seabed Resources (United Kingdom)' },
    UKSRLPMN2: { name: 'UK Seabed Resources (United Kingdom)' },
    YUZHPMN1: { name: 'Yuzhmorgeologiya (Russia)' },
  },

  // ISA area types. "title" stands in for the company where an area has none.
  isaKinds: {
    exploration: { title: 'ISA exploration contract', status: 'Granted' },
    application: { title: 'ISA application', status: 'Applied' },
    reserved: { title: 'Reserved area', status: 'Reserved for developing states' },
    apei: { title: 'Protected area (APEI)', status: 'Protected from mining' },
  },
};
