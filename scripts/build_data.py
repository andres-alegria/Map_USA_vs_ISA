#!/usr/bin/env python3
"""Build the map's GeoJSON layers from the project's geodata folder.

Usage:
    python3 scripts/build_data.py /path/to/Data

Reads:
    ccz.geojson
    US_Areas_CCZ/*.geojson
    ISA_Areas/ISA_Areas_{Exploration,Reserve,Impossible_Metals,APEIs}.geojson

Writes (into this repo's data/ folder):
    ccz.geojson        the Clarion-Clipperton Zone outline
    us_areas.geojson   US application and licence areas, one feature per subarea
    isa_areas.geojson  ISA contracts, reserved areas, applications and APEIs, one feature per subarea
    overlaps.geojson   every place where a US area overlaps an ISA area or another US area

Features stay undissolved so each subarea can be named on hover. Editorial text
(company names, statuses) lives in js/config.js; this script only carries keys.

Areas are measured on the WGS84 ellipsoid in a cylindrical equal-area projection,
with polygon edges read as straight lines in longitude/latitude.
Needs GDAL's Python bindings (osgeo).
"""
import json
import os
import sys

from osgeo import ogr, osr

ogr.UseExceptions()
osr.UseExceptions()

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.normpath(os.path.join(HERE, '..', 'data'))

KM2_PER_MI2 = 2.589988110336
MIN_OVERLAP_KM2 = 50.0            # overlap pieces smaller than this are treated as digitising slivers
REGION = (-161.0, -1.0, -110.0, 24.0)  # lon/lat window around the CCZ; ISA areas elsewhere are skipped
PRECISION = 5                     # decimal places kept in output coordinates (~1 m)

US_LAYERS = [  # file in US_Areas_CCZ/, company key used by js/config.js
    ('The_Metals_Company', 'TMC_USA.geojson', 'TMC'),
    ('American_Metal_Resources', 'American_Metal_Resources.geojson', 'AMR'),
    ('SEAX', 'SEAX.geojson', 'SEAX'),
    ('American_Ocean_Minerals', 'American_Ocean_Minerals.geojson', 'AOM'),
    ('Eco_Minerals', 'Eco_Minerals.geojson', 'ECO'),
    ('Lockheed_Martin', 'Lockheed_Martin.geojson', 'LM'),
]

WGS84 = osr.SpatialReference()
WGS84.ImportFromEPSG(4326)
WGS84.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
CEA = osr.SpatialReference()
CEA.ImportFromProj4('+proj=cea +lon_0=-135 +lat_ts=0 +datum=WGS84 +units=m +no_defs')
CEA.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
TO_CEA = osr.CoordinateTransformation(WGS84, CEA)


# ---------------------------------------------------------------- geometry helpers

def polys_only(g):
    """Return only the polygonal parts of g as a MultiPolygon (overlays can emit lines/points)."""
    out = ogr.Geometry(ogr.wkbMultiPolygon)
    if g is None or g.IsEmpty():
        return out
    t = ogr.GT_Flatten(g.GetGeometryType())
    if t == ogr.wkbPolygon:
        out.AddGeometry(g)
    elif t in (ogr.wkbMultiPolygon, ogr.wkbGeometryCollection):
        for i in range(g.GetGeometryCount()):
            sub = polys_only(g.GetGeometryRef(i))
            for j in range(sub.GetGeometryCount()):
                out.AddGeometry(sub.GetGeometryRef(j))
    return out


def clean(g):
    g = g.Clone()
    g.FlattenTo2D()
    if not g.IsValid():
        g = g.MakeValid()
    return polys_only(g)


def area_km2(g):
    if g is None or g.IsEmpty():
        return 0.0
    p = g.Clone()
    p.Segmentize(0.01)  # densify so lon/lat-straight edges keep their shape once projected
    p.Transform(TO_CEA)
    return p.GetArea() / 1e6


def width_km(g):
    """Rough strip width (2 x area / perimeter), used only in the build report."""
    p = g.Clone()
    p.Segmentize(0.01)
    p.Transform(TO_CEA)
    per = sum(p.GetGeometryRef(i).Boundary().Length() for i in range(p.GetGeometryCount()))
    return 2 * p.GetArea() / per / 1000 if per else 0.0


def envelopes_touch(a, b):
    ea, eb = a.GetEnvelope(), b.GetEnvelope()
    return not (ea[1] < eb[0] or eb[1] < ea[0] or ea[3] < eb[2] or eb[3] < ea[2])


def union(geoms):
    mp = ogr.Geometry(ogr.wkbMultiPolygon)
    for g in geoms:
        for i in range(g.GetGeometryCount()):
            mp.AddGeometry(g.GetGeometryRef(i))
    return polys_only(mp.UnaryUnion())


def read_layer(path, region=None):
    ds = ogr.Open(path)
    lyr = ds.GetLayer()
    if region:
        lyr.SetSpatialFilterRect(*region)
    rows = []
    for ft in lyr:
        ref = ft.GetGeometryRef()
        if ref is None:
            continue
        rows.append((ft.items(), clean(ref)))
    return rows


def feature(fid, props, geom):
    return {
        'type': 'Feature',
        'properties': {'id': fid, **props},
        'geometry': json.loads(geom.ExportToJson([f'COORDINATE_PRECISION={PRECISION}'])),
    }


def with_area(props, geom):
    a = area_km2(geom)
    return {**props, 'area_km2': round(a), 'area_mi2': round(a / KM2_PER_MI2)}


def write(name, features):
    path = os.path.join(OUT_DIR, name)
    with open(path, 'w') as fh:
        json.dump({'type': 'FeatureCollection', 'features': features}, fh, separators=(',', ':'))
    print(f'  wrote data/{name}: {len(features)} features, {os.path.getsize(path) / 1024:,.0f} KB')


# ---------------------------------------------------------------- source-specific labels

def us_area_name(key, raw):
    if not raw:
        return None
    if key == 'TMC' and '—' in raw:          # "USA-A — A-A" -> "USA-A (A-A)"
        app, _, block = raw.partition('—')
        return f'{app.strip()} ({block.strip()})'
    if key == 'LM':                               # "USA-1 (incl. 1988 additions, ...)" -> "USA-1"
        return raw.split(' ')[0]
    return raw.strip()


def na(v):
    return None if v in (None, '', 'NA') else str(v).strip()


# ---------------------------------------------------------------- build

def main(data_dir):
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f'Reading {data_dir}')

    # CCZ outline, copied through
    ccz_rows = read_layer(os.path.join(data_dir, 'ccz.geojson'))
    ccz = union([g for _, g in ccz_rows])
    write('ccz.geojson', [feature('ccz', {'name': 'Clarion-Clipperton Zone'}, ccz)])

    # US areas
    us = []  # (id, props, geom)
    for slug, fname, key in US_LAYERS:
        for i, (items, g) in enumerate(read_layer(os.path.join(data_dir, 'US_Areas_CCZ', fname)), 1):
            fid = f'us-{key.lower()}-{i}'
            us.append((fid, with_area({'group': 'us', 'company': key,
                                       'area_name': us_area_name(key, items.get('subarea'))}, g), g))
    write('us_areas.geojson', [feature(fid, p, g) for fid, p, g in us])

    # ISA areas
    isa = []
    isa_dir = os.path.join(data_dir, 'ISA_Areas')
    for items, g in read_layer(os.path.join(isa_dir, 'ISA_Areas_Exploration.geojson'), REGION):
        isa.append((f"isa-exp-{items['AreaKey']}",
                    with_area({'group': 'isa', 'kind': 'exploration', 'company': items['ContractID'],
                               'area_name': na(items.get('SubArea'))}, g), g))
    for items, g in read_layer(os.path.join(isa_dir, 'ISA_Areas_Reserve.geojson'), REGION):
        isa.append((f"isa-res-{items['SubArea'].replace(' ', '')}",
                    with_area({'group': 'isa', 'kind': 'reserved', 'company': None,
                               'area_name': na(items.get('SubArea'))}, g), g))
    for items, g in read_layer(os.path.join(isa_dir, 'ISA_Areas_Impossible_Metals.geojson'), REGION):
        isa.append((f"isa-im-{items['subarea'].split()[-1]}",
                    with_area({'group': 'isa', 'kind': 'application', 'company': 'IM',
                               'area_name': na(items.get('subarea'))}, g), g))
    for items, g in read_layer(os.path.join(isa_dir, 'ISA_Areas_APEIs.geojson'), REGION):
        name = items['Remarks'].replace('-', ' ')  # "APEI-13" -> "APEI 13"
        isa.append((f"isa-apei-{items['Remarks'].split('-')[-1]}",
                    with_area({'group': 'isa', 'kind': 'apei', 'company': None, 'area_name': name}, g), g))
    write('isa_areas.geojson', [feature(fid, p, g) for fid, p, g in isa])

    # Overlaps: split the US footprint into pieces that share the same set of covering areas
    us_union = union([g for _, _, g in us])
    pieces = []  # (geom, frozenset of member ids)

    def add(geom, mid):
        nonlocal pieces
        out, rest = [], geom.Clone()
        for pg, ids in pieces:
            if not envelopes_touch(pg, geom) or not pg.Intersects(geom):
                out.append((pg, ids))
                continue
            inter = polys_only(pg.Intersection(geom))
            if not inter.IsEmpty():
                out.append((inter, ids | {mid}))
            diff = polys_only(pg.Difference(geom))
            if not diff.IsEmpty():
                out.append((diff, ids))
            rest = polys_only(rest.Difference(pg))
        if not rest.IsEmpty():
            out.append((rest, frozenset([mid])))
        pieces = out

    for fid, _, g in us:
        add(g, fid)
    for fid, _, g in isa:
        clipped = polys_only(g.Intersection(us_union)) if envelopes_touch(g, us_union) else None
        if clipped is not None and area_km2(clipped) >= MIN_OVERLAP_KM2:
            add(clipped, fid)

    grouped, dropped = {}, []
    for pg, ids in pieces:
        if len(ids) < 2:
            continue
        for i in range(pg.GetGeometryCount()):
            part = pg.GetGeometryRef(i).Clone()
            a = area_km2(part)
            if a < MIN_OVERLAP_KM2:
                dropped.append((ids, a))
                continue
            grouped.setdefault(ids, []).append(part)

    order = {fid: n for n, (fid, _, _) in enumerate(us + isa)}
    overlaps = []
    for ids, parts in grouped.items():
        geom = union([polys_only(p) for p in parts])
        members = sorted(ids, key=order.get)
        overlaps.append((members, geom, area_km2(geom)))
    overlaps.sort(key=lambda o: -o[2])
    write('overlaps.geojson', [
        feature(f'ov-{n}', with_area({'group': 'overlap', 'members': '|'.join(m)}, g), g)
        for n, (m, g, _) in enumerate(overlaps, 1)
    ])

    # Report
    print(f'\nOverlaps kept (>= {MIN_OVERLAP_KM2:g} km2): {len(overlaps)}')
    for members, g, a in overlaps:
        print(f'  {a:10,.0f} km2  width~{width_km(g):6.1f} km  {" + ".join(members)}')
    print(f'Sliver pieces dropped: {len(dropped)}, largest {max((a for _, a in dropped), default=0):.1f} km2, '
          f'total {sum(a for _, a in dropped):.1f} km2')

    # Cross-check against the CCZ figures (US application area = US layers minus Lockheed Martin)
    def in_ccz(geoms):
        return polys_only(union(geoms).Intersection(ccz))

    lm = in_ccz([g for fid, _, g in us if fid.startswith('us-lm-')])
    app = polys_only(in_ccz([g for _, _, g in us]).Difference(lm))
    expl = in_ccz([g for fid, _, g in isa if fid.startswith('isa-exp-')])
    resv = in_ccz([g for fid, _, g in isa if fid.startswith('isa-res-')])
    print('\nChecks (within the CCZ):')
    for label, g in [('US application area', app),
                     ('  on ISA reserved areas', polys_only(app.Intersection(resv))),
                     ('  on ISA exploration contracts', polys_only(app.Intersection(expl))),
                     ('  on either', polys_only(app.Intersection(union([expl, resv]))))]:
        a = area_km2(g)
        print(f'  {label:32s} {a:10,.0f} km2  {a / KM2_PER_MI2:10,.0f} mi2')


if __name__ == '__main__':
    if len(sys.argv) != 2 or not os.path.isdir(sys.argv[1]):
        sys.exit(__doc__)
    main(sys.argv[1])
