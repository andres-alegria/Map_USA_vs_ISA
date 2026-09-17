/* Content and styling for the map.
   Editorial text, company names, statuses and layer colors live here;
   js/app.js holds the logic and should not need editing for copy changes. */

window.CONFIG = {
  /* ---- panel copy ------------------------------------------------------- */
  text: {
    title:
      'US deep-sea mining applications competing with internationally managed areas ' +
      'within the Clarion Clipperton Zone',
    deck:
      'Several companies have applied under US law for exploration and exploitation of the ' +
      'Clarion-Clipperton Zone, in the Pacific Ocean. A significant overlap lies on areas ' +
      'managed by the International Seabed Authority (ISA).',
    hintHover: 'Hover over an area to see its details.',
    hintTap: 'Tap an area to see its details.',
    footnote: '*Includes two exploration licenses granted in 1984, now held by Lockheed Martin.',
    sources:
      'Sources: International Seabed Authority; NOAA and Federal Register notices; company documents.',
    missingToken: 'The map needs a Mapbox access token. See README.md.',
  },

  /* ---- popup labels ------------------------------------------------------ */
  labels: {
    usBand: 'US application area',    // colored strip at the top of US popups
    isaBand: 'ISA managed area',      // colored strip at the top of ISA popups
    overlapBand: 'Overlap',           // colored strip at the top of overlap popups
    areaName: 'Area name',
    status: 'Status',
    federalRegister: 'Federal Register',
    posted: 'Posted {date}',
    notPosted: 'Not posted yet',
    area: 'Area',
  },
  governingBodies: { us: 'US', isa: 'ISA' }, // named after each area in overlap popups

  /* ---- basemap and view -------------------------------------------------- */
  map: {
    // Mongabay basemap for this story; it draws the EEZ boundaries itself
    style: 'mapbox://styles/mongabay/cmu5trzhy000x01qsd5a6620a',
    // Layers of that style to switch off, if a style ever carries some that don't belong here
    hideStyleLayers: [],
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
      label: 'US application areas*',
      note: 'Applications and licenses under US law',
      color: '#530E0D',       // adjust US hatch color here (also the US popup strip)
      hatchTile: 7,           // adjust the gap between hatch lines here (px, larger is sparser)
      hatchWidth: 1,          // adjust hatch line thickness here (px)
      edgeWidth: 0.6,         // adjust the hairline around US areas here (0 removes it)
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
      note: 'US areas overlapping ISA areas or each other',
      fill: '#E86D6D',        // adjust overlap color here
      fillOpacity: 1,
      visible: true,
    },
    ccz: {
      label: 'Clarion-Clipperton Zone',
      fill: '#FFFFFF',        // adjust CCZ tint here
      fillOpacity: 0.08,
      outline: '#FFFFFF',     // adjust CCZ outline color here
      outlineOpacity: 0.8,
      outlineWidth: 0.9,      // adjust CCZ outline thickness here
      outlineDash: [3, 2],    // adjust dash and gap length here (multiples of the thickness)
    },
    eez: {
      // Legend only: the EEZ lines come from the Mapbox style's "eez" layer,
      // so keep this color in step with that layer
      label: 'Exclusive economic zones',
      color: '#A8A8A8',
    },
    hover: {
      color: '#092F29',       // adjust the outline of the area under the cursor here
      width: 2.5,
    },
    water: '#428A94',         // basemap ocean color, used for the CCZ legend icon
  },

  /* ---- names and statuses ------------------------------------------------ */
  // Keys match the "company" property in data/us_areas.geojson and data/isa_areas.geojson.
  companies: {
    // US applicants and license holders.
    // federalRegister: month and year the application was posted in the Federal Register,
    // false if not posted yet, or dates per application keyed by the start of the area name.
    // Leave it out to skip that line (Lockheed Martin holds licenses, not applications).
    TMC: {
      name: 'The Metals Company (TMC USA)',
      status: 'Applied',
      federalRegister: { 'USA-A': 'August 2026', 'USA-B': 'December 2025' },
    },
    AMR: { name: 'American Metal Resources', status: 'Applied', federalRegister: 'March 2026' },
    SEAX: { name: 'SEAX', status: 'Applied', federalRegister: 'March 2026' },
    AOM: { name: 'American Ocean Minerals', status: 'Applied', federalRegister: false },
    ECO: { name: 'Eco Minerals', status: 'Applied', federalRegister: false },
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
