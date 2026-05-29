import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import lblLogo from './assets/lbl_logo.png';
import Sidebar from './components/Sidebar';
import Canvas, {
  UNIT as CANVAS_UNIT,
  STOVE_X as CANVAS_STOVE_X,
  STOVE_Y as CANVAS_STOVE_Y,
  STOVE_W as CANVAS_STOVE_W,
  STOVE_H as CANVAS_STOVE_H,
  ROOF_OUTDOOR_DEFAULT,
  WALL_TOP_DEFAULT,
  getItemWorldEndpoints,
  getStoveEndpoints,
} from './components/Canvas';
import Output from './components/Output';
import Settings from './components/Settings';
import ResultsPanel from './components/ResultsPanel';
import { API } from './config/api';

// Update this string when shipping a new build.
const LAST_UPDATED = '2026-05-05';

// Single door schedule used by every fire profile: door is wide open until
// 1:30, cracks to 15% (~2 in opening) at 1:35, holds, then closes fully at 3:00.
// Each profile differs only in its inlet-temp curve.
const DEFAULT_DOOR_SCHEDULE = [
  [0,   100],
  [90,  100],
  [95,  15],
  [175, 15],
  [180, 0],
];

// Inlet-temperature profiles below are sampled from the canonical 3-phase fire
// curves in flued_dynamics/notebooks/default_fire_curves.ipynb (power-law rise
// -> fast exponential drop -> slow exponential tail). Each profile shares the
// same shape; only T_max, rise duration, and tail temperatures differ.
//   Medium <- normal_start (peak 600 C @ 3.9 min, settles to 420 C)
//   Fast   <- hot_start    (peak 700 C @ 3.4 min, settles to 450 C)
//   Slow   <- cool_start   (peak 400 C @ 4.4 min, settles to 280 C)
// Values are in Kelvin; gas starts at ambient (20 C = 293 K) before kindling.
const FIRE_PROFILES = {
  balanced: {
    label: 'Medium',
    doorSchedule: DEFAULT_DOOR_SCHEDULE,
    inletTempProfile: [
      [0,    293],
      [60,   293],
      [84,   293],
      [120,  310],
      [234,  873],
      [264,  752],
      [330,  724],
      [390,  717],
      [480,  710],
      [600,  703],
      [900,  696],
      [1200, 694],
      [1800, 693],
    ],
  },
  high_output: {
    label: 'Fast',
    doorSchedule: DEFAULT_DOOR_SCHEDULE,
    inletTempProfile: [
      [0,    293],
      [60,   293],
      [84,   293],
      [120,  327],
      [204,  973],
      [234,  811],
      [300,  774],
      [360,  763],
      [480,  747],
      [600,  738],
      [900,  727],
      [1200, 724],
      [1800, 723],
    ],
  },
  long_burn: {
    label: 'Slow',
    doorSchedule: DEFAULT_DOOR_SCHEDULE,
    inletTempProfile: [
      [0,    293],
      [60,   293],
      [84,   293],
      [120,  300],
      [264,  673],
      [294,  592],
      [360,  574],
      [420,  569],
      [480,  566],
      [600,  561],
      [900,  555],
      [1200, 554],
      [1800, 553],
    ],
  },
};

function App() {

  const [activeTab, setActiveTab] = useState('workspace');
  const [canvasItems, setCanvasItems] = useState([]);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [showComponentList, setShowComponentList] = useState(false);
  const [showStoveMenu, setShowStoveMenu] = useState(false);
  const [doorAngle, setDoorAngle] = useState(0);
  const [payloadText, setPayloadText] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [resultUnits, setResultUnits] = useState('imperial');
  const [indoorTempF, setIndoorTempF] = useState('65');
  const [outdoorTempF, setOutdoorTempF] = useState('35');
  const [elevationFt, setElevationFt] = useState('0');
  const [outputError, setOutputError] = useState(null);
  const [outputStatus, setOutputStatus] = useState(null);
  const [selectedFireProfile, setSelectedFireProfile] = useState('balanced');
  const [stoveX, setStoveX] = useState(CANVAS_STOVE_X);
  const [roofOutdoorOverhang, setRoofOutdoorOverhang] = useState(ROOF_OUTDOOR_DEFAULT);
  const [wallTopY, setWallTopY] = useState(WALL_TOP_DEFAULT);

  // Invalidate cached results whenever any simulation input changes so the
  // user can't view stale results that no longer match the current design.
  // Skip the very first render so a result loaded at mount (e.g. MOCK_RESULT)
  // isn't cleared before the user sees it.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (lastResult) {
      setLastResult(null);
      setShowResults(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canvasItems,
    selectedFireProfile,
    elevationFt,
    indoorTempF,
    outdoorTempF,
    stoveX,
    roofOutdoorOverhang,
    wallTopY,
  ]);

  const handleCalculateSuccess = (data) => {
    setLastResult(data);
    setShowResults(true);
    setOutputError(null);
    setOutputStatus(null);
  };

  const runSimulation = async (payload) => {
    const response = await fetch(API.simulate, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || JSON.stringify(data));
    if (data && data.ok === false) {
      throw new Error(data.error || data.detail || 'Simulation failed');
    }

    console.group('[simulate] backend response');
    console.log('ul103_risk:', data.ul103_risk);
    console.log('backdraft_risk:', data.backdraft_risk);
    console.log('max_static_pressure_ss_Pa:', data.max_static_pressure_ss_Pa);
    console.log('max_temperature_ss_C:', data.max_temperature_ss_C);
    console.log('static_pressure_plot:', data.static_pressure_plot);
    console.log('temperature_plot:', data.temperature_plot);
    console.log('full payload:', data);
    console.groupEnd();

    handleCalculateSuccess(data);
    return data;
  };

  // Parse the current JSON payload, apply changes to parts[index], re-serialize
  const updatePayloadPart = (index, changes) => {
    setPayloadText(prev => {
      if (!prev.trim()) return prev;
      try {
        const config = JSON.parse(prev);
        if (!config.parts || config.parts[index] === undefined) return prev;
        config.parts = config.parts.map((p, i) => i === index ? { ...p, ...changes } : p);
        return JSON.stringify(config, null, 2);
      } catch {
        return prev; // leave unchanged if JSON is invalid
      }
    });
  };

  const handleDiametersChange = (index, selectedOptions) => {
    const newDiameters = Array.from(selectedOptions, option => option.value);
    const newItems = [...canvasItems];
    newItems[index].diameters = newDiameters;
    newItems[index].selectedDiameter = newDiameters[0];
    setCanvasItems(newItems);
    updatePayloadPart(index, { inner_diameter_ft: parseFloat(newDiameters[0]) / 12 });
  };

  const ORIENTATION_TO_ROTATION = {
    'vertical': 0,
    'horizontal': 90,
    '30': 30,
    '45': 45,
  };

  const handleOrientationChange = (index, selectedOption) => {
    setCanvasItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, orientation: selectedOption };
      if (item.componentType === 'pipe-straight' || item.componentType === 'chimney-straight') {
        updated.rotation = ORIENTATION_TO_ROTATION[selectedOption] ?? 0;
      }
      return updated;
    }));
    updatePayloadPart(index, { orientation: selectedOption });
  };

  // Build the orientation dropdown options for a pipe based on whether it's
  // touching a 30°/45° elbow (endpoint-adjacent). Vertical/Horizontal always
  // show; angled options appear only when the geometry calls for them.
  const getAvailableOrientations = (item) => {
    if (!item) return [];
    if (item.componentType !== 'pipe-straight' && item.componentType !== 'chimney-straight') {
      return [];
    }
    const EP_TOL = 8;
    const itemEPs = getItemWorldEndpoints(item);
    const opts = [
      { value: 'vertical',   label: 'Vertical' },
      { value: 'horizontal', label: 'Horizontal' },
    ];
    let has45 = false, has30 = false;
    for (const other of canvasItems) {
      if (other === item) continue;
      const ct = other.componentType;
      if (ct !== 'elbow-45' && ct !== 'chimney-30') continue;
      const otherEPs = getItemWorldEndpoints(other);
      const touching = itemEPs.some(p => otherEPs.some(q =>
        Math.hypot(p.x - q.x, p.y - q.y) <= EP_TOL
      ));
      if (touching) {
        if (ct === 'elbow-45') has45 = true;
        if (ct === 'chimney-30') has30 = true;
      }
    }
    if (has30) opts.push({ value: '30', label: '30°' });
    if (has45) opts.push({ value: '45', label: '45°' });
    return opts;
  };

  const handleHeightChange = (index, selectedValue) => {
    const parsed = parseFloat(selectedValue);
    const newItems = [...canvasItems];
    // Keep both keys for backward compatibility; Canvas prefers `length`.
    newItems[index].length = parsed;
    newItems[index].height = parsed;
    setCanvasItems(newItems);
    updatePayloadPart(index, { height_ft: parsed });
  };

  const handleAmbientTempChange = (index, selectedValue) => {
    const trimmed = String(selectedValue).trim();
    const parsed = trimmed === '' ? undefined : Number(trimmed);

    setCanvasItems(prev => prev.map((item, i) => {
      if (i !== index) return item;

      // Empty/invalid input -> blank (user must specify before Finalize).
      if (parsed == null || Number.isNaN(parsed)) {
        return {
          ...item,
          ambientTempF: undefined,
          ambientTempOverride: false,
        };
      }

      return {
        ...item,
        ambientTempF: parsed,
        ambientTempOverride: true,
      };
    }));
  };

  const handleSequenceOrderChange = (index, selectedValue) => {
    const trimmed = String(selectedValue).trim();
    const parsed = trimmed === '' ? undefined : Number(trimmed);

    setCanvasItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (parsed == null || Number.isNaN(parsed) || parsed < 1) {
        const { sequenceOrder, manualSequenceOrder, ...rest } = item;
        return rest;
      }
      const n = Math.round(parsed);
      return { ...item, sequenceOrder: n, manualSequenceOrder: n };
    }));
  };

  const handleDelete = (index) => {
    const removedSequence = canvasItems[index]?.sequenceOrder;

    setCanvasItems(prev => prev
      .filter((_, i) => i !== index)
      .map(item => {
        if (typeof removedSequence !== 'number') return item;
        const updated = { ...item };
        if (typeof item.sequenceOrder === 'number' && item.sequenceOrder > removedSequence) {
          updated.sequenceOrder = item.sequenceOrder - 1;
        }
        if (typeof item.manualSequenceOrder === 'number' && item.manualSequenceOrder > removedSequence) {
          updated.manualSequenceOrder = item.manualSequenceOrder - 1;
        }
        return updated;
      }));

    if (selectedItemIndex === index) {
      setSelectedItemIndex(null);
    } else if (selectedItemIndex > index) {
      setSelectedItemIndex(selectedItemIndex - 1);
    }
  };

  const handleClearDesign = () => {
    setCanvasItems([]);
    setSelectedItemIndex(null);
    setShowComponentList(false);
    setPayloadText('');
    setLastResult(null);
    setShowResults(false);
    setOutputError(null);
    setOutputStatus(null);
  };

  const handlePresetSelect = (config) => {
    const UNIT   = CANVAS_UNIT;
    const parts  = config.parts  || [];
    const elbows = config.elbows || [];

    // Map partIndex → the elbow just before it (between_parts[1] === partIndex)
    const elbowBefore = {};
    elbows.forEach(e => { elbowBefore[e.between_parts[1]] = e; });

    // Build interleaved sequence: [fitting-before-0, pipe-0, fitting-before-1, pipe-1, ...]
    const sequence = [];
    if (elbowBefore[0]) sequence.push({ kind: 'elbow', data: elbowBefore[0] });
    parts.forEach((part, idx) => {
      sequence.push({ kind: 'pipe', data: part });
      if (elbowBefore[idx + 1]) sequence.push({ kind: 'elbow', data: elbowBefore[idx + 1] });
    });

    // "After direction" for item i = direction of travel leaving item i.
    // Pipes use their own orientation; fittings inherit from the next pipe.
    const getAfterDir = (i) => {
      for (let j = i; j < sequence.length; j++) {
        if (sequence[j].kind === 'pipe')
          return sequence[j].data.orientation === 'horizontal' ? 'right' : 'up';
      }
      return 'up';
    };

    // Start cursor: one cell directly above the stove, horizontally centred on it
    let cursorX = Math.round(CANVAS_STOVE_X + CANVAS_STOVE_W / 2 - UNIT / 2);
    let cursorY = CANVAS_STOVE_Y - UNIT;

    const newItems = [];

    sequence.forEach(({ kind, data }, i) => {
      const rawDiam    = data.inner_diameter_ft || data.diameter_ft || 0.5;
      const diamInches = Math.round(rawDiam * 12);
      const afterDir   = getAfterDir(i);
      const beforeDir  = i === 0 ? 'up' : getAfterDir(i - 1);

      if (kind === 'pipe') {
        newItems.push({
          name:             data._name || 'Stove Pipe',
          type:             'Pipe',
          componentType:    'pipe-straight',
          diameters:        [String(diamInches)],
          selectedDiameter: String(diamInches),
          orientation:      afterDir === 'right' ? 'horizontal' : 'vertical',
          length:           data.height_ft || 3,
          height:           data.height_ft || 3,
          // pipe.svg is horizontal; rotate 90° so vertical pipes appear upright
          rotation:         afterDir === 'up' ? 90 : 0,
          rotationStep:     90,
          x: cursorX,
          y: cursorY,
        });
      } else {
        const isTee = data.type === 'tee';
        const angleDeg = Number(data.angle_deg) || 90;
        const isFortyFive = !isTee && angleDeg === 45;
        // Rotation so the fitting visually matches the flow:
        //   tee  up→up    = -90°   tee  right→up  = -90° + 90° = 0°
        //   elbow up→right = 90°   elbow right→up  = 90° + 90° = 180°
        let rotation = isTee ? -90 : 90;
        if ( isTee && beforeDir === 'right')                       rotation = 0;
        if (!isTee && beforeDir === 'right' && afterDir === 'up')  rotation = 180;
        newItems.push({
          name:             isTee ? 'Tee' : (isFortyFive ? 'Elbow 45°' : 'Elbow 90°'),
          type:             'Elbow',
          componentType:    isTee ? 'tee' : (isFortyFive ? 'elbow-45' : 'elbow-90'),
          diameters:        [String(diamInches)],
          selectedDiameter: String(diamInches),
          orientation:      beforeDir === 'right' ? 'horizontal' : 'vertical',
          height:           data.height_ft || data.vertical_length_ft || 1,
          rotation,
          rotationStep:     isFortyFive ? 45 : 90,
          angleLabel:       isFortyFive ? '45°' : undefined,
          x: cursorX,
          y: cursorY,
        });
      }

      // Advance cursor one grid cell in the outgoing direction
      if (afterDir === 'up') cursorY -= UNIT;
      else                   cursorX += UNIT;
    });

    setCanvasItems(newItems);
    setSelectedItemIndex(null);
    setShowComponentList(false);
    setPayloadText(JSON.stringify(config, null, 2));
  };

  const handleDoorAngleChange = (angle) => {
    setDoorAngle(angle);
  };

  const hasParts = canvasItems.length > 0;
  const canFinalizeDesign = hasParts;

  // Auto-number parts by walking the endpoint-connectivity graph from the stove.
  // Two items are connected iff one of their world endpoints sits within EP_TOL of
  // an endpoint of the other. Cap is pinned to the very last position. Items with
  // a manual `sequenceOrder` keep that number; remaining items fill the gaps in
  // visit order.
  const autoNumberItems = (items) => {
    const N = items.length;
    if (N === 0) return items;

    const EP_TOL = 8; // px tolerance for "endpoints touch"
    const itemEPs = items.map(it => getItemWorldEndpoints(it));
    const stoveEPs = getStoveEndpoints(
      stoveX, CANVAS_STOVE_Y, CANVAS_STOVE_W, CANVAS_STOVE_H,
    );

    const close = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) <= EP_TOL;

    // Build adjacency between items.
    const adj = items.map(() => new Set());
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const touching = itemEPs[i].some(p => itemEPs[j].some(q => close(p, q)));
        if (touching) {
          adj[i].add(j);
          adj[j].add(i);
        }
      }
    }

    // Find item(s) whose endpoint touches a stove endpoint. Pick the closest as start.
    let start = -1;
    let startD = Infinity;
    for (let i = 0; i < N; i++) {
      for (const ep of itemEPs[i]) {
        for (const sep of stoveEPs) {
          const d = Math.hypot(ep.x - sep.x, ep.y - sep.y);
          if (d < startD) { startD = d; start = i; }
        }
      }
    }

    // BFS from start in path order. Within each adjacency expansion, prefer
    // non-cap successors so the cap is naturally visited last.
    const visited = new Array(N).fill(false);
    const order = [];
    if (start >= 0) {
      const queue = [start];
      visited[start] = true;
      while (queue.length) {
        const cur = queue.shift();
        order.push(cur);
        const successors = [...adj[cur]].filter(j => !visited[j]);
        successors.sort((a, b) => {
          const aCap = items[a].componentType === 'cap';
          const bCap = items[b].componentType === 'cap';
          if (aCap !== bCap) return aCap ? 1 : -1;
          return 0;
        });
        for (const nxt of successors) {
          visited[nxt] = true;
          queue.push(nxt);
        }
      }
    }

    // Append any orphans (parts not reached by the walk). Cap pinned to the
    // very end if it didn't come up naturally.
    for (let i = 0; i < N; i++) {
      if (!visited[i]) order.push(i);
    }
    const capOrderIdx = order.findIndex(i => items[i].componentType === 'cap');
    if (capOrderIdx >= 0 && capOrderIdx !== order.length - 1) {
      const [capIdx] = order.splice(capOrderIdx, 1);
      order.push(capIdx);
    }

    // The cap is always pinned to the last position (N), overriding any manual
    // override the user may have typed. Other parts' user-typed manual numbers
    // stay put; auto-assigned numbers from a previous Finalize are recomputed.
    const capItemIdx = items.findIndex(it => it.componentType === 'cap');

    const reserved = new Set();
    items.forEach((it, i) => {
      if (i === capItemIdx) return;
      if (Number.isFinite(it.manualSequenceOrder) && it.manualSequenceOrder !== N) {
        reserved.add(it.manualSequenceOrder);
      }
    });
    if (capItemIdx >= 0) reserved.add(N);

    const assigned = new Map();
    let next = 1;
    for (const i of order) {
      if (i === capItemIdx) continue;
      if (Number.isFinite(items[i].manualSequenceOrder) && items[i].manualSequenceOrder !== N) continue;
      while (reserved.has(next)) next += 1;
      assigned.set(i, next);
      next += 1;
    }
    if (capItemIdx >= 0) assigned.set(capItemIdx, N);

    return items.map((item, i) => {
      if (i === capItemIdx) return { ...item, sequenceOrder: N };
      if (Number.isFinite(item.manualSequenceOrder) && item.manualSequenceOrder !== N) {
        return { ...item, sequenceOrder: item.manualSequenceOrder };
      }
      return assigned.has(i) ? { ...item, sequenceOrder: assigned.get(i) } : item;
    });
  };

  const handleFinalizeDesign = async () => {
    setOutputError(null);
    setOutputStatus(null);
    setSelectedItemIndex(null);

    if (canvasItems.length === 0) {
      setOutputError('No parts on the canvas.');
      return;
    }

    const numberedItems = autoNumberItems(canvasItems);
    setCanvasItems(numberedItems);

    const orderedForValidation = [...numberedItems].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const partItemsForValidation = orderedForValidation.filter(
      item => item.componentType === 'pipe-straight' || item.componentType === 'chimney-straight',
    );

    const errors = [];

    const sequenceNumbers = numberedItems
      .map(item => item.sequenceOrder)
      .sort((a, b) => a - b);
    const hasDuplicates = sequenceNumbers.some((n, idx) => idx > 0 && n === sequenceNumbers[idx - 1]);
    if (hasDuplicates) {
      errors.push('Two or more parts share the same Part Number. Adjust the manual overrides.');
    }
    const numberingIsContiguous = sequenceNumbers.every((n, idx) => n === idx + 1);
    if (!hasDuplicates && !numberingIsContiguous) {
      errors.push('Part numbering is invalid. Manual Part Numbers must be in the range 1..N with no gaps.');
    }

    if (partItemsForValidation.length === 0) {
      errors.push('No straight pipe/chimney segments are present in the design.');
    }

    if (!orderedForValidation.some(item => item.componentType === 'cap')) {
      errors.push('Add a chimney cap at the top of the chimney.');
    }

    orderedForValidation.forEach((item, idx) => {
      const isFitting = item.componentType !== 'pipe-straight'
        && item.componentType !== 'chimney-straight'
        && item.componentType !== 'cap';

      if (!isFitting) return;

      const hasNextPart = orderedForValidation.slice(idx + 1).some(
        p => p.componentType === 'pipe-straight' || p.componentType === 'chimney-straight',
      );

      if (!hasNextPart) {
        errors.push(`${item.name || 'Fitting'} needs a straight segment after it for a valid connection.`);
      }
    });

    // Two consecutive straight pipes with different orientations is invalid:
    // a change of direction requires an elbow or tee between them.
    for (let i = 0; i < orderedForValidation.length - 1; i++) {
      const cur = orderedForValidation[i];
      const nxt = orderedForValidation[i + 1];
      const curStraight = cur.componentType === 'pipe-straight' || cur.componentType === 'chimney-straight';
      const nxtStraight = nxt.componentType === 'pipe-straight' || nxt.componentType === 'chimney-straight';
      if (curStraight && nxtStraight && cur.orientation !== nxt.orientation) {
        errors.push(
          `Part ${cur.sequenceOrder} (${cur.orientation}) and Part ${nxt.sequenceOrder} (${nxt.orientation}) have different orientations with no elbow or tee between them. Add a fitting to change orientation.`,
        );
      }
    }

    // Flag floating parts: any part whose endpoints aren't near another part's
    // endpoint or the stove. Tolerance is more generous than the snap tolerance
    // (8 px) to allow small misalignments around angled fittings.
    const FLOAT_TOL = 40; // px
    const itemEPsForFloat = numberedItems.map(it => getItemWorldEndpoints(it));
    const stoveEPsForFloat = getStoveEndpoints(
      stoveX, CANVAS_STOVE_Y, CANVAS_STOVE_W, CANVAS_STOVE_H,
    );
    numberedItems.forEach((item, i) => {
      const myEPs = itemEPsForFloat[i];
      const nearStove = myEPs.some(p =>
        stoveEPsForFloat.some(s => Math.hypot(p.x - s.x, p.y - s.y) <= FLOAT_TOL),
      );
      const nearOther = numberedItems.some((_, j) => {
        if (j === i) return false;
        const otherEPs = itemEPsForFloat[j];
        return myEPs.some(p =>
          otherEPs.some(q => Math.hypot(p.x - q.x, p.y - q.y) <= FLOAT_TOL),
        );
      });
      if (!nearStove && !nearOther) {
        errors.push(
          `Part ${item.sequenceOrder} (${item.name || item.componentType}) is not connected to any other part or the stove. Move it next to its neighbor.`,
        );
      }
    });

    const missingTempNumbers = orderedForValidation
      .filter(item => !Number.isFinite(item.ambientTempF))
      .map(item => item.sequenceOrder)
      .filter(n => typeof n === 'number');

    if (missingTempNumbers.length > 0) {
      errors.push(`Please specify temperature of part(s) ${missingTempNumbers.join(', ')}.`);
    }

    if (errors.length > 0) {
      setOutputError(errors.join('\n'));
      return;
    }

    const fToK = (f) => ((f - 32) * 5 / 9) + 273.15;
    const parseTempF = (raw, fallback) => {
      const n = Number(raw);
      return Number.isFinite(n) ? n : fallback;
    };
    const indoorDefaultK = fToK(parseTempF(indoorTempF, 65));
    const outdoorDefaultK = fToK(parseTempF(outdoorTempF, 35));

    const ordered = [...numberedItems]
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
      .map(item => ({ ...item }));

    const isStraight = (item) => item.componentType === 'pipe-straight' || item.componentType === 'chimney-straight';
    const toRounded = (n, digits = 6) => Number(n.toFixed(digits));
    const getDiameterIn = (item) => Number(item.selectedDiameter || item.diameters?.[0] || 6);
    const getDiameterFt = (item) => toRounded(getDiameterIn(item) / 12, 6);
    const getHeightFt = (item) => Number(item.length ?? item.height ?? 3);
    const getAmbientK = (item) => {
      const itemAmbientK = Number.isFinite(item.ambientTempF) ? fToK(item.ambientTempF) : null;
      const defaultAmbientK = item.isOutdoor ? outdoorDefaultK : indoorDefaultK;
      return Number((itemAmbientK ?? defaultAmbientK).toFixed(2));
    };

    const partItems = ordered.filter(isStraight);
    const parts = partItems.map((item) => {
      // Backend only understands 'vertical' or 'horizontal'. 30°/45° pipes
      // round to 'vertical' (closest physical sense — they have vertical rise).
      const orientation = item.orientation === 'horizontal' ? 'horizontal' : 'vertical';
      const height_ft = getHeightFt(item);
      const inferredType = (item.part_type || item.type || '').toLowerCase();
      const partType = inferredType === 'single' || inferredType === 'triple'
        ? inferredType
        : (item.componentType === 'chimney-straight' || item.isOutdoor ? 'triple' : 'single');
      const base = {
        _name: item.name,
        type: partType,
        inner_diameter_ft: getDiameterFt(item),
        height_ft,
        z_ft: Number(item.z_ft ?? 0),
        orientation,
        T_ambient_K: getAmbientK(item),
      };

      if (partType === 'single') {
        return {
          ...base,
          Pa: Number(item.Pa ?? 98457),
          num_segments: Number(item.num_segments ?? Math.max(1, Math.round(height_ft))),
          thickness_w_m: Number(item.thickness_w_m ?? 0.00076),
          density_w_kg_m3: Number(item.density_w_kg_m3 ?? 7850),
          cp_w_J_kg_K: Number(item.cp_w_J_kg_K ?? 460),
          k_w_W_m_K: Number(item.k_w_W_m_K ?? 50),
          epsilon_w: Number(item.epsilon_w ?? 0.8),
          roughness_m: Number(item.roughness_m ?? 0.00015),
        };
      }

      return {
        ...base,
        Pa: Number(item.Pa ?? 98596),
        num_segments: Number(item.num_segments ?? (orientation === 'horizontal' ? 2 : Math.max(1, Math.round(height_ft)))),
        thickness_inner_m: Number(item.thickness_inner_m ?? 0.0005),
        density_inner_kg_m3: Number(item.density_inner_kg_m3 ?? 7850),
        cp_inner_J_kg_K: Number(item.cp_inner_J_kg_K ?? 460),
        k_inner_W_m_K: Number(item.k_inner_W_m_K ?? 26),
        epsilon_inner: Number(item.epsilon_inner ?? 0.35),
        thickness_middle_m: Number(item.thickness_middle_m ?? 0.025),
        density_middle_kg_m3: Number(item.density_middle_kg_m3 ?? 100),
        cp_middle_J_kg_K: Number(item.cp_middle_J_kg_K ?? 1050),
        k_middle_W_m_K: Number(item.k_middle_W_m_K ?? 0.04),
        thickness_outer_m: Number(item.thickness_outer_m ?? 0.0005),
        density_outer_kg_m3: Number(item.density_outer_kg_m3 ?? 8000),
        cp_outer_J_kg_K: Number(item.cp_outer_J_kg_K ?? 500),
        k_outer_W_m_K: Number(item.k_outer_W_m_K ?? 16),
        epsilon_outer: Number(item.epsilon_outer ?? 0.35),
        air_gap_inner_m: Number(item.air_gap_inner_m ?? 0.0),
        air_gap_outer_m: Number(item.air_gap_outer_m ?? 0.0),
        roughness_m: Number(item.roughness_m ?? 1e-6),
      };
    });

    const getPrevPartIndex = (sequence) => {
      for (let i = partItems.length - 1; i >= 0; i -= 1) {
        if (partItems[i].sequenceOrder < sequence) return i;
      }
      return -1;
    };

    const getNextPartIndex = (sequence) => {
      for (let i = 0; i < partItems.length; i += 1) {
        if (partItems[i].sequenceOrder > sequence) return i;
      }
      return -1;
    };

    const elbows = ordered
      .filter(item => !isStraight(item) && item.componentType !== 'cap')
      .map(item => {
        const prevPartIdx = getPrevPartIndex(item.sequenceOrder);
        const nextPartIdx = getNextPartIndex(item.sequenceOrder);
        const between_parts = [prevPartIdx, nextPartIdx >= 0 ? nextPartIdx : prevPartIdx];
        const diameter_ft = getDiameterFt(item);
        const ambientK = getAmbientK(item);

        if (item.componentType === 'tee' || item.componentType === 'chimney-tee') {
          return {
            type: 'tee',
            between_parts,
            diameter_ft,
            vertical_length_ft: Number(item.vertical_length_ft ?? 1.0),
            horizontal_length_ft: Number(item.horizontal_length_ft ?? 0.5417),
            T_ambient_K: ambientK,
          };
        }

        const angle_deg = item.componentType === 'elbow-45'
          ? 45
          : item.componentType === 'chimney-30'
            ? 30
            : Number(item.angle_deg ?? 90);

        return {
          type: 'elbow',
          between_parts,
          diameter_ft,
          height_ft: Number(item.height_ft ?? 0.625),
          width_ft: Number(item.width_ft ?? 0.7083),
          angle_deg,
          R_over_D: Number(item.R_over_D ?? 1.5),
          elbow_type: item.elbow_type || 'long_radius',
          T_ambient_K: ambientK,
        };
      });

    const elevationFtNum = Number.isFinite(Number(elevationFt)) ? Number(elevationFt) : 0;

    const payload = {
      parts,
      elbows,
      dt: 0.5,
      total_time: 600,
      elevation_ft: elevationFtNum,
      inlet_restriction: {
        enable: true,
        door_type: 'swivel',
        door_width_ft: 1.2708,
        door_height_ft: 0.8229,
        Cd: 0.62,
        A_leak_m2: 0.0075,
        inlet_area_min_m2: 0.003,
        K_stove: 0,
      },
      door_schedule: FIRE_PROFILES[selectedFireProfile]?.doorSchedule || FIRE_PROFILES.balanced.doorSchedule,
      inlet_temp_profile: FIRE_PROFILES[selectedFireProfile]?.inletTempProfile || FIRE_PROFILES.balanced.inletTempProfile,
      verbose: false,
    };
    setShowComponentList(false);
    setPayloadText(JSON.stringify(payload, null, 2));
    setOutputStatus('Calculating...');

    try {
      await runSimulation(payload);
    } catch (err) {
      setOutputStatus(null);
      setOutputError(`Finalize succeeded, but calculation failed: ${err.message}`);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="app-top-bar">
          <h1>Wood Heater Tool</h1>
          <nav className="tab-nav">
            <button
              className={`tab-btn${activeTab === 'workspace' ? ' active' : ''}`}
              onClick={() => setActiveTab('workspace')}
            >Workspace</button>
            <button
              className={`tab-btn${activeTab === 'settings' ? ' active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >Settings</button>
            <button
              className={`tab-btn${activeTab === 'profile' ? ' active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >Profile</button>
          </nav>
        </div>

        {activeTab === 'workspace' && (
        <div className={`workspace-container${showResults ? ' workspace-results-mode' : ''}`}>
          {showResults ? (
            /* ── Results mode: collapsed design preview + results panel ── */
            <>
              <div className="design-preview-panel">
                <h3 className="design-preview-title">Current Design</h3>
                <div style={{ width: '100%', flex: '0 0 auto', overflow: 'hidden', position: 'relative', pointerEvents: 'none' }}>
                  <Canvas
                    items={canvasItems}
                    setItems={setCanvasItems}
                    selectedItemIndex={null}
                    setSelectedItemIndex={() => {}}
                    showStoveMenu={false}
                    setShowStoveMenu={() => {}}
                    doorAngle={doorAngle}
                    setDoorAngle={() => {}}
                    hideTitle
                    readOnly
                    fullWidth
                    indoorTempF={indoorTempF}
                    setIndoorTempF={setIndoorTempF}
                    outdoorTempF={outdoorTempF}
                    setOutdoorTempF={setOutdoorTempF}
                    elevationFt={elevationFt}
                    setElevationFt={setElevationFt}
                    stoveX={stoveX}
                    onStoveXChange={setStoveX}
                    roofOutdoorOverhang={roofOutdoorOverhang}
                    onRoofOutdoorOverhangChange={setRoofOutdoorOverhang}
                    wallTopY={wallTopY}
                    onWallTopYChange={setWallTopY}
                  />
                </div>
                <button className="edit-design-btn" onClick={() => setShowResults(false)}>
                  Edit Design
                </button>
              </div>
              <div className="results-area">
                <ResultsPanel
                  result={lastResult}
                  units={resultUnits}
                  onUnitsChange={setResultUnits}
                />
              </div>
            </>
          ) : (
            /* ── Normal editing mode ── */
            <>
              <Sidebar
                items={canvasItems}
                showComponentList={showComponentList}
                setShowComponentList={setShowComponentList}
                handleClearDesign={handleClearDesign}
                showStoveMenu={showStoveMenu}
                setShowStoveMenu={setShowStoveMenu}
                doorAngle={doorAngle}
                setDoorAngle={handleDoorAngleChange}
                hasResults={!!lastResult}
                onShowResults={() => setShowResults(true)}
                finalizeDisabled={!canFinalizeDesign}
                finalizeTitle={canFinalizeDesign
                  ? 'Finalize design and run calculation'
                  : 'Drop at least one part on the canvas before finalizing.'}
                selectedFireProfile={selectedFireProfile}
                fireProfileOptions={Object.entries(FIRE_PROFILES).map(([value, cfg]) => ({ value, label: cfg.label }))}
                onFireProfileChange={setSelectedFireProfile}
                onFinalizeDesign={handleFinalizeDesign}
                elevationFt={elevationFt}
                setElevationFt={setElevationFt}
              />
              <Canvas
                items={canvasItems}
                setItems={setCanvasItems}
                selectedItemIndex={selectedItemIndex}
                setSelectedItemIndex={setSelectedItemIndex}
                showStoveMenu={showStoveMenu}
                setShowStoveMenu={setShowStoveMenu}
                doorAngle={doorAngle}
                setDoorAngle={handleDoorAngleChange}
                indoorTempF={indoorTempF}
                setIndoorTempF={setIndoorTempF}
                outdoorTempF={outdoorTempF}
                setOutdoorTempF={setOutdoorTempF}
                elevationFt={elevationFt}
                setElevationFt={setElevationFt}
                stoveX={stoveX}
                onStoveXChange={setStoveX}
                roofOutdoorOverhang={roofOutdoorOverhang}
                onRoofOutdoorOverhangChange={setRoofOutdoorOverhang}
                wallTopY={wallTopY}
                onWallTopYChange={setWallTopY}
              />
              <Output
                items={canvasItems}
                showComponentList={showComponentList}
                setShowComponentList={setShowComponentList}
                onPresetSelect={handlePresetSelect}
                payloadText={payloadText}
                setPayloadText={setPayloadText}
                outputError={outputError}
                outputStatus={outputStatus}
                isCalculating={outputStatus === 'Calculating...'}
                selectedItemIndex={selectedItemIndex}
                setSelectedItemIndex={setSelectedItemIndex}
                handleDiametersChange={handleDiametersChange}
                handleHeightChange={handleHeightChange}
                handleAmbientTempChange={handleAmbientTempChange}
                handleOrientationChange={handleOrientationChange}
                availableOrientations={getAvailableOrientations(canvasItems[selectedItemIndex])}
                handleSequenceOrderChange={handleSequenceOrderChange}
                handleDelete={handleDelete}
                handleClearDesign={handleClearDesign}
                onFinalizeDesign={handleFinalizeDesign}
                finalizeDisabled={!canFinalizeDesign || outputStatus === 'Calculating...'}
                finalizeTitle={canFinalizeDesign
                  ? 'Finalize design and run calculation'
                  : 'Drop at least one part on the canvas before finalizing.'}
              />
            </>
          )}
        </div>
        )}

        {activeTab === 'settings' && (
          <div className="tab-content-panel">
            <Settings />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="tab-content-panel">
            <h2>Profile</h2>
            <p>User profile information will appear here.</p>
          </div>
        )}
      </header>
      <footer className="app-footer">
        <img src={lblLogo} alt="Lawrence Berkeley National Laboratory" />
        <span className="app-last-updated">Last updated: {LAST_UPDATED}</span>
      </footer>
    </div>
  );
}

export default App;
