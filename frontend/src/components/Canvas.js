import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Rect, Line, Group, Image as KonvaImage, Circle, Text } from 'react-konva';
import stoveSvg from './svgs/stove.svg';
import pipeStraightSvg from './svgs/pipe.svg';
import elbow90Svg from './svgs/90_opt.svg';
import elbow45Svg from './svgs/45_opt.svg';
import teeSvg from './svgs/tee.svg';
import chimneyTopStraightSvg from './svgs/pipe.svg';
import chimneyTopTeeSvg from './svgs/tee.svg';
import chimneyTop30Svg from './svgs/30_opt.svg';
import capSvg from './svgs/cap_opt.svg';

function useImg(src) {
  const [img, setImg] = useState(null);

  useEffect(() => {
    if (!src) return;
    const i = new window.Image();
    i.onload = () => setImg(i);
    i.src = src;
  }, [src]);

  return img;
}

// Renders an image tinted with a solid color by overlaying a rect with
// globalCompositeOperation="source-in" inside a cached group, so the tint
// only affects the image's opaque pixels.
function TintedImage({ image, x, y, width, height, tint, opacity = 0.9 }) {
  const groupRef = useRef(null);

  useEffect(() => {
    const node = groupRef.current;
    if (!node || !image) return;
    node.cache();
    node.getLayer()?.batchDraw();
  }, [image, x, y, width, height, tint, opacity]);

  if (!image) return null;

  return (
    <Group ref={groupRef} listening={false}>
      <KonvaImage image={image} x={x} y={y} width={width} height={height} opacity={opacity} />
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={tint}
        globalCompositeOperation="source-in"
      />
    </Group>
  );
}

export const UNIT = 60;
export const STAGE_W = 820;
export const STAGE_H = 510;
export const STOVE_W = UNIT * 2.4;
export const STOVE_H = UNIT * 2.4;
export const STOVE_X = STAGE_W / 2 - STOVE_W / 2 - UNIT;

const WALL_W = 24;
const WALL_X = STOVE_X + STOVE_W + UNIT * 1.5;
const FLOOR_H = 24;
const FLOOR_Y = STAGE_H - FLOOR_H;

export const STOVE_Y = FLOOR_Y - STOVE_H;
const ROOF_H = 28;                                       // slab thickness px
const ROOF_Y_OFFSET = 30;                               // roof shifted down for control clearance
const ROOF_LEFT_X = 0;                                  // fixed left end of roof aligned to left edge of canvas
export const ROOF_OUTDOOR_DEFAULT = UNIT * 1.5;                // default right overhang
export const WALL_TOP_DEFAULT = UNIT * 3;                     // starting wall top Y

// Slope angle in radians given wall top Y position
// The roof top-left is at (ROOF_LEFT_X, ROOF_Y_OFFSET); its bottom-edge must hit (WALL_X, wallTopY).
// slope = atan((wallTopY - ROOF_H - ROOF_Y_OFFSET) / (WALL_X - ROOF_LEFT_X))
function roofSlopeFromWallTop(wTopY) {
  return Math.atan((wTopY - ROOF_H - ROOF_Y_OFFSET) / (WALL_X - ROOF_LEFT_X));
}

// Y of roof TOP surface at a given canvas X for the current slope
function roofTopYAtCanvasX(canvasX, slope) {
  return Math.round(ROOF_Y_OFFSET + (canvasX - ROOF_LEFT_X) * Math.tan(slope));
}

const SNAP_PX = 40;
const END_SNAP_PX = 80;
// How close two bounding boxes must be (Manhattan edge distance, px) before
// their endpoints are even considered for a snap. Prevents distant parts from
// auto-attaching just because their endpoints happen to be in range.
const BOX_PROX_PX = 30;

function getItemSize(item) {
  const componentType = inferComponentType(item);
  if (componentType === 'pipe-straight' || componentType === 'chimney-straight') {
    // Straight parts are fixed to a 1x1 UNIT bonding box.
    return { w: UNIT, h: UNIT };
  }
  return { w: UNIT, h: UNIT };
}

function normalizeRotation(value) {
  return ((value % 360) + 360) % 360;
}

function inferComponentType(item) {
  if (item.componentType) return item.componentType;

  const lowerName = (item.name || '').toLowerCase();
  if (lowerName.includes('stove') || lowerName.includes('firestove')) return 'stove';
  if (lowerName.includes('cap')) return 'cap';
  if (lowerName.includes('chimney tee') || lowerName.includes('chimney top tee')) return 'chimney-tee';
  if (lowerName.includes('chimney straight') || lowerName.includes('chimney top straight') || lowerName === 'chimney') return 'chimney-straight';
  if (lowerName.includes('chimney 30') || lowerName.includes('chimney top 30') || lowerName.includes('30')) return 'chimney-30';
  if (lowerName.includes('tee')) return 'tee';
  if (lowerName.includes('45')) return 'elbow-45';
  if (item.type === 'Elbow') return 'elbow-90';
  return 'pipe-straight';
}

function getSvgKey(item) {
  const componentType = inferComponentType(item);

  if (componentType === 'cap') return 'cap';
  if (componentType === 'tee') return 'tee';
  if (componentType === 'chimney-tee') return 'chimney-tee';
  if (componentType === 'chimney-straight') return 'chimney-straight';
  if (componentType === 'chimney-30') return 'chimney-30';
  if (componentType === 'elbow-45') return 'elbow-45';
  if (componentType === 'elbow-90') return 'elbow-90';
  return 'pipe-straight';
}

function getEffectiveRotation(item) {
  // Canvas renders SVGs in their natural orientation (matching sidebar icons).
  // Any extra rotation is applied via the explicit `rotation` field set by the
  // user (rotate handle) or by sidebar templates.
  return item.rotation != null ? item.rotation : 0;
}

function getRotationStep(item) {
  if (typeof item.rotationStep === 'number') return item.rotationStep;

  const componentType = inferComponentType(item);
  if (componentType === 'chimney-30') return 30;
  if (componentType === 'elbow-45') return 45;
  // Straight pipes/chimneys rotate in 15° steps so 30° and 45° angles are reachable.
  if (componentType === 'pipe-straight' || componentType === 'chimney-straight') return 15;
  return 90;
}

function getSvgImageProps(item, w, h) {
  const svgKey = getSvgKey(item);

  if (svgKey === 'cap') {
    return { x: 0, y: 0, width: w, height: h };
  }

  if (svgKey === 'pipe-straight' || svgKey === 'chimney-straight') {
    // Straight SVG fills the local bonding box; length growth is carried by box width.
    return {
      x: 0,
      y: 0,
      width: w,
      height: h,
    };
  }

  if (svgKey === 'elbow-90') {
    // 90_opt.svg has inner whitespace; scale and shift into the bonding box.
    return {
      x: +0.10 * w,
      y: +0.18 * h,
      width: w * 1,
      height: h * 1,
    };
  }

  if (svgKey === 'elbow-45')
     // Path's input-stub bottom-center is at viewBox (6.688, 15.29) in a
     // (0, -0.5, 17, 17) viewBox. These offsets land that point at the cell's
     // bottom-center so it lines up with a vertical pipe's top-center after snap.
     return {
      x: +0.107 * w,
      y: +0.071 * h,
      width: w * 1,
      height: h * 1,
    };
  if (svgKey === 'chimney-30') {
    // Path's input-stub bottom-center is at viewBox (6.435, 14.941). Same
    // alignment goal as elbow-45.
    return {
      x: +0.121 * w,
      y: +0.092 * h,
      width: w * 1,
      height: h * 1,
    };
  }

  return { x: -1, y: -1, width: w + 2, height: h + 2 };
}

// Bounding-box polygon vertices per component, in unit space relative to the
// item's CENTER, BEFORE rotation. Default = 1x1 square. Angled elbows use a
// right triangle with the right-angle at bottom-right and the hypotenuse running
// from bottom-left to top-right (the 45-deg pipe path).
const DEFAULT_BBOX_SQUARE = [
  { x: -0.5, y: -0.5 },
  { x:  0.5, y: -0.5 },
  { x:  0.5, y:  0.5 },
  { x: -0.5, y:  0.5 },
];
// Triangle bbox for 45°/30° elbows. Right angle at bottom-left, bottom edge a
// full UNIT wide (x = -0.5 → 0.5) so a square pipe docking center-to-center on
// the input port aligns flush along the elbow's bottom. Hypotenuse runs from
// bottom-right to top-left and is shallower than the nominal 45°/30° (~43°/42°
// in canvas coords) — this is the tradeoff for keeping the bottom full-width
// inside a 1×1 unit cell. ENDPOINTS_BY_TYPE places the output port at the
// midpoint of this hypotenuse with outward dir perpendicular to it.
// Right-triangle bboxes filling the full unit cell (right-angle at bottom-left,
// hypotenuse from top-left corner to bottom-right corner). The 45° hypotenuse
// passes through the cell center at (0,0), so a unit-square pipe attached at
// the angled output (top edge or right edge of cell) shares only a boundary
// point with the triangle — SAT treats that as non-overlap, no need for a
// shrunken triangle.
const BBOX_SHAPES_BY_TYPE = {
  'elbow-45':   [{ x: -0.5, y:  0.5 }, { x:  0.5, y:  0.5 }, { x: -0.5, y: -0.5 }],
  'chimney-30': [{ x: -0.5, y:  0.5 }, { x:  0.5, y:  0.5 }, { x: -0.5, y: -0.5 }],
};

function getBboxShapeForType(componentType) {
  return BBOX_SHAPES_BY_TYPE[componentType] || DEFAULT_BBOX_SQUARE;
}

// Opening coordinates per component, in unit space relative to the item's
// CENTER. Each opening is represented by the 2 corner points of its visible
// pipe-edge (as drawn in the SVG, after imgProps offsets are applied):
//   pipe-straight: 2 ports × 2 corners = 4
//   elbow-90:      2 ports × 2 corners = 4
//   elbow-45/30:   2 ports × 2 corners = 4
//   tee/chimney-tee: 3 ports × 2 corners = 6
//   cap:            1 port  × 2 corners = 2
// y grows DOWN (canvas coords).
const ENDPOINTS_BY_TYPE = {
  // pipe.svg: vertical bar at viewBox x [173.67, 331.047] of [0, 503.607],
  // full height. Bar width = 31.3% of cell, centered.
  'pipe-straight': [
    { x: -0.155, y: -0.500 },   // top-left of bar
    { x:  0.157, y: -0.500 },   // top-right of bar
    { x:  0.157, y:  0.500 },   // bottom-right of bar
    { x: -0.155, y:  0.500 },   // bottom-left of bar
  ],
  'chimney-straight': [
    { x: -0.155, y: -0.500 },
    { x:  0.157, y: -0.500 },
    { x:  0.157, y:  0.500 },
    { x: -0.155, y:  0.500 },
  ],
  // 90_opt.svg with imgProps (0.10, 0.18). The L-shape's two arms extend from
  // the cell's bottom and right edges inward. Input port is the bottom edge
  // of the bottom arm; output port is the right edge of the right arm.
  'elbow-90': [
    { x: -0.152, y:  0.472 },   // bottom port: left corner
    { x:  0.160, y:  0.472 },   // bottom port: right corner
    { x:  0.473, y: -0.153 },   // right port: top corner
    { x:  0.473, y:  0.160 },   // right port: bottom corner
  ],
  // 45_opt.svg with imgProps (0.107, 0.071). Bottom-edge port from path
  // vertices (4.022, 15.29)→(9.354, 15.29) and angled-edge port from
  // (6.732, 8.736)→(10.502, 12.504).
  'elbow-45': [
    { x: -0.157, y:  0.500 },   // bottom port: left corner
    { x:  0.158, y:  0.500 },   // bottom port: right corner
    { x:  0.003, y:  0.114 },   // angled port: top corner
    { x:  0.225, y:  0.336 },   // angled port: bottom corner
  ],
  // 30_opt.svg with imgProps (0.121, 0.092). Bottom-edge port from
  // (3.77, 14.941)→(9.1, 14.941) and angled-edge port from
  // (5.693, 7.78)→(10.299, 10.44).
  'chimney-30': [
    { x: -0.157, y:  0.500 },   // bottom port: left corner
    { x:  0.156, y:  0.500 },   // bottom port: right corner
    { x: -0.044, y:  0.079 },   // angled port: top corner
    { x:  0.227, y:  0.236 },   // angled port: bottom corner
  ],
  // tee.svg: black vertical column (full height) + black horizontal strip at
  // bottom + grey rect extending past cell left (the 3rd arm). 3 ports at
  // LEFT (grey rect's left edge), TOP (vertical column's top), and BOTTOM
  // (horizontal strip's bottom) — 2 corners each.
  'tee': [
    { x: -0.517, y: -0.161 },   // left port: top corner
    { x: -0.517, y:  0.162 },   // left port: bottom corner
    { x: -0.160, y: -0.517 },   // top port: top-left
    { x:  0.163, y: -0.517 },   // top port: top-right
    { x: -0.194, y:  0.517 },   // bottom port: bottom-left
    { x:  0.194, y:  0.517 },   // bottom port: bottom-right
  ],
  'chimney-tee': [
    { x: -0.517, y: -0.161 },
    { x: -0.517, y:  0.162 },
    { x: -0.160, y: -0.517 },
    { x:  0.163, y: -0.517 },
    { x: -0.194, y:  0.517 },
    { x:  0.194, y:  0.517 },
  ],
  // cap_opt.svg has a small input stub at the bottom (path vertices at
  // y=16.489 in viewBox, x range [5.845, 11.155]).
  'cap': [
    { x: -0.156, y:  0.499 },   // stub bottom: left corner
    { x:  0.156, y:  0.499 },   // stub bottom: right corner
  ],
};

export function getItemWorldEndpoints(item) {
  const componentType = item.componentType || inferComponentType(item);
  const ep = ENDPOINTS_BY_TYPE[componentType] || [];
  const cx = (item.x ?? 0) + UNIT / 2;
  const cy = (item.y ?? 0) + UNIT / 2;
  const rad = ((item.rotation ?? 0) * Math.PI) / 180;
  const cR = Math.cos(rad), sR = Math.sin(rad);
  return ep.map((p, i) => ({
    x: cx + UNIT * (p.x * cR - p.y * sR),
    y: cy + UNIT * (p.x * sR + p.y * cR),
    // Outward unit vector at this port (rotated into world frame).
    dir: p.dir
      ? { x: p.dir.x * cR - p.dir.y * sR, y: p.dir.x * sR + p.dir.y * cR }
      : null,
    // Index into ENDPOINTS_BY_TYPE for this component — used by auto-rotate.
    intrinsicIdx: i,
  }));
}

// Port edges per component. Each edge connects two corner endpoints (by index
// into ENDPOINTS_BY_TYPE) and has an outward unit-vector `dir`. The diagonal
// edges of the 45° / 30° elbows are deliberately NOT listed here — they're
// handled with their own logic. Auto-snap matches edge-to-edge (anti-parallel
// dirs, midpoints close) so both corner dots couple at the joint.
const EDGES_BY_TYPE = {
  // pipe-straight endpoints: 0=top-L, 1=top-R, 2=bot-R, 3=bot-L
  'pipe-straight': [
    { c1: 0, c2: 1, dir: { x: 0, y: -1 } },   // top edge
    { c1: 3, c2: 2, dir: { x: 0, y:  1 } },   // bottom edge
  ],
  'chimney-straight': [
    { c1: 0, c2: 1, dir: { x: 0, y: -1 } },
    { c1: 3, c2: 2, dir: { x: 0, y:  1 } },
  ],
  // elbow-90 endpoints: 0=bot-L, 1=bot-R, 2=right-T, 3=right-B
  'elbow-90': [
    { c1: 0, c2: 1, dir: { x: 0, y:  1 } },   // bottom edge
    { c1: 2, c2: 3, dir: { x: 1, y:  0 } },   // right edge
  ],
  // elbow-45 endpoints: 0=bot-L, 1=bot-R, 2=angled-T, 3=angled-B
  // Only the BOTTOM edge is listed (diagonal output is handled elsewhere).
  'elbow-45': [
    { c1: 0, c2: 1, dir: { x: 0, y:  1 } },
  ],
  'chimney-30': [
    { c1: 0, c2: 1, dir: { x: 0, y:  1 } },
  ],
  // tee endpoints: 0=left-T, 1=left-B, 2=top-L, 3=top-R, 4=bot-L, 5=bot-R
  'tee': [
    { c1: 0, c2: 1, dir: { x: -1, y:  0 } },   // left edge
    { c1: 2, c2: 3, dir: { x:  0, y: -1 } },   // top edge
    { c1: 4, c2: 5, dir: { x:  0, y:  1 } },   // bottom edge
  ],
  'chimney-tee': [
    { c1: 0, c2: 1, dir: { x: -1, y:  0 } },
    { c1: 2, c2: 3, dir: { x:  0, y: -1 } },
    { c1: 4, c2: 5, dir: { x:  0, y:  1 } },
  ],
  // cap endpoints: 0=stub-L, 1=stub-R
  'cap': [
    { c1: 0, c2: 1, dir: { x: 0, y:  1 } },
  ],
};

// World-space port edges for an item: { p1, p2, mid, dir } in world coords,
// rotated by the item's rotation.
function getItemWorldEdges(item) {
  const componentType = item.componentType || inferComponentType(item);
  const edges = EDGES_BY_TYPE[componentType] || [];
  const eps = getItemWorldEndpoints(item);
  const rad = ((item.rotation ?? 0) * Math.PI) / 180;
  const cR = Math.cos(rad), sR = Math.sin(rad);
  return edges.map(e => {
    const p1 = eps[e.c1];
    const p2 = eps[e.c2];
    return {
      p1: { x: p1.x, y: p1.y },
      p2: { x: p2.x, y: p2.y },
      mid: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 },
      dir: { x: e.dir.x * cR - e.dir.y * sR, y: e.dir.x * sR + e.dir.y * cR },
    };
  });
}

// Diagonal-edge corner anchors per component (only 45° / 30° elbows have these).
// Each anchor is a corner of the diagonal port edge — these match a pipe's
// nearest corner directly (corner-to-corner), since a cardinal pipe edge
// cannot align with the diagonal in dir.
const DIAG_ANCHORS_BY_TYPE = {
  // elbow-45 endpoints index 2 (angled-top apex) and 3 (angled-bottom).
  'elbow-45': [
    { x:  0.003, y:  0.114 },   // top vertex of diagonal (the apex)
    { x:  0.225, y:  0.336 },   // bottom vertex of diagonal
  ],
  'chimney-30': [
    { x: -0.044, y:  0.079 },
    { x:  0.227, y:  0.236 },
  ],
};

// World-space diagonal anchors for an item, rotated by the item's rotation.
function getItemWorldDiagAnchors(item) {
  const componentType = item.componentType || inferComponentType(item);
  const anchors = DIAG_ANCHORS_BY_TYPE[componentType] || [];
  const cx = (item.x ?? 0) + UNIT / 2;
  const cy = (item.y ?? 0) + UNIT / 2;
  const rad = ((item.rotation ?? 0) * Math.PI) / 180;
  const cR = Math.cos(rad), sR = Math.sin(rad);
  return anchors.map(p => ({
    x: cx + UNIT * (p.x * cR - p.y * sR),
    y: cy + UNIT * (p.x * sR + p.y * cR),
  }));
}

// Stove SVG has internal padding; the visible top sits a bit below the bbox
// top. Pulling the snap edge up by STOVE_TOP_INSET aligns it with the visible
// flue opening. Negative = move up.
const STOVE_TOP_INSET = -32;

// Anchor points on the stove for the auto-numbering BFS (App.js only). These
// are used to decide which item is closest to the stove; not for snapping.
// Use the visible stove top (sy), NOT the snap axis (sy + STOVE_TOP_INSET):
// when a pipe snaps to the axis, its bottom corner sits 32 px above the
// visible top. Anchoring at the visible top keeps the start node correct
// whether the pipe snapped cleanly or is floating just above the stove.
export function getStoveEndpoints(sx, sy, sw, sh) {
  return [
    { x: sx + sw / 2, y: sy },
    { x: sx,          y: sy + sh / 2 },
    { x: sx + sw,     y: sy + sh / 2 },
  ];
}

// Stove snap targets are axis-locked EDGES, not points: when a pipe snaps to
// the top, only Y aligns (pipe is free to slide along X). When it snaps to a
// side, only X aligns (free to slide along Y). Each entry:
//   { axis: 'y' | 'x', value, range: [lo, hi] }
// 'axis' = which axis the snap LOCKS to `value`. The other axis must fall
// within `range` for the snap to count.
export function getStoveSnapTargets(sx, sy, sw, sh) {
  return [
    // Top edge: locks Y, X must be within the stove's horizontal span.
    { axis: 'y', value: sy + STOVE_TOP_INSET, range: [sx, sx + sw] },
    // Left edge: locks X, Y must be within the stove's vertical span.
    { axis: 'x', value: sx,                   range: [sy, sy + sh] },
    // Right edge: locks X.
    { axis: 'x', value: sx + sw,              range: [sy, sy + sh] },
  ];
}

// Manhattan edge-to-edge distance between two AABBs. 0 if they touch or overlap.
function bboxManhattan(a, b) {
  const gapX = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const gapY = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  return gapX + gapY;
}

// Convex-polygon overlap via Separating Axis Theorem. Touching edges (no
// interior intersection) count as NOT overlapping so two parts can dock flush.
function _projectOnAxis(poly, ax) {
  let min = Infinity, max = -Infinity;
  for (const v of poly) {
    const p = v.x * ax.x + v.y * ax.y;
    if (p < min) min = p;
    if (p > max) max = p;
  }
  return [min, max];
}
function polysOverlap(p1, p2) {
  // Tolerate sub-pixel overlap (in pixel units) so the SAT check doesn't
  // reject snaps that have a tiny offset from asymmetric SVG geometry —
  // e.g. an elbow's port midpoint landing 0.2 px off-center causing the
  // snapped pipe's bbox to barely clip a neighboring item's bbox.
  const EPS = 2;
  for (const poly of [p1, p2]) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const len = Math.hypot(b.y - a.y, b.x - a.x);
      if (len < 1e-9) continue;
      const ax = { x: -(b.y - a.y) / len, y: (b.x - a.x) / len };
      const [min1, max1] = _projectOnAxis(p1, ax);
      const [min2, max2] = _projectOnAxis(p2, ax);
      if (max1 <= min2 + EPS || max2 <= min1 + EPS) return false;
    }
  }
  return true;
}

// Axis-aligned bounding box of a polygon (used for the proximity gate).
function polyAABB(poly) {
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
  for (const v of poly) {
    if (v.x < xMin) xMin = v.x;
    if (v.x > xMax) xMax = v.x;
    if (v.y < yMin) yMin = v.y;
    if (v.y > yMax) yMax = v.y;
  }
  return { x: xMin, y: yMin, w: xMax - xMin, h: yMax - yMin };
}

// World-space polygon for an item, factoring its rotation. Triangle for angled
// elbows, square for everything else (default).
export function getItemWorldPoly(item) {
  const ct = item.componentType || inferComponentType(item);
  const shape = getBboxShapeForType(ct);
  const cx = (item.x ?? 0) + UNIT / 2;
  const cy = (item.y ?? 0) + UNIT / 2;
  const r = ((item.rotation ?? 0) * Math.PI) / 180;
  const cR = Math.cos(r), sR = Math.sin(r);
  return shape.map(p => ({
    x: cx + UNIT * (p.x * cR - p.y * sR),
    y: cy + UNIT * (p.x * sR + p.y * cR),
  }));
}

// Edge-based snap with bounding-box proximity gating and overlap rejection.
// Matches port edges between parts: anti-parallel outward dirs, midpoints
// close enough. Translation aligns the edge midpoints, so both corner dots
// of the matched edges couple at the joint.
// fixedList entries can carry either:
//   - { kind: 'item', bbox, edges, endpoints, poly } — port-edge snap
//   - { kind: 'axis', axis, value, range }           — 1D edge snap (stove)
function computeSnap(moving, fixedList, snapPx = SNAP_PX, boxProxPx = Math.max(BOX_PROX_PX, snapPx)) {
  let best = null;
  let bestD = snapPx;

  for (const f of fixedList) {
    if (f.kind === 'axis') {
      // Edge snap: lock one axis if any moving endpoint's free coord is within range.
      const lockAxis = f.axis;
      const free = lockAxis === 'y' ? 'x' : 'y';
      for (const m of moving.endpoints) {
        if (m[free] < f.range[0] || m[free] > f.range[1]) continue;
        const d = Math.abs(m[lockAxis] - f.value);
        if (d < bestD) {
          bestD = d;
          best = lockAxis === 'y'
            ? { dx: 0, dy: f.value - m.y, gx: m.x, gy: f.value }
            : { dx: f.value - m.x, dy: 0, gx: f.value, gy: m.y };
        }
      }
      continue;
    }

    // Edge-to-edge snap (with bbox proximity gating).
    if (bboxManhattan(moving.bbox, f.bbox) > boxProxPx) continue;
    for (const me of moving.edges || []) {
      for (const fe of f.edges || []) {
        // Dir-compatibility filter: edges only match if their outward
        // directions are anti-parallel (sum ≈ 0). Keeps a horizontal port
        // from snapping to a vertical port.
        const sx = me.dir.x + fe.dir.x;
        const sy = me.dir.y + fe.dir.y;
        if (Math.abs(sx) > 0.01 || Math.abs(sy) > 0.01) continue;
        const dx = fe.mid.x - me.mid.x;
        const dy = fe.mid.y - me.mid.y;
        const d = Math.hypot(dx, dy);
        if (d < bestD) {
          bestD = d;
          best = {
            dx, dy, gx: fe.mid.x, gy: fe.mid.y,
            target: f,
          };
        }
      }
    }

    // Diagonal-edge anchor snap: each anchor is a single corner on the
    // elbow's diagonal port. The pipe's nearest corner snaps to it
    // (corner-to-corner), since a cardinal pipe edge can't align with the
    // diagonal in dir. Used for "vertical pipe → 45° elbow → horizontal
    // pipe" type chains. Checked both directions: the elbow can be either
    // the moving item or the fixed one.
    for (const fa of f.diagAnchors || []) {
      for (const m of moving.endpoints || []) {
        const dx = fa.x - m.x;
        const dy = fa.y - m.y;
        const d = Math.hypot(dx, dy);
        if (d < bestD) {
          bestD = d;
          best = { dx, dy, gx: fa.x, gy: fa.y, target: f };
        }
      }
    }
    for (const ma of moving.diagAnchors || []) {
      for (const fp of f.endpoints || []) {
        const dx = fp.x - ma.x;
        const dy = fp.y - ma.y;
        const d = Math.hypot(dx, dy);
        if (d < bestD) {
          bestD = d;
          best = { dx, dy, gx: fp.x, gy: fp.y, target: f };
        }
      }
    }
  }

  if (!best) return { dx: 0, dy: 0, snapped: false, guideX: null, guideY: null };

  // Verify the snapped polygon doesn't overlap any OTHER fixed-item polygon.
  // The snap target itself is excluded — overlap there is the intended joint
  // (and post-rotation will resolve geometric overlap from a triangular bbox).
  const newPoly = moving.poly.map(p => ({ x: p.x + best.dx, y: p.y + best.dy }));
  for (const f of fixedList) {
    if (f.kind === 'axis') continue;
    if (f === best.target) continue;
    if (polysOverlap(newPoly, f.poly)) {
      return { dx: 0, dy: 0, snapped: false, guideX: null, guideY: null };
    }
  }
  return {
    dx: best.dx,
    dy: best.dy,
    snapped: true,
    guideX: best.gx,
    guideY: best.gy,
    movingEp: best.movingEp ?? null,
    fixedEp: best.fixedEp ?? null,
  };
}

// Build a snap entry for one item (kind: 'item'). Polygon is the (possibly
// triangular) collision shape used by SAT overlap. The proximity bbox is the
// full UNIT cell — using the smaller polygon AABB here would cause the gate
// to reject valid snaps for triangular elbows, since the triangle doesn't
// reach the cell edges.
function snapEntryForItem(item) {
  const poly = getItemWorldPoly(item);
  const { w, h } = getItemSize(item);
  return {
    kind: 'item',
    poly,
    bbox: { x: item.x ?? 0, y: item.y ?? 0, w, h },
    endpoints: getItemWorldEndpoints(item),
    edges: getItemWorldEdges(item),
    diagAnchors: getItemWorldDiagAnchors(item),
  };
}

// Compute the rotation (degrees) that the moving item must take so its endpoint
// at `intrinsicIdx` has world outward direction = -fixedDirWorld. Returns null
// if the moving componentType has no endpoints with `dir` set, or if the snap
// didn't match a directional endpoint, OR if the fixed dir is non-cardinal —
// pipes stay vertical/horizontal even when attaching to angled fitting outputs.
function computeAttachRotation(componentType, intrinsicIdx, fixedDirWorld) {
  if (!fixedDirWorld) return null;
  // Skip non-cardinal directions (e.g. the angled output of a 45°/30° elbow).
  // The simulation only consumes 'vertical' or 'horizontal' per pipe, so we
  // never want to auto-rotate a pipe to a 47°/42° hypotenuse-aligned angle.
  const dx = Math.abs(fixedDirWorld.x), dy = Math.abs(fixedDirWorld.y);
  const isCardinal = (dx < 0.001 && Math.abs(dy - 1) < 0.001) ||
                     (dy < 0.001 && Math.abs(dx - 1) < 0.001);
  if (!isCardinal) return null;
  const ep = ENDPOINTS_BY_TYPE[componentType];
  if (!ep || !ep[intrinsicIdx] || !ep[intrinsicIdx].dir) return null;
  const m = ep[intrinsicIdx].dir;            // intrinsic, before rotation
  const targetX = -fixedDirWorld.x;          // we want world outward = opposite
  const targetY = -fixedDirWorld.y;
  // Rotation that maps (m.x, m.y) -> (targetX, targetY): R = atan2(target) - atan2(m)
  const angleM      = Math.atan2(m.y, m.x);
  const angleTarget = Math.atan2(targetY, targetX);
  let deg = (angleTarget - angleM) * 180 / Math.PI;
  // Normalize to [0, 360).
  deg = ((deg % 360) + 360) % 360;
  return deg;
}

// Wrap each axis-locked stove target with kind: 'axis' so computeSnap can
// dispatch on it. The stove's targets come from getStoveSnapTargets above.
function snapEntriesForStove(sx, sy, sw, sh) {
  return getStoveSnapTargets(sx, sy, sw, sh).map(t => ({ kind: 'axis', ...t }));
}

const Canvas = ({
  items,
  setItems,
  selectedItemIndex,
  setSelectedItemIndex,
  showStoveMenu,
  setShowStoveMenu,
  hideTitle = false,
  readOnly = false,
  fullWidth = false,
  indoorTempF = '65',
  setIndoorTempF = () => {},
  outdoorTempF = '35',
  setOutdoorTempF = () => {},
  stoveX: controlledStoveX,
  onStoveXChange,
  roofOutdoorOverhang: controlledRoofOutdoorOverhang,
  onRoofOutdoorOverhangChange,
  wallTopY: controlledWallTopY,
  onWallTopYChange,
}) => {
  const [snapGuide, setSnapGuide] = useState(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [localStoveX, setLocalStoveX] = useState(STOVE_X);
  const stoveX = controlledStoveX ?? localStoveX;
  const roofOutdoorOverhang = controlledRoofOutdoorOverhang ?? ROOF_OUTDOOR_DEFAULT;
  const wallTopY = controlledWallTopY ?? WALL_TOP_DEFAULT;
  const setStoveXState = (next) => {
    if (typeof onStoveXChange === 'function') onStoveXChange(next);
    else setLocalStoveX(next);
  };
  const stoveNodeRef = useRef(null);
  const nodeRefs = useRef({});
  const dragState = useRef({});
  const stageWrapRef = useRef(null);
  const [stageScale, setStageScale] = useState(1);

  const stoveImg = useImg(stoveSvg);
  const pipeStraightImg = useImg(pipeStraightSvg);
  const elbow90Img = useImg(elbow90Svg);
  const elbow45Img = useImg(elbow45Svg);
  const teeImg = useImg(teeSvg);
  const chimneyTopStraightImg = useImg(chimneyTopStraightSvg);
  const chimneyTopTeeImg = useImg(chimneyTopTeeSvg);
  const chimneyTop30Img = useImg(chimneyTop30Svg);
  const capImg = useImg(capSvg);

  const svgImages = {
    stove: stoveImg,
    'pipe-straight': pipeStraightImg,
    'elbow-90': elbow90Img,
    'elbow-45': elbow45Img,
    tee: teeImg,
    'chimney-straight': chimneyTopStraightImg,
    'chimney-tee': chimneyTopTeeImg,
    'chimney-30': chimneyTop30Img,
    cap: capImg,
  };

  // Roof geometry kept for snap zones / outdoor classification (no longer rendered)
  const slope = roofSlopeFromWallTop(wallTopY);
  const roofRightX = WALL_X + WALL_W + roofOutdoorOverhang;
  const roofLen = roofRightX - ROOF_LEFT_X;
  const roofTopRight = roofTopYAtCanvasX(roofRightX, slope);
  const roofBotRight = roofTopRight + ROOF_H;
  const wallH = FLOOR_Y - wallTopY;

  useEffect(() => {
    const updateScale = () => {
      const wrap = stageWrapRef.current;
      if (!wrap) return;
      const availableWidth = wrap.clientWidth;
      if (!availableWidth) return;
      const nextScale = Math.min(1, availableWidth / STAGE_W);
      setStageScale(nextScale);
    };

    updateScale();

    const wrap = stageWrapRef.current;
    if (!wrap) return;

    let resizeObserver;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateScale());
      resizeObserver.observe(wrap);
    }

    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

  const computeIsOutdoor = useCallback((item) => {
    const { w, h } = getItemSize(item);
    const itemLeft = item.x || 0;
    const itemRight = itemLeft + w;
    const itemTop = item.y || 0;
    const roofYAtLeft = roofTopYAtCanvasX(itemLeft, slope);
    const roofYAtRight = roofTopYAtCanvasX(itemRight, slope);
    const wallRight = WALL_X + WALL_W;

    // If a part spans both indoor and outdoor sections, treat it as indoor.
    const spansBothSections = itemLeft < wallRight && itemRight > wallRight;
    if (spansBothSections) return false;

    return (itemLeft > wallRight) ||
      (itemTop + h < Math.min(roofYAtLeft, roofYAtRight));
  }, [slope]);

  useEffect(() => {
    setItems(prev => {
      let changed = false;
      const next = prev.map(item => {
        const isOutdoor = computeIsOutdoor(item);
        if (item.isOutdoor === isOutdoor) return item;
        changed = true;
        return { ...item, isOutdoor };
      });
      return changed ? next : prev;
    });
  }, [setItems, items, computeIsOutdoor]);

  const fixedBoxes = [
    { x: WALL_X, y: wallTopY, w: WALL_W, h: wallH },
    { x: 0, y: FLOOR_Y, w: STAGE_W, h: FLOOR_H },
    { x: ROOF_LEFT_X, y: ROOF_Y_OFFSET, w: roofLen, h: roofBotRight - ROOF_Y_OFFSET },
    { x: stoveX, y: STOVE_Y, w: STOVE_W, h: STOVE_H },
  ];

  const getLiveBox = (item, idx) => {
    const node = nodeRefs.current[idx];
    const { w, h } = getItemSize(item);

    return {
      id: idx,
      parentIdx: idx,
      x: node ? node.x() - w / 2 : (item.x || 0),
      y: node ? node.y() - h / 2 : (item.y || 0),
      w,
      h,
    };
  };

  const handleDragStart = (idx, e) => {
    setDraggingIdx(idx);
    dragState.current = {
      dragIdx: idx,
      lastX: e.target.x(),
      lastY: e.target.y(),
      dragStartY: e.target.y(),
      snap: null,
    };
  };

  const handleDragMove = (idx, e) => {
    const { w, h } = getItemSize(items[idx]);
    const cx = Math.max(w / 2, Math.min(STAGE_W - w / 2, e.target.x()));
    const cy = Math.max(h / 2, Math.min(STAGE_H - h / 2, e.target.y()));
    e.target.x(cx);
    e.target.y(cy);

    dragState.current.lastX = cx;
    dragState.current.lastY = cy;

    const movingItem = { ...items[idx], x: cx - w / 2, y: cy - h / 2 };
    const movingPoly = getItemWorldPoly(movingItem);
    const moving = {
      poly: movingPoly,
      bbox: { x: movingItem.x, y: movingItem.y, w, h },
      endpoints: getItemWorldEndpoints(movingItem),
      edges: getItemWorldEdges(movingItem),
      diagAnchors: getItemWorldDiagAnchors(movingItem),
    };
    const fixedList = [
      ...snapEntriesForStove(stoveX, STOVE_Y, STOVE_W, STOVE_H),
      ...items.flatMap((it, i) => i === idx ? [] : [snapEntryForItem(it)]),
    ];
    const snap = computeSnap(moving, fixedList);

    // Show snap guide while dragging — apply the snap only on release in handleDragEnd.
    dragState.current.snap = snap;
    setSnapGuide(snap.snapped ? { x: snap.guideX, y: snap.guideY } : null);
  };

  const handleDragEnd = (idx) => {
    const node = nodeRefs.current[idx];
    const targetItem = items[idx];

    // Always recompute snap on release with the stronger magnetic radius.
    let snap = null;
    if (node && targetItem) {
      const { w, h } = getItemSize(targetItem);
      const movingItem = { ...targetItem, x: node.x() - w / 2, y: node.y() - h / 2 };
      const movingPoly = getItemWorldPoly(movingItem);
      const moving = {
        poly: movingPoly,
        bbox: { x: movingItem.x, y: movingItem.y, w, h },
        endpoints: getItemWorldEndpoints(movingItem),
        edges: getItemWorldEdges(movingItem),
        diagAnchors: getItemWorldDiagAnchors(movingItem),
      };
      const fixedList = [
        ...snapEntriesForStove(stoveX, STOVE_Y, STOVE_W, STOVE_H),
        ...items.flatMap((it, i) => i === idx ? [] : [snapEntryForItem(it)]),
      ];
      snap = computeSnap(moving, fixedList, END_SNAP_PX);
    }

    // Auto-rotate the moving part if it's a pipe and it just docked against
    // a directional endpoint (angled fitting, or a pipe at non-cardinal rotation).
    let autoRotation = null;
    if (snap?.snapped && targetItem && snap.fixedEp?.dir && snap.movingEp) {
      const ct = targetItem.componentType || inferComponentType(targetItem);
      if (ct === 'pipe-straight' || ct === 'chimney-straight') {
        autoRotation = computeAttachRotation(ct, snap.movingEp.intrinsicIdx, snap.fixedEp.dir);
      }
    }

    if (snap?.snapped && node) {
      // If we're auto-rotating, the snap delta computed for the un-rotated pipe
      // would offset the (now-rotated) endpoint away from the fixed port. So
      // place the pipe's center such that its POST-rotation endpoint lands on
      // fixedEp exactly.
      if (autoRotation != null && targetItem) {
        const ct = targetItem.componentType || inferComponentType(targetItem);
        const epLocal = ENDPOINTS_BY_TYPE[ct]?.[snap.movingEp.intrinsicIdx];
        if (epLocal) {
          const rad = (autoRotation * Math.PI) / 180;
          const cR = Math.cos(rad), sR = Math.sin(rad);
          const offX = UNIT * (epLocal.x * cR - epLocal.y * sR);
          const offY = UNIT * (epLocal.x * sR + epLocal.y * cR);
          node.x(snap.fixedEp.x - offX);
          node.y(snap.fixedEp.y - offY);
        } else {
          node.x(node.x() + snap.dx);
          node.y(node.y() + snap.dy);
        }
      } else {
        node.x(node.x() + snap.dx);
        node.y(node.y() + snap.dy);
      }
    }

    if (node && targetItem) {
      const { w, h } = getItemSize(targetItem);
      setItems(prev => prev.map((item, i) => {
        if (i !== idx) return item;
        const nx = Math.max(0, Math.min(STAGE_W - w, node.x() - w / 2));
        const ny = Math.max(0, Math.min(STAGE_H - h, node.y() - h / 2));
        const movedItem = { ...item, x: nx, y: ny };
        if (autoRotation != null) {
          movedItem.rotation = autoRotation;
          // Also reflect this in the orientation field so the right-panel
          // dropdown stays in sync.
          if (autoRotation === 0) movedItem.orientation = 'vertical';
          else if (autoRotation === 90) movedItem.orientation = 'horizontal';
          else if (autoRotation === 45) movedItem.orientation = '45';
          else if (autoRotation === 30) movedItem.orientation = '30';
        }
        const isOutdoor = computeIsOutdoor(movedItem);

        if (item.ambientTempOverride) {
          return { ...movedItem, isOutdoor };
        }

        return {
          ...movedItem,
          isOutdoor,
        };
      }));
    }

    setSnapGuide(null);
    setDraggingIdx(null);
    dragState.current = {};
  };

  const handleRotate = (idx, stepOverride) => {
    const target = items[idx];
    if (!target) return;

    const step = stepOverride ?? getRotationStep(target);
    const nextRotation = normalizeRotation((target.rotation ?? getEffectiveRotation(target)) + step);

    // For straight pipes, sync `orientation` so the right-panel dropdown updates
    // and the simulation payload (which only consumes 'vertical'/'horizontal' per
    // part) reflects the new orientation. Elbows have their bend baked into
    // angle_deg by component type, so we don't touch their orientation here.
    const ct = target.componentType || inferComponentType(target);
    const isStraightPipe = ct === 'pipe-straight' || ct === 'chimney-straight';
    let nextOrientation = target.orientation;
    if (isStraightPipe) {
      const norm = nextRotation % 360;
      if (norm === 0 || norm === 180) nextOrientation = 'vertical';
      else if (norm === 90 || norm === 270) nextOrientation = 'horizontal';
      else if (norm === 30 || norm === 210) nextOrientation = '30';
      else if (norm === 45 || norm === 225) nextOrientation = '45';
      else {
        // Intermediate angle — classify by nearest cardinal so the simulation
        // gets a valid 'vertical' or 'horizontal'.
        const mod180 = norm % 180;
        nextOrientation = (mod180 > 45 && mod180 < 135) ? 'horizontal' : 'vertical';
      }
    }

    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      return { ...item, rotation: nextRotation, orientation: nextOrientation };
    }));

    const node = nodeRefs.current[idx];
    if (node) node.rotation(nextRotation);
  };

  const handleDropFromSidebar = (e) => {
    e.preventDefault();

    const itemData = e.dataTransfer.getData('item');
    if (!itemData) return;

    const item = JSON.parse(itemData);
    const stageCanvas = e.currentTarget.querySelector('canvas');
    const rect = stageCanvas
      ? stageCanvas.getBoundingClientRect()
      : e.currentTarget.getBoundingClientRect();

    const componentType = inferComponentType(item);
    const { w, h } = getItemSize({ ...item, componentType });
    const pointerX = (e.clientX - rect.left) / stageScale;
    const pointerY = (e.clientY - rect.top) / stageScale;
    const dropX = Math.max(0, Math.min(STAGE_W - w, pointerX - w / 2));
    const dropY = Math.max(0, Math.min(STAGE_H - h, pointerY - h / 2));

    const tentativeItem = {
      ...item,
      componentType,
      selectedDiameter: item.selectedDiameter || item.diameters?.[0] || '6',
      orientation: item.orientation || 'vertical',
      length: item.length ?? item.height ?? 3,
      height: item.height ?? item.length ?? 3,
      rotation: item.rotation != null ? item.rotation : getEffectiveRotation(item),
      rotationStep: item.rotationStep || 90,
      x: dropX,
      y: dropY,
    };

    const movingPoly = getItemWorldPoly(tentativeItem);
    const moving = {
      poly: movingPoly,
      bbox: { x: tentativeItem.x, y: tentativeItem.y, w, h },
      endpoints: getItemWorldEndpoints(tentativeItem),
      edges: getItemWorldEdges(tentativeItem),
      diagAnchors: getItemWorldDiagAnchors(tentativeItem),
    };
    const fixedList = [
      ...snapEntriesForStove(stoveX, STOVE_Y, STOVE_W, STOVE_H),
      ...items.map(it => snapEntryForItem(it)),
    ];
    const snap = computeSnap(moving, fixedList, END_SNAP_PX);

    // Determine auto-rotation for pipes docking on directional ports.
    let autoRotation = null;
    if (snap?.snapped && snap.fixedEp?.dir && snap.movingEp) {
      const ct = tentativeItem.componentType;
      if (ct === 'pipe-straight' || ct === 'chimney-straight') {
        autoRotation = computeAttachRotation(ct, snap.movingEp.intrinsicIdx, snap.fixedEp.dir);
      }
    }

    let snappedX = tentativeItem.x;
    let snappedY = tentativeItem.y;
    let finalRotation = tentativeItem.rotation;
    if (snap.snapped) {
      if (autoRotation != null) {
        // Position so the POST-rotation endpoint lands exactly on fixedEp.
        const epLocal = ENDPOINTS_BY_TYPE[tentativeItem.componentType]?.[snap.movingEp.intrinsicIdx];
        if (epLocal) {
          const rad = (autoRotation * Math.PI) / 180;
          const cR = Math.cos(rad), sR = Math.sin(rad);
          const offX = UNIT * (epLocal.x * cR - epLocal.y * sR);
          const offY = UNIT * (epLocal.x * sR + epLocal.y * cR);
          // node.x/y == center == item.x + UNIT/2
          snappedX = (snap.fixedEp.x - offX) - UNIT / 2;
          snappedY = (snap.fixedEp.y - offY) - UNIT / 2;
          finalRotation = autoRotation;
        } else {
          snappedX = tentativeItem.x + snap.dx;
          snappedY = tentativeItem.y + snap.dy;
        }
      } else {
        snappedX = tentativeItem.x + snap.dx;
        snappedY = tentativeItem.y + snap.dy;
      }
    }

    const newItemWithSnap = {
      ...tentativeItem,
      x: snappedX,
      y: snappedY,
      rotation: finalRotation,
    };
    if (autoRotation != null) {
      if (autoRotation === 0) newItemWithSnap.orientation = 'vertical';
      else if (autoRotation === 90) newItemWithSnap.orientation = 'horizontal';
      else if (autoRotation === 45) newItemWithSnap.orientation = '45';
      else if (autoRotation === 30) newItemWithSnap.orientation = '30';
    }

    const isOutdoor = computeIsOutdoor(newItemWithSnap);

    const newItem = {
      ...newItemWithSnap,
      isOutdoor,
    };

    setItems(prev => [...prev, newItem]);
  };

  const gridLines = [];
  for (let x = 0; x <= STAGE_W; x += UNIT) {
    gridLines.push(
      <Line
        key={`v${x}`}
        points={[x, 0, x, STAGE_H]}
        stroke="#c8cdd4"
        strokeWidth={0.5}
      />,
    );
  }
  for (let y = 0; y <= STAGE_H; y += UNIT) {
    gridLines.push(
      <Line
        key={`h${y}`}
        points={[0, y, STAGE_W, y]}
        stroke="#c8cdd4"
        strokeWidth={0.5}
      />,
    );
  }

  return (
    <div
      className="canvas"
      style={fullWidth ? { width: '100%', padding: 0 } : undefined}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDropFromSidebar}
    >
      {!hideTitle && <h2>Canvas</h2>}
      <div ref={stageWrapRef} style={{ position: 'relative', width: '100%', maxWidth: STAGE_W }}>
        <div
          style={{
            position: 'relative',
            width: STAGE_W * stageScale,
            height: STAGE_H * stageScale,
          }}
        >
        <Stage
          width={STAGE_W * stageScale}
          height={STAGE_H * stageScale}
          scaleX={stageScale}
          scaleY={stageScale}
          style={{ display: 'block' }}
          onClick={e => {
            if (e.target === e.target.getStage()) setSelectedItemIndex(null);
          }}
        >
        <Layer>{gridLines}</Layer>

        <Layer listening={false}>
          <Rect x={0} y={0} width={STAGE_W} height={STAGE_H} fill="#f0f2f5" />
        </Layer>

        <Layer>
          {snapGuide?.x != null && snapGuide?.y != null && (
            <Circle
              x={snapGuide.x}
              y={snapGuide.y}
              radius={6}
              stroke="#0088cc"
              strokeWidth={2}
              listening={false}
            />
          )}
        </Layer>

        <Layer>
          {/* Stove */}
          <Group
            x={stoveX}
            y={STOVE_Y}
            draggable
            ref={node => { stoveNodeRef.current = node; }}
            onDragMove={(e) => {
              const nx = Math.max(0, Math.min(WALL_X - STOVE_W, e.target.x()));
              e.target.position({ x: nx, y: STOVE_Y });
            }}
            onDragEnd={(e) => {
              const nx = Math.max(0, Math.min(WALL_X - STOVE_W, e.target.x()));
              e.target.position({ x: nx, y: STOVE_Y });
              setStoveXState(nx);
            }}
            onClick={() => setShowStoveMenu(!showStoveMenu)}
          >
            <Rect
              x={0}
              y={0}
              width={STOVE_W}
              height={STOVE_H}
              fill="rgba(0,0,0,0.001)"
            />
            {stoveImg && (
              <KonvaImage
                image={stoveImg}
                x={0}
                y={0}
                width={STOVE_W}
                height={STOVE_H}
                opacity={0.9}
                listening={false}
              />
            )}
          </Group>


        </Layer>

        <Layer>

          {items.map((item, idx) => {
            const isSelected = selectedItemIndex === idx;
            const isDragging = draggingIdx === idx;
            const componentType = inferComponentType(item);
            const isChimneyTop = componentType.startsWith('chimney-');
            const isCap = componentType === 'cap';
            const { w, h } = getItemSize(item);
            const cx = (item.x || 0) + w / 2;
            const cy = (item.y || 0) + h / 2;
            const effectiveRotation = getEffectiveRotation(item);
            const key = getSvgKey(item);
            const img = svgImages[key];
            const imgProps = getSvgImageProps(item, w, h);

            const liveNode = isDragging ? nodeRefs.current[idx] : null;
            const liveX = liveNode ? (liveNode.x() - w / 2) : (item.x || 0);
            const liveY = liveNode ? (liveNode.y() - h / 2) : (item.y || 0);
            const isOutdoor = computeIsOutdoor({ ...item, x: liveX, y: liveY });

            return (
              <Group
                key={idx}
                draggable
                ref={node => {
                  if (node) nodeRefs.current[idx] = node;
                }}
                x={cx}
                y={cy}
                offsetX={w / 2}
                offsetY={h / 2}
                rotation={effectiveRotation}
                onDragStart={e => handleDragStart(idx, e)}
                onDragMove={e => handleDragMove(idx, e)}
                onDragEnd={() => handleDragEnd(idx)}
                onClick={e => {
                  e.cancelBubble = true;
                  setSelectedItemIndex(isSelected ? null : idx);
                }}
                onDblClick={e => {
                  e.cancelBubble = true;
                  handleRotate(idx, 90);
                }}
                onDblTap={e => {
                  e.cancelBubble = true;
                  handleRotate(idx, 90);
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {(() => {
                  const strokeColor = isOutdoor
                    ? '#888'
                    : isSelected
                      ? (isChimneyTop ? '#059669' : '#2563eb')
                      : (isChimneyTop ? '#6ee7b7' : '#94a3b8');
                  const dash = isDragging ? [6, 4] : undefined;
                  const sw = isSelected ? 2 : 1;
                  const shape = getBboxShapeForType(componentType);
                  if (shape !== DEFAULT_BBOX_SQUARE) {
                    // Triangle (or any non-rectangular) bbox — render as a polygon
                    // for the visible outline, plus an invisible full-cell rect
                    // so hover/click hit detection covers the full UNIT cell
                    // (otherwise the rotate "R" button at the top-right corner
                    // sits outside the triangle and disappears on mouse-out).
                    const points = shape.flatMap(p => [(p.x + 0.5) * w, (p.y + 0.5) * h]);
                    return (
                      <>
                        <Rect
                          x={0}
                          y={0}
                          width={w}
                          height={h}
                          fill="rgba(0,0,0,0)"
                        />
                        <Line
                          points={points}
                          closed
                          fill="rgba(0,0,0,0)"
                          stroke={strokeColor}
                          strokeWidth={sw}
                          dash={dash}
                        />
                      </>
                    );
                  }
                  return (
                    <Rect
                      x={0}
                      y={0}
                      width={w}
                      height={h}
                      fill="rgba(0,0,0,0)"
                      stroke={strokeColor}
                      strokeWidth={sw}
                      dash={dash}
                      cornerRadius={1}
                    />
                  );
                })()}


                {img && (
                  isChimneyTop ? (
                    <TintedImage
                      key={`img-${idx}-${isOutdoor}`}
                      image={img}
                      x={imgProps.x}
                      y={imgProps.y}
                      width={imgProps.width}
                      height={imgProps.height}
                      tint="#363b458d"
                      opacity={0.9}
                    />
                  ) : isCap ? (
                    <TintedImage
                      key={`img-${idx}-cap`}
                      image={img}
                      x={imgProps.x}
                      y={imgProps.y}
                      width={imgProps.width}
                      height={imgProps.height}
                      tint="#363b458d"
                      opacity={0.9}
                    />
                  ) : (
                    <KonvaImage
                      key={`img-${idx}-${isOutdoor}`}
                      image={img}
                      x={imgProps.x}
                      y={imgProps.y}
                      width={imgProps.width}
                      height={imgProps.height}
                      rotation={imgProps.rotation || 0}
                      offsetX={imgProps.offsetX || 0}
                      offsetY={imgProps.offsetY || 0}
                      opacity={0.9}
                      listening={false}
                    />
                  )
                )}


                {item.angleLabel && (
                  // Anchor sits in the part's local frame, so the label moves
                  // with the rotation. The Text rotates -effectiveRotation
                  // around its own center (offset = ~half text size) so the
                  // glyphs stay upright at the rotated anchor position.
                  <Text
                    x={11}
                    y={h - 13}
                    offsetX={7}
                    offsetY={5}
                    rotation={-effectiveRotation}
                    text={item.angleLabel}
                    fill="#333"
                    fontSize={10}
                    listening={false}
                  />
                )}

                {typeof item.sequenceOrder === 'number' && (
                  <Group
                    x={w / 2}
                    y={h / 2}
                    offsetX={w / 2}
                    offsetY={h / 2}
                    rotation={-effectiveRotation}
                    listening={false}
                  >
                    <Circle
                      x={10}
                      y={h - 10}
                      radius={10}
                      fill="#ffeb3b"
                      stroke="#111"
                      strokeWidth={2}
                    />
                    <Text
                      x={0}
                      y={h - 18}
                      width={20}
                      height={16}
                      text={String(item.sequenceOrder)}
                      fill="#111"
                      fontStyle="bold"
                      fontSize={12}
                      align="center"
                      verticalAlign="middle"
                      listening={false}
                    />
                  </Group>
                )}


              </Group>
            );
          })}
        </Layer>
      </Stage>

      </div>
      </div>

      {!readOnly && (
        <p style={{ marginTop: 8, marginBottom: 0, color: '#334155', fontSize: 12, fontWeight: 700, textAlign: 'center', lineHeight: 1.4 }}>
          Drag parts from the sidebar. Double-click part to rotate.<br />
          Tip: Parts are numbered automatically when you click Finalize Design, starting at the stove. To override a number, select the part and edit Part Number on the right.
        </p>
      )}
    </div>
  );
};

export default Canvas;
