#!/usr/bin/env python3
"""Rebuild Orloj's mean-precession data; reuse only the existing asset subset.

No network requests are made. Numeric geometry and IAU partitions are computed
from ERFA and the Roman (1987) table packaged with Astropy. The input bundle
supplies only stars, Spica and the Earth texture reference, avoiding another
copy/download of the HYG catalogue and NASA imagery.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import astropy
import astropy.coordinates as coordinates
from astropy.time import Time
import erfa
import numpy as np


ROOT = Path(__file__).resolve().parents[2]
START, END, STEP = -12000, 14000, 20
SOURCES = [
    {"title": "IAU: The Constellations", "url": "https://www.iau.org/IAU/Astronomy-FAQs/Constellations.aspx"},
    {"title": "Roman (1987): Identification of a Constellation From a Position", "url": "https://cdsarc.cds.unistra.fr/viz-bin/ReadMe/VI/42?format=html&tex=true"},
    {"title": "Astropy get_constellation documentation", "url": "https://docs.astropy.org/en/stable/api/astropy.coordinates.get_constellation.html"},
    {"title": "Vondrak, Capitaine & Wallace (2011), New precession expressions, valid for long time intervals", "url": "https://www.aanda.org/articles/aa/full_html/2011/10/aa17274-11/aa17274-11.html"},
    {"title": "Vondrak, Capitaine & Wallace (2012), Corrigendum", "url": "https://www.aanda.org/articles/aa/full_html/2012/05/aa17274e-11/aa17274e-11.html"},
    {"title": "SOFA official software and documentation", "url": "https://www.iausofa.org/current-software"},
    {"title": "ERFA ltp implementation and accuracy notes", "url": "https://github.com/liberfa/erfa/blob/master/src/ltp.c"},
]


def load_bundle(path: Path) -> dict:
    """Decode the literal data, never execute input JavaScript."""
    text = path.read_text(encoding="utf-8")
    if text.lstrip().startswith("{"):
        return json.loads(text)
    marker = "const data="
    if marker not in text:
        raise ValueError("Expected a JSON bundle or the literal 'const data=' wrapper")
    return json.JSONDecoder().raw_decode(text.split(marker, 1)[1].lstrip())[0]


def norm(vector: np.ndarray) -> np.ndarray:
    return vector / np.linalg.norm(vector)


class Sky:
    def __init__(self) -> None:
        self.table_path = Path(coordinates.__file__).parent / "data/constellation_data_roman87.dat"
        self.table = np.genfromtxt(self.table_path, dtype=[("lo", float), ("hi", float), ("dec", float), ("code", "U3")])
        self.codes = sorted(set(str(code) for code in self.table["code"]))
        self.code_index = {code: i for i, code in enumerate(self.codes)}
        self.b1875_epoch = float(Time("B1875", scale="tt").jyear)
        self.to_b1875 = erfa.ltp(self.b1875_epoch)

    def classify(self, vectors: np.ndarray) -> np.ndarray:
        v = np.asarray(vectors) @ self.to_b1875.T
        ra = (np.degrees(np.arctan2(v[:, 1], v[:, 0])) % 360 / 15) % 24
        dec = np.degrees(np.arcsin(np.clip(v[:, 2], -1, 1)))
        result = np.full(len(v), -1, dtype=int)
        remaining = np.arange(len(v))
        for row in self.table:
            if not len(remaining):
                break
            match = (row["lo"] <= ra[remaining]) & (ra[remaining] < row["hi"]) & (dec[remaining] >= row["dec"])
            result[remaining[match]] = self.code_index[str(row["code"])]
            remaining = remaining[~match]
        if len(remaining):
            raise ArithmeticError("Unclassified B1875 coordinates")
        return result

    def code_at(self, year: float) -> str:
        return self.codes[self.classify(np.array([erfa.ltp(year)[0]]))[0]]

    def transition(self, lo: float, hi: float) -> float:
        before = self.code_at(lo)
        for _ in range(60):
            mid = (lo + hi) / 2
            if self.code_at(mid) == before:
                lo = mid
            else:
                hi = mid
        return (lo + hi) / 2

    def crossings(self) -> list:
        years = np.arange(START, END + 1)
        codes = self.classify(erfa.ltp(years)[:, 0, :])
        changes = np.flatnonzero(codes[1:] != codes[:-1])
        return [[round(self.transition(float(years[i]), float(years[i + 1])), 6),
                 self.codes[codes[i]], self.codes[codes[i + 1]]] for i in changes]

    def rings(self, years: np.ndarray, poles: np.ndarray) -> list:
        """Analytic intersections avoid losing sub-arcminute constellation slivers."""
        xs = np.array([1.0, 0, 0]) - poles * poles[:, 0, None]
        xs /= np.linalg.norm(xs, axis=1)[:, None]
        ys = np.cross(poles, xs)
        meridians = np.unique(np.r_[self.table["lo"], self.table["hi"]]) * np.pi / 12
        parallels = np.unique(self.table["dec"]) * np.pi / 180
        candidate_rows, midpoint_vectors, lengths = [], [], []
        for i, _ in enumerate(years):
            bx, by = self.to_b1875 @ xs[i], self.to_b1875 @ ys[i]
            a = bx[1] * np.cos(meridians) - bx[0] * np.sin(meridians)
            b = by[1] * np.cos(meridians) - by[0] * np.sin(meridians)
            roots = np.arctan2(-a, b)
            radius, phase = np.hypot(bx[2], by[2]), np.arctan2(by[2], bx[2])
            ratios = np.sin(parallels) / radius
            arcs = np.arccos(ratios[np.abs(ratios) <= 1])
            cuts = np.unique(np.round(np.r_[0.0, roots % (2*np.pi),
                (roots + np.pi) % (2*np.pi), (phase + arcs) % (2*np.pi),
                (phase - arcs) % (2*np.pi), 2*np.pi], 12))
            cuts[0], cuts[-1] = 0.0, 2*np.pi
            cuts = cuts[np.r_[True, np.diff(cuts) > 1e-10]]
            cuts[-1] = 2*np.pi
            mids = (cuts[:-1] + cuts[1:]) / 2
            candidate_rows.append(cuts)
            midpoint_vectors.append(xs[i, None, :] * np.cos(mids[:, None]) + ys[i, None, :] * np.sin(mids[:, None]))
            lengths.append(len(mids))
        classified = self.classify(np.vstack(midpoint_vectors))
        result, offset = [], 0
        for i, year in enumerate(years):
            codes = classified[offset:offset + lengths[i]]
            offset += lengths[i]
            changes = np.r_[0, np.flatnonzero(codes[1:] != codes[:-1]) + 1]
            partition = [[round(float(np.degrees(candidate_rows[i][j])), 6), int(codes[j])] for j in changes]
            result.append([float(year), partition])
        return result


def build(seed: dict) -> dict:
    assets = {key: seed[key] for key in ("spica", "stars", "earth")}
    if len(assets["spica"]) != 3 or not assets["stars"]:
        raise ValueError("Missing local star inputs")
    sky = Sky()
    crossing = sky.transition(2597, 2598)
    years = np.array(sorted(set(list(range(START, END + 1, STEP)) + [2026.9, crossing])))
    matrices = erfa.ltp(years)
    q, n, e = matrices[:, 0, :], erfa.ltpequ(years), erfa.ltpecl(years)
    samples = [[float(year), *[round(float(x), 9) for x in np.r_[q[i], n[i], e[i]]]] for i, year in enumerate(years)]
    eps = float(np.arccos(np.dot(erfa.ltpequ(2000), erfa.ltpecl(2000))))
    ce, se = float(np.cos(eps)), float(np.sin(eps))
    plane_error = float(max(np.max(np.abs(np.sum(q*n, axis=1))), np.max(np.abs(np.sum(q*e, axis=1)))))
    if plane_error > 1e-12:
        raise ArithmeticError("Equinox does not lie in both mean planes")
    asset_hash = hashlib.sha256(json.dumps(assets, ensure_ascii=False, separators=(",", ":"), sort_keys=True).encode()).hexdigest()
    metadata = {
        "purpose": "Mean precession of the equator and ecliptic, not prediction of a cultural or spiritual era.",
        "model": "Vondrak, Capitaine, Wallace 2011/2012 long-term precession via ERFA ltp, ltpequ, ltpecl",
        "astropyVersion": astropy.__version__, "erfaVersion": erfa.__version__,
        "numpyVersion": np.__version__,
        "frame": "Fixed mean equator and equinox J2000.0; right-handed unit vectors",
        "years": "Julian epochs TT in astronomical year numbering; displayed calendar years are approximate. UTC Date conversion is a present-day display approximation to TT.",
        "start": START, "end": END, "step": STEP,
        "B1875JulianEpoch": sky.b1875_epoch,
        "J2000MeanObliquityDeg": float(np.degrees(eps)),
        "equatorialJ2000ToEclipticJ2000": [[1, 0, 0], [0, ce, se], [0, -se, ce]],
        "constellations": "Roman 1987 / Delporte IAU boundaries B1875, transformed through long-term mean precession.",
        "ring": "Dynamic intersection of each epoch's mean ecliptic with IAU constellation regions. BasisX is the J2000 equinox projected into that ecliptic; BasisY = cross(eclipticPole, BasisX).",
        "ringTopology": "Interpolate boundaries only when neighbour partitions have identical code order. Otherwise use the nearest sampled partition; topology can include narrow Cetus and Orion excursions over this long interval.",
        "spicaConvention": "Illustrative equal 30-degree sectors: fixed HYG J2000 Spica direction assigned 180 degrees in the epoch ecliptic; no claim to standard Lahiri, no stellar proper motion.",
        "limitations": [
            "No nutation, aberration or proper motions of individual stars.",
            "IAU boundaries are a modern sky-partition convention, not an agreed definition of an astrological age.",
            "The ecliptic plane and obliquity evolve; the pole path is not an exact fixed circle.",
            "The 26,000-year display interval is approximately one precession circuit, not a perfectly periodic clock.",
            "Boundary precision describes this convention only; display around 2600 CE or approximately 2597, not a prophesied exact date."
        ],
        "geometryMaxDotProductError": plane_error,
        "romanTableSha256": hashlib.sha256(sky.table_path.read_bytes()).hexdigest(),
        "localAssetSubsetSha256": asset_hash,
        "assetOrigin": "Existing precession-data.js local HYG v3.8 subset and NASA image reference; see THIRD_PARTY_NOTICES.md.",
        "generator": "scripts/precession/build.py",
    }
    return {"samples": samples, "cosE": ce, "sinE": se, "firstCode": sky.code_at(START),
        "crossings": sky.crossings(), "crossing": crossing, "dynamic": sky.rings(years, e),
        "codes": sky.codes, **assets, "sources": SOURCES, "metadata": metadata,
        "version": "mean-precession-v1"}


def check_against(actual: dict, expected: dict) -> dict:
    """Compare computed scientific fields, independently of prose metadata."""
    for key in ("firstCode", "codes", "spica", "stars", "earth", "crossings"):
        if actual[key] != expected[key]:
            raise AssertionError(f"Mismatch in {key}")
    a, b = np.asarray(actual["samples"]), np.asarray(expected["samples"])
    if a.shape != b.shape or not np.allclose(a, b, rtol=0, atol=1e-8):
        raise AssertionError("Sample vectors/epochs differ")
    ring_error = 0.0
    if len(actual["dynamic"]) != len(expected["dynamic"]):
        raise AssertionError("Dynamic sample count differs")
    for aa, bb in zip(actual["dynamic"], expected["dynamic"]):
        if abs(aa[0] - bb[0]) > 1e-8 or [x[1] for x in aa[1]] != [x[1] for x in bb[1]]:
            raise AssertionError(f"Ring topology differs at {aa[0]}")
        ring_error = max(ring_error, max(abs(x[0] - y[0]) for x, y in zip(aa[1], bb[1])))
    if ring_error > 2e-6 or abs(actual["crossing"] - expected["crossing"]) > 1e-7:
        raise AssertionError("Ring or IAU crossing numeric difference exceeds tolerance")
    return {"maxSampleDifference": float(np.max(np.abs(a-b))), "maxRingDifferenceDeg": ring_error}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--assets-from", type=Path, default=ROOT / "precession-data.js")
    parser.add_argument("--output", type=Path, required=True, help="Explicit output avoids accidentally replacing the runtime bundle during review")
    parser.add_argument("--check-against", type=Path)
    args = parser.parse_args()
    bundle = build(load_bundle(args.assets_from))
    check = check_against(bundle, load_bundle(args.check_against)) if args.check_against else None
    payload = json.dumps(bundle, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    wrapper = ('/* ERFA-derived mean precession; HYG subset: CC BY-SA 4.0. See THIRD_PARTY_NOTICES.md. */\n'
        '(function(root){\n"use strict";\nconst data=' + payload + ';\n'
        'if(typeof module!=="undefined"&&module.exports)module.exports=data;\n'
        'root.OrlojPrecessionData=data;\n})(typeof window==="undefined"?globalThis:window);\n')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(wrapper, encoding="utf-8")
    print(json.dumps({"output": str(args.output), "samples": len(bundle["samples"]),
        "dynamicSamples": len(bundle["dynamic"]), "iauCrossing": bundle["crossing"],
        "bytes": args.output.stat().st_size, "comparison": check}, ensure_ascii=False))


if __name__ == "__main__":
    main()
