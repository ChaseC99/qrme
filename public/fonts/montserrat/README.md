# Montserrat

Self-hosted, unmodified Latin WOFF2 file from Google Fonts, CDN revision v31.
The variable normal style covers the site's 400–700 weights and is preloaded by
the shared layout. Only Latin is included for the current English site; other
characters use system-font fallback.

Source stylesheet (retrieved 2026-10-16):
https://fonts.googleapis.com/css2?family=Montserrat:wght@400..700&display=swap

The font is distributed under the SIL Open Font License 1.1 in `OFL.txt`, copied
from https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/OFL.txt.

| Local file | Original URL | SHA-256 |
| --- | --- | --- |
| montserrat-latin-v31.woff2 | https://fonts.gstatic.com/s/montserrat/v31/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2 | `06b16db7a969135d48d38c49183be7fb88d4452e2a3011957c7851941f4e4879` |

Runtime font declarations live in `src/styles/fonts.css`. No Google Fonts request
is made by the browser or during the build.

## Translations

Montserrat is self-hosted with only the Latin subset, covering weights 400–700.
If future translations or user-entered names require broader Montserrat coverage,
redownload the needed subsets using the [font restoration instructions](public/fonts/montserrat/README.md#restoring-additional-language-coverage)
and add their local `@font-face` rules to `src/styles/fonts.css`.

## Restoring additional language coverage

If the site is translated or user-entered names need consistent Montserrat
rendering beyond Latin, redownload only the needed subsets (Latin extended,
Vietnamese, Cyrillic, or Cyrillic extended):

1. Open the source stylesheet above in a modern browser to obtain its WOFF2 URLs
   and `@font-face` rules for weights 400–700.
2. Download the required subset files into this directory. Keep their revision
   in the filenames and record the source URLs and SHA-256 checksums here.
3. Add the matching `@font-face` rules to `src/styles/fonts.css`, preserving each
   `unicode-range` and replacing the remote URLs with `/fonts/montserrat/...`
   paths. Retain the font license.
4. Run `npm run build` and verify representative text in the local preview.

Keep the font files self-hosted; do not restore the Google Fonts stylesheet link.
