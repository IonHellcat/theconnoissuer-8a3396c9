

## Problem

The visit dots are positioned using CSS percentage positioning on a `div` container, while the SVG map uses `viewBox="0 0 1000 500"` with `preserveAspectRatio="xMidYMid meet"`. This causes a mismatch:

1. **Aspect ratio mismatch**: The map SVG has a 2:1 aspect ratio (1000×500) but the container is not 2:1 (it's the full width × 200px). With `xMidYMid meet`, the SVG scales to fit and centers itself, leaving horizontal or vertical padding. The CSS `%`-positioned dots don't account for this padding — they're positioned relative to the full container, not the rendered SVG area.

2. **Solution**: Render the dots **inside the SVG** as `<circle>` elements using the same coordinate system (0–1000 x, 0–500 y), so they align perfectly with the land shapes regardless of container size or aspect ratio.

## Plan

**Single change — Render dots inside the SVG instead of as CSS-positioned divs**

- Modify `WorldMapSvg` to accept an optional `markers` prop: `Array<{ id: string; lat: number; lng: number; label?: string }>`.
- Render each marker as an SVG `<circle>` at `x = ((lng + 180) / 360) * 1000`, `y = ((90 - lat) / 180) * 500` — the same projection used for the land paths.
- Style the circles with fill color and a glow filter defined inside the SVG.
- In `VisitedPage.tsx`, pass the visit coordinates as the `markers` prop and remove the CSS-positioned `<div>` dots.
- Remove the wrapper `<div className="relative">` around the map since dot positioning is no longer CSS-based.

