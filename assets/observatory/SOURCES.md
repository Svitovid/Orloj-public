# Orloj 3D — verified renderer and texture sources

Retrieved 2026-11-27. Files were downloaded without generating or painting imagery.

## Renderer

- `three-r160.min.js`: Three.js 0.160.0 UMD bundle. Source: https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js
- License: MIT, Three.js authors, retained in `THREE-LICENSE.txt`; original https://github.com/mrdoob/three.js/blob/r160/LICENSE.
- Runtime verification: `THREE.REVISION === "160"`; sphere geometry can be constructed. The bundle emits its upstream deprecation warning; this is not a runtime failure.

## Earth

- Recommended file: `earth-blue-marble-2k-mirror.jpg` (2048 × 1024).
- Primary source: NASA Earth Observatory, Blue Marble: Next Generation, July base map.
- Source collection: https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-map/
- Original: https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-base/july/world.200407.3x5400x2700.jpg
- Download mirror: https://raw.githubusercontent.com/MaxwellLee/physics-lab/main/assets/textures/earth_2048.jpg
- Mirror processing: bicubic downsampling to 2K; JPEG quality 90; no clouds, lighting, atmosphere, night lights or eclipse shadow added.
- Credit: NASA Earth Observatory; Blue Marble: Next Generation, produced by Reto Stöckli, NASA Goddard Space Flight Center.

## Moon

- Recommended file: `moon-lroc-2k-mirror.jpg` (2048 × 1024).
- Primary source: NASA Scientific Visualization Studio, CGI Moon Kit: https://svs.gsfc.nasa.gov/4720/
- Original: https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg
- Download mirror: https://raw.githubusercontent.com/MaxwellLee/physics-lab/main/assets/textures/moon_2048.jpg
- Mirror processing: original dimensions retained, JPEG re-encoded at quality 93.
- Optional bump texture: `moon-height-1k-mirror.jpg` (1024 × 512); original https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/ldem_3_8bit.jpg; mirror https://raw.githubusercontent.com/MaxwellLee/physics-lab/main/assets/textures/moon_height_1024.jpg reports byte-for-byte retention.
- Credit: NASA's Scientific Visualization Studio; Ernie Wright; Noah Petro (NASA/GSFC); LRO/LROC and LOLA instrument teams.
- The color map is centered on 0° longitude. It derives from LROC observations, with polar coverage filled from laser-altimeter albedo data. NASA states the color map is optimized for aesthetics; it is suitable for display, not numerical scientific measurement.

## Optional clouds

- `earth-clouds-2k-mirror.png` (2048 × 1024 RGBA).
- Source: NASA Visible Earth, Blue Marble: Clouds. https://visibleearth.nasa.gov/images/57747/blue-marble-clouds/77558l
- Original: https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg
- Mirror: https://raw.githubusercontent.com/MaxwellLee/physics-lab/main/assets/textures/clouds_2048.png
- Mirror processing: source grayscale brightness converted to alpha over near-white; original resolution retained. This is historical composite imagery, not current weather.
- Credit: NASA Goddard Space Flight Center; Reto Stöckli; enhancements by Robert Simmon.

## Rights and provenance

NASA media guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/

NASA permits educational and informational uses of its imagery and 3D texture-map media under those guidelines. Acknowledge NASA as the source and do not imply its endorsement. No NASA logo is included here. No separate third-party copyright notice was shown for the selected NASA items.

The mirror provides a detailed provenance record at https://github.com/MaxwellLee/physics-lab/blob/main/assets/textures/SOURCES.md (inspected content blob `7ef11da7d00e5bd679823aa13ff0307fd72c710d`). Direct NASA image downloads returned HTTP 503 in this session; the published GitHub mirror was used instead. Checksums of actual downloaded files are in `verified-assets.json`.

`earth-day.jpg`, `earth-clouds.png` and `moon.jpg` are initial candidate downloads. Prefer the verified files above because their provenance is documented more precisely.
