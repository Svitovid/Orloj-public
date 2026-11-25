# Reproducing the precession model

`build.py` computes the scientific runtime data from **ERFA 2.0.1.5** and the **Roman (1987) / Delporte B1875** constellation table included in **Astropy 8.0.3**. Python 3.12 and NumPy 2.3.5 were used for the verified build; versions are pinned in `requirements.txt`.

The calculation makes no network requests. It reuses only the existing local `spica`, `stars`, and `earth` fields from `precession-data.js`. No computed precession vectors, crossings, or rings are reused, and no full star catalogue or duplicate Earth image is required.

## Rebuild and compare

From the repository root, in a Python environment for build tools:

```sh
python -m pip install -r scripts/precession/requirements.txt
python scripts/precession/build.py --output /tmp/precession-data.regenerated.js --check-against precession-data.js
node --test tests/precession-core.test.js
```

`--check-against` compares all vector samples, IAU crossing records, dynamic ring topology, ring angles, and the unchanged asset subset. Metadata prose is not compared. The verified run produced **zero numeric difference** in the 1,303 vector samples and 1,303 dynamic rings.

The output path is mandatory so a review does not silently replace the active runtime bundle. After reviewing the result, regeneration into the application is explicit:

```sh
python scripts/precession/build.py --output precession-data.js
```

Use `--assets-from path/to/bundle.js` or a JSON bundle to select another existing local asset subset. The JSON literal is parsed without executing its JavaScript wrapper. The generator records hashes of the Roman table and of the reused asset subset.

## Calculation

- `erfa.ltp(epoch)[0]`: mean equinox direction in fixed mean equator/equinox J2000 coordinates.
- `erfa.ltpequ(epoch)`: mean equator north pole in the same frame.
- `erfa.ltpecl(epoch)`: mean ecliptic north pole in the same frame.
- B1875 transformation: `erfa.ltp(Time('B1875', scale='tt').jyear)` followed by the Roman table lookup.
- Dynamic rings: all meridian and declination-parallel intersections with the epoch ecliptic are solved analytically, classified at their midpoints, and adjacent equal regions merged. This retains narrow Cetus and Orion intervals that a coarse angular scan can miss.
- Ring basis: project the J2000 equinox onto the selected ecliptic; the second axis is `cross(eclipticPole, basisX)`.

Samples span Julian epochs −12,000 through 14,000 at 20-year intervals, with additional samples at 2026.9 and the Pisces–Aquarius crossing. The runtime interpolates normalized vectors. It interpolates ring angles only if both neighbouring partitions have the same constellation order; at a topology change it uses the nearest actual partition.

## Reference tests and accuracy

`tests/precession-core.test.js` contains fixed, independently calculated ERFA fixtures at five epochs outside the runtime sampling grid. Reproduce an individual reference without importing the generator:

```sh
python - <<'PY'
import erfa, numpy as np
y = 3210.5
q, n, e = erfa.ltp(y)[0], erfa.ltpequ(y), erfa.ltpecl(y)
print('q', q.tolist())
print('n', n.tolist())
print('e', e.tolist())
print('obliquity', float(np.degrees(np.arccos(n @ e))))
PY
```

The independent interpolation audit sampled quarter, half, and three-quarter points of every interval (3,906 epochs). Maximum interpolation error in equator pole direction and obliquity was below **0.25 arcseconds**. This is an interpolation error relative to ERFA, not a claim about physical model accuracy over 26,000 years. Norms and the ecliptic basis remain normalized; independently interpolated equinox/pole vectors can leave a plane residual below 0.02 arcseconds.

## Conventions and limits

- The long-term model is Vondrák–Capitaine–Wallace (2011, with 2012 correction), implemented in ERFA, derived from SOFA. Both the equator and ecliptic move; the pole track is not an exact closed circle.
- The computed IAU crossing is approximately **2597**, under modern constellation boundaries. These boundaries do not define a universally accepted astrological age.
- The alternative equal 30-degree sectors use the fixed HYG J2000 direction of Spica assigned to 180 degrees. This illustrative convention gives a crossing near **2441**. It is not labelled standard Lahiri; a user-selected boundary offset changes the date.
- Model years are **Julian epochs TT**, not exact civil-calendar dates. Their numerical year labels are approximate over the long interval. The UI's UTC `Date` conversion is a present-day display approximation to TT; it does not implement historical ΔT or leap seconds.
- Nutation, aberration and stellar proper motion are omitted. Star positions are fixed at J2000; the local star subset retains its HYG CC BY-SA attribution in `THIRD_PARTY_NOTICES.md`. Earth illumination and scale are illustrative.

Primary references are embedded in the generated bundle's `sources` list. In particular, the ERFA `ltpequ.c` and `ltpecl.c` documentation describes the long-term model and its applicable accuracy, and the IAU constellation page explains what its boundaries mean.
