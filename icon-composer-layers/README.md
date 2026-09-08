# QR Me Icon Composer layers

These three SVGs are prepared for Apple Icon Composer on a shared 1024 x 1024
canvas. Each file keeps the original `0 0 100 100` coordinate system through
its `viewBox`, so the artwork remains easy to edit while importing at the
expected app-icon size.

## Import

1. Open Icon Composer and set the canvas background to `#a8edfe`.
2. Import `01-qr-modules.svg`.
3. Import `02-qr-centers.svg` above it.
4. Import `03-person.svg` above both QR layers.
5. Keep the QR treatment restrained. Add the soft shadow and any stronger
   Liquid Glass treatment to the person layer inside Icon Composer.

### Person appearance variants

Import `03-person.svg` as the person layer's Default image. Do not add
`03-person-solid.svg` to the sidebar as another normal layer. Instead, select
Dark and add an Image variation under Composition, using
`03-person-solid.svg`; repeat for Mono with the same solid image. Default then
uses the outline geometry while Dark and Mono use the matching solid geometry.

The file numbers preserve the intended back-to-front order. Background color,
drop shadow, blur, translucency, and the final app-icon enclosure are omitted
intentionally because Icon Composer supplies those features. Each SVG imports
as one layer: QR frames and modules, finder-center squares, and the complete
person.

The finder-frame outlines in `01-qr-modules.svg` are filled compound paths,
not SVG strokes. Their centers remain transparent, while Icon Composer can
recolor the visible outlines through the layer's fill color in every mode.

## Geometry note

The top-right frame in `01-qr-modules.svg` replaces the source SVG's circular
mask with a single filled path. Its circle/frame intersections are rounded to two decimals
(`64.5,28.34`, `68.5,28.01`, `77.15,30.5`, and `81.85,34.5`). This preserves
the head-shaped clearance while avoiding a mask during import.

`03-person.svg` contains both the body and head outlines so Icon Composer
treats the complete person as a single imported layer. For the current import
test, its artwork is baked at 96% scale around `(68, 50)` on the shared
`100 x 100` viewBox; no SVG transform is used. The visible outlines are filled
compound paths with transparent interiors, avoiding Icon Composer's clipping
of SVG stroke bounds.

`03-person-solid.svg` uses the exact outer boundaries of those outline paths,
so changing the layer's Image between appearance variants does not alter its
size or placement.
