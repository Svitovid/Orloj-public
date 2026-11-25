# Third-party notices

## Earth texture — NASA Blue Marble

`assets/earth-blue-marble-1024.jpg` is a JPEG conversion of the 1024-pixel
Blue Marble texture, used only to illustrate the Earth's surface. It does
not encode the current day/night terminator or an observation timestamp.

Credit: NASA/GSFC Scientific Visualization Studio; Reto Stöckli.

Source: <https://svs.gsfc.nasa.gov/2915/>

Original: <https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-1024.png>

NASA media usage guidance: <https://www.nasa.gov/nasa-brand-center/images-and-media/>

No NASA endorsement is implied.

## HYG star data

The 180-star subset and Spica direction in `precession-data.js` derive from
David Nash / Astronexus, HYG Database v3.8. The subset was selected and
converted to Cartesian J2000 directions for Orloj. The renderer fixes these
directions: it does not apply proper motion, aberration, or parallax.

Source: <https://github.com/astronexus/HYG-Database>

Data release: <https://github.com/astronexus/HYG-Database/blob/main/hyg/v3/hyg_v38.csv.gz>

License: Creative Commons Attribution-ShareAlike 4.0 International.
The adapted star data remain available under that license:
<https://creativecommons.org/licenses/by-sa/4.0/>

This attribution applies to the derived catalogue data, not to unrelated
Orloj source code or the NASA texture.

## Mean precession and constellation boundaries

Precession samples were computed with ERFA 2.0.1.5 (`ltp`, `ltpequ`, `ltpecl`),
implementing Vondrák, Capitaine & Wallace (2011, with 2012 corrections).
The client interpolates those samples; it does not bundle the ERFA engine.

Primary model implementation: <https://github.com/liberfa/erfa/blob/master/src/ltpequ.c>

IAU region membership uses the Roman (1987) B1875 boundary table distributed
with Astropy 8.0.3, transformed into the fixed J2000 frame. The illustrated
ring follows the moving mean ecliptic. These conventions do not establish
an agreed starting date for an astrological age.

Boundary table: <https://github.com/astropy/astropy/blob/v8.0.3/astropy/coordinates/data/constellation_data_roman87.dat>

Astropy licensing: <https://github.com/astropy/astropy/blob/v8.0.3/LICENSE.rst>

## Astronomy Engine

Orloj uses Astronomy Engine for high-precision geocentric planetary positions
in its Human Design calculation layer.

Source: <https://github.com/cosinekitty/astronomy>

MIT License

Copyright (c) 2019-2023 Don Cross <cosinekitty@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## natalengine

The Human Design calculation layer in Orloj was independently verified against
the open-source `natalengine` project. Structural reference data for the Rave
Mandala gate order, channel topology and incarnation-cross naming was adapted
and reviewed for Orloj's original implementation.

Source: <https://github.com/Unforced-Dev/natalengine>

MIT License

Copyright (c) 2024 unforced

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
