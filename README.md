# US deep-sea mining applications and ISA areas

Interactive map for a Mongabay story. It shows where seabed areas sought or held under US law in the
Clarion-Clipperton Zone (CCZ) overlap areas managed by the International Seabed Authority (ISA).

## What the map shows

- **US application areas** (hatched): The Metals Company (TMC USA), American Metal Resources, SEAX,
  American Ocean Minerals, Eco Minerals, and the two exploration licenses held by Lockheed Martin.
- **ISA managed areas** (grey): exploration contracts, reserved areas, Impossible Metals' application
  and the protected areas (APEIs).
- **Overlaps** (red): every place where a US area overlaps an ISA area or another US area.
  Pieces under 50 km² are left out as digitising slivers.
- **Clarion-Clipperton Zone** dashed outline and **exclusive economic zone** lines as background.

Hover over an area (tap on phones) for company, area name, status, area in km² and mi², and for US
applications whether they have been posted in the Federal Register. A colored strip on each box says
whether it is a US application area or an ISA managed area.
Areas and features stay undissolved, one per subarea.

## Run locally

The map loads its GeoJSON with `fetch`, so serve the folder over HTTP rather than opening the file:

```
python3 -m http.server 8000
```

It needs a Mapbox public token. Copy `js/mapbox-token.example.js` to `js/mapbox-token.js` and paste
the token there. That file is git-ignored, so the token never enters the repo. The basemap is a
Mongabay Mapbox style made for this map, which also draws the EEZ boundaries.

## Editing

- `js/config.js`: title, deck, sources, layer colors, legend text, company names and statuses.
- `css/style.css`: page colors, fonts, panel width and the phone layout.
- `js/app.js`: map logic only.

## Rebuilding the data

```
python3 scripts/build_data.py /path/to/Data
```

Reads the project geodata folder (`ccz.geojson`, `US_Areas_CCZ/`, `ISA_Areas/`) and rewrites `data/`.
It needs GDAL's Python bindings. Areas are measured on the WGS84 ellipsoid in an equal-area
projection. The script prints every overlap it keeps and checks the headline CCZ figures.

## Deploying on Vercel

`vercel.json` runs `scripts/build-site.sh`, which copies the site into `dist/` and writes the token
from the `MAPBOX_ACCESS_TOKEN` environment variable. Set that variable in the Vercel project settings.
