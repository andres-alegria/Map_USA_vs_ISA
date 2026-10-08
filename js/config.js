/* Content and styling for the map.
   Editorial text, company names, statuses and layer colors live here;
   js/app.js holds the logic and should not need editing for copy changes. */

window.CONFIG = {
  /* ---- panel copy ------------------------------------------------------- */
  text: {
    // Mongabay style: the heading drops the periods ("US"); every other string keeps them ("U.S.")
    title:
      'US deep-sea mining applications compete with internationally managed areas in the CCZ',
    deck:
      'Several companies have applied to the U.S. government under U.S. law for rights to ' +
      'explore and exploit areas of the deep seabed in international waters, with most interest ' +
      'concentrated on the Clarion Clipperton Zone (CCZ), an abyssal plain in the Pacific Ocean. ' +
      'Some areas requested by U.S. applicants overlap with areas managed by the International ' +
      'Seabed Authority (ISA).',
    hintHover: 'Hover over an area to see its details.',
    hintTap: 'Tap an area to see its details.',
    // the \u00a0 keep each figure together with its unit when the line wraps
    footnote:
      '*Includes two exploration licenses granted in 1984, held by Lockheed Martin. ' +
      'Does not include one application known at the time of publication: Vancouver-based ' +
      'Deep Sea Minerals Corp. announced its subsidiary had submitted an application to ' +
      'explore 147,430\u00a0km\u00b2 (56,923\u00a0mi\u00b2) of the CCZ without supplying ' +
      'geographic data for the proposed mining areas.',
    // shown in the popup of any area drawn outside the CCZ boundary
    outsideCcz: 'This is the only area on this map that falls outside the Clarion Clipperton Zone.',
    sources:
      'Sources: International Seabed Authority; NOAA and Federal Register notices; company documents.',
    missingToken: 'The map needs a Mapbox access token. See README.md.',
  },

  /* ---- popup labels ------------------------------------------------------ */
  labels: {
    usBand: 'U.S. application area', // colored strip at the top of U.S. popups
    isaBand: 'ISA managed area',      // colored strip at the top of ISA popups
    overlapBand: 'Overlap',           // colored strip at the top of overlap popups
    company: 'Company:',
    parent: 'Parent or owner',
    sponsor: 'Sponsoring state',      // ISA areas
    authority: 'Licensing authority', // U.S. areas, which have no sponsoring state
    areaName: 'Area name',
    status: 'Status',
    federalRegister: 'Federal Register',
    posted: 'Posted {date}',
    notPosted: 'Not posted yet',
    area: 'Area',
    none: 'None',       // the company genuinely has no parent, sponsor or equivalent
    unknown: 'Unknown',  // the information is not public
  },
  governingBodies: { us: 'U.S.', isa: 'ISA' }, // named after each area in overlap popups

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
      label: 'U.S. areas',
      // the asterisk on "Licenses" is picked up by text.footnote below; the two notes
      // list their kinds in the same order: granted instrument, then
      // applications, then the rest. "Licenses" and "contracts" are not interchangeable:
      // NOAA issues licenses under DSHMRA, while an approved ISA plan of work takes the
      // form of a contract with the Authority (UNCLOS Annex III, art. 3(5)).
      note: 'Licenses* and applications under U.S. law',
      color: '#530E0D',       // adjust U.S. hatch color here (also the U.S. popup strip)
      hatchTile: 7,           // adjust the gap between hatch lines here (px, larger is sparser)
      hatchWidth: 1,          // adjust hatch line thickness here (px)
      edgeWidth: 0.6,         // adjust the hairline around U.S. areas here (0 removes it)
      visible: true,
    },
    isa: {
      label: 'ISA areas',
      note: 'Contracts, applications, reserved areas and protected areas managed by the ISA',
      fill: '#D5DAD9',        // adjust ISA fill color here
      fillOpacity: 0.9,       // adjust how solid the ISA fill looks here
      outline: '#9AA6A4',     // adjust the lines between ISA subareas here
      outlineWidth: 0.6,
      visible: true,
    },
    overlaps: {
      label: 'Overlaps',
      note: 'U.S. areas overlapping ISA areas or each other',
      fill: '#E86D6D',        // adjust overlap color here
      fillOpacity: 1,
      visible: true,
    },
    ccz: {
      label: 'Clarion Clipperton Zone',
      fill: '#FFFFFF',        // CCZ tint; fillOpacity 0 leaves the zone unfilled
      fillOpacity: 0,
      outline: '#FFFFFF',     // adjust CCZ outline color here
      outlineOpacity: 0.8,
      outlineWidth: 1.1,      // adjust CCZ outline thickness here
      outlineDash: [3, 2],    // adjust dash and gap length here (multiples of the thickness)
    },
    eez: {
      // The lines come from the Mapbox style's "eez" layer, which the map recolors to this;
      // the fill is added on the same tileset
      label: 'Exclusive economic zones',
      color: '#FFFFFF',       // adjust EEZ line color here
      fill: '#FFFFFF',        // adjust EEZ fill color here
      fillOpacity: 0.2,       // adjust how strongly national waters are washed in
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
    // U.S. applicants and license holders, as the Federal Register and the companies' own
    // applications name them (fact-checked 23 Sep 2026; see the project's
    // Stuff/entity_names_factcheck.xlsx for sources and open questions).
    // federalRegister: month and year the application was posted in the Federal Register,
    // false if not posted yet, or dates per application keyed by the start of the area name.
    // federalRegisterText replaces that line with its own wording.
    TMC: {
      name: 'The Metals Company USA, LLC',
      parent: 'TMC the metals company Inc.',
      authority: 'United States (NOAA)',
      status: 'Applied',
      federalRegister: { 'USA-A': 'August 2026', 'USA-B': 'December 2025' },
    },
    AMR: {
      name: 'American Metal Resources, LLC',
      parent: 'American Metal Inc.',
      authority: 'United States (NOAA)',
      status: 'Applied',
      federalRegister: 'March 2026',
    },
    SEAX: {
      name: 'SeaX, Inc.',
      parent: 'American Metal Inc.',   // the same parent as American Metal Resources
      authority: 'United States (NOAA)',
      status: 'Applied',
      federalRegister: 'March 2026',
    },
    AOM: {
      // Confirmed 23 Sep 2026: the polygons come from the company's own licence-areas map
      // (aomusa.com/license-areas), so this is American Ocean Minerals Corporation of Tampa,
      // not the unrelated Deep Sea Minerals Corp., whose U.S. subsidiary carried the same name
      // until 9 Apr 2026. Its merger with Odyssey Marine Exploration was still pending.
      name: 'American Ocean Minerals Corporation',
      parent: 'Merging with Odyssey Marine Exploration',
      authority: 'United States (NOAA)',
      status: 'Applied',
      federalRegister: false,
    },
    ECO: {
      name: 'Eco Minerals, Inc.',
      parent: 'None',
      authority: 'United States (NOAA)',
      status: 'Applied',
      federalRegister: false,
    },
    LM: {
      name: 'Lockheed Martin Corporation',
      parent: 'None',
      authority: 'United States (NOAA)',
      status: 'Granted',
      // holds licenses rather than an application, so the Federal Register line is written out
      federalRegisterText: 'License extensions posted August 2022',
    },

    // ISA applicant: the U.S. cannot sponsor at the ISA, so the American parent applied
    // through a Bahraini subsidiary
    IM: {
      name: 'Impossible Metals Bahrain W.L.L.',
      parent: 'Impossible Metals Inc.',
      sponsor: 'Bahrain',
      status: 'Applied; deferred by the ISA to 2027',
    },

    // ISA exploration contractors, keyed by ISA contract ID. Names follow ISA's own
    // register (ISBA/31/C/3 Annex I, 9 Feb 2026); owners come from company filings.
    BGRPMN1: {
      name: 'Federal Institute for Geosciences and Natural Resources (BGR)',
      parent: 'German federal agency',
      sponsor: 'Germany',
    },
    BMJPMN1: { name: 'Blue Minerals Jamaica Ltd.', parent: 'Allseas Group', sponsor: 'Jamaica' },
    CIICPMN1: {
      name: 'Cook Islands Investment Corporation',
      parent: 'Cook Islands government body',
      sponsor: 'Cook Islands',
    },
    CMMPMN1: { name: 'China Minmetals Corporation', parent: 'Chinese state body', sponsor: 'China' },
    COMRAPMN1: {
      name: 'China Ocean Mineral Resources Research and Development Association',
      parent: 'Chinese state body',
      sponsor: 'China',
    },
    DORDPMN1: {
      name: 'Deep Ocean Resources Development Co. Ltd.',
      parent: 'JOGMEC, with 43 private companies',
      sponsor: 'Japan',
    },
    GSRPMN1: { name: 'Global Sea Mineral Resources NV', parent: 'DEME Group', sponsor: 'Belgium' },
    IFREMERPMN1: {
      name: 'Institut français de recherche pour l\'exploitation de la mer (Ifremer)',
      parent: 'French state body',
      sponsor: 'France',
    },
    IOMPMN1: {
      name: 'Interoceanmetal Joint Organization',
      parent: 'Intergovernmental organisation of its six member states',
      sponsor: 'Bulgaria, Cuba, Czechia, Poland, Russia, Slovakia',
    },
    KOREAPMN1: {
      name: 'Government of the Republic of Korea',
      parent: 'State contractor; implemented by KIOST',
      // a state contractor has no sponsoring state
    },
    MARAWAPMN1: {
      name: 'Marawa Research and Exploration Ltd.',
      parent: 'Kiribati government body',
      sponsor: 'Kiribati',
    },
    NORIPMN1: { name: 'Nauru Ocean Resources Inc.', parent: 'TMC the metals company Inc.', sponsor: 'Nauru' },
    OMSPMN1: { name: 'Ocean Mineral Singapore Pte. Ltd.', parent: 'Keppel Ltd', sponsor: 'Singapore' },
    TOMLPMN1: { name: 'Tonga Offshore Mining Limited', parent: 'TMC the metals company Inc.', sponsor: 'Tonga' },
    UKSRLPMN1: {
      // Lockheed Martin sold it in 2023, Loke went bankrupt in 2025, Glomar took it over
      name: 'UK Seabed Resources Ltd.',
      parent: 'Glomar Minerals',
      sponsor: 'United Kingdom',
    },
    UKSRLPMN2: { name: 'UK Seabed Resources Ltd.', parent: 'Glomar Minerals', sponsor: 'United Kingdom' },
    YUZHPMN1: { name: 'JSC Yuzhmorgeologiya', parent: 'Rosgeo', sponsor: 'Russian Federation' },
  },

  // ISA area types. "title" stands in for the company where an area has none.
  isaKinds: {
    exploration: { title: 'ISA exploration contract', status: 'Granted' },
    application: { title: 'ISA application', status: 'Applied' },
    reserved: { title: 'Reserved area', status: 'Reserved for developing states' },
    apei: {
      title: 'Area of Particular Environmental Interest (APEI)',
      status: 'Protected from mining',
    },
  },
};
