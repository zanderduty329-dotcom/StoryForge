import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  PointerEvent as ReactPointerEvent,
} from "react";

type MapType = "world" | "region" | "city" | "dungeon";
type MapStyle = "old-timey" | "modern" | "sci-fi" | "custom";

type DrawMode =
  | "freehand"
  | "grid"
  | "area"
  | "fill"
  | "path";
type BrushShape = "round" | "square";
type CanvasBase = "water" | "land" | "blank";

type TerrainType =
  | "land"
  | "water"
  | "forest"
  | "mountain"
  | "desert"
  | "plains"
  | "swamp"
  | "snow";

type EditorTool =
  | "select"
  | TerrainType
  | "region"
  | "river"
  | "road"
  | "erase"
  | "location";

type EraseTarget =
  | TerrainType
  | "region"
  | "river"
  | "road";

type MapColors = {
  water: string;
  land: string;
  forest: string;
  desert: string;
  mountain: string;
  plains: string;
  label: string;
  accent: string;
};

type TerrainStamp = {
  id: string;
  type: TerrainType;
  x: number;
  y: number;
  size: number;
  mode?: DrawMode;
  shape?: BrushShape;
  strokeId?: string;
  terrainStyle?: string;

  /*
   * Visual mountain size.
   * Independent from automatic ridge density.
   */
  mountainScale?: number;
  smoothed?: boolean;

  fillGenerated?: boolean;
};

type RegionKind =
  | "biome"
  | "feature"
  | "political";

type TerrainRegion = {
  id: string;
  kind: RegionKind;
  name: string;
  terrainType?: TerrainType;
  style?: string;
  cells: string[];
  columns: number;
  rows: number;
  createdAt: string;
};

type MapPathKind =
  | "river"
  | "road";

type PathSegmentMode =
  | "straight"
  | "curve";

type RoadStyle =
  | "pathway"
  | "dirt"
  | "stone";

type MapPathPoint = {
  x: number;
  y: number;

  /*
   * Controls the segment from the PREVIOUS
   * point to this point.
   */
  curveFromPrevious?: boolean;
};

type MapPath = {
  id: string;
  kind: MapPathKind;
  points: MapPathPoint[];
  width: number;
  roadStyle?: RoadStyle;
  createdAt: string;
};

type MapHistorySnapshot = {
  mapId: string;
  terrain: TerrainStamp[];
  regions: TerrainRegion[];
  locations: MapLocation[];
  paths: MapPath[];
};

type LocationType =
  | "city"
  | "town"
  | "village"
  | "camp"
  | "port"
  | "fort"
  | "stronghold"
  | "cave"
  | "dungeon"
  | "ruins"
  | "castle"
  | "forest"
  | "mountain"
  | "landmark"
  | "custom";

type LocationSize =
  | "tiny"
  | "small"
  | "medium"
  | "large";

type MapLocation = {
  id: string;
  name: string;
  type: LocationType;
  icon: string;
  x: number;
  y: number;
  description?: string;
  size?: LocationSize;

  /*
   * Used later for entrances such as caves,
   * dungeons, buildings, or other maps that
   * exist beneath/inside this surface marker.
   */
  linkedMapId?: string;
};

type StoryMap = {
  id: string;
  name: string;
  type: MapType;
  style: MapStyle;
  colors: MapColors;
  base?: CanvasBase;
  terrain: TerrainStamp[];
  regions?: TerrainRegion[];
  locations: MapLocation[];
  paths?: MapPath[];
  createdAt: string;
  updatedAt: string;
};

const STYLE_PRESETS: Record<
  Exclude<MapStyle, "custom">,
  MapColors
> = {
  "old-timey": {
    water: "#6f9fbd",
    land: "#c8b27d",
    forest: "#526b3f",
    desert: "#d0b46f",
    mountain: "#756b5c",
    plains: "#9da96f",
    label: "#2f2418",
    accent: "#6b4329",
  },

  modern: {
    water: "#4c9bd8",
    land: "#d8d8cf",
    forest: "#4c8a55",
    desert: "#d9bd77",
    mountain: "#777d84",
    plains: "#9bbf73",
    label: "#18202a",
    accent: "#c2413a",
  },

  "sci-fi": {
    water: "#172d46",
    land: "#343e53",
    forest: "#316d63",
    desert: "#806846",
    mountain: "#62677b",
    plains: "#45576b",
    label: "#d9f4ff",
    accent: "#5ee7ff",
  },
};

const LOCATION_ICONS: Record<LocationType, string> = {
  city: "🏰",
  town: "🏘️",
  village: "🏡",
  camp: "⛺",
  port: "⚓",
  fort: "🛡️",
  stronghold: "🏯",
  cave: "🕳️",
  dungeon: "🗝️",
  ruins: "🏚️",
  castle: "🏰",
  forest: "🌲",
  mountain: "⛰️",
  landmark: "📍",
  custom: "✦",
};

const LOCATION_LABELS: Record<LocationType, string> = {
  city: "City",
  town: "Town",
  village: "Village",
  camp: "Camp",
  port: "Port",
  fort: "Fort",
  stronghold: "Stronghold",

  /*
   * These exist as markers on the surface.
   * Their actual interior/underground maps
   * will be created separately later.
   */
  cave: "Cave Entrance",
  dungeon: "Dungeon Entrance",

  ruins: "Ruins",
  castle: "Castle",
  forest: "Forest Location",
  mountain: "Mountain Location",
  landmark: "Landmark",
  custom: "Custom",
};


const LOCATION_SIZE_LABELS: Record<
  LocationSize,
  string
> = {
  tiny: "Tiny",
  small: "Small",
  medium: "Medium",
  large: "Large",
};

function locationMapSymbol(
  type: LocationType
) {
  let content = null;

  switch (type) {
    case "city":
      content = (
        <>
          <path d="M8 49h48" />
          <path d="M12 49V29l9-8 9 8v20" />
          <path d="M34 49V23l8-7 8 7v26" />
          <path d="M18 49V36h6v13" />
          <path d="M40 49V33h5v16" />
          <path d="M9 29h22M33 23h18" />
        </>
      );
      break;

    case "town":
      content = (
        <>
          <path d="M7 50h50" />
          <path d="M9 50V34l8-7 8 7v16" />
          <path d="M27 50V29l9-8 9 8v21" />
          <path d="M46 50V37l6-5 6 5v13" />
          <path d="M15 50V40h5v10" />
          <path d="M33 50V38h6v12" />
        </>
      );
      break;

    case "village":
      content = (
        <>
          <path d="M9 51h46" />
          <path d="M11 51V35l9-8 9 8v16" />
          <path d="M34 51V38l7-6 7 6v13" />
          <path d="M17 51V41h6v10" />
        </>
      );
      break;

    case "camp":
      content = (
        <>
          <path d="M7 50h50" />
          <path d="M10 50l11-25 11 25z" />
          <path d="M37 50l8-19 9 19z" />
          <path d="M21 25v25" />
        </>
      );
      break;

    case "port":
      content = (
        <>
          <path d="M11 45h42" />
          <path d="M17 45V20" />
          <path d="M17 22h22l-7 10H17" />
          <path d="M8 50c5-4 10 4 15 0s10 4 15 0 10 4 18 0" />
        </>
      );
      break;

    case "fort":
    case "stronghold":
    case "castle":
      content = (
        <>
          <path d="M9 51V24h8v7h8v-7h14v7h8v-7h8v27z" />
          <path d="M18 51V39h8v12" />
          <path d="M38 51V38h8v13" />
          <path d="M26 24V15h12v9" />
        </>
      );
      break;

    case "cave":
      content = (
        <>
          <path d="M8 51c3-24 14-36 24-36s21 12 24 36z" />
          <path d="M22 51c1-12 5-19 10-19s9 7 10 19" />
        </>
      );
      break;

    case "dungeon":
      content = (
        <>
          <path d="M15 51V20h34v31" />
          <path d="M24 51V31h16v20" />
          <path d="M24 38h16" />
          <path d="M28 43h12M32 48h8" />
        </>
      );
      break;

    case "ruins":
      content = (
        <>
          <path d="M9 51h46" />
          <path d="M15 51V24h8v27" />
          <path d="M34 51V31h8v20" />
          <path d="M13 24h12M32 31h12" />
          <path d="M28 51l7-12" />
        </>
      );
      break;

    case "forest":
      content = (
        <>
          <path d="M19 52V36M42 52V33" />
          <path d="M19 13L7 36h24z" />
          <path d="M42 10L29 33h26z" />
        </>
      );
      break;

    case "mountain":
      content = (
        <>
          <path d="M5 51L23 18l10 18 8-13 18 28z" />
          <path d="M17 29l6-11 6 11" />
        </>
      );
      break;

    case "landmark":
      content = (
        <>
          <path d="M32 8l6 16 17 1-13 11 4 17-14-9-14 9 4-17L9 25l17-1z" />
        </>
      );
      break;

    case "custom":
    default:
      content = (
        <>
          <path d="M32 9l22 23-22 23L10 32z" />
          <circle cx="32" cy="32" r="5" />
        </>
      );
      break;
  }

  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {content}
    </svg>
  );
}

const LOCATION_PALETTE_TYPES: LocationType[] = [
  "city",
  "town",
  "village",
  "camp",
  "port",
  "fort",
  "stronghold",
  "castle",
  "ruins",
  "cave",
  "dungeon",
  "landmark",
  "custom",
];

const MAP_TYPES: MapType[] = [
  "world",
  "region",
  "city",
  "dungeon",
];

const MAP_STYLES: MapStyle[] = [
  "old-timey",
  "modern",
  "sci-fi",
  "custom",
];

const TERRAIN_TOOLS: Array<{
  key: TerrainType;
  label: string;
  icon: string;
}> = [
  { key: "land", label: "Land", icon: "🟫" },
  { key: "water", label: "Water", icon: "🌊" },
  { key: "forest", label: "Forest", icon: "🌲" },
  { key: "mountain", label: "Mountain", icon: "⛰️" },
  { key: "desert", label: "Desert", icon: "🏜️" },
  { key: "plains", label: "Plains", icon: "🌾" },
  { key: "swamp", label: "Swamp", icon: "🌿" },
  { key: "snow", label: "Snow", icon: "❄️" },
];

const BASE_TERRAIN_TOOLS =
  TERRAIN_TOOLS.filter(
    (item) =>
      item.key === "land" ||
      item.key === "water"
  );

const BIOME_TOOLS =
  TERRAIN_TOOLS.filter(
    (item) =>
      item.key === "forest" ||
      item.key === "plains" ||
      item.key === "desert" ||
      item.key === "swamp" ||
      item.key === "snow"
  );

const FEATURE_TERRAIN_TOOLS =
  TERRAIN_TOOLS.filter(
    (item) =>
      item.key === "mountain"
  );


const TERRAIN_STYLE_OPTIONS: Record<
  TerrainType,
  Array<{
    value: string;
    label: string;
  }>
> = {
  land: [
    { value: "plain", label: "Plain Land" },
  ],

  water: [
    { value: "plain", label: "Plain Water" },
  ],

  forest: [
    { value: "ink-trees", label: "StoryForge Forest" },
    { value: "pine", label: "Pine Trees" },
    { value: "oak", label: "Oak Trees" },
    { value: "mixed", label: "Mixed Woodland" },
  ],

  mountain: [
    { value: "ink-peaks", label: "Ink Peaks" },
    { value: "rocky", label: "StoryForge Peaks" },
    { value: "snow-peaks", label: "Snow Peaks" },
    { value: "range", label: "Mountain Range" },
  ],

  desert: [
    { value: "dunes", label: "Dunes" },
    { value: "sand-marks", label: "Sand Marks" },
    { value: "barren", label: "Barren" },
  ],

  plains: [
    { value: "grass", label: "Grass" },
    { value: "hatch", label: "Map Hatch" },
    { value: "sparse", label: "Sparse Plains" },
  ],

  swamp: [
    { value: "reeds", label: "Reeds" },
    { value: "marsh", label: "Marsh" },
    { value: "dead-trees", label: "Dead Trees" },
  ],

  snow: [
    { value: "snowfield", label: "Snowfield" },
    { value: "ice", label: "Ice" },
    { value: "snow-peaks", label: "Snow Peaks" },
  ],
};

const DEFAULT_TERRAIN_STYLES: Record<
  TerrainType,
  string
> = {
  land: "plain",
  water: "plain",
  forest: "ink-trees",
  mountain: "rocky",
  desert: "dunes",
  plains: "grass",
  swamp: "reeds",
  snow: "snowfield",
};

/*
 * STORYFORGE MAP SIZE SCALE V1
 *
 * Sliders use graduated logical steps instead
 * of one uniform increment.
 *
 * This gives small-detail work much finer
 * control while preserving very large sizes
 * for continents, oceans, and broad biomes.
 */

const TERRAIN_BRUSH_SIZE_STEPS = [
  0.25,
  0.35,
  0.5,
  0.65,
  0.8,
  1,
  1.25,
  1.5,
  1.75,
  2,
  2.5,
  3,
  3.5,
  4,
  5,
  6,
  7,
  8,
  10,
  12,
  14,
  16,
  20,
  24,
  28,
  32,
  36,
  40,
] as const;

const GRID_SIZE_STEPS = [
  2,
  3,
  4,
  5,
  6,
  8,
  10,
  12,
  14,
  16,
  20,
  24,
  28,
  32,
  40,
  48,
  56,
  64,
  80,
  96,
  120,
] as const;

const RIVER_WIDTH_STEPS = [
  0.10,
  0.14,
  0.18,
  0.22,
  0.28,
  0.35,
  0.45,
  0.55,
  0.70,
  0.85,
  1,
  1.2,
  1.5,
  1.8,
  2.2,
  2.6,
  3,
] as const;

const ROAD_WIDTH_STEPS = [
  0.04,
  0.06,
  0.08,
  0.10,
  0.12,
  0.15,
  0.18,
  0.22,
  0.28,
  0.32,
  0.38,
  0.45,
  0.55,
  0.70,
  0.85,
  1,
] as const;

function nearestMapSizeIndex(
  steps: readonly number[],
  value: number
) {
  let closestIndex = 0;
  let closestDistance =
    Number.POSITIVE_INFINITY;

  for (
    let index = 0;
    index < steps.length;
    index += 1
  ) {
    const distance =
      Math.abs(
        steps[index] -
        value
      );

    if (
      distance <
      closestDistance
    ) {
      closestDistance =
        distance;

      closestIndex =
        index;
    }
  }

  return closestIndex;
}

function formatMapSize(
  value: number
) {
  return String(
    Number(
      value.toFixed(2)
    )
  );
}


/*
 * STORYFORGE TINY TERRAIN PERSISTENCE V1
 *
 * The existing Land/Water smoothing filter is
 * tuned for the old minimum brush size of 1.
 *
 * Sub-1 terrain remains as raw saved geometry
 * so it cannot be eroded away when the stroke
 * is released.
 */
const MIN_AUTO_SMOOTH_TERRAIN_SIZE = 1;

const REGION_COLUMNS = 120;
const REGION_ROWS = 75;
const MAP_LOGICAL_ASPECT = 1.6;

function areaKindForTool(
  tool: EditorTool
): RegionKind | null {
  if (
    tool === "forest" ||
    tool === "plains" ||
    tool === "desert" ||
    tool === "swamp" ||
    tool === "snow"
  ) {
    return "biome";
  }

  if (tool === "mountain") {
    return "feature";
  }

  if (tool === "region") {
    return "political";
  }

  return null;
}

function canUseAreaMode(
  tool: EditorTool
) {
  return (
    Boolean(areaKindForTool(tool)) ||
    tool === "erase"
  );
}

function canUseFillMode(
  tool: EditorTool
) {
  return (
    tool === "land" ||
    tool === "water" ||
    tool === "forest" ||
    tool === "plains" ||
    tool === "desert" ||
    tool === "swamp" ||
    tool === "snow"
  );
}

function cellKey(
  column: number,
  row: number
) {
  return `${column},${row}`;
}

function parseCellKey(key: string) {
  const [column, row] =
    key.split(",").map(Number);

  return {
    column,
    row,
  };
}

function pointInsideTerrainStamp(
  stamp: TerrainStamp,
  x: number,
  y: number
) {
  const halfWidth = stamp.size / 2;

  const halfHeight =
    (stamp.size * MAP_LOGICAL_ASPECT) / 2;

  const dx = x - stamp.x;
  const dy = y - stamp.y;

  if (
    stamp.mode === "grid" ||
    stamp.shape === "square"
  ) {
    return (
      Math.abs(dx) <= halfWidth &&
      Math.abs(dy) <= halfHeight
    );
  }

  if (
    halfWidth <= 0 ||
    halfHeight <= 0
  ) {
    return false;
  }

  return (
    (dx * dx) /
      (halfWidth * halfWidth) +
      (dy * dy) /
        (halfHeight * halfHeight)
      <=
    1
  );
}

function terrainRenderLayer(
  type: TerrainType
) {
  if (
    type === "land" ||
    type === "water"
  ) {
    return 1;
  }

  if (type === "mountain") {
    return 3;
  }

  return 2;
}

function pointIsLand(
  map: StoryMap,
  x: number,
  y: number
) {
  for (
    let index = map.terrain.length - 1;
    index >= 0;
    index -= 1
  ) {
    const stamp = map.terrain[index];

    if (
      stamp.type !== "land" &&
      stamp.type !== "water"
    ) {
      continue;
    }

    if (
      pointInsideTerrainStamp(
        stamp,
        x,
        y
      )
    ) {
      return stamp.type === "land";
    }
  }

  return (map.base ?? "water") === "land";
}

function isTerrainTool(
  value: EditorTool
): value is TerrainType {
  return TERRAIN_TOOLS.some(
    (item) => item.key === value
  );
}

function terrainSymbol(
  type: TerrainType,
  style?: string
) {
  const selected =
    style ?? DEFAULT_TERRAIN_STYLES[type];

  if (type === "forest") {
    if (selected === "pine") return "▲";
    if (selected === "oak") return "♣";
    if (selected === "mixed") return "▲♣";
    return "♠";
  }

  if (type === "mountain") {
    if (selected === "rocky") return "▲";
    if (selected === "snow-peaks") return "△";
    if (selected === "range") return "△△";
    return "⌃";
  }

  if (type === "desert") {
    if (selected === "dunes") return "dunes";
    if (selected === "sand-marks") return "sand";
    if (selected === "barren") return "barren";
    return "dunes";
  }

  if (type === "plains") {
    if (selected === "grass") return "grass";
    if (selected === "hatch") return "hatch";
    if (selected === "sparse") return "sparse";
    return "grass";
  }

  if (type === "swamp") {
    if (selected === "reeds") return "reeds";
    if (selected === "marsh") return "marsh";
    if (selected === "dead-trees") return "dead-trees";
    return "reeds";
  }

  if (type === "snow") {
    /*
     * These values now act only as internal
     * style-presence markers. Snow artwork is
     * rendered as custom SVG below rather than
     * as Unicode text.
     */
    if (selected === "snowfield") return "snow";
    if (selected === "ice") return "ice";
    if (selected === "snow-peaks") return "peaks";
    return "snow";
  }

  return "";
}


/*
 * FOREST ORGANIC SCATTER V1
 *
 * Use a larger irregular repeat field so the eye does not
 * immediately recognize rows or a tiny repeated stamp.
 */
function storyForgeForestPatternMetrics(
  detailTier:
    | "overview"
    | "standard"
    | "detailed"
    | "close"
) {
  if (detailTier === "overview") {
    return { width: 18, height: 13 };
  }

  if (detailTier === "standard") {
    return { width: 15.5, height: 11.2 };
  }

  if (detailTier === "detailed") {
    return { width: 13.8, height: 9.8 };
  }

  return { width: 12.4, height: 8.8 };
}

type StoryForgeForestEntityPlacement = {
  x: number;
  y: number;
  scale: number;
  kind: "pine" | "oak";
};

function storyForgeForestPattern(
  style: string | undefined,
  ink: string,
  forestFill: string,
  detailTier:
    | "overview"
    | "standard"
    | "detailed"
    | "close" = "standard",
    scatterVariant = 0,
    placementsOverride?: StoryForgeForestEntityPlacement[]
  ) {
  const selected =
    style ?? "ink-trees";

  /*
   * Tree artwork itself becomes physically smaller
   * as the camera reveals more local forest detail.
   */
  const detailScale =
    (
      detailTier === "overview"
        ? 1.06
        : detailTier === "standard"
          ? 1
          : detailTier === "detailed"
            ? 0.82
            : 0.70
    ) * 0.545;

  /*
   * STORYFORGE FOREST ART
   *
   * Density and zoom logic live below this section
   * and are intentionally left untouched.
   *
   * These helpers only control how individual trees
   * look.
   */

  const pine = (
    x: number,
    y: number,
    scale: number
  ) => {
    /*
     * Stable natural variation based on position.
     * No Math.random(), so trees do not jump around
     * when React rerenders.
     */
    const seed =
      Math.sin(
        x * 12.9898 +
        y * 78.233
      );

    const lean =
      seed * 2.2;

    const xJitter =
      seed * 0.34;

    const yJitter =
      Math.cos(
        x * 17.31 +
        y * 9.73
      ) * 0.28;

    /*
     * Keep the forest artwork slightly smaller than
     * the old stamped version.
     */
    const naturalScale =
      scale *
      detailScale *
      (0.78 +
        Math.abs(seed) * 0.05);

    return (
      <g
        transform={
          `translate(${x + xJitter} ${y + yJitter}) ` +
          `rotate(${lean} 1.7 3.9) ` +
          `scale(${naturalScale})`
        }
        stroke={ink}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/*
          Main silhouette.

          The left and right sides deliberately do
          not mirror one another perfectly.
        */}
        <path
          d="
            M1.68 0.10

            C1.40 0.72 1.07 1.25 0.68 1.91
            L1.14 1.78

            C0.84 2.30 0.46 2.93 0.19 3.58
            L0.87 3.30

            C0.58 3.98 0.25 4.70 0.02 5.45
            L0.96 5.04

            C0.77 5.63 0.46 6.26 0.24 6.77
            L1.30 6.32

            L0.70 7.18
            L2.74 7.18

            L2.20 6.28
            L3.16 6.66

            C2.93 6.05 2.63 5.48 2.46 4.97
            L3.28 5.29

            C3.04 4.54 2.72 3.92 2.47 3.27
            L3.12 3.50

            C2.87 2.86 2.51 2.26 2.24 1.76
            L2.70 1.91

            C2.34 1.29 2.00 0.70 1.68 0.10
            Z
          "
          fill={forestFill}
          fillOpacity="0.88"
          strokeWidth="0.30"
        />

        {/*
          Slightly darker lower foliage gives the
          tree more depth without turning it into a
          heavy realistic illustration.
        */}
        <path
          d="
            M0.26 5.42
            C0.92 5.14 1.42 5.24 1.69 4.91
            C2.04 5.21 2.56 5.05 3.02 5.28

            L3.16 6.66
            L2.20 6.28
            L2.74 7.18
            L0.70 7.18
            L1.30 6.32
            L0.24 6.77
            Z
          "
          fill={ink}
          fillOpacity="0.08"
          stroke="none"
        />

        {/*
          Trunk + irregular branch marks.
        */}
        <path
          d="
            M1.68 1.72
            C1.65 3.14 1.70 5.08 1.69 7.72

            M1.67 3.02
            L0.96 3.62

            M1.69 3.78
            L2.39 4.29

            M1.68 4.65
            L0.82 5.28

            M1.70 5.42
            L2.50 5.93
          "
          fill="none"
          strokeWidth="0.25"
          opacity="0.66"
        />

        {/*
          Small interior ridge lines give the pine
          the same cartographic edge language as
          StoryForge Peaks.
        */}
        <path
          d="
            M1.12 2.32
            L1.53 1.34

            M2.10 2.25
            L1.78 1.26

            M0.82 4.20
            L1.48 3.38

            M2.53 4.13
            L1.86 3.34
          "
          fill="none"
          strokeWidth="0.18"
          opacity="0.32"
        />

        {/*
          Subtle ground marks keep trees from
          looking pasted onto the biome color.
        */}
        <path
          d="
            M0.48 7.42
            C1.00 7.22 1.43 7.36 1.77 7.25
            C2.18 7.10 2.61 7.24 3.00 7.40

            M0.92 7.68
            C1.42 7.53 1.98 7.57 2.47 7.66
          "
          fill="none"
          strokeWidth="0.17"
          opacity="0.22"
        />
      </g>
    );
  };

  const oak = (
    x: number,
    y: number,
    scale: number
  ) => {
    const seed =
      Math.sin(
        x * 19.173 +
        y * 31.417
      );

    const lean =
      seed * 1.8;

    const xJitter =
      seed * 0.31;

    const yJitter =
      Math.cos(
        x * 13.87 +
        y * 21.41
      ) * 0.25;

    const naturalScale =
      scale *
      detailScale *
      (0.79 +
        Math.abs(seed) * 0.05);

    return (
      <g
        transform={
          `translate(${x + xJitter} ${y + yJitter}) ` +
          `rotate(${lean} 2.0 3.5) ` +
          `scale(${naturalScale})`
        }
        stroke={ink}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/*
          Trunk first so it visually disappears
          behind the canopy.
        */}
        <path
          d="
            M1.98 6.76
            C1.94 5.84 2.02 4.80 1.96 3.78

            M1.97 4.78
            L1.12 3.63

            M1.98 4.52
            L2.84 3.39

            M1.96 5.28
            L1.40 4.66

            M2.00 5.09
            L2.57 4.46
          "
          fill="none"
          strokeWidth="0.31"
        />

        {/*
          Irregular StoryForge canopy.

          Instead of a circular cloud, it has
          asymmetric lobes and a slightly uneven
          lower edge.
        */}
        <path
          d="
            M0.48 4.13

            C-0.06 3.60 0.12 2.86 0.71 2.55
            C0.43 1.86 0.91 1.26 1.52 1.31

            C1.66 0.57 2.35 0.25 2.86 0.75

            C3.49 0.42 4.14 0.88 4.10 1.55

            C4.78 1.60 5.07 2.24 4.72 2.72

            C5.14 3.31 4.82 3.94 4.28 4.10

            C4.18 4.80 3.41 5.12 2.88 4.74

            C2.37 5.22 1.63 5.09 1.35 4.57

            C0.92 4.72 0.62 4.52 0.48 4.13
            Z
          "
          fill={forestFill}
          fillOpacity="0.87"
          strokeWidth="0.30"
        />

        {/*
          Shadowed lower/right canopy plane.
        */}
        <path
          d="
            M1.34 4.56
            C1.85 4.16 2.24 4.26 2.68 3.96

            C3.18 4.25 3.74 4.07 4.27 4.10

            C4.17 4.78 3.42 5.12 2.88 4.74

            C2.38 5.21 1.63 5.09 1.34 4.56
            Z
          "
          fill={ink}
          fillOpacity="0.07"
          stroke="none"
        />

        {/*
          Canopy contour details.
        */}
        <path
          d="
            M0.95 3.25
            C1.49 2.79 1.94 2.91 2.30 2.42

            C2.70 1.88 3.20 1.86 3.72 2.18

            M1.27 3.90
            C1.74 3.53 2.17 3.59 2.49 3.27

            M3.00 3.53
            C3.34 3.17 3.69 3.12 4.04 3.32
          "
          fill="none"
          strokeWidth="0.20"
          opacity="0.38"
        />

        {/*
          Small bark lines.
        */}
        <path
          d="
            M1.82 5.36
            L2.07 5.09

            M1.81 5.83
            L2.08 5.57

            M1.83 6.28
            L2.06 6.04
          "
          fill="none"
          strokeWidth="0.15"
          opacity="0.28"
        />

        {/*
          Ground integration.
        */}
        <path
          d="
            M0.72 6.94
            C1.22 6.72 1.69 6.88 2.05 6.76
            C2.54 6.59 3.02 6.76 3.49 6.92

            M1.14 7.20
            C1.62 7.06 2.17 7.09 2.74 7.18
          "
          fill="none"
          strokeWidth="0.17"
          opacity="0.22"
        />
      </g>
    );
  };

  /*
   * Whole-tree map renderer.
   */
  if (placementsOverride) {
    return (
      <>
        {placementsOverride.map(
          (placement, index) => (
            <g key={`forest-whole-tree-${index}`}>
              {placement.kind === "pine"
                ? pine(
                    placement.x,
                    placement.y,
                    placement.scale
                  )
                : oak(
                    placement.x,
                    placement.y,
                    placement.scale
                  )}
            </g>
          )
        )}
      </>
    );
  }

  /*
   * FOREST ORGANIC SCATTER V1
   *
   * Stable pseudo-random placement:
   * - no obvious rows
   * - no Math.random()
   * - trees do not jump on rerender
   * - occasional size variation
   */
  const stableForestUnit = (
    index: number,
    salt: number
  ) => {
    const raw =
      Math.sin(
          (index + 1) * 12.9898 +
            (
              salt +
              scatterVariant * 19.731
            ) *
              78.233
        ) * 43758.5453;

    return raw - Math.floor(raw);
  };

  const patternMetrics =
    storyForgeForestPatternMetrics(
      detailTier
    );

  const targetCount =
    detailTier === "overview"
      ? 8
      : detailTier === "standard"
        ? 13
        : detailTier === "detailed"
          ? 17
          : 21;

  const minimumSpacing =
    detailTier === "overview"
      ? 2.8
      : detailTier === "standard"
        ? 2.15
        : detailTier === "detailed"
          ? 1.75
          : 1.48;

  type ForestScatterPoint = {
    x: number;
    y: number;
    scale: number;
    kind: "pine" | "oak";
  };

  const placements: ForestScatterPoint[] =
    [];

  const usableWidth =
    Math.max(
      1,
      patternMetrics.width - 2.8
    );

  const usableHeight =
    Math.max(
      1,
      patternMetrics.height - 3.4
    );

  let attempt = 0;

  while (
    placements.length < targetCount &&
    attempt < targetCount * 80
  ) {
    /*
     * Independent X/Y sequences prevent the points from
     * settling into diagonal or horizontal bands.
     */
    const x =
      0.35 +
      stableForestUnit(
        attempt,
        1.731
      ) *
        usableWidth;

    const y =
      0.25 +
      stableForestUnit(
        attempt,
        8.413
      ) *
        usableHeight;

    const sizeSeed =
      stableForestUnit(
        attempt,
        4.927
      );

    /*
     * Mostly small trees, some medium trees, and an
     * occasional slightly larger interior tree.
     */
    const treeScale =
      0.69 +
      sizeSeed * 0.27 +
      (
        sizeSeed > 0.93
          ? 0.12
          : 0
      );

    const hasRoom =
      placements.every(
        (existing) => {
          const dx =
            existing.x - x;

          const dy =
            existing.y - y;

          /*
           * Unequal X/Y weighting deliberately breaks
           * the visual rhythm of rows.
           */
          const distance =
            Math.sqrt(
              dx * dx +
                dy * dy * 1.24
            );

          return (
            distance >=
            minimumSpacing
          );
        }
      );

    if (hasRoom) {
      let kind: "pine" | "oak";

      if (selected === "pine") {
        kind = "pine";
      } else if (selected === "oak") {
        kind = "oak";
      } else if (selected === "mixed") {
        kind =
          stableForestUnit(
            attempt,
            12.13
          ) > 0.5
            ? "pine"
            : "oak";
      } else {
        kind =
          stableForestUnit(
            attempt,
            17.71
          ) > 0.43
            ? "pine"
            : "oak";
      }

      placements.push({
        x,
        y,
        scale: treeScale,
        kind,
      });
    }

    attempt += 1;
  }

  return (
    <>
      {placements.map(
        (
          placement,
          index
        ) => (
          <g
            key={`forest-tree-${index}`}
          >
            {placement.kind === "pine"
              ? pine(
                  placement.x,
                  placement.y,
                  placement.scale
                )
              : oak(
                  placement.x,
                  placement.y,
                  placement.scale
                )}
          </g>
        )
      )}
    </>
  );

}

function terrainTexture(
  type: TerrainType,
  style?: string
) {
  const selected =
    style ?? DEFAULT_TERRAIN_STYLES[type];

  if (
    type === "plains" &&
    selected === "hatch"
  ) {
    return `repeating-linear-gradient(
      135deg,
      rgb(40 32 20 / 20%) 0px,
      rgb(40 32 20 / 20%) 1px,
      transparent 1px,
      transparent 7px
    )`;
  }

  if (
    type === "desert" &&
    selected === "sand-marks"
  ) {
    return `radial-gradient(
      circle,
      rgb(65 45 20 / 24%) 0 1px,
      transparent 1.5px
    )`;
  }

  if (
    type === "swamp" &&
    selected === "marsh"
  ) {
    return `repeating-linear-gradient(
      0deg,
      transparent 0px,
      transparent 6px,
      rgb(20 45 25 / 25%) 7px,
      transparent 8px
    )`;
  }

  if (
    type === "snow" &&
    selected === "ice"
  ) {
    return `
      linear-gradient(
        45deg,
        transparent 45%,
        rgb(80 130 160 / 22%) 46%,
        rgb(80 130 160 / 22%) 48%,
        transparent 49%
      ),
      linear-gradient(
        -45deg,
        transparent 45%,
        rgb(80 130 160 / 16%) 46%,
        rgb(80 130 160 / 16%) 48%,
        transparent 49%
      )
    `;
  }

  return undefined;
}

function title(value: string) {
  return value
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function terrainColor(
  type: TerrainType,
  colors: MapColors
) {
  switch (type) {
    case "land":
      return colors.land;

    case "water":
      return colors.water;

    case "forest":
      return colors.forest;

    case "mountain":
      return colors.mountain;

    case "desert":
      return colors.desert;

    case "plains":
      return colors.plains;

    case "swamp":
      return "#526d58";

    case "snow":
      return "#e7edf0";
  }
}


const ROAD_STYLE_OPTIONS: Array<{
  value: RoadStyle;
  label: string;
}> = [
  {
    value: "pathway",
    label: "Pathway",
  },
  {
    value: "dirt",
    label: "Dirt Road",
  },
  {
    value: "stone",
    label: "Stone Road",
  },
];

function roadVisualForStyle(
  style: RoadStyle | undefined
) {
  switch (style) {
    case "stone":
      return {
        main: "#8e9295",
        edge: "#575b5e",
        dashArray: undefined,
        edgeExtra: 0.16,
      };

    case "dirt":
      return {
        main: "#9a7651",
        edge: "#654b35",
        dashArray: undefined,
        edgeExtra: 0.14,
      };

    case "pathway":
    default:
      return {
        /*
         * Thin worn-grass / walking trail.
         */
        main: "#b99b68",
        edge: "#8f774f",
        dashArray: "1.15 0.85",
        edgeExtra: 0.10,
      };
  }
}

function curveGeometryForSegment(
  kind: MapPathKind,
  previous: MapPathPoint,
  current: MapPathPoint,
  index: number
) {
  const dx =
    current.x - previous.x;

  const dy =
    current.y - previous.y;

  const distance =
    Math.max(
      0.001,
      Math.sqrt(
        dx * dx +
        dy * dy
      )
    );

  const tangentX =
    dx / distance;

  const tangentY =
    dy / distance;

  const perpendicularX =
    -tangentY;

  const perpendicularY =
    tangentX;

  /*
   * Produce deterministic variation from the
   * segment itself. Saved paths therefore keep
   * the same shape every time they are rendered.
   */
  const rawSeed =
    Math.sin(
      previous.x * 12.9898 +
      previous.y * 78.233 +
      current.x * 37.719 +
      current.y * 11.131 +
      index * 19.19
    ) * 43758.5453;

  const seed =
    rawSeed -
    Math.floor(rawSeed);

  const rawSeedTwo =
    Math.sin(
      previous.x * 31.417 +
      previous.y * 17.733 +
      current.x * 53.119 +
      current.y * 29.971 +
      index * 7.77
    ) * 24634.6345;

  const seedTwo =
    rawSeedTwo -
    Math.floor(rawSeedTwo);

  const rawSeedThree =
    Math.sin(
      previous.x * 9.173 +
      previous.y * 41.927 +
      current.x * 21.311 +
      current.y * 67.113 +
      index * 13.37
    ) * 19341.173;

  const seedThree =
    rawSeedThree -
    Math.floor(rawSeedThree);

  const firstDirection =
    seed < 0.5
      ? -1
      : 1;

  /*
   * Most curved segments gently reverse their
   * bend, creating an S-like natural route.
   * Some remain a softer uneven single bend.
   */
  const secondDirection =
    seedThree < 0.62
      ? -firstDirection
      : firstDirection;

  const baseBendStrength =
    kind === "river"
      ? Math.min(
          4.2,
          distance * 0.18
        )
      : Math.min(
          2.25,
          distance * 0.10
        );

  const firstBendStrength =
    baseBendStrength *
    (
      0.72 +
      seedTwo * 0.52
    );

  const secondBendStrength =
    baseBendStrength *
    (
      secondDirection ===
      firstDirection
        ? 0.38 +
          seedThree * 0.28
        : 0.55 +
          seedThree * 0.55
    );

  return {
    control1X:
      previous.x +
      tangentX *
        distance *
        0.32 +
      perpendicularX *
        firstBendStrength *
        firstDirection,

    control1Y:
      previous.y +
      tangentY *
        distance *
        0.32 +
      perpendicularY *
        firstBendStrength *
        firstDirection,

    control2X:
      previous.x +
      tangentX *
        distance *
        0.68 +
      perpendicularX *
        secondBendStrength *
        secondDirection,

    control2Y:
      previous.y +
      tangentY *
        distance *
        0.68 +
      perpendicularY *
        secondBendStrength *
        secondDirection,
  };
}



type StoryForgeBiomeSymbolPlacement = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};


function buildStoryForgeBiomeSymbolEntities(
  map: StoryMap,
  cells: Set<string>,
  columns: number,
  rows: number,
  terrainType: TerrainType,
  detailTier:
    | "overview"
    | "standard"
    | "detailed"
    | "close"
): StoryForgeBiomeSymbolPlacement[] {
  const biomeCells =
    new Set<string>();

  cells.forEach((key) => {
    const {
      column,
      row,
    } = parseCellKey(key);

    biomeCells.add(
      `${column}:${row}`
    );
  });

  if (biomeCells.size === 0) {
    return [];
  }

  const unit = (
    index: number,
    salt: number
  ) => {
    const raw =
      Math.sin(
        (index + 1) * 12.9898 +
        salt * 78.233
      ) * 43758.5453;

    return raw - Math.floor(raw);
  };


  const hasCell = (
    column: number,
    row: number
  ) =>
    column >= 0 &&
    row >= 0 &&
    column < columns &&
    row < rows &&
    biomeCells.has(
      `${column}:${row}`
    );


  const pointIsBiome = (
    x: number,
    y: number
  ) => {
    if (
      x < 0 ||
      y < 0 ||
      x >= 100 ||
      y >= 100
    ) {
      return false;
    }

    return hasCell(
      Math.floor(
        (x / 100) * columns
      ),
      Math.floor(
        (y / 100) * rows
      )
    );
  };


  /*
   * Different biomes want different visual density.
   */
  const standardSpacing =
    terrainType === "plains"
      ? 2.20
      : terrainType === "swamp"
        ? 2.48
        : terrainType === "desert"
          ? 2.72
          : 2.65;

  const zoomMultiplier =
    detailTier === "overview"
      ? 1.30
      : detailTier === "standard"
        ? 1
        : detailTier === "detailed"
          ? 0.89
          : 0.80;

  const spacing =
    standardSpacing *
    zoomMultiplier;


  /*
   * Roads and rivers become collision segments.
   */
  const pathSegments: Array<{
    ax: number;
    ay: number;
    bx: number;
    by: number;
    clearance: number;
  }> = [];

  (map.paths ?? []).forEach(
    (mapPath) => {
      for (
        let index = 1;
        index < mapPath.points.length;
        index += 1
      ) {
        const previous =
          mapPath.points[index - 1];

        const current =
          mapPath.points[index];

        const clearance =
          mapPath.width / 2 +
          (
            mapPath.kind === "river"
              ? 0.70
              : 0.50
          );

        if (
          !current.curveFromPrevious
        ) {
          pathSegments.push({
            ax: previous.x,
            ay: previous.y,
            bx: current.x,
            by: current.y,
            clearance,
          });

          continue;
        }

        const curve =
          curveGeometryForSegment(
            mapPath.kind,
            previous,
            current,
            index
          );

        let lastX =
          previous.x;

        let lastY =
          previous.y;

        for (
          let sample = 1;
          sample <= 10;
          sample += 1
        ) {
          const t =
            sample / 10;

          const inverse =
            1 - t;

          const x =
            inverse * inverse * inverse *
              previous.x +
            3 * inverse * inverse * t *
              curve.control1X +
            3 * inverse * t * t *
              curve.control2X +
            t * t * t *
              current.x;

          const y =
            inverse * inverse * inverse *
              previous.y +
            3 * inverse * inverse * t *
              curve.control1Y +
            3 * inverse * t * t *
              curve.control2Y +
            t * t * t *
              current.y;

          pathSegments.push({
            ax: lastX,
            ay: lastY,
            bx: x,
            by: y,
            clearance,
          });

          lastX = x;
          lastY = y;
        }
      }
    }
  );


  const pointSegmentDistance = (
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number
  ) => {
    const dx = bx - ax;
    const dy = by - ay;

    const lengthSquared =
      dx * dx + dy * dy;

    if (
      lengthSquared <
      0.000001
    ) {
      return Math.hypot(
        px - ax,
        py - ay
      );
    }

    const t =
      Math.max(
        0,
        Math.min(
          1,
          (
            (px - ax) * dx +
            (py - ay) * dy
          ) /
            lengthSquared
        )
      );

    return Math.hypot(
      px - (ax + dx * t),
      py - (ay + dy * t)
    );
  };


  const placements:
    StoryForgeBiomeSymbolPlacement[] =
      [];

  const gridColumns =
    Math.ceil(
      100 / spacing
    );

  const gridRows =
    Math.ceil(
      100 / spacing
    );


  for (
    let gridY = 0;
    gridY < gridRows;
    gridY += 1
  ) {
    for (
      let gridX = 0;
      gridX < gridColumns;
      gridX += 1
    ) {
      const index =
        gridY *
          gridColumns +
        gridX;

      const baseX =
        (gridX + 0.5) *
          spacing +
        (
          unit(index, 4.71) -
          0.5
        ) *
          spacing *
          0.70;

      const baseY =
        (gridY + 0.5) *
          spacing +
        (
          unit(index, 11.83) -
          0.5
        ) *
          spacing *
          0.70;

      if (
        !pointIsBiome(
          baseX,
          baseY
        )
      ) {
        continue;
      }


      const column =
        Math.floor(
          (baseX / 100) *
            columns
        );

      const row =
        Math.floor(
          (baseY / 100) *
            rows
        );


      let neighbors = 0;

      for (
        let dy = -1;
        dy <= 1;
        dy += 1
      ) {
        for (
          let dx = -1;
          dx <= 1;
          dx += 1
        ) {
          if (
            dx === 0 &&
            dy === 0
          ) {
            continue;
          }

          if (
            hasCell(
              column + dx,
              row + dy
            )
          ) {
            neighbors += 1;
          }
        }
      }


      const baseDensity =
        neighbors >= 8
          ? 0.93
          : neighbors >= 6
            ? 0.78
            : neighbors >= 4
              ? 0.57
              : neighbors >= 2
                ? 0.36
                : 0.18;


      const biomeDensity =
        terrainType === "plains"
          ? 1.05
          : terrainType === "swamp"
            ? 0.96
            : terrainType === "desert"
              ? 0.88
              : 0.84;


      if (
        unit(index, 17.29) >
        Math.min(
          0.98,
          baseDensity *
            biomeDensity
        )
      ) {
        continue;
      }


      const sizeSeed =
        unit(index, 23.41);

      let scale =
        0.82 +
        sizeSeed * 0.25;

      if (
        neighbors <= 3
      ) {
        scale *= 0.86;
      }


      const radius =
        spacing *
        0.17 *
        scale;


      const shift =
        spacing * 0.38;

      const angle =
        unit(index, 29.73) *
        Math.PI *
        2;


      const offsets = [
        [0, 0],

        [
          Math.cos(angle) *
            shift * 0.5,
          Math.sin(angle) *
            shift * 0.5,
        ],

        [
          Math.cos(angle + 2.1) *
            shift * 0.5,
          Math.sin(angle + 2.1) *
            shift * 0.5,
        ],

        [
          Math.cos(angle - 2.1) *
            shift * 0.5,
          Math.sin(angle - 2.1) *
            shift * 0.5,
        ],

        [
          Math.cos(angle) *
            shift,
          Math.sin(angle) *
            shift,
        ],

        [
          Math.cos(angle + 2.1) *
            shift,
          Math.sin(angle + 2.1) *
            shift,
        ],

        [
          Math.cos(angle - 2.1) *
            shift,
          Math.sin(angle - 2.1) *
            shift,
        ],
      ];


      let accepted:
        {
          x: number;
          y: number;
        } |
        null = null;


      for (
        const [offsetX, offsetY]
        of offsets
      ) {
        const x =
          baseX + offsetX;

        const y =
          baseY + offsetY;


        const probes = [
          [x, y],
          [x - radius, y],
          [x + radius, y],
          [x, y - radius],
          [x, y + radius],
        ];


        if (
          probes.some(
            ([px, py]) =>
              !pointIsBiome(
                px,
                py
              ) ||
              !pointIsLand(
                map,
                px,
                py
              )
          )
        ) {
          continue;
        }


        let blocked = false;


        /*
         * Roads and rivers.
         */
        for (
          const segment
          of pathSegments
        ) {
          if (
            pointSegmentDistance(
              x,
              y,
              segment.ax,
              segment.ay,
              segment.bx,
              segment.by
            ) <
            segment.clearance +
              radius +
              0.18
          ) {
            blocked = true;
            break;
          }
        }

        if (blocked) {
          continue;
        }


        /*
         * Mountains use the same tightened 10% rule
         * already approved for Forest.
         */
        for (
          const stamp
          of map.terrain
        ) {
          if (
            stamp.type !==
            "mountain"
          ) {
            continue;
          }

          const clearance =
            (
              Math.max(
                0.95,
                stamp.size * 0.39
              ) +
              0.45 +
              radius * 0.70
            ) *
            0.90;

          if (
            Math.hypot(
              x - stamp.x,
              y - stamp.y
            ) <
            clearance
          ) {
            blocked = true;
            break;
          }
        }

        if (blocked) {
          continue;
        }


        /*
         * Locations.
         */
        for (
          const location
          of (map.locations ?? [])
        ) {
          const clearance =
            location.size === "large"
              ? 2.2
              : location.size === "medium"
                ? 1.7
                : location.size === "tiny"
                  ? 0.9
                  : 1.25;

          if (
            Math.hypot(
              x - location.x,
              y - location.y
            ) <
            clearance +
              radius +
              0.18
          ) {
            blocked = true;
            break;
          }
        }

        if (blocked) {
          continue;
        }


        /*
         * Keep direct symbols from sitting on top of
         * already accepted symbols.
         */
        if (
          placements.some(
            (existing) =>
              Math.hypot(
                existing.x - x,
                existing.y - y
              ) <
              spacing * 0.44
          )
        ) {
          continue;
        }


        accepted = {
          x,
          y,
        };

        break;
      }


      if (!accepted) {
        continue;
      }


      placements.push({
        x: accepted.x,
        y: accepted.y,
        scale,
        rotation:
          (
            unit(index, 41.63) -
            0.5
          ) *
          8,
      });


      if (
        placements.length >=
        1800
      ) {
        return placements;
      }
    }
  }


  return placements;
}




type StoryForgeSwampPool = {
  id: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation: number;
  variant: number;
};

type StoryForgeSwampChannel = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  control1X: number;
  control1Y: number;
  control2X: number;
  control2Y: number;
  width: number;
};

type StoryForgeSwampWater = {
  pools: StoryForgeSwampPool[];
  channels: StoryForgeSwampChannel[];
};


function buildStoryForgeSwampWaterFeatures(
  cells: Set<string>,
  columns: number,
  rows: number
): StoryForgeSwampWater {
  const swampCells =
    new Set<string>();

  cells.forEach((key) => {
    const {
      column,
      row,
    } = parseCellKey(key);

    swampCells.add(
      `${column}:${row}`
    );
  });


  const hasCell = (
    column: number,
    row: number
  ) =>
    column >= 0 &&
    row >= 0 &&
    column < columns &&
    row < rows &&
    swampCells.has(
      `${column}:${row}`
    );


  const unit = (
    column: number,
    row: number,
    salt: number
  ) => {
    const raw =
      Math.sin(
        column * 12.9898 +
        row * 78.233 +
        salt * 37.719
      ) *
      43758.5453;

    return (
      raw -
      Math.floor(raw)
    );
  };


  const cellWidth =
    100 / columns;

  const cellHeight =
    100 / rows;


  const pools:
    StoryForgeSwampPool[] =
    [];


  /*
   * Find broad interior swamp cells.
   * These become candidates for natural
   * wetland pools.
   */
  [...swampCells]
    .sort()
    .forEach((key) => {
      const [
        columnText,
        rowText,
      ] = key.split(":");

      const column =
        Number(columnText);

      const row =
        Number(rowText);

      let neighbors = 0;

      for (
        let dy = -1;
        dy <= 1;
        dy += 1
      ) {
        for (
          let dx = -1;
          dx <= 1;
          dx += 1
        ) {
          if (
            dx === 0 &&
            dy === 0
          ) {
            continue;
          }

          if (
            hasCell(
              column + dx,
              row + dy
            )
          ) {
            neighbors += 1;
          }
        }
      }


      /*
       * Keep most water away from the outer
       * swamp boundary.
       */
      if (neighbors < 5) {
        return;
      }


      const chance =
        neighbors >= 8
          ? 0.16
          : neighbors >= 7
            ? 0.115
            : 0.075;


      if (
        unit(
          column,
          row,
          3.17
        ) > chance
      ) {
        return;
      }


      const x =
        (
          column +
          0.5 +
          (
            unit(
              column,
              row,
              7.31
            ) -
            0.5
          ) *
          0.58
        ) *
        cellWidth;

      const y =
        (
          row +
          0.5 +
          (
            unit(
              column,
              row,
              11.73
            ) -
            0.5
          ) *
          0.58
        ) *
        cellHeight;


      /*
       * Prevent evenly packed puddles.
       */
      const tooClose =
        pools.some(
          (pool) =>
            Math.hypot(
              pool.x - x,
              pool.y - y
            ) < 3.15
        );

      if (tooClose) {
        return;
      }


      const sizeSeed =
        unit(
          column,
          row,
          17.49
        );


      pools.push({
        id:
          `swamp-pool-${column}-${row}`,

        x,
        y,

        rx:
          0.95 +
          sizeSeed *
            1.25,

        ry:
          0.42 +
          unit(
            column,
            row,
            21.27
          ) *
            0.68,

        rotation:
          (
            unit(
              column,
              row,
              29.71
            ) -
            0.5
          ) *
          46,

        variant:
          Math.floor(
            unit(
              column,
              row,
              31.93
            ) *
              3
          ),
      });
    });


  /*
   * A reasonably sized swamp should never
   * end up completely dry because of random
   * candidate rejection.
   */
  if (
    swampCells.size >= 25 &&
    pools.length === 0
  ) {
    const cellsArray =
      [...swampCells];

    const fallbackKey =
      cellsArray[
        Math.floor(
          cellsArray.length *
            0.5
        )
      ];

    if (fallbackKey) {
      const [
        columnText,
        rowText,
      ] =
        fallbackKey.split(":");

      const column =
        Number(columnText);

      const row =
        Number(rowText);

      pools.push({
        id:
          "swamp-pool-fallback",

        x:
          (
            column +
            0.5
          ) *
          cellWidth,

        y:
          (
            row +
            0.5
          ) *
          cellHeight,

        rx: 1.55,
        ry: 0.68,
        rotation: -8,
        variant: 0,
      });
    }
  }


  const channels:
    StoryForgeSwampChannel[] =
    [];


  /*
   * Connect selected nearby pools with
   * winding wetland channels.
   */
  pools.forEach(
    (pool, index) => {
      let nearest:
        StoryForgeSwampPool |
        null =
        null;

      let nearestDistance =
        Infinity;


      for (
        let otherIndex =
          index + 1;
        otherIndex <
          pools.length;
        otherIndex += 1
      ) {
        const other =
          pools[
            otherIndex
          ];

        const distance =
          Math.hypot(
            other.x -
              pool.x,
            other.y -
              pool.y
          );

        if (
          distance >= 3.0 &&
          distance <= 11 &&
          distance <
            nearestDistance
        ) {
          nearest =
            other;

          nearestDistance =
            distance;
        }
      }


      if (!nearest) {
        return;
      }


      const connectSeed =
        Math.abs(
          Math.sin(
            pool.x *
              4.171 +
            pool.y *
              7.331
          )
        );


      if (
        connectSeed >
        0.72
      ) {
        return;
      }


      const dx =
        nearest.x -
        pool.x;

      const dy =
        nearest.y -
        pool.y;

      const distance =
        Math.max(
          0.001,
          Math.hypot(
            dx,
            dy
          )
        );

      const perpendicularX =
        -dy /
        distance;

      const perpendicularY =
        dx /
        distance;

      const bend =
        Math.sin(
          pool.x *
            8.13 +
          nearest.y *
            5.91
        ) *
        Math.min(
          1.55,
          distance *
            0.18
        );


      channels.push({
        id:
          `swamp-channel-${pool.id}-${nearest.id}`,

        x1:
          pool.x,

        y1:
          pool.y,

        x2:
          nearest.x,

        y2:
          nearest.y,

        control1X:
          pool.x +
          dx *
            0.33 +
          perpendicularX *
            bend,

        control1Y:
          pool.y +
          dy *
            0.33 +
          perpendicularY *
            bend,

        control2X:
          pool.x +
          dx *
            0.68 -
          perpendicularX *
            bend *
            0.72,

        control2Y:
          pool.y +
          dy *
            0.68 -
          perpendicularY *
            bend *
            0.72,

        width:
          0.18 +
          connectSeed *
            0.12,
      });
    }
  );


  return {
    pools,
    channels,
  };
}


function buildStoryForgeForestEntities(
  map: StoryMap,
  cells: Set<string>,
  columns: number,
  rows: number,
  style: string | undefined,
  detailTier:
    | "overview"
    | "standard"
    | "detailed"
    | "close"
): StoryForgeForestEntityPlacement[] {
  const forest = new Set<string>();

  cells.forEach((key) => {
    const { column, row } =
      parseCellKey(key);

    forest.add(`${column}:${row}`);
  });

  const unit = (
    index: number,
    salt: number
  ) => {
    const raw =
      Math.sin(
        (index + 1) * 12.9898 +
          salt * 78.233
      ) * 43758.5453;

    return raw - Math.floor(raw);
  };

  const hasCell = (
    column: number,
    row: number
  ) =>
    column >= 0 &&
    row >= 0 &&
    column < columns &&
    row < rows &&
    forest.has(`${column}:${row}`);

  const inForest = (
    x: number,
    y: number
  ) => {
    if (
      x < 0 ||
      y < 0 ||
      x >= 100 ||
      y >= 100
    ) {
      return false;
    }

    return hasCell(
      Math.floor((x / 100) * columns),
      Math.floor((y / 100) * rows)
    );
  };

  const pointSegmentDistance = (
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number
  ) => {
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared =
      dx * dx + dy * dy;

    if (lengthSquared < 0.000001) {
      return Math.hypot(
        px - ax,
        py - ay
      );
    }

    const t = Math.max(
      0,
      Math.min(
        1,
        (
          (px - ax) * dx +
          (py - ay) * dy
        ) / lengthSquared
      )
    );

    return Math.hypot(
      px - (ax + dx * t),
      py - (ay + dy * t)
    );
  };

  /*
   * Convert roads/rivers, including curved segments,
   * into short collision segments.
   */
  const pathSegments: Array<{
    ax: number;
    ay: number;
    bx: number;
    by: number;
    clearance: number;
  }> = [];

  (map.paths ?? []).forEach((mapPath) => {
    for (
      let i = 1;
      i < mapPath.points.length;
      i += 1
    ) {
      const a = mapPath.points[i - 1];
      const b = mapPath.points[i];

      const clearance =
        mapPath.width / 2 +
        (mapPath.kind === "river"
          ? 0.82
          : 0.58);

      if (!b.curveFromPrevious) {
        pathSegments.push({
          ax: a.x,
          ay: a.y,
          bx: b.x,
          by: b.y,
          clearance,
        });
        continue;
      }

      const curve =
        curveGeometryForSegment(
          mapPath.kind,
          a,
          b,
          i
        );

      let lastX = a.x;
      let lastY = a.y;

      for (
        let sample = 1;
        sample <= 10;
        sample += 1
      ) {
        const t = sample / 10;
        const u = 1 - t;

        const x =
          u * u * u * a.x +
          3 * u * u * t *
            curve.control1X +
          3 * u * t * t *
            curve.control2X +
          t * t * t * b.x;

        const y =
          u * u * u * a.y +
          3 * u * u * t *
            curve.control1Y +
          3 * u * t * t *
            curve.control2Y +
          t * t * t * b.y;

        pathSegments.push({
          ax: lastX,
          ay: lastY,
          bx: x,
          by: y,
          clearance,
        });

        lastX = x;
        lastY = y;
      }
    }
  });

  /*
   * 100% zoom is deliberately denser than the old stamp.
   */
  const spacing =
    detailTier === "overview"
      ? 3.45
      : detailTier === "standard"
        ? 2.28
        : detailTier === "detailed"
          ? 2.03
          : 1.82;

  const gridColumns =
    Math.ceil(100 / spacing);

  const gridRows =
    Math.ceil(100 / spacing);

  const placements:
    StoryForgeForestEntityPlacement[] =
      [];

  for (
    let gy = 0;
    gy < gridRows;
    gy += 1
  ) {
    for (
      let gx = 0;
      gx < gridColumns;
      gx += 1
    ) {
      const index =
        gy * gridColumns + gx;

      const baseX =
        (gx + 0.5) * spacing +
        (unit(index, 3.17) - 0.5) *
          spacing * 0.68;

      const baseY =
        (gy + 0.5) * spacing +
        (unit(index, 9.41) - 0.5) *
          spacing * 0.68;

      if (!inForest(baseX, baseY)) {
        continue;
      }

      const column =
        Math.floor(
          (baseX / 100) * columns
        );

      const row =
        Math.floor(
          (baseY / 100) * rows
        );

      let neighbors = 0;

      for (
        let dy = -1;
        dy <= 1;
        dy += 1
      ) {
        for (
          let dx = -1;
          dx <= 1;
          dx += 1
        ) {
          if (dx === 0 && dy === 0) {
            continue;
          }

          if (
            hasCell(
              column + dx,
              row + dy
            )
          ) {
            neighbors += 1;
          }
        }
      }

      const density =
        neighbors >= 8
          ? 0.97
          : neighbors >= 6
            ? 0.84
            : neighbors >= 4
              ? 0.64
              : neighbors >= 2
                ? 0.42
                : 0.21;

      if (
        unit(index, 14.77) >
        density
      ) {
        continue;
      }

      const sizeSeed =
        unit(index, 21.37);

      let scale =
        0.67 +
        sizeSeed * 0.27;

      if (
        neighbors >= 7 &&
        sizeSeed > 0.91
      ) {
        scale += 0.14;
      }

      if (neighbors <= 3) {
        scale *= 0.80;
      } else if (neighbors <= 5) {
        scale *= 0.90;
      }

      const side =
        0.43 + scale * 0.27;

      const down =
        1.10 + scale * 0.68;

      /*
       * If blocked, try shifting the entire tree to one
       * of three nearby locations.
       */
      const shift =
        spacing * 0.40;

      const angle =
        unit(index, 26.43) *
        Math.PI * 2;

      const offsets = [
        [0, 0],

        /*
         * Small local adjustments first.
         */
        [
          Math.cos(angle) *
            shift * 0.52,
          Math.sin(angle) *
            shift * 0.52,
        ],
        [
          Math.cos(angle + 2.1) *
            shift * 0.52,
          Math.sin(angle + 2.1) *
            shift * 0.52,
        ],
        [
          Math.cos(angle - 2.1) *
            shift * 0.52,
          Math.sin(angle - 2.1) *
            shift * 0.52,
        ],

        /*
         * Then try the wider moves when a mountain,
         * road, river, or settlement needs more room.
         */
        [
          Math.cos(angle) * shift,
          Math.sin(angle) * shift,
        ],
        [
          Math.cos(angle + 2.1) *
            shift,
          Math.sin(angle + 2.1) *
            shift,
        ],
        [
          Math.cos(angle - 2.1) *
            shift,
          Math.sin(angle - 2.1) *
            shift,
        ],
      ];

      let accepted:
        { x: number; y: number } |
        null = null;

      for (
        const [offsetX, offsetY]
        of offsets
      ) {
        const x =
          baseX + offsetX;

        const y =
          baseY + offsetY;

        const probes = [
          [x, y],
          [x - side, y + 0.45],
          [x + side, y + 0.45],
          [x, y + down],
        ];

        /*
         * Whole tree must fit forest + land.
         */
        if (
          probes.some(
            ([px, py]) =>
              !inForest(px, py) ||
              !pointIsLand(
                map,
                px,
                py
              )
          )
        ) {
          continue;
        }

        const centerX = x;
        const centerY =
          y + down * 0.48;

        let blocked = false;

        for (
          const segment of pathSegments
        ) {
          if (
            pointSegmentDistance(
              centerX,
              centerY,
              segment.ax,
              segment.ay,
              segment.bx,
              segment.by
            ) <
            segment.clearance +
              0.48 +
              scale * 0.24
          ) {
            blocked = true;
            break;
          }
        }

        if (blocked) {
          continue;
        }

        for (
          const stamp of map.terrain
        ) {
          if (
            stamp.type !== "mountain"
          ) {
            continue;
          }

          /*
           * Mountains still keep a readable clearing,
           * but trees may grow about 10% closer than
           * before. Coastline behavior is unchanged.
           */
          const clearance =
            (
              Math.max(
                0.95,
                stamp.size * 0.39
              ) +
              0.45 +
              scale * 0.22
            ) *
            0.90;

          if (
            Math.hypot(
              centerX - stamp.x,
              centerY - stamp.y
            ) < clearance
          ) {
            blocked = true;
            break;
          }
        }

        if (blocked) {
          continue;
        }

        for (
          const location
          of (map.locations ?? [])
        ) {
          const clearance =
            location.size === "large"
              ? 2.2
              : location.size === "medium"
                ? 1.7
                : location.size === "tiny"
                  ? 0.9
                  : 1.25;

          if (
            Math.hypot(
              centerX - location.x,
              centerY - location.y
            ) <
            clearance +
              0.45 +
              scale * 0.22
          ) {
            blocked = true;
            break;
          }
        }

        if (!blocked) {
          accepted = { x, y };
          break;
        }
      }

      if (!accepted) {
        continue;
      }

      let kind:
        "pine" | "oak";

      if (style === "pine") {
        kind = "pine";
      } else if (style === "oak") {
        kind = "oak";
      } else if (style === "mixed") {
        kind =
          unit(index, 31.91) > 0.5
            ? "pine"
            : "oak";
      } else {
        kind =
          unit(index, 37.13) > 0.43
            ? "pine"
            : "oak";
      }

      placements.push({
        x: accepted.x,
        y: accepted.y,
        scale,
        kind,
      });

      if (
        placements.length >= 1800
      ) {
        return placements;
      }
    }
  }

  return placements;
}


function buildMapPathD(
  kind: MapPathKind,
  points: MapPathPoint[]
) {
  if (points.length === 0) {
    return "";
  }

  let d =
    `M ${points[0].x} ${points[0].y}`;

  for (
    let index = 1;
    index < points.length;
    index += 1
  ) {
    const previous =
      points[index - 1];

    const current =
      points[index];

    if (
      !current.curveFromPrevious
    ) {
      d +=
        ` L ${current.x} ${current.y}`;

      continue;
    }

    const curve =
      curveGeometryForSegment(
        kind,
        previous,
        current,
        index
      );

    d +=
      ` C ${curve.control1X} ${curve.control1Y}` +
      ` ${curve.control2X} ${curve.control2Y}` +
      ` ${current.x} ${current.y}`;
  }

  return d;
}


function sampleMapPath(
  mapPath: MapPath
) {
  if (
    mapPath.points.length === 0
  ) {
    return [] as Array<{
      x: number;
      y: number;
    }>;
  }

  const sampled: Array<{
    x: number;
    y: number;
  }> = [
    {
      x: mapPath.points[0].x,
      y: mapPath.points[0].y,
    },
  ];

  for (
    let index = 1;
    index < mapPath.points.length;
    index += 1
  ) {
    const previous =
      mapPath.points[index - 1];

    const current =
      mapPath.points[index];

    const dx =
      current.x -
      previous.x;

    const dy =
      current.y -
      previous.y;

    const distance =
      Math.max(
        0.001,
        Math.sqrt(
          dx * dx +
          dy * dy
        )
      );

    /*
     * Sample often enough that erase and
     * selection follow the visible curve.
     */
    const steps =
      Math.max(
        1,
        Math.ceil(
          distance / 0.20
        )
      );

    if (
      current.curveFromPrevious
    ) {
      const curve =
        curveGeometryForSegment(
          mapPath.kind,
          previous,
          current,
          index
        );

      for (
        let step = 1;
        step <= steps;
        step += 1
      ) {
        const t =
          step / steps;

        const inverse =
          1 - t;

        sampled.push({
          x:
            inverse *
              inverse *
              inverse *
              previous.x +
            3 *
              inverse *
              inverse *
              t *
              curve.control1X +
            3 *
              inverse *
              t *
              t *
              curve.control2X +
            t *
              t *
              t *
              current.x,

          y:
            inverse *
              inverse *
              inverse *
              previous.y +
            3 *
              inverse *
              inverse *
              t *
              curve.control1Y +
            3 *
              inverse *
              t *
              t *
              curve.control2Y +
            t *
              t *
              t *
              current.y,
        });
      }

      continue;
    }

    for (
      let step = 1;
      step <= steps;
      step += 1
    ) {
      const t =
        step / steps;

      sampled.push({
        x:
          previous.x +
          dx * t,

        y:
          previous.y +
          dy * t,
      });
    }
  }

  return sampled;
}

function mapPathTouchesPoint(
  mapPath: MapPath,
  x: number,
  y: number,
  radius: number
) {
  const hitRadius =
    radius +
    Math.max(
      0.15,
      mapPath.width / 2
    );

  return sampleMapPath(
    mapPath
  ).some((point) => {
    const dx =
      point.x - x;

    const dy =
      point.y - y;

    return (
      Math.sqrt(
        dx * dx +
        dy * dy
      ) <= hitRadius
    );
  });
}


function mapPathTouchesArea(
  mapPath: MapPath,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const padding =
    Math.max(
      0.15,
      mapPath.width / 2
    );

  const left =
    Math.min(x1, x2) -
    padding;

  const right =
    Math.max(x1, x2) +
    padding;

  const top =
    Math.min(y1, y2) -
    padding;

  const bottom =
    Math.max(y1, y2) +
    padding;

  return sampleMapPath(
    mapPath
  ).some(
    (point) =>
      point.x >= left &&
      point.x <= right &&
      point.y >= top &&
      point.y <= bottom
  );
}


export function MapPage({
  worldId,
}: {
  worldId: string;
}) {
  const storageKey = `storyforge-maps-${worldId}`;

  const [maps, setMaps] = useState<StoryMap[]>([]);
  const [loadedWorldId, setLoadedWorldId] = useState("");

  const [selectedMapId, setSelectedMapId] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);

  const [newMapName, setNewMapName] = useState("");
  const [newMapType, setNewMapType] =
    useState<MapType>("world");

  const [tool, setTool] =
    useState<EditorTool>("select");

  const [eraseTargets, setEraseTargets] =
    useState<EraseTarget[]>([]);

  /*
   * No selected targets means:
   * erase everything touched except the
   * map base/background itself.
   */
  const eraseAll =
    eraseTargets.length === 0;

  const shouldEraseTerrain = (
    type: TerrainType
  ) =>
    eraseAll ||
    eraseTargets.includes(type);

  const shouldEraseRegion = () =>
    eraseAll ||
    eraseTargets.includes("region");

  const shouldErasePath = (
    kind: MapPathKind
  ) =>
    eraseAll ||
    eraseTargets.includes(kind);

  const toggleEraseTarget = (
    target: EraseTarget
  ) => {
    setEraseTargets((old) =>
      old.includes(target)
        ? old.filter(
            (item) =>
              item !== target
          )
        : [
            ...old,
            target,
          ]
    );
  };

  const [drawMode, setDrawMode] =
    useState<DrawMode>("freehand");

  const [
    pathDraft,
    setPathDraft,
  ] = useState<MapPath | null>(null);

  const [
    pathHoverPoint,
    setPathHoverPoint,
  ] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [
    pathSegmentMode,
    setPathSegmentMode,
  ] =
    useState<PathSegmentMode>("curve");

  const [
    pathWidth,
    setPathWidth,
  ] = useState(1.2);

  const [
    roadStyle,
    setRoadStyle,
  ] =
    useState<RoadStyle>("pathway");

  const pathFreehandDrawingRef =
    useRef(false);

  const [brushShape, setBrushShape] =
    useState<BrushShape>("round");

  const [regionName, setRegionName] =
    useState("");

  const [areaPreview, setAreaPreview] =
    useState<{
      x1: number;
      y1: number;
      x2: number;
      y2: number;
    } | null>(null);

  const [undoStack, setUndoStack] =
    useState<MapHistorySnapshot[]>([]);

  const undoStackRef =
    useRef<MapHistorySnapshot[]>([]);

  const [terrainStyles, setTerrainStyles] =
    useState<Record<TerrainType, string>>({
      ...DEFAULT_TERRAIN_STYLES,
    });

  const selectedBiomeTool =
    BIOME_TOOLS.find(
      (item) =>
        item.key === tool
    );

  const [brushSize, setBrushSize] = useState(6);

  /*
   * Mountain artwork size is separate from
   * range length and automatic density.
   */
  const [
    mountainScale,
    setMountainScale,
  ] = useState(1);
  /*
   * MAP ZOOM
   *
   * Zoom affects presentation only.
   * Saved map coordinates stay unchanged.
   */
  const [mapZoom, setMapZoom] = useState(1);

  const mapDetailTier:
    | "overview"
    | "standard"
    | "detailed"
    | "close" =
    mapZoom < 0.75
      ? "overview"
      : mapZoom < 1.25
        ? "standard"
        : mapZoom < 1.75
          ? "detailed"
          : "close";

  const [gridSize, setGridSize] = useState(28);
  const [showGrid, setShowGrid] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [locationEditor, setLocationEditor] =
    useState<{
      location: MapLocation;
      isNew: boolean;
    } | null>(null);

  const [placingLocation, setPlacingLocation] =
    useState(false);

  const [
    selectedLocationType,
    setSelectedLocationType,
  ] = useState<LocationType | null>(null);

  const [
    locationSearch,
    setLocationSearch,
  ] = useState("");

  const [movingLocationId, setMovingLocationId] =
    useState("");

  const canvasRef = useRef<HTMLDivElement>(null);

  /*
   * Keep the map aspect ratio outside the SVG render path.
   *
   * Reading getBoundingClientRect() during JSX rendering can
   * force synchronous browser layout work. ResizeObserver
   * updates this only when the canvas layout actually changes.
   */
  const [
    renderCanvasAspect,
    setRenderCanvasAspect,
  ] = useState(1.6);

  useEffect(() => {
    if (!editorOpen) {
      return;
    }

    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const updateAspect = () => {
      const width =
        canvas.clientWidth;

      const height =
        canvas.clientHeight;

      if (
        width <= 0 ||
        height <= 0
      ) {
        return;
      }

      const nextAspect =
        width / height;

      setRenderCanvasAspect(
        (oldAspect) =>
          Math.abs(
            oldAspect -
            nextAspect
          ) < 0.001
            ? oldAspect
            : nextAspect
      );
    };

    updateAspect();

    const observer =
      new ResizeObserver(
        updateAspect
      );

    observer.observe(canvas);

    return () => {
      observer.disconnect();
    };
  }, [
    editorOpen,
    selectedMapId,
  ]);

  /*
   * MAP TRACKPAD CAMERA
   *
   * Click the map once to make it the active
   * camera surface.
   *
   * Chromium-based browsers expose a laptop
   * trackpad pinch as a WheelEvent with ctrlKey.
   * We intercept that gesture only over the map,
   * preventing browser-page zoom while changing
   * StoryForge's own mapZoom instead.
   */
  const mapGestureActiveRef =
    useRef(false);

  /*
   * FAST CAMERA STATE
   *
   * Trackpad pinch updates the visual camera directly.
   * React only receives the final zoom after the gesture
   * settles, preventing the entire map renderer from
   * rebuilding for every tiny trackpad event.
   */
  const mapZoomRef =
    useRef(mapZoom);

  const zoomCommitTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null
    );

  useEffect(() => {
    mapZoomRef.current = mapZoom;

    if (canvasRef.current) {
      canvasRef.current.style.transform =
        `scale(${mapZoom})`;
    }
  }, [mapZoom]);

  useEffect(() => {
    if (!editorOpen) {
      mapGestureActiveRef.current = false;
      return;
    }

    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const handlePointerDown = (
      event: PointerEvent
    ) => {
      const target =
        event.target;

      mapGestureActiveRef.current =
        target instanceof Node &&
        canvas.contains(target);
    };

    const handleDocumentPointerDown = (
      event: PointerEvent
    ) => {
      const target =
        event.target;

      if (
        !(target instanceof Node) ||
        !canvas.contains(target)
      ) {
        mapGestureActiveRef.current = false;
      }
    };

    const handleTrackpadPinch = (
      event: WheelEvent
    ) => {
      /*
       * Normal two-finger scrolling does NOT
       * zoom the map.
       *
       * Chromebook/Chromium trackpad pinch is
       * represented by ctrlKey + wheel.
       */
      if (
        !mapGestureActiveRef.current ||
        !event.ctrlKey
      ) {
        return;
      }

      /*
       * Stop Chrome from zooming the entire page.
       */
      event.preventDefault();
      event.stopPropagation();

      /*
       * Smooth proportional zoom.
       *
       * Clamp each incoming gesture event so a
       * large trackpad delta cannot suddenly jump
       * from one zoom extreme to the other.
       */
      const zoomStep =
        Math.max(
          -0.08,
          Math.min(
            0.08,
            -event.deltaY * 0.004
          )
        );

      const nextZoom =
        mapZoomRef.current *
        (1 + zoomStep);

      const clampedZoom =
        Math.max(
          0.5,
          Math.min(
            2,
            nextZoom
          )
        );

      const roundedZoom =
        Math.round(
          clampedZoom * 1000
        ) / 1000;

      /*
       * High-frequency camera motion bypasses React.
       * CSS transforms are considerably cheaper than
       * rebuilding all biome SVGs, masks and mountains.
       */
      mapZoomRef.current =
        roundedZoom;

      canvas.style.transform =
        `scale(${roundedZoom})`;

      /*
       * Once the pinch pauses, commit the camera value
       * back to React. This updates the percentage and
       * detail tier only once per gesture burst.
       */
      if (
        zoomCommitTimerRef.current
      ) {
        clearTimeout(
          zoomCommitTimerRef.current
        );
      }

      zoomCommitTimerRef.current =
        setTimeout(() => {
          setMapZoom(
            mapZoomRef.current
          );

          zoomCommitTimerRef.current =
            null;
        }, 140);
    };

    canvas.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    document.addEventListener(
      "pointerdown",
      handleDocumentPointerDown,
      true
    );

    canvas.addEventListener(
      "wheel",
      handleTrackpadPinch,
      {
        passive: false,
      }
    );

    return () => {
      if (
        zoomCommitTimerRef.current
      ) {
        clearTimeout(
          zoomCommitTimerRef.current
        );

        zoomCommitTimerRef.current =
          null;
      }

      canvas.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.removeEventListener(
        "pointerdown",
        handleDocumentPointerDown,
        true
      );

      canvas.removeEventListener(
        "wheel",
        handleTrackpadPinch
      );
    };
  }, [
    editorOpen,
    selectedMapId,
  ]);

  const locationEditorRef =
    useRef<HTMLDivElement>(null);

  /*
   * When a new location is placed on the map,
   * automatically bring its editor into view.
   */
  useEffect(() => {
    if (
      !locationEditor ||
      !locationEditor.isNew
    ) {
      return;
    }

    locationEditorRef.current
      ?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
  }, [
    locationEditor?.location.id,
    locationEditor?.isNew,
  ]);

  const areaStartRef = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const areaCurrentRef = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const paintingRef = useRef(false);
  const currentStrokeIdRef = useRef("");

  const lastPaintRef = useRef<{
    x: number;
    y: number;
  } | null>(null);

  const activeMap = useMemo(
    () =>
      maps.find((map) => map.id === selectedMapId) ??
      null,
    [maps, selectedMapId]
  );

  /*
   * MAP RENDER CACHES
   *
   * These collections only rebuild when the actual
   * saved map data changes. Camera motion and unrelated
   * editor state can reuse the same prepared data.
   */
  const biomeRenderGroups = useMemo(() => {
    const groups =
      new Map<
        string,
        {
          terrainType: TerrainType;
          style?: string;
          columns: number;
          rows: number;
          cells: Set<string>;
        }
      >();

    (
      activeMap?.regions ?? []
    ).forEach((region) => {
      if (
        region.kind === "political" ||
        !region.terrainType
      ) {
        return;
      }

      const groupKey = [
        region.kind,
        region.terrainType,
        region.style ?? "",
        region.columns,
        region.rows,
      ].join(":");

      let group =
        groups.get(groupKey);

      if (!group) {
        group = {
          terrainType:
            region.terrainType,
          style:
            region.style,
          columns:
            region.columns,
          rows:
            region.rows,
          cells:
            new Set<string>(),
        };

        groups.set(
          groupKey,
          group
        );
      }

      region.cells.forEach(
        (key) =>
          group!.cells.add(key)
      );
    });

    return groups;
  }, [activeMap?.regions]);

  const landWaterTerrainStamps =
    useMemo(
      () =>
        (
          activeMap?.terrain ?? []
        ).filter(
          (stamp) =>
            stamp.type === "land" ||
            stamp.type === "water"
        ),
      [activeMap?.terrain]
    );

  const mountainTerrainStamps =
    useMemo(
      () =>
        (
          activeMap?.terrain ?? []
        ).filter(
          (stamp) =>
            stamp.type === "mountain"
        ),
      [activeMap?.terrain]
    );

  const politicalMapRegions =
    useMemo(
      () =>
        (
          activeMap?.regions ?? []
        ).filter(
          (region) =>
            region.kind === "political"
        ),
      [activeMap?.regions]
    );


  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const parsed: unknown = raw
        ? JSON.parse(raw)
        : [];

      if (Array.isArray(parsed)) {
        const loaded = parsed as StoryMap[];

        setMaps(
          loaded.map((map) => ({
            ...map,
            base: map.base ?? "water",
            colors: {
              ...map.colors,
              water:
                map.style === "old-timey" &&
                map.colors?.water === "#8fa7a6"
                  ? "#6f9fbd"
                  : map.colors?.water ?? "#6f9fbd",
            },
            terrain: Array.isArray(map.terrain)
              ? map.terrain
              : [],
            regions: Array.isArray(map.regions)
              ? map.regions
              : [],
            locations: Array.isArray(map.locations)
              ? map.locations
              : [],
            paths: Array.isArray(map.paths)
              ? map.paths
              : [],
          }))
        );
      } else {
        setMaps([]);
      }
    } catch {
      setMaps([]);
    }

    setSelectedMapId("");
    setEditorOpen(false);
    setLoadedWorldId(worldId);
    setLocationEditor(null);
    setPlacingLocation(false);
    setMovingLocationId("");
    setTool("select");
  }, [storageKey, worldId]);

  useEffect(() => {
    if (loadedWorldId !== worldId) return;

    localStorage.setItem(
      storageKey,
      JSON.stringify(maps)
    );
  }, [
    maps,
    loadedWorldId,
    storageKey,
    worldId,
  ]);

  const updateMap = (
    mapId: string,
    update:
      | Partial<StoryMap>
      | ((map: StoryMap) => StoryMap)
  ) => {
    setMaps((old) =>
      old.map((map) => {
        if (map.id !== mapId) return map;

        const next =
          typeof update === "function"
            ? update(map)
            : {
                ...map,
                ...update,
              };

        return {
          ...next,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  const erasePathsAtPoint = (
    x: number,
    y: number
  ) => {
    if (!activeMap) {
      return;
    }

    if (
      !shouldErasePath("road") &&
      !shouldErasePath("river")
    ) {
      return;
    }

    const rect =
      canvasRef.current
        ?.getBoundingClientRect();

    const gridEraseRadius =
      rect &&
      rect.width > 0
        ? Math.max(
            0.8,
            (
              (
                gridSize /
                rect.width
              ) *
              100
            ) / 2
          )
        : 1.2;

    const eraseRadius =
      drawMode === "grid"
        ? gridEraseRadius
        : Math.max(
            3,
            brushSize / 2
          );

    updateMap(
      activeMap.id,
      (map) => ({
        ...map,

        paths:
          (map.paths ?? [])
            .filter(
              (mapPath) => {
                if (
                  !shouldErasePath(
                    mapPath.kind
                  )
                ) {
                  return true;
                }

                return !mapPathTouchesPoint(
                  mapPath,
                  x,
                  y,
                  eraseRadius
                );
              }
            ),
      })
    );
  };


  const erasePathsInArea = (
    start: {
      x: number;
      y: number;
    },
    end: {
      x: number;
      y: number;
    }
  ) => {
    if (!activeMap) {
      return;
    }

    if (
      !shouldErasePath("road") &&
      !shouldErasePath("river")
    ) {
      return;
    }

    updateMap(
      activeMap.id,
      (map) => ({
        ...map,

        paths:
          (map.paths ?? [])
            .filter(
              (mapPath) => {
                if (
                  !shouldErasePath(
                    mapPath.kind
                  )
                ) {
                  return true;
                }

                return !mapPathTouchesArea(
                  mapPath,
                  start.x,
                  start.y,
                  end.x,
                  end.y
                );
              }
            ),
      })
    );
  };


  const pushUndoSnapshot = (
    map: StoryMap
  ) => {
    const snapshot: MapHistorySnapshot = {
      mapId: map.id,

      terrain: map.terrain.map(
        (stamp) => ({
          ...stamp,
        })
      ),

      regions: (map.regions ?? []).map(
        (region) => ({
          ...region,
          cells: [...region.cells],
        })
      ),

      locations: map.locations.map(
        (location) => ({
          ...location,
        })
      ),

      paths: (map.paths ?? []).map(
        (path) => ({
          ...path,
          points:
            path.points.map(
              (point) => ({
                ...point,
              })
            ),
        })
      ),
    };

    const nextStack = [
      ...undoStackRef.current.slice(-39),
      snapshot,
    ];

    undoStackRef.current =
      nextStack;

    setUndoStack(nextStack);
  };

  const openMap = (mapId: string) => {
    setSelectedMapId(mapId);
    setEditorOpen(true);

    undoStackRef.current = [];
    setUndoStack([]);

    setTool("select");
    setLocationEditor(null);
    setPlacingLocation(false);
    setMovingLocationId("");
    setShowSettings(false);
  };

  const closeEditor = () => {
    setEditorOpen(false);

    setTool("select");
    setLocationEditor(null);
    setPlacingLocation(false);
    setMovingLocationId("");
    setShowSettings(false);
  };

  const createMap = () => {
    const trimmedName = newMapName.trim();

    if (!trimmedName) return;

    const now = new Date().toISOString();

    const map: StoryMap = {
      id: crypto.randomUUID(),
      name: trimmedName,
      type: newMapType,
      style: "old-timey",
      colors: {
        ...STYLE_PRESETS["old-timey"],
      },
      base: "water",
      terrain: [],
      regions: [],
      locations: [],
      paths: [],
      createdAt: now,
      updatedAt: now,
    };

    setMaps((old) => [...old, map]);

    setNewMapName("");

    setSelectedMapId(map.id);
    setEditorOpen(true);
    setTool("select");
  };

  const deleteMap = () => {
    if (!activeMap) return;

    const remaining = maps.filter(
      (map) => map.id !== activeMap.id
    );

    setMaps(remaining);
    setSelectedMapId("");
    setEditorOpen(false);
    setLocationEditor(null);
  };

  const changeStyle = (style: MapStyle) => {
    if (!activeMap) return;

    if (style === "custom") {
      updateMap(activeMap.id, {
        style,
      });

      return;
    }

    updateMap(activeMap.id, {
      style,
      colors: {
        ...STYLE_PRESETS[style],
      },
    });
  };

  const updateColor = (
    key: keyof MapColors,
    value: string
  ) => {
    if (!activeMap) return;

    updateMap(activeMap.id, {
      style: "custom",
      colors: {
        ...activeMap.colors,
        [key]: value,
      },
    });
  };

  const canvasPoint = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    const rect =
      event.currentTarget.getBoundingClientRect();

    const rawX =
      ((event.clientX - rect.left) / rect.width) *
      100;

    const rawY =
      ((event.clientY - rect.top) / rect.height) *
      100;

    return {
      x: Math.max(0, Math.min(100, rawX)),
      y: Math.max(0, Math.min(100, rawY)),
    };
  };

  const pointSupportsBiome = (
      map: NonNullable<typeof activeMap>,
      x: number,
      y: number
    ) => {
      if (
        pointIsLand(
          map,
          x,
          y
        )
      ) {
        return true;
      }

      /*
       * Explicit Water should never be bridged
       * by biome painting.
       */
      for (
        let index =
          map.terrain.length - 1;
        index >= 0;
        index -= 1
      ) {
        const stamp =
          map.terrain[index];

        if (
          stamp.type !== "land" &&
          stamp.type !== "water"
        ) {
          continue;
        }

        if (
          pointInsideTerrainStamp(
            stamp,
            x,
            y
          )
        ) {
          return (
            stamp.type ===
            "land"
          );
        }
      }

      /*
       * Smoothed Land can visually cover a
       * microscopic gap between source stamps.
       *
       * Only bridge the gap when Land surrounds
       * the cell from all four directions. This
       * fills pinholes without expanding biomes
       * noticeably beyond the actual coastline.
       */
      const sampleX =
        (100 / REGION_COLUMNS) *
        0.46;

      const sampleY =
        (100 / REGION_ROWS) *
        0.46;

      return (
        pointIsLand(
          map,
          x - sampleX,
          y
        ) &&
        pointIsLand(
          map,
          x + sampleX,
          y
        ) &&
        pointIsLand(
          map,
          x,
          y - sampleY
        ) &&
        pointIsLand(
          map,
          x,
          y + sampleY
        )
      );
    };

    const applyAreaSelection = (
    startPoint: {
      x: number;
      y: number;
    },
    endPoint: {
      x: number;
      y: number;
    }
  ) => {
    if (!activeMap) return;

    const kind =
      areaKindForTool(tool);

    const erasingWithArea =
      tool === "erase";

    if (
      !kind &&
      !erasingWithArea
    ) {
      return;
    }

    const minX = Math.min(
      startPoint.x,
      endPoint.x
    );

    const maxX = Math.max(
      startPoint.x,
      endPoint.x
    );

    const minY = Math.min(
      startPoint.y,
      endPoint.y
    );

    const maxY = Math.max(
      startPoint.y,
      endPoint.y
    );

    if (
      maxX - minX < 0.3 ||
      maxY - minY < 0.3
    ) {
      return;
    }

    const areaCellWidth =

      100 /

      REGION_COLUMNS;


    const areaCellHeight =

      100 /

      REGION_ROWS;


    const areaWidthCells =

      (maxX - minX) /

      areaCellWidth;


    const areaHeightCells =

      (maxY - minY) /

      areaCellHeight;


    /*

     * Large biome Area selections should

     * have an organic outside silhouette

     * instead of a ruler-straight rectangle.

     *

     * Only edge cells are affected. Interior

     * cells remain solid, preventing holes.

     */

    const naturalizeBiomeArea =

      kind === "biome" &&

      Math.min(

        areaWidthCells,

        areaHeightCells

      ) >= 4;


    const cells: string[] = [];

    for (
      let row = 0;
      row < REGION_ROWS;
      row += 1
    ) {
      const centerY =
        ((row + 0.5) /
          REGION_ROWS) *
        100;

      if (
        centerY < minY ||
        centerY > maxY
      ) {
        continue;
      }

      for (
        let column = 0;
        column < REGION_COLUMNS;
        column += 1
      ) {
        const centerX =
          ((column + 0.5) /
            REGION_COLUMNS) *
          100;

        if (
          centerX < minX ||
          centerX > maxX
        ) {
          continue;
        }

        if (
            naturalizeBiomeArea
          ) {
            const edgeDistance =
              Math.min(
                (
                  centerX -
                  minX
                ) /
                  areaCellWidth,
                (
                  maxX -
                  centerX
                ) /
                  areaCellWidth,
                (
                  centerY -
                  minY
                ) /
                  areaCellHeight,
                (
                  maxY -
                  centerY
                ) /
                  areaCellHeight
              );

            /*
             * Stable edge noise:
             * same cell = same coastline every render.
             */
            const rawEdgeNoise =
              Math.sin(
                (
                  column + 1
                ) *
                  12.9898 +
                  (
                    row + 1
                  ) *
                    78.233
              ) *
              43758.5453;

            const edgeNoise =
              rawEdgeNoise -
              Math.floor(
                rawEdgeNoise
              );

            /*
             * Only disturb roughly the outer
             * one-cell band. The center remains
             * completely filled.
             */
            if (
              edgeDistance <
                1.15 &&
              edgeNoise <
                0.34
            ) {
              continue;
            }
          }

          if (
            !erasingWithArea &&
            !pointSupportsBiome(
              activeMap,
              centerX,
              centerY
            )
          ) {
            continue;
          }

        cells.push(
          cellKey(column, row)
        );
      }
    }

    if (cells.length === 0) {
      return;
    }

    const selectedCells =
      new Set(cells);

    if (erasingWithArea) {
      updateMap(
        activeMap.id,
        (map) => ({
          ...map,

          /*
           * Erase matching terrain stamps,
           * regardless of whether they came
           * from Freehand or Grid.
           */
          terrain:
            map.terrain.filter(
              (stamp) => {
                if (
                  !shouldEraseTerrain(
                    stamp.type
                  )
                ) {
                  return true;
                }

                return !(
                  stamp.x >= minX &&
                  stamp.x <= maxX &&
                  stamp.y >= minY &&
                  stamp.y <= maxY
                );
              }
            ),

          /*
           * Area biomes/features and political
           * regions use the exact same Eraser
           * selection rules.
           */
          regions:
            (map.regions ?? [])
              .map((region) => {
                const matches =
                  region.kind ===
                    "political"
                    ? shouldEraseRegion()
                    : region.terrainType
                      ? shouldEraseTerrain(
                          region.terrainType
                        )
                      : eraseAll;

                if (!matches) {
                  return region;
                }

                return {
                  ...region,

                  cells:
                    region.cells.filter(
                      (key) =>
                        !selectedCells.has(
                          key
                        )
                    ),
                };
              })
              .filter(
                (region) =>
                  region.cells.length > 0
              ),

          /*
           * Universal Eraser also removes
           * location markers it touches.
           *
           * Targeted Location erasing will be
           * added when we build the new
           * Location palette next.
           */
          locations:
            eraseAll
              ? map.locations.filter(
                  (location) =>
                    !(
                      location.x >=
                        minX &&
                      location.x <=
                        maxX &&
                      location.y >=
                        minY &&
                      location.y <=
                        maxY
                    )
                )
              : map.locations,
        })
      );

      return;
    }

    const terrainType =
      isTerrainTool(tool)
        ? tool
        : undefined;

    const currentRegions =
      activeMap.regions ?? [];

    const politicalCount =
      currentRegions.filter(
        (region) =>
          region.kind === "political"
      ).length;

    const newRegion: TerrainRegion = {
      id: crypto.randomUUID(),
      kind,
      name:
        kind === "political"
          ? regionName.trim() ||
            `Region ${politicalCount + 1}`
          : `${title(
              terrainType ?? "region"
            )} Area`,
      terrainType,
      style:
        terrainType &&
        terrainStyles[terrainType]
          ? terrainStyles[terrainType]
          : undefined,
      cells,
      columns: REGION_COLUMNS,
      rows: REGION_ROWS,
      createdAt:
        new Date().toISOString(),
    };

    updateMap(activeMap.id, (map) => {
      const existing =
        map.regions ?? [];

      if (kind === "biome") {
        /*
         * Biomes behave like actual paint.
         *
         * Painting Plains over Forest removes
         * Forest from those cells first.
         * Painting Forest back over Plains does
         * the reverse.
         */
        const replacingCells =
          new Set(
            newRegion.cells
          );

        const cleanedRegions =
          existing
            .map((region) => {
              if (
                region.kind !==
                "biome"
              ) {
                return region;
              }

              return {
                ...region,

                cells:
                  region.cells.filter(
                    (key) =>
                      !replacingCells.has(
                        key
                      )
                  ),
              };
            })
            .filter(
              (region) =>
                region.cells.length > 0
            );

        return {
          ...map,

          regions: [
            ...cleanedRegions,
            newRegion,
          ],
        };
      }

      return {
        ...map,
        regions: [
          ...existing,
          newRegion,
        ],
      };
    });

    if (kind === "political") {
      setRegionName("");
    }
  };

  const paintBiomeCells = (
    cells: string[],
    terrainType: TerrainType
  ) => {
    if (
      !activeMap ||
      cells.length === 0
    ) {
      return;
    }

    const selectedCells =
      new Set(cells);

    const selectedStyle =
      terrainStyles[terrainType];

    updateMap(
      activeMap.id,
      (map) => {
        const existing =
          map.regions ?? [];

        /*
         * Painting a biome replaces any other
         * biome occupying the same cells.
         */
        const cleaned =
          existing
            .map((region) => {
              if (
                region.kind !==
                "biome"
              ) {
                return region;
              }

              return {
                ...region,

                cells:
                  region.cells.filter(
                    (key) =>
                      !selectedCells.has(
                        key
                      )
                  ),
              };
            })
            .filter(
              (region) =>
                region.cells.length > 0
            );

        /*
         * Reuse an existing region of the same
         * biome/style instead of making hundreds
         * of tiny regions while freehand drawing.
         */
        const matchingIndex =
          cleaned.findIndex(
            (region) =>
              region.kind ===
                "biome" &&
              region.terrainType ===
                terrainType &&
              region.style ===
                selectedStyle &&
              region.columns ===
                REGION_COLUMNS &&
              region.rows ===
                REGION_ROWS
          );

        if (
          matchingIndex >= 0
        ) {
          const matching =
            cleaned[
              matchingIndex
            ];

          const mergedCells =
            Array.from(
              new Set([
                ...matching.cells,
                ...cells,
              ])
            );

          const updated =
            [...cleaned];

          updated[
            matchingIndex
          ] = {
            ...matching,
            cells: mergedCells,
          };

          return {
            ...map,
            regions: updated,
          };
        }

        const newBiome:
          TerrainRegion = {
            id:
              crypto.randomUUID(),

            kind: "biome",

            name:
              `${title(
                terrainType
              )} Area`,

            terrainType,

            style:
              selectedStyle,

            cells,

            columns:
              REGION_COLUMNS,

            rows:
              REGION_ROWS,

            createdAt:
              new Date()
                .toISOString(),
          };

        return {
          ...map,

          regions: [
            ...cleaned,
            newBiome,
          ],
        };
      }
    );
  };

  const fillEnclosedArea = (
    x: number,
    y: number
  ) => {
    if (
      !activeMap ||
      !canUseFillMode(tool)
    ) {
      return;
    }

    const terrainType =
      tool as TerrainType;

    const startColumn =
      Math.max(
        0,
        Math.min(
          REGION_COLUMNS - 1,
          Math.floor(
            (x / 100) *
              REGION_COLUMNS
          )
        )
      );

    const startRow =
      Math.max(
        0,
        Math.min(
          REGION_ROWS - 1,
          Math.floor(
            (y / 100) *
              REGION_ROWS
          )
        )
      );

    const boundary =
      new Set<string>();

    /*
     * For Land/Water Fill we also remember
     * which actual terrain stamps created the
     * enclosing boundary.
     *
     * After a successful Fill, those outline
     * stamps and the new interior can become
     * one shared smoothed terrain shape.
     */
    const boundaryStampIds =
      new Map<
        string,
        Set<string>
      >();

    /*
     * Existing region cells of the selected
     * terrain count as Fill boundaries.
     *
     * This catches Forest/Plains/etc. outlines
     * created through the unified biome system.
     */
    for (
      const region of
      activeMap.regions ?? []
    ) {
      if (
        region.terrainType !==
        terrainType
      ) {
        continue;
      }

      for (
        const key of
        region.cells
      ) {
        boundary.add(key);
      }
    }

    /*
     * Rasterize matching terrain stamps onto
     * the same 120 x 75 grid.
     *
     * This lets Freehand/Grid Land and Water
     * strokes act as Fill boundaries too.
     */
    const matchingStamps =
      activeMap.terrain.filter(
        (stamp) =>
          stamp.type ===
          terrainType
      );

    for (
      const stamp of
      matchingStamps
    ) {
      const halfWidth =
        stamp.size / 2;

      const halfHeight =
        (
          stamp.size *
          MAP_LOGICAL_ASPECT
        ) / 2;

      const minColumn =
        Math.max(
          0,
          Math.floor(
            (
              (stamp.x -
                halfWidth) /
              100
            ) *
              REGION_COLUMNS
          ) - 1
        );

      const maxColumn =
        Math.min(
          REGION_COLUMNS - 1,
          Math.ceil(
            (
              (stamp.x +
                halfWidth) /
              100
            ) *
              REGION_COLUMNS
          ) + 1
        );

      const minRow =
        Math.max(
          0,
          Math.floor(
            (
              (stamp.y -
                halfHeight) /
              100
            ) *
              REGION_ROWS
          ) - 1
        );

      const maxRow =
        Math.min(
          REGION_ROWS - 1,
          Math.ceil(
            (
              (stamp.y +
                halfHeight) /
              100
            ) *
              REGION_ROWS
          ) + 1
        );

      for (
        let row = minRow;
        row <= maxRow;
        row += 1
      ) {
        for (
          let column =
            minColumn;
          column <=
            maxColumn;
          column += 1
        ) {
            const cellX =
              (
                (column + 0.5) /
                REGION_COLUMNS
              ) * 100;

            const cellY =
              (
                (row + 0.5) /
                REGION_ROWS
              ) * 100;

            /*
             * Grid drawing and Fill use different
             * logical grids.
             *
             * A Grid square may overlap a Fill cell
             * even when the Fill cell center falls
             * just outside the square.
             *
             * Square Grid stamps therefore use
             * rectangle-overlap detection. Other
             * terrain stamps keep their normal
             * point-in-stamp geometry.
             */
            const fillCellWidth =
              100 /
              REGION_COLUMNS;

            const fillCellHeight =
              100 /
              REGION_ROWS;

            const cellLeft =
              column *
              fillCellWidth;

            const cellRight =
              (column + 1) *
              fillCellWidth;

            const cellTop =
              row *
              fillCellHeight;

            const cellBottom =
              (row + 1) *
              fillCellHeight;

            const gridSquareTouchesCell =
              stamp.mode ===
                "grid" &&
              stamp.shape ===
                "square" &&
              (
                /*
                 * Large Grid squares are detected when
                 * the Fill cell center falls inside them.
                 *
                 * Tiny Grid squares may be smaller than
                 * a Fill cell, so also assign them to the
                 * Fill cell containing the square's own
                 * center.
                 *
                 * Unlike the previous any-overlap test,
                 * this does not turn one tiny square into
                 * several blocked boundary cells.
                 */
                pointInsideTerrainStamp(
                  stamp,
                  cellX,
                  cellY
                ) ||
                (
                  stamp.x >=
                    cellLeft &&
                  stamp.x <
                    cellRight &&
                  stamp.y >=
                    cellTop &&
                  stamp.y <
                    cellBottom
                )
              );

            const touchesBoundaryCell =
              gridSquareTouchesCell ||
              pointInsideTerrainStamp(
                stamp,
                cellX,
                cellY
              );

            if (
              touchesBoundaryCell
            ) {
            const key =
              cellKey(
                column,
                row
              );

            boundary.add(key);

            const owners =
              boundaryStampIds.get(
                key
              ) ??
              new Set<string>();

            owners.add(
              stamp.id
            );

            boundaryStampIds.set(
              key,
              owners
            );
          }
        }
      }
    }

    const startKey =
      cellKey(
        startColumn,
        startRow
      );

    if (
      boundary.has(startKey)
    ) {
      window.alert(
        "Click inside the outline, not directly on the outline."
      );

      return;
    }

    /*
     * Classic four-direction flood fill.
     *
     * If the flood can reach any outside edge,
     * the outline is considered open and we
     * refuse to paint anything.
     */
    const visited =
      new Set<string>();

    const queue: Array<{
      column: number;
      row: number;
    }> = [
      {
        column:
          startColumn,
        row:
          startRow,
      },
    ];

    visited.add(startKey);

    let queueIndex = 0;
    let escaped = false;

    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    while (
      queueIndex <
      queue.length
    ) {
      const current =
        queue[
          queueIndex
        ];

      queueIndex += 1;

      if (
        current.column === 0 ||
        current.row === 0 ||
        current.column ===
          REGION_COLUMNS - 1 ||
        current.row ===
          REGION_ROWS - 1
      ) {
        escaped = true;
        break;
      }

      for (
        const [
          columnChange,
          rowChange,
        ] of directions
      ) {
        const nextColumn =
          current.column +
          columnChange;

        const nextRow =
          current.row +
          rowChange;

        if (
          nextColumn < 0 ||
          nextColumn >=
            REGION_COLUMNS ||
          nextRow < 0 ||
          nextRow >=
            REGION_ROWS
        ) {
          escaped = true;
          break;
        }

        const nextKey =
          cellKey(
            nextColumn,
            nextRow
          );

        if (
          visited.has(
            nextKey
          ) ||
          boundary.has(
            nextKey
          )
        ) {
          continue;
        }

        visited.add(
          nextKey
        );

        queue.push({
          column:
            nextColumn,
          row:
            nextRow,
        });
      }

      if (escaped) {
        break;
      }
    }

    if (escaped) {
      window.alert(
        "That outline appears to be open. Close the gap and try Fill again."
      );

      return;
    }

    if (
      visited.size === 0
    ) {
      return;
    }

    /*
     * Determine which Land/Water stamps actually
     * touch the filled interior.
     *
     * We only merge the enclosing outline, not
     * unrelated terrain elsewhere on the map.
     */
    const enclosingStampIds =
      new Set<string>();

    for (
      const key of visited
    ) {
      const {
        column,
        row,
      } =
        parseCellKey(key);

      const neighbors = [
        [column + 1, row],
        [column - 1, row],
        [column, row + 1],
        [column, row - 1],
      ];

      for (
        const [
          neighborColumn,
          neighborRow,
        ] of neighbors
      ) {
        if (
          neighborColumn < 0 ||
          neighborColumn >=
            REGION_COLUMNS ||
          neighborRow < 0 ||
          neighborRow >=
            REGION_ROWS
        ) {
          continue;
        }

        const neighborKey =
          cellKey(
            neighborColumn,
            neighborRow
          );

        const owners =
          boundaryStampIds.get(
            neighborKey
          );

        if (!owners) {
          continue;
        }

        for (
          const stampId of owners
        ) {
          enclosingStampIds.add(
            stampId
          );
        }
      }
    }

    /*
     * If one piece of an original Freehand/Grid
     * stroke touches the enclosed area, include
     * that whole stroke in the merged shape.
     */
    const enclosingStrokeIds =
      new Set<string>();

    for (
      const stamp of
      matchingStamps
    ) {
      if (
        enclosingStampIds.has(
          stamp.id
        ) &&
        stamp.strokeId
      ) {
        enclosingStrokeIds.add(
          stamp.strokeId
        );
      }
    }

    /*
     * Biomes use the shared biome-cell system.
     * They are also clipped to valid land.
     */
    if (
      terrainType ===
        "forest" ||
      terrainType ===
        "plains" ||
      terrainType ===
        "desert" ||
      terrainType ===
        "swamp" ||
      terrainType ===
        "snow"
    ) {
      const biomeCells =
        Array.from(
          visited
        ).filter(
          (key) => {
            const {
              column,
              row,
            } =
              parseCellKey(
                key
              );

            const cellX =
              (
                (column +
                  0.5) /
                REGION_COLUMNS
              ) * 100;

            const cellY =
              (
                (row +
                  0.5) /
                REGION_ROWS
              ) * 100;

            return pointIsLand(
              activeMap,
              cellX,
              cellY
            );
          }
        );

      if (
        biomeCells.length ===
        0
      ) {
        window.alert(
          "This biome Fill needs to be inside land."
        );

        return;
      }

      pushUndoSnapshot(
        activeMap
      );

      paintBiomeCells(
        biomeCells,
        terrainType
      );

      return;
    }

    /*
     * Land and Water are still stored as
     * TerrainStamp records, so create one
     * shared fill stroke in a single update.
     *
     * The cell dimensions match the existing
     * 120 x 75 logical map grid.
     */
    const fillStrokeId =
      crypto.randomUUID();

    /*
     * Fill cells overlap their neighbors slightly.
     *
     * A hand-drawn outline can pass through only
     * part of a logical grid cell. If filled cells
     * stop exactly at the grid edge, tiny strips of
     * the map underneath can remain visible between
     * the outline and the fill.
     *
     * This overlap seals those visual seams without
     * changing the flood-fill boundary itself.
     */
    const cellSize =
      (100 /
        REGION_COLUMNS) *
      1.30;

    const fillStamps:
      TerrainStamp[] =
      Array.from(
        visited
      ).map(
        (key) => {
          const {
            column,
            row,
          } =
            parseCellKey(
              key
            );

          return {
            id:
              crypto.randomUUID(),

            type:
              terrainType,

            x:
              (
                (column +
                  0.5) /
                REGION_COLUMNS
              ) * 100,

            y:
              (
                (row +
                  0.5) /
                REGION_ROWS
              ) * 100,

            size:
              cellSize,

            mode:
              "grid",

            shape:
              "square",

            strokeId:
              fillStrokeId,

            terrainStyle:
              terrainStyles[
                terrainType
              ],

            smoothed: true,
            fillGenerated: true,
          };
        }
      );

    pushUndoSnapshot(
      activeMap
    );

    updateMap(
      activeMap.id,
      (map) => ({
        ...map,

        terrain: [
          ...map.terrain.map(
            (stamp) => {
              const belongsToOutline =
                enclosingStampIds.has(
                  stamp.id
                ) ||
                Boolean(
                  stamp.strokeId &&
                  enclosingStrokeIds.has(
                    stamp.strokeId
                  )
                );

              if (
                !belongsToOutline
              ) {
                return stamp;
              }

              return {
                ...stamp,

                /*
                 * The outline and its filled
                 * interior now render through
                 * one shared SVG smoothing mask.
                 */
                strokeId:
                  fillStrokeId,

                smoothed: true,
              };
            }
          ),

          ...fillStamps,
        ],
      })
    );
  };

  const paintAt = (
    x: number,
    y: number
  ) => {
    if (!activeMap) return;

    if (
      tool === "select" ||
      tool === "location"
    ) {
      return;
    }

    /*
     * Roads and rivers are independent map
     * paths. Let the same Eraser gesture hit
     * them before the existing terrain/region
     * erase logic runs.
     */
    if (tool === "erase") {
      erasePathsAtPoint(
        x,
        y
      );
    }

    if (drawMode === "grid") {
      const rect =
        canvasRef.current?.getBoundingClientRect();

      if (!rect || rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const cellPixels = gridSize;

      const xPixels = (x / 100) * rect.width;
      const yPixels = (y / 100) * rect.height;

      const snappedXPixels =
        Math.floor(xPixels / cellPixels) * cellPixels +
        cellPixels / 2;

      const snappedYPixels =
        Math.floor(yPixels / cellPixels) * cellPixels +
        cellPixels / 2;

      const snappedX =
        (snappedXPixels / rect.width) * 100;

      const snappedY =
        (snappedYPixels / rect.height) * 100;

      const cellWidthPercent =
        (cellPixels / rect.width) * 100;

      if (tool === "erase") {
        const column =
          Math.max(
            0,
            Math.min(
              REGION_COLUMNS - 1,
              Math.floor(
                (snappedX / 100) *
                  REGION_COLUMNS
              )
            )
          );

        const row =
          Math.max(
            0,
            Math.min(
              REGION_ROWS - 1,
              Math.floor(
                (snappedY / 100) *
                  REGION_ROWS
              )
            )
          );

        const targetCell =
          cellKey(
            column,
            row
          );

        updateMap(
          activeMap.id,
          (map) => ({
            ...map,

            terrain:
              map.terrain.filter(
                (stamp) => {
                  if (
                    !shouldEraseTerrain(
                      stamp.type
                    )
                  ) {
                    return true;
                  }

                  const stampXPixels =
                    (stamp.x / 100) *
                    rect.width;

                  const stampYPixels =
                    (stamp.y / 100) *
                    rect.height;

                  return (
                    Math.abs(
                      stampXPixels -
                        snappedXPixels
                    ) >
                      cellPixels / 2 ||
                    Math.abs(
                      stampYPixels -
                        snappedYPixels
                    ) >
                      cellPixels / 2
                  );
                }
              ),

            regions:
              (map.regions ?? [])
                .map((region) => {
                  const matches =
                    region.kind ===
                      "political"
                      ? shouldEraseRegion()
                      : region.terrainType
                        ? shouldEraseTerrain(
                            region.terrainType
                          )
                        : eraseAll;

                  if (!matches) {
                    return region;
                  }

                  return {
                    ...region,

                    cells:
                      region.cells.filter(
                        (key) =>
                          key !==
                          targetCell
                      ),
                  };
                })
                .filter(
                  (region) =>
                    region.cells.length >
                    0
                ),

            locations:
              eraseAll
                ? map.locations.filter(
                    (location) => {
                      const lx =
                        (location.x /
                          100) *
                        rect.width;

                      const ly =
                        (location.y /
                          100) *
                        rect.height;

                      return (
                        Math.abs(
                          lx -
                            snappedXPixels
                        ) >
                          cellPixels / 2 ||
                        Math.abs(
                          ly -
                            snappedYPixels
                        ) >
                          cellPixels / 2
                      );
                    }
                  )
                : map.locations,
          })
        );

        return;
      }

      const terrainTool =
        tool as TerrainType;

      /*
       * Grid is only the INPUT method.
       * Biomes themselves use the shared biome
       * representation so they render exactly
       * like Area and Freehand biomes.
       */
      if (
        areaKindForTool(
          terrainTool
        ) === "biome"
      ) {
        const left =
          snappedX -
          cellWidthPercent / 2;

        const right =
          snappedX +
          cellWidthPercent / 2;

        const cellHeightPercent =
          (cellPixels /
            rect.height) *
          100;

        const top =
          snappedY -
          cellHeightPercent / 2;

        const bottom =
          snappedY +
          cellHeightPercent / 2;

        const biomeCells:
          string[] = [];

        for (
          let row = 0;
          row < REGION_ROWS;
          row += 1
        ) {
          const centerY =
            ((row + 0.5) /
              REGION_ROWS) *
            100;

          if (
            centerY < top ||
            centerY > bottom
          ) {
            continue;
          }

          for (
            let column = 0;
            column <
            REGION_COLUMNS;
            column += 1
          ) {
            const centerX =
              ((column + 0.5) /
                REGION_COLUMNS) *
              100;

            if (
              centerX < left ||
              centerX > right
            ) {
              continue;
            }

            /*
             * Interior biomes may only exist
             * on actual land.
             */
            if (
              !pointSupportsBiome(
                  activeMap,
                  centerX,
                  centerY
                )
            ) {
              continue;
            }

            biomeCells.push(
              cellKey(
                column,
                row
              )
            );
          }
        }

        paintBiomeCells(
          biomeCells,
          terrainTool
        );

        return;
      }

      const gridStrokeId =
          currentStrokeIdRef.current ||
          crypto.randomUUID();

        currentStrokeIdRef.current =
          gridStrokeId;

        updateMap(activeMap.id, (map) => {
        const alreadyPainted =
          map.terrain.some((stamp) => {
            if (
              stamp.mode !== "grid" ||
              stamp.type !== terrainTool
            ) {
              return false;
            }

            const stampXPixels =
              (stamp.x / 100) * rect.width;

            const stampYPixels =
              (stamp.y / 100) * rect.height;

            return (
              Math.abs(stampXPixels - snappedXPixels) < 1 &&
              Math.abs(stampYPixels - snappedYPixels) < 1
            );
          });

        if (alreadyPainted) return map;

        return {
          ...map,
          terrain: [
            ...map.terrain,
            {
              id: crypto.randomUUID(),
              type: terrainTool,
              x: snappedX,
              y: snappedY,
              size: cellWidthPercent,
              mode: "grid",
              shape: "square",
              strokeId:
                  gridStrokeId,
                terrainStyle:
                terrainStyles[terrainTool],

                  mountainScale:
                    terrainTool === "mountain"
                      ? mountainScale
                      : undefined,
            },
          ],
        };
      });

      return;
    }

    if (tool === "erase") {
      const eraseRadius =
        Math.max(
          3,
          brushSize / 2
        );

      const cellsToErase =
        new Set<string>();

      const minColumn =
        Math.max(
          0,
          Math.floor(
            ((x -
              eraseRadius) /
              100) *
              REGION_COLUMNS
          )
        );

      const maxColumn =
        Math.min(
          REGION_COLUMNS - 1,
          Math.ceil(
            ((x +
              eraseRadius) /
              100) *
              REGION_COLUMNS
          )
        );

      const minRow =
        Math.max(
          0,
          Math.floor(
            ((y -
              eraseRadius) /
              100) *
              REGION_ROWS
          )
        );

      const maxRow =
        Math.min(
          REGION_ROWS - 1,
          Math.ceil(
            ((y +
              eraseRadius) /
              100) *
              REGION_ROWS
          )
        );

      for (
        let row = minRow;
        row <= maxRow;
        row += 1
      ) {
        const centerY =
          ((row + 0.5) /
            REGION_ROWS) *
          100;

        for (
          let column =
            minColumn;
          column <=
            maxColumn;
          column += 1
        ) {
          const centerX =
            ((column + 0.5) /
              REGION_COLUMNS) *
            100;

          const dx =
            centerX - x;

          const dy =
            centerY - y;

          if (
            Math.sqrt(
              dx * dx +
                dy * dy
            ) <= eraseRadius
          ) {
            cellsToErase.add(
              cellKey(
                column,
                row
              )
            );
          }
        }
      }

      updateMap(
        activeMap.id,
        (map) => ({
          ...map,

          terrain:
            map.terrain.filter(
              (stamp) => {
                if (
                  !shouldEraseTerrain(
                    stamp.type
                  )
                ) {
                  return true;
                }

                const dx =
                  stamp.x - x;

                const dy =
                  stamp.y - y;

                return (
                  Math.sqrt(
                    dx * dx +
                      dy * dy
                  ) >
                  eraseRadius
                );
              }
            ),

          regions:
            (map.regions ?? [])
              .map((region) => {
                const matches =
                  region.kind ===
                    "political"
                    ? shouldEraseRegion()
                    : region.terrainType
                      ? shouldEraseTerrain(
                          region.terrainType
                        )
                      : eraseAll;

                if (!matches) {
                  return region;
                }

                return {
                  ...region,

                  cells:
                    region.cells.filter(
                      (key) =>
                        !cellsToErase.has(
                          key
                        )
                    ),
                };
              })
              .filter(
                (region) =>
                  region.cells.length > 0
              ),

          locations:
            eraseAll
              ? map.locations.filter(
                  (location) => {
                    const dx =
                      location.x - x;

                    const dy =
                      location.y - y;

                    return (
                      Math.sqrt(
                        dx * dx +
                          dy * dy
                      ) >
                      eraseRadius
                    );
                  }
                )
              : map.locations,
        })
      );

      return;
    }

    const previous = lastPaintRef.current;
    const terrainTool = tool as TerrainType;

    const strokeId =
      currentStrokeIdRef.current ||
      crypto.randomUUID();

    currentStrokeIdRef.current = strokeId;

    const points: Array<{
      x: number;
      y: number;
    }> = [];

    if (!previous) {
      points.push({ x, y });
    } else {
      const dx = x - previous.x;
      const dy = y - previous.y;

      const distance = Math.sqrt(
        dx * dx + dy * dy
      );

      const spacing =
        Math.max(
          0.12,
          brushSize * 0.03
        );

      const steps = Math.max(
        1,
        Math.ceil(distance / spacing)
      );

      for (let index = 1; index <= steps; index += 1) {
        const progress = index / steps;

        points.push({
          x: previous.x + dx * progress,
          y: previous.y + dy * progress,
        });
      }
    }

    lastPaintRef.current = { x, y };

    const rect =
      canvasRef.current?.getBoundingClientRect();

    const canvasAspect =
      rect && rect.height > 0
        ? rect.width / rect.height
        : 1.6;

    /*
     * Forest, Plains, Desert, Swamp and Snow
     * use one shared biome system regardless
     * of drawing mode.
     */
    if (
      areaKindForTool(
        terrainTool
      ) === "biome"
    ) {
      const biomeCells =
        new Set<string>();

      /*
       * brushSize is already expressed in the
       * same 0-100 canvas coordinate system as
       * the terrain stamps.
       */
      const radius =
        Math.max(
          0.5,
          brushSize / 2
        );

      for (
        const point of points
      ) {
        const minColumn =
          Math.max(
            0,
            Math.floor(
              ((point.x -
                radius) /
                100) *
                REGION_COLUMNS
            )
          );

        const maxColumn =
          Math.min(
            REGION_COLUMNS - 1,
            Math.ceil(
              ((point.x +
                radius) /
                100) *
                REGION_COLUMNS
            )
          );

        const minRow =
          Math.max(
            0,
            Math.floor(
              ((point.y -
                radius) /
                100) *
                REGION_ROWS
            )
          );

        const maxRow =
          Math.min(
            REGION_ROWS - 1,
            Math.ceil(
              ((point.y +
                radius) /
                100) *
                REGION_ROWS
            )
          );

        for (
          let row = minRow;
          row <= maxRow;
          row += 1
        ) {
          const centerY =
            ((row + 0.5) /
              REGION_ROWS) *
            100;

          for (
            let column =
              minColumn;
            column <=
              maxColumn;
            column += 1
          ) {
            const centerX =
              ((column + 0.5) /
                REGION_COLUMNS) *
              100;

            const dx =
              centerX -
              point.x;

            const dy =
              centerY -
              point.y;

            if (
              Math.sqrt(
                dx * dx +
                  dy * dy
              ) > radius
            ) {
              continue;
            }

            if (
              !pointSupportsBiome(
                  activeMap,
                  centerX,
                  centerY
                )
            ) {
              continue;
            }

            biomeCells.add(
              cellKey(
                column,
                row
              )
            );
          }
        }
      }

      paintBiomeCells(
        [...biomeCells],
        terrainTool
      );

      return;
    }

    const stamps: TerrainStamp[] = [];

    for (const point of points) {
      stamps.push({
        id: crypto.randomUUID(),
        type: terrainTool,
        x: point.x,
        y: point.y,
        size: brushSize,
        mode: "freehand",
        shape: brushShape,
        strokeId,
        terrainStyle:
          terrainStyles[terrainTool],

          mountainScale:
            terrainTool === "mountain"
              ? mountainScale
              : undefined,
      });
    }

    updateMap(activeMap.id, (map) => ({
      ...map,
      terrain: [
        ...map.terrain,
        ...stamps,
      ],
    }));
  };

  const beginPainting = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (!activeMap) return;

    const point = canvasPoint(event);

    if (
      tool === "river" ||
      tool === "road"
    ) {
      const kind:
        MapPathKind =
        tool;

      if (
        pathSegmentMode ===
        "straight"
      ) {
        pathFreehandDrawingRef.current =
          true;

        setPathHoverPoint(null);

        setPathDraft({
          id:
            crypto.randomUUID(),

          kind,

          width:
            pathWidth,

          roadStyle:
            kind === "road"
              ? roadStyle
              : undefined,

          points: [
            {
              x: point.x,
              y: point.y,
            },
          ],

          createdAt:
            new Date()
              .toISOString(),
        });

        event.currentTarget
          .setPointerCapture(
            event.pointerId
          );

        return;
      }

      setPathDraft(
        (old) => {
          if (
            !old ||
            old.kind !== kind
          ) {
            return {
              id:
                crypto.randomUUID(),

              kind,

              width:
                pathWidth,

              roadStyle:
                kind === "road"
                  ? roadStyle
                  : undefined,

              points: [
                {
                  x: point.x,
                  y: point.y,
                },
              ],

              createdAt:
                new Date()
                  .toISOString(),
            };
          }

          const lastPoint =
            old.points[
              old.points.length -
                1
            ];

          if (
            lastPoint &&
            Math.hypot(
              point.x -
                lastPoint.x,
              point.y -
                lastPoint.y
            ) < 0.15
          ) {
            return old;
          }

          return {
            ...old,

            width:
              pathWidth,

            points: [
              ...old.points,
              {
                x: point.x,
                y: point.y,

                curveFromPrevious:
                  pathSegmentMode ===
                  "curve",
              },
            ],
          };
        }
      );

      setPathHoverPoint(null);

      return;
    }

    if (
      drawMode === "fill" &&
      canUseFillMode(tool)
    ) {
      fillEnclosedArea(
        point.x,
        point.y
      );

      return;
    }

    if (
      drawMode === "area" &&
      canUseAreaMode(tool)
    ) {
      pushUndoSnapshot(activeMap);

      areaStartRef.current = point;
      areaCurrentRef.current = point;

      setAreaPreview({
        x1: point.x,
        y1: point.y,
        x2: point.x,
        y2: point.y,
      });

      event.currentTarget.setPointerCapture(
        event.pointerId
      );

      return;
    }

    if (
      tool === "location" &&
      placingLocation &&
      selectedLocationType &&
      !movingLocationId
    ) {
      setLocationEditor({
        isNew: true,

        location: {
          id:
            crypto.randomUUID(),

          name: "",

          type:
            selectedLocationType,

          icon:
            LOCATION_ICONS[
              selectedLocationType
            ],

          x: point.x,
          y: point.y,

          description: "",
          size: "small",
        },
      });

      /*
       * Position is chosen now.
       * The editor that opens next handles
       * the name/details before saving.
       */
      setPlacingLocation(false);

      return;
    }

    if (movingLocationId) {
      pushUndoSnapshot(activeMap);

      updateMap(activeMap.id, (map) => ({
        ...map,
        locations: map.locations.map(
          (location) =>
            location.id === movingLocationId
              ? {
                  ...location,
                  x: point.x,
                  y: point.y,
                }
              : location
        ),
      }));

      setMovingLocationId("");
      setTool("select");

      return;
    }

    if (
      tool === "select" ||
      tool === "location"
    ) {
      return;
    }

    pushUndoSnapshot(activeMap);

    paintingRef.current = true;
    lastPaintRef.current = null;
    currentStrokeIdRef.current =
      crypto.randomUUID();

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    paintAt(point.x, point.y);
  };

  const continuePainting = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (
      drawMode === "area" &&
      areaStartRef.current
    ) {
      const point =
        canvasPoint(event);

      areaCurrentRef.current =
        point;

      setAreaPreview({
        x1:
          areaStartRef.current.x,
        y1:
          areaStartRef.current.y,
        x2: point.x,
        y2: point.y,
      });

      return;
    }

    if (
      (
        tool === "river" ||
        tool === "road"
      ) &&
      pathDraft &&
      pathDraft.points.length > 0
    ) {
      const point =
        canvasPoint(event);

      /*
       * Internally "straight" now powers
       * the Freehand drawing mode.
       */
      if (
        pathSegmentMode ===
        "straight"
      ) {
        if (
          pathFreehandDrawingRef.current
        ) {
          setPathDraft(
            (old) => {
              if (!old) {
                return old;
              }

              const lastPoint =
                old.points[
                  old.points.length - 1
                ];

              /*
               * Ignore extremely tiny mouse
               * movements so the stroke does
               * not collect excessive points.
               */
              if (
                lastPoint &&
                Math.hypot(
                  point.x -
                    lastPoint.x,
                  point.y -
                    lastPoint.y
                ) < 0.12
              ) {
                return old;
              }

              return {
                ...old,

                width:
                  pathWidth,

                points: [
                  ...old.points,
                  {
                    x: point.x,
                    y: point.y,

                    curveFromPrevious:
                      false,
                  },
                ],
              };
            }
          );
        }

        /*
         * Freehand has no floating endpoint
         * after the mouse is released.
         */
        return;
      }

      /*
       * Internal Curve mode remains the
       * click-to-route Natural mode.
       */
      setPathHoverPoint({
        x: point.x,
        y: point.y,
      });

      return;
    }

    if (!paintingRef.current) return;

    const point = canvasPoint(event);

    paintAt(point.x, point.y);
  };

  const stopPainting = () => {
    if (
      (
        tool === "river" ||
        tool === "road"
      ) &&
      pathSegmentMode ===
        "straight" &&
      pathFreehandDrawingRef.current
    ) {
      pathFreehandDrawingRef.current =
        false;

      /*
       * Keep the completed stroke as a
       * draft until Finish is pressed.
       */
      return;
    }

    if (
      drawMode === "area" &&
      areaStartRef.current &&
      areaCurrentRef.current
    ) {
      if (tool === "erase") {
        erasePathsInArea(
          areaStartRef.current,
          areaCurrentRef.current
        );
      }

      applyAreaSelection(
        areaStartRef.current,
        areaCurrentRef.current
      );

      areaStartRef.current = null;
      areaCurrentRef.current = null;
      setAreaPreview(null);

      return;
    }

    const completedStrokeId =
        currentStrokeIdRef.current;

      const shouldAutoSmoothTerrain =
        Boolean(
          completedStrokeId
        ) &&
        (
          tool === "land" ||
          tool === "water"
        ) &&
        (
          drawMode === "grid" ||
          drawMode === "freehand"
        );

      paintingRef.current = false;
      lastPaintRef.current = null;

      if (
        activeMap &&
        shouldAutoSmoothTerrain
      ) {
        updateMap(
          activeMap.id,
          (map) => ({
            ...map,

            terrain:
              map.terrain.map(
                (stamp) =>
                  stamp.strokeId ===
                  completedStrokeId
                    ? {
                        ...stamp,
                        smoothed:
                            stamp.size >=
                            MIN_AUTO_SMOOTH_TERRAIN_SIZE,
                      }
                    : stamp
              ),
          })
        );
      }

      currentStrokeIdRef.current = "";
  };

  const finishPath = () => {
    if (
      !activeMap ||
      !pathDraft ||
      pathDraft.points.length < 2
    ) {
      return;
    }

    pushUndoSnapshot(activeMap);

    const finishedPoints: MapPathPoint[] =
      pathSegmentMode ===
      "straight"
        ? (() => {
            let points:
              MapPathPoint[] =
              pathDraft.points.map(
                (point, index) => ({
                  ...point,

                  curveFromPrevious:
                    index === 0
                      ? undefined
                      : false,
                })
              );

            /*
             * Two gentle smoothing passes remove
             * mouse wobble while preserving the
             * route and exact endpoints.
             */
            for (
              let pass = 0;
              pass < 2;
              pass += 1
            ) {
              points =
                points.map(
                  (
                    point,
                    index,
                    source
                  ) => {
                    if (
                      index === 0 ||
                      index ===
                        source.length - 1
                    ) {
                      return {
                        ...point,
                      };
                    }

                    const previous =
                      source[index - 1];

                    const next =
                      source[index + 1];

                    return {
                      ...point,

                      x:
                        previous.x *
                          0.25 +
                        point.x *
                          0.5 +
                        next.x *
                          0.25,

                      y:
                        previous.y *
                          0.25 +
                        point.y *
                          0.5 +
                        next.y *
                          0.25,

                      curveFromPrevious:
                        false,
                    };
                  }
                );
            }

            return points;
          })()
        : pathDraft.points.map(
            (point) => ({
              ...point,
            })
          );

    const finishedPath: MapPath = {
      ...pathDraft,

      width:
        pathWidth,

      points:
        finishedPoints,
    };

    updateMap(
      activeMap.id,
      (map) => ({
        ...map,

        paths: [
          ...(map.paths ?? []),
          finishedPath,
        ],
      })
    );

    setPathDraft(null);
    setPathHoverPoint(null);
  };

  const cancelPath = () => {
    setPathDraft(null);
    setPathHoverPoint(null);
  };

  const smoothLastAction = () => {
    if (!activeMap) return;

    const lastActionId =
      [...activeMap.terrain]
        .reverse()
        .find(
          (stamp) =>
            stamp.strokeId
        )
        ?.strokeId;

    if (!lastActionId) return;

    pushUndoSnapshot(activeMap);

    updateMap(
      activeMap.id,
      (map) => ({
        ...map,

        terrain:
          map.terrain.map(
            (stamp) =>
              stamp.strokeId ===
              lastActionId
                ? {
                    ...stamp,
                    smoothed: true,
                  }
                : stamp
          ),
      })
    );
  };

  const undoLastAction = () => {
    if (!activeMap) return;

    const stack =
      undoStackRef.current;

    if (stack.length === 0) {
      return;
    }

    const snapshot =
      stack[stack.length - 1];

    if (
      snapshot.mapId !==
      activeMap.id
    ) {
      return;
    }

    const nextStack =
      stack.slice(0, -1);

    undoStackRef.current =
      nextStack;

    setUndoStack(nextStack);

    setMaps((old) =>
      old.map((map) =>
        map.id === activeMap.id
          ? {
              ...map,

              terrain:
                snapshot.terrain.map(
                  (stamp) => ({
                    ...stamp,
                  })
                ),

              regions:
                snapshot.regions.map(
                  (region) => ({
                    ...region,
                    cells: [
                      ...region.cells,
                    ],
                  })
                ),

              locations:
                snapshot.locations.map(
                  (location) => ({
                    ...location,
                  })
                ),

              paths:
                snapshot.paths.map(
                  (path) => ({
                    ...path,
                    points:
                      path.points.map(
                        (point) => ({
                          ...point,
                        })
                      ),
                  })
                ),

              updatedAt:
                new Date().toISOString(),
            }
          : map
      )
    );
  };

  const addLocation = () => {
    /*
     * Clicking Location again exits Location mode.
     */
    if (tool === "location") {
      setTool("select");
      setSelectedLocationType(null);
      setLocationSearch("");
      setLocationEditor(null);
      setPlacingLocation(false);
      setMovingLocationId("");
      return;
    }

    setTool("location");
    setSelectedLocationType(null);
    setLocationSearch("");
    setLocationEditor(null);
    setMovingLocationId("");
    setPlacingLocation(false);
  };

  const chooseLocationSearchValue = (
    value: string
  ) => {
    setLocationSearch(value);

    const search =
      value
        .trim()
        .toLowerCase();

    if (!search) {
      return;
    }

    const matchedType =
      LOCATION_PALETTE_TYPES.find(
        (type) =>
          type.toLowerCase() === search ||
          LOCATION_LABELS[type]
            .toLowerCase() === search
      );

    if (!matchedType) {
      return;
    }

    setSelectedLocationType(
      matchedType
    );

    setLocationSearch("");
    setLocationEditor(null);
    setPlacingLocation(true);
  };

  const saveNewLocation = () => {
    if (
      !activeMap ||
      !locationEditor ||
      !locationEditor.isNew
    ) {
      return;
    }

    const cleanLocation: MapLocation = {
      ...locationEditor.location,

      name:
        locationEditor.location.name.trim() ||
        `Unnamed ${
          LOCATION_LABELS[
            locationEditor.location.type
          ]
        }`,

      description:
        locationEditor.location.description
          ?.trim() || "",
    };

    pushUndoSnapshot(activeMap);

    updateMap(
      activeMap.id,
      (map) => ({
        ...map,

        locations: [
          ...map.locations,
          cleanLocation,
        ],
      })
    );

    setLocationEditor(null);
    setPlacingLocation(false);

    /*
     * Stay in Location mode so another marker
     * can be placed without reopening the tool.
     */
  };

  const saveExistingLocation = () => {
    if (
      !activeMap ||
      !locationEditor ||
      locationEditor.isNew
    ) {
      return;
    }

    const cleanLocation: MapLocation = {
      ...locationEditor.location,
      name:
        locationEditor.location.name.trim() ||
        "Unnamed Location",
      description:
        locationEditor.location.description?.trim() ||
        "",
    };

    updateMap(activeMap.id, (map) => ({
      ...map,
      locations: map.locations.map(
        (location) =>
          location.id === cleanLocation.id
            ? cleanLocation
            : location
      ),
    }));

    setLocationEditor(null);
    setTool("select");
  };

  const removeLocation = () => {
    if (
      !activeMap ||
      !locationEditor ||
      locationEditor.isNew
    ) {
      return;
    }

    updateMap(activeMap.id, (map) => ({
      ...map,
      locations: map.locations.filter(
        (location) =>
          location.id !==
          locationEditor.location.id
      ),
    }));

    setLocationEditor(null);
    setTool("select");
  };

  if (!editorOpen || !activeMap) {
    return (
      <div className="sf-map-library-v2">
        <div className="sf-map-library-heading">
          <div>
            <h2>Maps</h2>

            <p>
              Create and edit maps for this world.
            </p>
          </div>
        </div>

        <div className="card sf-map-create-card-v2">
          <h3>Create Map</h3>

          <div className="sf-map-create-grid-v2">
            <label>
              Map Name

              <input
                className="form-input"
                value={newMapName}
                onChange={(event) =>
                  setNewMapName(event.target.value)
                }
                placeholder="Example: The Western Realms"
              />
            </label>

            <label>
              Map Type

              <select
                className="form-input"
                value={newMapType}
                onChange={(event) =>
                  setNewMapType(
                    event.target.value as MapType
                  )
                }
              >
                {MAP_TYPES.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {LOCATION_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={createMap}
            disabled={!newMapName.trim()}
          >
            + Create Map
          </button>
        </div>

        {maps.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              🧭
            </div>

            <h3>No maps yet</h3>

            <p>
              Create a world, region, city, or
              dungeon map to begin.
            </p>
          </div>
        ) : (
          <div className="sf-map-library-grid-v2">
            {maps.map((map) => (
              <button
                key={map.id}
                type="button"
                className="card sf-map-library-item-v2"
                onClick={() => openMap(map.id)}
              >
                <strong>{map.name}</strong>

                <span>
                  {title(map.type)} ·{" "}
                  {title(map.style)}
                </span>

                <small>
                  {map.terrain.length} terrain
                  marks · {map.locations.length}{" "}
                  locations
                </small>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="sf-map-editor-v2">
      <div className="sf-map-editor-titlebar-v2">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={closeEditor}
        >
          ← Maps
        </button>

        <div className="sf-map-editor-name-v2">
          <strong>{activeMap.name}</strong>

          <span>
            {title(activeMap.type)}
          </span>
        </div>

        <div className="sf-map-autosave-v2">
          Saved automatically
        </div>
      </div>

      <div className="sf-map-toolbar-v2">
        <div className="sf-map-toolbar-group-v2">
          <button
            type="button"
            className={
              tool === "select"
                ? "btn btn-primary"
                : "btn btn-secondary"
            }
            onClick={() => {
              setTool("select");
              setLocationEditor(null);
              setPlacingLocation(false);
              setMovingLocationId("");
            }}
          >
            ↖ Select
          </button>

          {tool === "erase" ? (
              TERRAIN_TOOLS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={
                    eraseTargets.includes(
                      item.key
                    )
                      ? "btn btn-primary"
                      : "btn btn-secondary"
                  }
                  onClick={() =>
                    toggleEraseTarget(
                      item.key
                    )
                  }
                >
                  {item.icon}{" "}
                  {item.label}
                </button>
              ))
            ) : (
              <>
                {BASE_TERRAIN_TOOLS.map(
                  (item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={
                        tool === item.key
                          ? "btn btn-primary"
                          : "btn btn-secondary"
                      }
                      onClick={() => {
                        setTool(item.key);

                        if (
                          drawMode ===
                          "path"
                        ) {
                          setDrawMode(
                            "freehand"
                          );
                        }

                        setPathDraft(null);
                        setPathHoverPoint(
                          null
                        );
                        setLocationEditor(
                          null
                        );
                        setPlacingLocation(
                          false
                        );
                        setMovingLocationId(
                          ""
                        );
                      }}
                    >
                      {item.icon}{" "}
                      {item.label}
                    </button>
                  )
                )}

                <select
                  aria-label="Choose biome"
                  title="Choose a biome"
                  className={
                    selectedBiomeTool
                      ? "btn btn-primary"
                      : "btn btn-secondary"
                  }
                  value={
                    selectedBiomeTool
                      ?.key ?? ""
                  }
                  onChange={(event) => {
                    const nextBiome =
                      event.target
                        .value as TerrainType;

                    const validBiome =
                      BIOME_TOOLS.some(
                        (item) =>
                          item.key ===
                          nextBiome
                      );

                    if (!validBiome) {
                      return;
                    }

                    setTool(nextBiome);

                    if (
                      drawMode === "path"
                    ) {
                      setDrawMode(
                        "freehand"
                      );
                    }

                    setPathDraft(null);
                    setPathHoverPoint(null);
                    setLocationEditor(null);
                    setPlacingLocation(false);
                    setMovingLocationId("");
                  }}
                >
                  <option
                    value=""
                    disabled
                  >
                    🌿 Biomes
                  </option>

                  {BIOME_TOOLS.map(
                    (item) => (
                      <option
                        key={item.key}
                        value={item.key}
                      >
                        {item.icon}{" "}
                        {item.label}
                      </option>
                    )
                  )}
                </select>

                {FEATURE_TERRAIN_TOOLS.map(
                  (item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={
                        tool === item.key
                          ? "btn btn-primary"
                          : "btn btn-secondary"
                      }
                      onClick={() => {
                        setTool(item.key);

                        if (
                          drawMode ===
                          "path"
                        ) {
                          setDrawMode(
                            "freehand"
                          );
                        }

                        setPathDraft(null);
                        setPathHoverPoint(
                          null
                        );
                        setLocationEditor(
                          null
                        );
                        setPlacingLocation(
                          false
                        );
                        setMovingLocationId(
                          ""
                        );
                      }}
                    >
                      {item.icon}{" "}
                      {item.label}
                    </button>
                  )
                )}
              </>
            )}
          <button
            type="button"
            className={
              tool === "erase"
                ? eraseTargets.includes(
                    "region"
                  )
                  ? "btn btn-primary"
                  : "btn btn-secondary"
                : tool === "region"
                  ? "btn btn-primary"
                  : "btn btn-secondary"
            }
            onClick={() => {
              if (tool === "erase") {
                toggleEraseTarget(
                  "region"
                );
                return;
              }

              setTool("region");
              setDrawMode("area");
              setLocationEditor(null);
              setPlacingLocation(false);
              setMovingLocationId("");
            }}
          >
            ◇ Region
          </button>

          <button
            type="button"
            className={
              tool === "erase"
                ? eraseTargets.includes(
                    "river"
                  )
                  ? "btn btn-primary"
                  : "btn btn-secondary"
                : tool === "river"
                  ? "btn btn-primary"
                  : "btn btn-secondary"
            }
            onClick={() => {
              if (
                tool === "erase"
              ) {
                toggleEraseTarget(
                  "river"
                );
                return;
              }

              if (
                tool === "river"
              ) {
                cancelPath();
                setTool("select");
                setDrawMode(
                  "freehand"
                );
                return;
              }

              cancelPath();
              setTool("river");
              setDrawMode("path");
              setPathWidth(1.2);
              setPathSegmentMode(
                "curve"
              );
              setLocationEditor(null);
              setPlacingLocation(false);
              setMovingLocationId("");
            }}
          >
            ≈ River
          </button>

          <button
            type="button"
            className={
              tool === "erase"
                ? eraseTargets.includes(
                    "road"
                  )
                  ? "btn btn-primary"
                  : "btn btn-secondary"
                : tool === "road"
                  ? "btn btn-primary"
                  : "btn btn-secondary"
            }
            onClick={() => {
              if (
                tool === "erase"
              ) {
                toggleEraseTarget(
                  "road"
                );
                return;
              }

              if (
                tool === "road"
              ) {
                cancelPath();
                setTool("select");
                setDrawMode(
                  "freehand"
                );
                return;
              }

              cancelPath();
              setTool("road");
              setDrawMode("path");

              /*
               * Old-timey pathways should read
               * like map routes, not highways.
               */
              setRoadStyle(
                "pathway"
              );
              setPathWidth(0.28);

              setPathSegmentMode(
                "straight"
              );
              setLocationEditor(null);
              setPlacingLocation(false);
              setMovingLocationId("");
            }}
          >
            ╍ Road
          </button>

          <button
            type="button"
            className={
              tool === "erase"
                ? "btn btn-primary"
                : "btn btn-secondary"
            }
            onClick={() => {
              const leavingErase =
                tool === "erase";

              if (
                !leavingErase &&
                drawMode === "path"
              ) {
                cancelPath();
                setDrawMode(
                  "freehand"
                );
              }

              setTool(
                leavingErase
                  ? "select"
                  : "erase"
              );

              setLocationEditor(null);
              setPlacingLocation(false);
              setMovingLocationId("");
            }}
          >
            ◻ Eraser
            {tool === "erase" &&
              eraseAll
              ? " · All"
              : ""}
          </button>



          <div className="sf-map-location-picker-wrap-v3">
            <button
              type="button"
              className={
                tool === "location"
                  ? "btn btn-primary"
                  : "btn btn-secondary"
              }
              onClick={addLocation}
            >
              📍 Location
              {tool === "location"
                ? " ▴"
                : " ▾"}
            </button>

            {tool === "location" &&
              !placingLocation &&
              !locationEditor &&
              !movingLocationId && (
                <div className="sf-map-location-picker-v3">
                  <input
                    className="form-input sf-map-location-search-v3"
                    type="search"
                    list="sf-map-location-types-v3"
                    value={locationSearch}
                    onChange={(event) =>
                      chooseLocationSearchValue(
                        event.target.value
                      )
                    }
                    placeholder="Search city, town, camp..."
                    autoFocus
                  />

                  <datalist id="sf-map-location-types-v3">
                    {LOCATION_PALETTE_TYPES.map(
                      (type) => (
                        <option
                          key={
                            `location-${type}`
                          }
                          value={
                            LOCATION_LABELS[
                              type
                            ]
                          }
                        />
                      )
                    )}
                  </datalist>
                </div>
              )}
          </div>
        </div>

        <div className="sf-map-toolbar-group-v2">
          {(
            tool === "river" ||
            tool === "road"
          ) && (
            <>
              {tool === "road" && (
                <label className="sf-map-brush-control-v2">
                  Road Type

                  <select
                    value={roadStyle}
                    onChange={(event) => {
                      const nextStyle =
                        event.target
                          .value as RoadStyle;

                      setRoadStyle(
                        nextStyle
                      );

                      const defaultWidth =
                        nextStyle ===
                        "pathway"
                          ? 0.28
                          : nextStyle ===
                              "dirt"
                            ? 0.38
                            : 0.45;

                      setPathWidth(
                        defaultWidth
                      );

                      setPathDraft(
                        (old) =>
                          old
                            ? {
                                ...old,
                                roadStyle:
                                  nextStyle,
                                width:
                                  defaultWidth,
                              }
                            : old
                      );
                    }}
                  >
                    {ROAD_STYLE_OPTIONS.map(
                      (option) => (
                        <option
                          key={
                            option.value
                          }
                          value={
                            option.value
                          }
                        >
                          {
                            option.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </label>
              )}

              <label className="sf-map-brush-control-v2">
                Width

                <input
                  type="range"
                  min="0"
                  max={
                    (
                      tool === "river"
                        ? RIVER_WIDTH_STEPS
                        : ROAD_WIDTH_STEPS
                    ).length - 1
                  }
                  step="1"
                  value={
                    nearestMapSizeIndex(
                      tool === "river"
                        ? RIVER_WIDTH_STEPS
                        : ROAD_WIDTH_STEPS,
                      pathWidth
                    )
                  }
                  onChange={(event) => {
                    const widthSteps =
                      tool === "river"
                        ? RIVER_WIDTH_STEPS
                        : ROAD_WIDTH_STEPS;

                    const index =
                      Number(
                        event.target.value
                      );

                    const nextWidth =
                      widthSteps[
                        index
                      ];

                    if (
                      nextWidth ===
                      undefined
                    ) {
                      return;
                    }

                    setPathWidth(
                      nextWidth
                    );

                    setPathDraft(
                      (old) =>
                        old
                          ? {
                              ...old,
                              width:
                                nextWidth,
                            }
                          : old
                    );
                  }}
                />

                <span>
                  {formatMapSize(
                    pathWidth
                  )}
                </span>
              </label>

              <button
                type="button"
                className={
                  pathSegmentMode ===
                  "straight"
                    ? "btn btn-primary"
                    : "btn btn-secondary"
                }
                onClick={() =>
                  setPathSegmentMode(
                    "straight"
                  )
                }
              >
                ✎ Freehand
              </button>

              <button
                type="button"
                className={
                  pathSegmentMode ===
                  "curve"
                    ? "btn btn-primary"
                    : "btn btn-secondary"
                }
                onClick={() =>
                  setPathSegmentMode(
                    "curve"
                  )
                }
              >
                〰 Natural
              </button>

              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  !pathDraft ||
                  pathDraft.points
                    .length < 2
                }
                onClick={finishPath}
              >
                ✓ Finish
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                disabled={!pathDraft}
                onClick={cancelPath}
              >
                Cancel
              </button>
            </>
          )}

          {isTerrainTool(tool) &&
            TERRAIN_STYLE_OPTIONS[tool].length > 1 && (
              <label className="sf-map-brush-control-v2 sf-map-terrain-style-v1">
                Style

                <select
                  value={terrainStyles[tool]}
                  onChange={(event) =>
                    setTerrainStyles((old) => ({
                      ...old,
                      [tool]: event.target.value,
                    }))
                  }
                >
                  {TERRAIN_STYLE_OPTIONS[
                    tool
                  ].map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

          {tool === "mountain" && (
            <label className="sf-map-brush-control-v2">
              Scale

              <input
                type="range"
                min="0.65"
                max="1.8"
                step="0.05"
                value={mountainScale}
                onChange={(event) =>
                  setMountainScale(
                    Number(
                      event.target.value
                    )
                  )
                }
              />

              <span>
                {mountainScale < 0.8
                  ? "Small"
                  : mountainScale < 1.2
                    ? "Medium"
                    : mountainScale < 1.5
                      ? "Large"
                      : "Massive"}
              </span>
            </label>
          )}

          <button
            type="button"
            className={
              drawMode === "freehand"
                ? "btn btn-primary"
                : "btn btn-secondary"
            }
            onClick={() =>
              setDrawMode("freehand")
            }
          >
            ✏ Freehand
          </button>

          <button
            type="button"
            className={
              drawMode === "grid"
                ? "btn btn-primary"
                : "btn btn-secondary"
            }
            onClick={() => {
              setDrawMode("grid");
              setShowGrid(true);
            }}
          >
            ▦ Grid
          </button>

          <button
            type="button"
            className={
              drawMode === "area"
                ? "btn btn-primary"
                : "btn btn-secondary"
            }
            disabled={
              !canUseAreaMode(tool)
            }
            title={
              tool === "erase"
                ? "Erase selected map layers inside a dragged area."
                : areaKindForTool(tool)
                  ? "Drag a rectangular selection over existing land."
                  : "Area mode works with biomes, mountains, regions, and region erasing."
            }
            onClick={() =>
              setDrawMode("area")
            }
          >
            ▭ Area
          </button>

          <button
            type="button"
            className={
              drawMode === "fill"
                ? "btn btn-primary"
                : "btn btn-secondary"
            }
            disabled={
              !canUseFillMode(tool)
            }
            title={
              canUseFillMode(tool)
                ? "Click inside a closed outline of the selected terrain to fill it."
                : "Fill works with Land, Water, Forest, Plains, Desert, Swamp, and Snow."
            }
            onClick={() =>
              setDrawMode(
                drawMode === "fill"
                  ? "freehand"
                  : "fill"
              )
            }
          >
            ▣ Fill
          </button>

          {drawMode === "area" &&
            tool === "region" && (
              <label className="sf-map-brush-control-v2">
                Region Name
                <input
                  className="sf-map-region-name-v1"
                  value={regionName}
                  onChange={(event) =>
                    setRegionName(
                      event.target.value
                    )
                  }
                  placeholder="Northern Kingdom"
                />
              </label>
            )}

          {drawMode === "area" &&
            tool === "erase" && (
              <span className="sf-map-area-hint-v1">
                Drag over the map to erase
                the selected layers.
              </span>
            )}

          {drawMode === "area" &&
            areaKindForTool(tool) &&
            tool !== "region" && (
              <span className="sf-map-area-hint-v1">
                Drag over the land to place
                this terrain.
              </span>
            )}

          {drawMode === "freehand" && (
            <>
              <label className="sf-map-brush-control-v2">
                Brush
                <input
                  type="range"
                  min="0"
                  max={
                    TERRAIN_BRUSH_SIZE_STEPS.length -
                    1
                  }
                  step="1"
                  value={
                    nearestMapSizeIndex(
                      TERRAIN_BRUSH_SIZE_STEPS,
                      brushSize
                    )
                  }
                  onChange={(event) => {
                    const index =
                      Number(
                        event.target.value
                      );

                    const nextSize =
                      TERRAIN_BRUSH_SIZE_STEPS[
                        index
                      ];

                    if (
                      nextSize !==
                      undefined
                    ) {
                      setBrushSize(
                        nextSize
                      );
                    }
                  }}
                />
                <span>
                  {formatMapSize(
                    brushSize
                  )}
                </span>
              </label>

              <label className="sf-map-brush-control-v2">
                Shape
                <select
                  value={brushShape}
                  onChange={(event) =>
                    setBrushShape(
                      event.target.value as BrushShape
                    )
                  }
                >
                  <option value="round">Round</option>
                  <option value="square">Square</option>
                </select>
              </label>

            </>
          )}

          {drawMode === "grid" && (
            <label className="sf-map-brush-control-v2">
              Grid Size
              <input
                type="range"
                min="0"
                max={
                  GRID_SIZE_STEPS.length -
                  1
                }
                step="1"
                value={
                  nearestMapSizeIndex(
                    GRID_SIZE_STEPS,
                    gridSize
                  )
                }
                onChange={(event) => {
                  const index =
                    Number(
                      event.target.value
                    );

                  const nextSize =
                    GRID_SIZE_STEPS[
                      index
                    ];

                  if (
                    nextSize !==
                    undefined
                  ) {
                    setGridSize(
                      nextSize
                    );
                  }
                }}
              />
              <span>
                {formatMapSize(
                  gridSize
                )}px
              </span>
            </label>
          )}

          <button
            type="button"
            className={
              showGrid
                ? "btn btn-primary"
                : "btn btn-secondary"
            }
            onClick={() =>
              setShowGrid((old) => !old)
            }
          >
            # Grid Overlay
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={undoLastAction}
            disabled={
              undoStack.length === 0
            }
            title="Undo the most recent map action."
          >
            ↶ Undo
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={smoothLastAction}
            disabled={
              !activeMap.terrain.some(
                (stamp) =>
                  Boolean(stamp.strokeId)
              )
            }
            title="Smooth the most recent terrain action."
          >
            ≋ Smooth Last Action
          </button>

          <button
            type="button"
            className={
              showSettings
                ? "btn btn-primary"
                : "btn btn-secondary"
            }
            onClick={() =>
              setShowSettings((old) => !old)
            }
          >
            ⚙ Map
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="card sf-map-settings-v2">
          <div className="sf-map-settings-grid-v2">
            <label>
              Map Name

              <input
                className="form-input"
                value={activeMap.name}
                onChange={(event) =>
                  updateMap(activeMap.id, {
                    name: event.target.value,
                  })
                }
              />
            </label>

            <label>
              Type

              <select
                className="form-input"
                value={activeMap.type}
                onChange={(event) =>
                  updateMap(activeMap.id, {
                    type: event.target
                      .value as MapType,
                  })
                }
              >
                {MAP_TYPES.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {
                      LOCATION_LABELS[
                        type
                      ]
                    }
                  </option>
                ))}
              </select>
            </label>

            <label>
              Style

              <select
                className="form-input"
                value={activeMap.style}
                onChange={(event) =>
                  changeStyle(
                    event.target
                      .value as MapStyle
                  )
                }
              >
                {MAP_STYLES.map((style) => (
                  <option
                    key={style}
                    value={style}
                  >
                    {title(style)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Canvas Base

              <select
                className="form-input"
                value={activeMap.base ?? "water"}
                onChange={(event) =>
                  updateMap(activeMap.id, {
                    base:
                      event.target.value as CanvasBase,
                  })
                }
              >
                <option value="water">Water</option>
                <option value="land">Land</option>
                <option value="blank">Blank Parchment</option>
              </select>
            </label>
          </div>

          <div className="sf-map-color-row-v2">
            {(
              Object.keys(
                activeMap.colors
              ) as Array<keyof MapColors>
            ).map((key) => (
              <label key={key}>
                {title(key)}

                <input
                  type="color"
                  value={
                    activeMap.colors[key]
                  }
                  onChange={(event) =>
                    updateColor(
                      key,
                      event.target.value
                    )
                  }
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={deleteMap}
          >
            Delete Map
          </button>
        </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.55rem",
            marginBottom: "0.7rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            disabled={mapZoom <= 0.5}
            onClick={() =>
              setMapZoom((old) =>
                Math.max(0.5, old - 0.25)
              )
            }
          >
            − Zoom
          </button>

          <strong>
            {Math.round(mapZoom * 100)}%
            {" · "}
            {mapDetailTier === "overview"
              ? "Overview"
              : mapDetailTier === "standard"
                ? "Standard"
                : mapDetailTier === "detailed"
                  ? "Detailed"
                  : "Close"}
          </strong>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={mapZoom >= 2}
            onClick={() =>
              setMapZoom((old) =>
                Math.min(2, old + 0.25)
              )
            }
          >
            + Zoom
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            disabled={mapZoom === 1}
            onClick={() => setMapZoom(1)}
          >
            Reset
          </button>
        </div>

        <div
          className="sf-map-canvas-wrap-v2"
          style={{
            overflow: "auto",
          }}
        >
        <div
          ref={canvasRef}
          className={[
            "sf-map-canvas-v2",
            showGrid
              ? "sf-map-grid-visible-v2"
              : "",
            tool !== "select" &&
            tool !== "location"
              ? "sf-map-drawing-v2"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={{
            /*
              * Camera zoom.
              *
              * Keep the original StoryForge canvas dimensions
              * intact. Zoom the completed map visually instead
              * of changing its layout width.
              */
            transform: `scale(${mapZoom})`,
            transformOrigin: "top left",
            willChange: "transform",
            backgroundColor:
              (activeMap.base ?? "water") === "water"
                ? activeMap.colors.water
                : (activeMap.base ?? "water") === "land"
                  ? activeMap.colors.land
                  : "#eadfbe",
            borderColor:
              activeMap.colors.accent,
            backgroundSize: showGrid
              ? `${gridSize}px ${gridSize}px`
              : undefined,
          }}
          onPointerDown={beginPainting}
          onPointerMove={continuePainting}
          onPointerUp={stopPainting}
          onPointerCancel={stopPainting}
          onPointerLeave={stopPainting}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
              pointerEvents: "none",
              zIndex: 4,
            }}
          >
            {(activeMap.paths ?? []).map(
              (mapPath) => {
                const d =
                  buildMapPathD(
                    mapPath.kind,
                    mapPath.points
                  );

                const roadVisual =
                  roadVisualForStyle(
                    mapPath.roadStyle
                  );

                const mainColor =
                  mapPath.kind ===
                  "river"
                    ? activeMap
                        .colors.water
                    : roadVisual.main;

                const edgeColor =
                  mapPath.kind ===
                  "river"
                    ? "#335f78"
                    : roadVisual.edge;

                const dashArray =
                  mapPath.kind ===
                  "river"
                    ? undefined
                    : roadVisual
                        .dashArray;

                const edgeExtra =
                  mapPath.kind ===
                  "river"
                    ? 0.55
                    : roadVisual
                        .edgeExtra;

                return (
                  <g
                    key={mapPath.id}
                  >
                    <path
                      d={d}
                      fill="none"
                      stroke={
                        edgeColor
                      }
                      strokeWidth={
                        mapPath.width +
                        edgeExtra
                      }
                      strokeDasharray={
                        dashArray
                      }
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    <path
                      d={d}
                      fill="none"
                      stroke={
                        mainColor
                      }
                      strokeWidth={
                        mapPath.width
                      }
                      strokeDasharray={
                        dashArray
                      }
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              }
            )}

            {pathDraft && (
              <g opacity="0.82">
                {(() => {
                  const previewPoints =
                    pathHoverPoint
                      ? [
                          ...pathDraft
                            .points,
                          {
                            x:
                              pathHoverPoint
                                .x,

                            y:
                              pathHoverPoint
                                .y,

                            curveFromPrevious:
                              pathSegmentMode ===
                              "curve",
                          },
                        ]
                      : pathDraft
                          .points;

                  const d =
                    buildMapPathD(
                      pathDraft.kind,
                      previewPoints
                    );

                  const roadVisual =
                    roadVisualForStyle(
                      pathDraft.roadStyle ??
                        roadStyle
                    );

                  const mainColor =
                    pathDraft.kind ===
                    "river"
                      ? activeMap
                          .colors.water
                      : roadVisual.main;

                  const edgeColor =
                    pathDraft.kind ===
                    "river"
                      ? "#335f78"
                      : roadVisual.edge;

                  const dashArray =
                    pathDraft.kind ===
                    "river"
                      ? undefined
                      : roadVisual
                          .dashArray;

                  const edgeExtra =
                    pathDraft.kind ===
                    "river"
                      ? 0.55
                      : roadVisual
                          .edgeExtra;

                  return (
                    <>
                      <path
                        d={d}
                        fill="none"
                        stroke={
                          edgeColor
                        }
                        strokeWidth={
                          pathWidth +
                          edgeExtra
                        }
                        strokeDasharray={
                          dashArray
                        }
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      <path
                        d={d}
                        fill="none"
                        stroke={
                          mainColor
                        }
                        strokeWidth={
                          pathWidth
                        }
                        strokeDasharray={
                          dashArray
                        }
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  );
                })()}

                {pathDraft.points.map(
                  (
                    point,
                    index
                  ) => (
                    <circle
                      key={
                        `path-point-${index}`
                      }
                      cx={point.x}
                      cy={point.y}
                      r={
                        pathSegmentMode ===
                        "straight"
                          ? 0
                          : 0.45
                      }
                      fill="#ffffff"
                      stroke="#111827"
                      strokeWidth="0.18"
                    />
                  )
                )}
              </g>
            )}
          </svg>

          {(
            tool === "river" ||
            tool === "road"
          ) && (
            <div className="sf-map-canvas-message-v2">
              {!pathDraft
                ? `Click the map to start a ${tool}.`
                : pathDraft.points
                    .length < 2
                  ? "Click another point to create the first segment."
                  : `Add more points, choose Straight or Curve for the next segment, then press Finish.`}
            </div>
          )}

          {areaPreview && (
            <div
              className="sf-map-area-preview-v1"
              style={{
                left: `${
                  Math.min(
                    areaPreview.x1,
                    areaPreview.x2
                  )
                }%`,
                top: `${
                  Math.min(
                    areaPreview.y1,
                    areaPreview.y2
                  )
                }%`,
                width: `${
                  Math.abs(
                    areaPreview.x2 -
                    areaPreview.x1
                  )
                }%`,
                height: `${
                  Math.abs(
                    areaPreview.y2 -
                    areaPreview.y1
                  )
                }%`,
              }}
            />
          )}

          {(() => {
            /*
             * Combine Area-painted terrain by
             * terrain identity instead of drawing
             * every tiny region cell separately.
             */
            const groups =
              biomeRenderGroups;

            const canvasAspect =
              renderCanvasAspect;

            return [
              ...groups.entries(),
            ].map(
              ([groupKey, group]) => {
                const fill =
                  terrainColor(
                    group.terrainType,
                    activeMap.colors
                  );

                const symbol =
                  terrainSymbol(
                    group.terrainType,
                    group.style
                  );

                const safeKey =
                  groupKey.replace(
                    /[^a-zA-Z0-9_-]/g,
                    "-"
                  );

                const filterId =
                  `sf-area-filter-${safeKey}`;

                const maskId =
                  `sf-area-mask-${safeKey}`;

                  /*
                   * Land/Water coastline mask.
                   * Biomes retain their organic edge but
                   * cannot visually extend outside Land.
                   */
                                    const symbolFilterId =
                    `sf-area-symbol-filter-${safeKey}`;

                  const symbolMaskId =
                    `sf-area-symbol-mask-${safeKey}`;

                  /*
                   * FOREST ENVIRONMENT AWARENESS V1
                   *
                   * Forest color still follows the painted biome.
                   * Tree symbols receive a second mask so they can
                   * thin naturally around map features without
                   * changing the underlying forest biome.
                   */
                  const forestAwareSymbolMaskId =
                    `sf-area-forest-aware-symbol-mask-${safeKey}`;

const landMaskId =
                    `sf-area-land-mask-${safeKey}`;

                const patternId =
                  `sf-area-pattern-${safeKey}`;

                

                /*
                 * DESERT TONAL SHADOW V1
                 *
                 * Separate tonal depth layer for dunes.
                 * Existing dune artwork remains unchanged.
                 */
                const desertShadowFilterId =
                  `sf-desert-shadow-${safeKey}`;
/*
                 * Blur joins neighboring cells
                 * into one continuous biome.
                 *
                 * Morphology then pulls it inward
                 * a little so the island coastline
                 * remains visible around the biome.
                 */
                const cellWidth =
                    100 /
                    group.columns;

                  const cellHeight =
                    100 /
                    group.rows;

                  /*
                   * Biomes remain stored on the exact
                   * logical cell grid, but their visible
                   * cells overlap very slightly so the
                   * renderer does not expose square seams.
                   */
                  const cellOverlapX =
                    cellWidth *
                    0.08;

                  const cellOverlapY =
                    cellHeight *
                    0.08;

                  /*
                   * Merge the cells into one softer
                   * continuous shape before naturalizing
                   * the outside edge.
                   */
                  const smoothX =
                    0.32;

                  const smoothY =
                    smoothX *
                    canvasAspect;

                  /*
                   * Keep only a very light inset. The old
                   * 0.13 erosion was strong enough to
                   * emphasize the underlying cell grid.
                   */
                  const coastInset =
                    0.055;

                  const coastInsetY =
                    coastInset *
                    canvasAspect;

                  /*
                   * Shared organic boundary system for
                   * every biome, with subtle differences
                   * in edge character.
                   */
                  const biomeEdgeScale =
                      group.terrainType ===
                      "swamp"
                        ? 0.26
                        : group.terrainType ===
                            "forest"
                          ? 0.22
                          : group.terrainType ===
                              "desert"
                            ? 0.19
                            : group.terrainType ===
                                "snow"
                              ? 0.17
                              : group.terrainType ===
                                  "plains"
                                ? 0.15
                                : 0.18;

                    return (
                  <svg
                    key={groupKey}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    style={{
                      position:
                        "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      overflow:
                        "hidden",
                      pointerEvents:
                        "none",

                      zIndex:
                        terrainRenderLayer(
                          group.terrainType
                        ),
                    }}
                  >
                    <defs>
                      {/*
                        DESERT TONAL SHADOW V1

                        Blur only affects the sandy shadow,
                        never the existing dune linework.
                      */}
                      <filter
                        id={desertShadowFilterId}
                        x="-45%"
                        y="-70%"
                        width="190%"
                        height="240%"
                      >
                        <feGaussianBlur
                          stdDeviation="0.24 0.13"
                        />
                      </filter>

                      <filter
                        id={filterId}
                        x="-5"
                        y="-8"
                        width="110"
                        height="116"
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                      >
                        <feGaussianBlur
                          in="SourceGraphic"
                          stdDeviation={
                            `${smoothX} ${smoothY}`
                          }
                          result="blurred"
                        />

                        <feColorMatrix
                          in="blurred"
                          type="matrix"
                          values="
                            1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 22 -10
                          "
                          result="merged"
                        />

                        {/*
                          A stable noise field gently
                          breaks up geometric biome
                          edges without randomly
                          changing the map each render.
                        */}
                        <feTurbulence
                          type="fractalNoise"
                          baseFrequency="0.038 0.052"
                          numOctaves="3"
                          seed="17"
                          result="edgeNoise"
                        />

                        <feDisplacementMap
                          in="merged"
                          in2="edgeNoise"
                          scale={biomeEdgeScale}
                          xChannelSelector="R"
                          yChannelSelector="G"
                          result="naturalBiome"
                        />

                        <feGaussianBlur
                          in="naturalBiome"
                          stdDeviation="0.07 0.11"
                          result="naturalSoft"
                        />

                        <feMorphology
                          in="naturalSoft"
                          operator="erode"
                          radius={
                            `${coastInset} ${coastInsetY}`
                          }
                          result="coastInset"
                        />

                          {/*
                            Final biome color feather.

                            This makes the terrain color
                            gradually lose density instead
                            of ending in noisy blotches.
                          */}
                          <feGaussianBlur
                            in="coastInset"
                            stdDeviation={
                              `0.18 ${0.18 * canvasAspect}`
                            }
                            result="biomeFeather"
                          />
                      </filter>

                        {/*
                          Symbols deliberately extend a little
                          beyond the color feather so forests,
                          grasslands, marshes, etc. do not look
                          like flat clipped stickers.
                        */}
                        <filter
                          id={symbolFilterId}
                          x="-5"
                          y="-8"
                          width="110"
                          height="116"
                          filterUnits="userSpaceOnUse"
                          colorInterpolationFilters="sRGB"
                        >
                          <feGaussianBlur
                            in="SourceGraphic"
                            stdDeviation={
                              `0.22 ${0.22 * canvasAspect}`
                            }
                            result="symbolBlur"
                          />

                          <feColorMatrix
                            in="symbolBlur"
                            type="matrix"
                            values="
                              1 0 0 0 0
                              0 1 0 0 0
                              0 0 1 0 0
                              0 0 0 20 -9
                            "
                            result="symbolMerged"
                          />

                          <feMorphology
                            in="symbolMerged"
                            operator="dilate"
                            radius={
                              `0.24 ${0.24 * canvasAspect}`
                            }
                            result="symbolSpread"
                          />

                          <feGaussianBlur
                            in="symbolSpread"
                            stdDeviation={
                              `0.04 ${0.04 * canvasAspect}`
                            }
                            result="symbolSoft"
                          />
                        </filter>

                      <mask
                        id={maskId}
                        maskUnits="userSpaceOnUse"
                        x="0"
                        y="0"
                        width="100"
                        height="100"
                      >
                        <g
                          filter={
                            `url(#${filterId})`
                          }
                        >
                          {[
                            ...group.cells,
                          ].map((key) => {
                            const {
                              column,
                              row,
                            } =
                              parseCellKey(
                                key
                              );

                            return (
                              <rect
                                key={key}
                                x={
                                    (
                                      column /
                                      group.columns
                                    ) *
                                      100 -
                                    cellOverlapX /
                                      2
                                  }
                                  y={
                                    (
                                      row /
                                      group.rows
                                    ) *
                                      100 -
                                    cellOverlapY /
                                      2
                                  }
                                  width={
                                    cellWidth +
                                    cellOverlapX
                                  }
                                  height={
                                    cellHeight +
                                    cellOverlapY
                                  }
                                  fill="white"
                              />
                            );
                          })}
                        </g>
                      </mask>

                        {/*
                          Wider symbol boundary.
                        */}
<mask
                        id={symbolMaskId}
                        maskUnits="userSpaceOnUse"
                        x="0"
                        y="0"
                        width="100"
                        height="100"
                      >
                        <g
                          filter={`url(#${symbolFilterId})`}
                        >
                          {[
                            ...group.cells,
                          ].map((key) => {
                            const {
                              column,
                              row,
                            } =
                              parseCellKey(
                                key
                              );

                            return (
                              <rect
                                key={key}
                                x={
                                    (
                                      column /
                                      group.columns
                                    ) *
                                      100 -
                                    cellOverlapX /
                                      2
                                  }
                                  y={
                                    (
                                      row /
                                      group.rows
                                    ) *
                                      100 -
                                    cellOverlapY /
                                      2
                                  }
                                  width={
                                    cellWidth +
                                    cellOverlapX
                                  }
                                  height={
                                    cellHeight +
                                    cellOverlapY
                                  }
                                  fill="white"
                              />
                            );
                          })}
                        </g>
                      </mask>

                        {/*
                          FOREST ENVIRONMENT AWARENESS V1

                          White = normal tree visibility.
                          Gray = transition / thinning zone.
                          Black = clear corridor.

                          This keeps dense woodland in broad open
                          areas while giving mountains, roads,
                          rivers, and settlements breathing room.
                        */}
                        {group.terrainType === "forest" && (
                          <mask
                            id={forestAwareSymbolMaskId}
                            maskUnits="userSpaceOnUse"
                            x="0"
                            y="0"
                            width="100"
                            height="100"
                            style={{
                              maskType: "luminance",
                            }}
                          >
                            {/*
                              Begin with the existing organic
                              forest-symbol boundary.
                            */}
                            <rect
                              x="0"
                              y="0"
                              width="100"
                              height="100"
                              fill="white"
                              mask={`url(#${symbolMaskId})`}
                            />

                            {/*
                              Roads and rivers create two zones:

                              gray outer corridor = fewer trees
                              black inner corridor = no trees

                              Width responds to the path's own
                              configured width.
                            */}
                            {(activeMap.paths ?? []).map(
                              (mapPath) => {
                                if (
                                  mapPath.points.length < 2
                                ) {
                                  return null;
                                }

                                const d =
                                  buildMapPathD(
                                    mapPath.kind,
                                    mapPath.points
                                  );

                                const transitionWidth =
                                  Math.max(
                                    mapPath.width +
                                      (mapPath.kind ===
                                      "river"
                                        ? 2.0
                                        : 1.55),
                                    mapPath.kind ===
                                    "river"
                                      ? 2.5
                                      : 1.8
                                  );

                                const clearWidth =
                                  Math.max(
                                    mapPath.width +
                                      (mapPath.kind ===
                                      "river"
                                        ? 0.72
                                        : 0.52),
                                    mapPath.kind ===
                                    "river"
                                      ? 1.25
                                      : 0.95
                                  );

                                return (
                                  <g
                                    key={`forest-path-clear-${mapPath.id}`}
                                  >
                                    <path
                                      d={d}
                                      fill="none"
                                      stroke="black"
                                      strokeWidth={
                                        transitionWidth
                                      }
                                      strokeDasharray="1.15 2.15"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />

                                    <path
                                      d={d}
                                      fill="none"
                                      stroke="black"
                                      strokeWidth={
                                        clearWidth
                                      }
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </g>
                                );
                              }
                            )}

                            {/*
                              Mountains get an open core plus a
                              partial transition ring.

                              Their saved stamp size determines
                              roughly how much woodland should
                              step away from the ridge.
                            */}
                            {activeMap.terrain
                              .filter(
                                (stamp) =>
                                  stamp.type ===
                                  "mountain"
                              )
                              .map((stamp) => {
                                const transitionRadius =
                                  Math.max(
                                    1.05,
                                    stamp.size *
                                      0.58
                                  );

                                const clearRadius =
                                  Math.max(
                                    0.58,
                                    stamp.size *
                                      0.34
                                  );

                                return (
                                  <g
                                    key={`forest-mountain-clear-${stamp.id}`}
                                  >
                                    <circle
                                      cx={stamp.x}
                                      cy={stamp.y}
                                      r={
                                        transitionRadius
                                      }
                                      fill="none"
                                      stroke="black"
                                      strokeWidth="0.52"
                                      strokeDasharray="0.72 1.08"
                                    />

                                    <circle
                                      cx={stamp.x}
                                      cy={stamp.y}
                                      r={
                                        clearRadius
                                      }
                                      fill="black"
                                    />
                                  </g>
                                );
                              })}

                            {/*
                              Settlement clearing size follows
                              the marker's configured scale.
                            */}
                            {activeMap.locations.map(
                              (location) => {
                                const transitionRadius =
                                  location.size ===
                                  "large"
                                    ? 3.2
                                    : location.size ===
                                        "medium"
                                      ? 2.6
                                      : location.size ===
                                          "tiny"
                                        ? 1.45
                                        : 2.0;

                                const clearRadius =
                                  location.size ===
                                  "large"
                                    ? 2.0
                                    : location.size ===
                                        "medium"
                                      ? 1.55
                                      : location.size ===
                                          "tiny"
                                        ? 0.82
                                        : 1.15;

                                return (
                                  <g
                                    key={`forest-location-clear-${location.id}`}
                                  >
                                    <circle
                                      cx={
                                        location.x
                                      }
                                      cy={
                                        location.y
                                      }
                                      r={
                                        transitionRadius
                                      }
                                      fill="none"
                                      stroke="black"
                                      strokeWidth="0.52"
                                      strokeDasharray="0.72 1.08"
                                    />

                                    <circle
                                      cx={
                                        location.x
                                      }
                                      cy={
                                        location.y
                                      }
                                      r={
                                        clearRadius
                                      }
                                      fill="black"
                                    />
                                  </g>
                                );
                              }
                            )}
                          </mask>
                        )}


                        {/*
                          Actual Land/Water coastline.

                          White means biome is allowed.
                          Black means biome is hidden.

                          Land and Water stay in saved order,
                          matching pointIsLand().
                        */}
                        <filter
                          id={`sf-area-land-inset-filter-${safeKey}`}
                          x="-6"
                          y="-10"
                          width="112"
                          height="120"
                          filterUnits="userSpaceOnUse"
                          colorInterpolationFilters="sRGB"
                        >
                          {/*
                            First soften the saved Land/Water
                            geometry just enough to remove small
                            stamp/grid corners.
                          */}
                          <feGaussianBlur
                            in="SourceGraphic"
                            stdDeviation={
                              `0.30 ${0.30 * canvasAspect}`
                            }
                            result="landSoft"
                          />

                          {/*
                            A small stable displacement prevents
                            the protected coast from becoming a
                            perfectly even artificial ring.
                          */}
                          <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.025 0.04"
                            numOctaves="2"
                            seed="53"
                            result="shoreNoise"
                          />

                          <feDisplacementMap
                            in="landSoft"
                            in2="shoreNoise"
                            scale="0.18"
                            xChannelSelector="R"
                            yChannelSelector="G"
                            result="naturalLand"
                          />

                          {/*
                            This is the actual protected coast.

                            Increasing 0.58 makes the exposed
                            shoreline wider. Decreasing it lets
                            biomes grow closer to the water.
                          */}
                          <feMorphology
                            in="naturalLand"
                            operator="erode"
                            radius={
                              `0.58 ${0.58 * canvasAspect}`
                            }
                            result="coastalInset"
                          />

                          {/*
                            Feather the inner coast very slightly
                            so forest/plains/etc. blend into the
                            exposed coastal land instead of ending
                            on a razor-sharp line.
                          */}
                          <feGaussianBlur
                            in="coastalInset"
                            stdDeviation={
                              `0.07 ${0.07 * canvasAspect}`
                            }
                            result="coastalInsetSoft"
                          />
                        </filter>

                        <mask
                          id={landMaskId}
                          maskUnits="userSpaceOnUse"
                          x="0"
                          y="0"
                          width="100"
                          height="100"
                          style={{
                            maskType: "luminance",
                          }}
                        >
                          <g
                            filter={
                              `url(#sf-area-land-inset-filter-${safeKey})`
                            }
                          >
                            <rect
                              x="0"
                              y="0"
                              width="100"
                              height="100"
                              fill={
                                (activeMap.base ?? "water") === "land"
                                  ? "white"
                                  : "black"
                              }
                            />

                            {landWaterTerrainStamps.map((stamp) => {
                                const stampHeight =
                                  stamp.size *
                                  canvasAspect;

                                const maskFill =
                                  stamp.type === "land"
                                    ? "white"
                                    : "black";

                                if (
                                  stamp.mode !== "grid" &&
                                  stamp.shape !== "square"
                                ) {
                                  return (
                                    <ellipse
                                      key={`land-mask-${stamp.id}`}
                                      cx={stamp.x}
                                      cy={stamp.y}
                                      rx={stamp.size / 2}
                                      ry={stampHeight / 2}
                                      fill={maskFill}
                                    />
                                  );
                                }

                                return (
                                  <rect
                                    key={`land-mask-${stamp.id}`}
                                    x={
                                      stamp.x -
                                      stamp.size / 2
                                    }
                                    y={
                                      stamp.y -
                                      stampHeight / 2
                                    }
                                    width={stamp.size}
                                    height={stampHeight}
                                    fill={maskFill}
                                  />
                                );
                              })}
                          </g>
                        </mask>


                      {group.terrainType === "snow" && (
                          <>
                            {/*
                             * STORYFORGE SNOW ICE COAST V8
                             *
                             * Simpler than V1:
                             *
                             * 1. Start with the existing snow biome mask.
                             * 2. Expand that shape outward.
                             * 3. Only reveal the expansion outside the
                             *    protected inland land mask.
                             *
                             * This creates:
                             *
                             * snow -> icy rim -> soft frozen shelf -> water
                             *
                             * without putting an icy border around inland
                             * snow/biome boundaries.
                             */}

                            <mask
                              id={`sf-snow-coastal-zone-${safeKey}`}
                              maskUnits="userSpaceOnUse"
                              x="0"
                              y="0"
                              width="100"
                              height="100"
                              style={{
                                maskType: "luminance",
                              }}
                            >
                              {/*
                               * Everything starts visible...
                               */}
                              <rect
                                x="0"
                                y="0"
                                width="100"
                                height="100"
                                fill="white"
                              />

                              {/*
                               * ...then protected inland terrain is
                               * removed. What remains is the exposed
                               * coastline plus water.
                               */}
                              <g
                                mask={`url(#${landMaskId})`}
                              >
                                <rect
                                  x="0"
                                  y="0"
                                  width="100"
                                  height="100"
                                  fill="black"
                                />
                              </g>
                            </mask>


                            {/*
                             * Wider, softer outer frozen shelf.
                             */}
                            <filter
                              id={`sf-snow-ice-outer-${safeKey}`}
                              x="-5"
                              y="-8"
                              width="110"
                              height="116"
                              filterUnits="userSpaceOnUse"
                              colorInterpolationFilters="sRGB"
                            >
                              <feMorphology
                                in="SourceGraphic"
                                operator="dilate"
                                radius={
                                  `0.92 ${0.92 * canvasAspect}`
                                }
                                result="snowOuter"
                              />

                              <feTurbulence
                                type="fractalNoise"
                                baseFrequency="0.72 0.54"
                                numOctaves="2"
                                seed="71"
                                result="iceOuterNoise"
                              />

                              <feDisplacementMap
                                in="snowOuter"
                                in2="iceOuterNoise"
                                scale="0.34"
                                xChannelSelector="R"
                                yChannelSelector="G"
                                result="snowOuterNatural"
                              />

                              <feGaussianBlur
                                in="snowOuterNatural"
                                stdDeviation={
                                  `0.008 ${0.008 * canvasAspect}`
                                }
                              />
                            </filter>


                            {/*
                             * Tighter brighter rim nearest the coast.
                             */}
                            <filter
                              id={`sf-snow-ice-inner-${safeKey}`}
                              x="-5"
                              y="-8"
                              width="110"
                              height="116"
                              filterUnits="userSpaceOnUse"
                              colorInterpolationFilters="sRGB"
                            >
                              <feMorphology
                                in="SourceGraphic"
                                operator="dilate"
                                radius={
                                  `0.44 ${0.44 * canvasAspect}`
                                }
                                result="snowInner"
                              />

                              <feTurbulence
                                type="fractalNoise"
                                baseFrequency="0.86 0.66"
                                numOctaves="2"
                                seed="43"
                                result="iceInnerNoise"
                              />

                              <feDisplacementMap
                                in="snowInner"
                                in2="iceInnerNoise"
                                scale="0.16"
                                xChannelSelector="R"
                                yChannelSelector="G"
                                result="snowInnerNatural"
                              />

                              <feGaussianBlur
                                in="snowInnerNatural"
                                stdDeviation={
                                  `0.004 ${0.004 * canvasAspect}`
                                }
                              />
                            </filter>
                          </>
                        )}


                        {symbol && (
                        <pattern
                          id={patternId}
                          patternUnits="userSpaceOnUse"
                            patternTransform={
                              group.terrainType === "forest"
                                ? "translate(-0.8 -0.45) rotate(-1.1 50 50)"
                                : undefined
                            }
                          width={
                              group.terrainType === "forest"
                                ? storyForgeForestPatternMetrics(
                                    mapDetailTier
                                  ).width
                                : 5.2
                            }
                            height={
                              group.terrainType === "forest"
                                ? storyForgeForestPatternMetrics(
                                    mapDetailTier
                                  ).height
                                : 5.2
                            }>
                          {group.terrainType === "forest" ? (
                              <g>
                                {storyForgeForestPattern(
                                    group.style,
                                    activeMap.colors.label,
                                    activeMap.colors.forest,
                                    mapDetailTier
                                  )}
                              </g>
                            ) : (
                              <text
                                x="1"
                                y="3.8"
                                fontSize="2.6"
                                opacity="0.68"
                                fill={
                                  activeMap
                                    .colors
                                    .label
                                }
                              >
                                {symbol}
                              </text>
                            )}
                        </pattern>
                      )}
                    </defs>

                      {group.terrainType === "snow" && (
                        <g
                          mask={
                            `url(#sf-snow-coastal-zone-${safeKey})`
                          }
                          pointerEvents="none"
                        >
                          {/*
                             * STORYFORGE SNOW COAST COVER V3
                             *
                             * Snow reaches the frozen shore instead of
                             * leaving the normal tan land rim exposed.
                             */}
                            <rect
                              x="0"
                              y="0"
                              width="100"
                              height="100"
                              fill="#eef7f8"
                              opacity="1"
                              mask={`url(#${maskId})`}
                            />


                            {/*
                           * OUTER ICE FADE
                           *
                           * Slight blue-white tint extending into
                           * open water. Strong enough to read, but
                           * transparent enough to retain the water.
                           */}
                          <g
                            filter={
                              `url(#sf-snow-ice-outer-${safeKey})`
                            }
                            opacity="0.14"
                          >
                            <rect
                              x="0"
                              y="0"
                              width="100"
                              height="100"
                              fill="#66bdd8"
                              mask={`url(#${maskId})`}
                            />
                          </g>


                          {/*
                           * INNER FROZEN RIM
                           *
                           * Almost white with just enough blue to
                           * read as ice instead of an ordinary coast.
                           */}
                          <g
                            filter={
                              `url(#sf-snow-ice-inner-${safeKey})`
                            }
                            opacity="0.38"
                          >
                            <rect
                              x="0"
                              y="0"
                              width="100"
                              height="100"
                              fill="#a7ddea"
                              mask={`url(#${maskId})`}
                            />
                          </g>
                        </g>
                      )}


                    <g
                        mask={`url(#${landMaskId})`}
                      >
<rect
                      x="0"
                      y="0"
                      width="100"
                      height="100"
                      fill={
                        group.terrainType === "snow"
                          ? "#edf4f3"
                          : fill
                      }
                      opacity={
                        group.terrainType === "snow"
                          ? 0.96
                          : 0.88
                      }
                      mask={
                        `url(#${maskId})`
                      }
                    />

                    {symbol &&
                        group.terrainType !== "forest" &&
                        group.terrainType !== "plains" &&
                        group.terrainType !== "desert" &&
                        group.terrainType !== "swamp" &&
                        group.terrainType !== "snow" && (
                      <rect
                        x="0"
                        y="0"
                        width="100"
                        height="100"
                        fill={
                          `url(#${patternId})`
                        }
                        mask={
                            `url(#${
                              group.terrainType === "forest"
                                ? forestAwareSymbolMaskId
                                : symbolMaskId
                            })`
                          }
                      />
                    )}
                      </g>
                                        {/*
                        FOREST DIRECT WHOLE-TREE LAYER
                      */}
                      {group.terrainType === "forest" && (
                        <g>
                          {storyForgeForestPattern(
                            group.style,
                            activeMap.colors.label,
                            activeMap.colors.forest,
                            mapDetailTier,
                            0,
                            buildStoryForgeForestEntities(
                              activeMap,
                              group.cells,
                              group.columns,
                              group.rows,
                              group.style,
                              mapDetailTier
                            )
                          )}
                        </g>
                      )}

                      {/*
                        STORYFORGE SWAMP HYDROLOGY V3

                        Generated independently from reeds.
                        Water is clipped inside the swamp
                        biome and the actual land boundary.
                      */}
                      {group.terrainType ===
                        "swamp" &&
                        (() => {
                          const wetland =
                            buildStoryForgeSwampWaterFeatures(
                              group.cells,
                              group.columns,
                              group.rows
                            );

                          return (
                            <g
                              mask={
                                `url(#${landMaskId})`
                              }
                              pointerEvents="none"
                            >
                              <g
                                mask={
                                  `url(#${maskId})`
                                }
                              >
                                {/*
                                 * Draw channels first so they
                                 * disappear naturally beneath
                                 * the pools at each endpoint.
                                 */}
                                {wetland.channels.map(
                                  (
                                    channel
                                  ) => (
                                    <g
                                      key={
                                        channel.id
                                      }
                                    >
                                      <path
                                        d={
                                          `M ${channel.x1} ${channel.y1} ` +
                                          `C ${channel.control1X} ${channel.control1Y}, ` +
                                          `${channel.control2X} ${channel.control2Y}, ` +
                                          `${channel.x2} ${channel.y2}`
                                        }
                                        fill="none"
                                        stroke="#75877a"
                                        strokeWidth={
                                          channel.width *
                                          1.9
                                        }
                                        strokeLinecap="round"
                                        opacity="0.72"
                                      />

                                      <path
                                        d={
                                          `M ${channel.x1} ${channel.y1} ` +
                                          `C ${channel.control1X} ${channel.control1Y}, ` +
                                          `${channel.control2X} ${channel.control2Y}, ` +
                                          `${channel.x2} ${channel.y2}`
                                        }
                                        fill="none"
                                        stroke="#405247"
                                        strokeWidth={
                                          channel.width *
                                          0.28
                                        }
                                        strokeLinecap="round"
                                        opacity="0.32"
                                      />
                                    </g>
                                  )
                                )}


                                {wetland.pools.map(
                                  (pool) => (
                                    <g
                                      key={
                                        pool.id
                                      }
                                      transform={
                                        `translate(${pool.x} ${pool.y}) ` +
                                        `rotate(${pool.rotation}) ` +
                                        `scale(${pool.rx} ${pool.ry})`
                                      }
                                    >
                                      <path
                                        d={
                                          pool.variant ===
                                          0
                                            ? `
                                              M-1 0
                                              C-0.91 -0.63 -0.40 -0.95 0.03 -0.77
                                              C0.39 -0.92 0.90 -0.58 0.94 -0.13
                                              C1.08 0.30 0.62 0.82 0.18 0.73
                                              C-0.19 0.93 -0.83 0.63 -0.96 0.21
                                              C-1.02 0.13 -1.03 0.06 -1 0
                                              Z
                                            `
                                            : pool.variant ===
                                                1
                                              ? `
                                                M-1 0.04
                                                C-0.82 -0.52 -0.43 -0.81 -0.08 -0.66
                                                C0.23 -0.86 0.73 -0.68 0.90 -0.31
                                                C1.12 -0.03 0.84 0.45 0.51 0.53
                                                C0.20 0.85 -0.39 0.78 -0.61 0.52
                                                C-0.91 0.49 -1.10 0.21 -1 0.04
                                                Z
                                              `
                                              : `
                                                M-1 -0.04
                                                C-0.70 -0.69 -0.22 -0.82 0.15 -0.62
                                                C0.52 -0.79 0.96 -0.42 0.91 -0.05
                                                C1.06 0.34 0.58 0.72 0.20 0.65
                                                C-0.15 0.87 -0.63 0.69 -0.78 0.42
                                                C-1.02 0.35 -1.12 0.08 -1 -0.04
                                                Z
                                              `
                                        }
                                        fill="#75877a"
                                        fillOpacity="0.80"
                                        stroke="#405247"
                                        strokeWidth="0.075"
                                        vectorEffect="non-scaling-stroke"
                                      />

                                      <path
                                        d="
                                          M-0.57 0.06
                                          C-0.30 -0.04 0.00 0.02 0.23 -0.04

                                          M-0.25 0.35
                                          C0.02 0.25 0.30 0.31 0.52 0.24
                                        "
                                        fill="none"
                                        stroke="#34483d"
                                        strokeWidth="0.052"
                                        opacity="0.42"
                                        vectorEffect="non-scaling-stroke"
                                      />
                                    </g>
                                  )
                                )}
                              </g>
                            </g>
                          );
                        })()}


                      {/*
                        BIOME DIRECT WHOLE-SYMBOL LAYER
                      */}
                      {symbol &&
                        (
                          group.terrainType === "plains" ||
                          group.terrainType === "desert" ||
                          group.terrainType === "swamp" ||
                          group.terrainType === "snow"
                        ) && (
                          <g>
                            {buildStoryForgeBiomeSymbolEntities(
                              activeMap,
                              group.cells,
                              group.columns,
                              group.rows,
                              group.terrainType,
                              mapDetailTier
                            ).map(
                              (
                                placement,
                                index
                              ) => {
                                /*
                                 * STORYFORGE SNOW ART V2
                                 *
                                 * Snow previously used a Unicode
                                 * sparkle/triangle. It now uses the
                                 * same hand-drawn cartographic
                                 * language as StoryForge trees and
                                 * peaks.
                                 */
                                if (
                                  group.terrainType ===
                                  "snow"
                                ) {
                                  const snowStyle =
                                      group.style ??
                                      "snowfield";

                                    /*
                                     * STORYFORGE ORGANIC SNOWDRIFT V9
                                     *
                                     * Snowfield symbols are stretched into
                                     * broad wind-shaped ridges instead of
                                     * reading like miniature mountains.
                                     *
                                     * Variation is based on placement index,
                                     * so the artwork remains stable between
                                     * React renders.
                                     */
                                    /*
                                       * STORYFORGE SNOW DENSITY V8
                                       *
                                       * Snow formations are deliberately
                                       * sparser than grasses/desert marks.
                                       * Larger open white areas make the
                                       * individual snow hills readable.
                                       */
                                      if (
                                        snowStyle === "snowfield" &&
                                        index % 3 === 2
                                      ) {
                                        return null;
                                      }

                                      const snowVariant =
                                        index % 5;

                                      /*
                                       * STORYFORGE SNOWDRIFT SHAPE V7
                                       *
                                       * Larger hand-drawn snow ridges with
                                       * enough rise to read from normal map
                                       * zoom, while staying softer than the
                                       * dedicated mountain renderer.
                                       */
                                      const snowStretch =
                                        snowStyle ===
                                        "snowfield"
                                          ? 1.12 +
                                            snowVariant *
                                              0.045
                                          : 1;

                                      const snowHeight =
                                        snowStyle ===
                                        "snowfield"
                                          ? 0.96 +
                                            (
                                              index % 3
                                            ) *
                                              0.050
                                          : 1;

                                      const snowScale =
                                        snowStyle ===
                                        "snowfield"
                                          ? 1.28 +
                                            (
                                              index % 3
                                            ) *
                                              0.060
                                          : 1;

                                      /*
                                       * Mild shared wind direction.
                                       */
                                      const snowRotation =
                                        snowStyle ===
                                        "snowfield"
                                          ? placement.rotation *
                                              0.18 +
                                            (
                                              index % 4 === 0
                                                ? -1.1
                                                : index % 4 === 2
                                                  ? 0.9
                                                  : 0
                                            )
                                          : placement.rotation;

                                      return (
                                    <g
                                      key={
                                        `biome-direct-${groupKey}-${index}`
                                      }
                                      transform={
                                        `translate(${placement.x} ${placement.y}) ` +
                                          `rotate(${snowRotation}) ` +
                                          `scale(${placement.scale * snowStretch * snowScale} ${placement.scale * snowHeight * snowScale})`
                                      }
                                      fill="none"
                                      stroke="#344a52"
                                        strokeLinecap="round"
                                      strokeLinejoin="round"
                                      opacity="0.96"
                                    >
                                      {/*
                                         * STORYFORGE SNOW TONAL SHADOW V8
                                         *
                                         * A cooler version of the desert
                                         * tonal-depth treatment.
                                         *
                                         * Stronger than V1 so it actually
                                         * reads against the pale snow,
                                         * while remaining soft enough not
                                         * to look like another ink line.
                                         */}
                                        <path
                                            d="
                                              M-1.62 0.50
                                              C-1.28 0.43 -1.02 0.25 -0.78 0.07
                                              C-0.50 -0.14 -0.24 -0.20 0.02 -0.08
                                              C0.28 0.04 0.45 0.30 0.72 0.39
                                              C0.99 0.48 1.27 0.40 1.58 0.45
                                              C1.17 0.66 0.66 0.76 0.09 0.77
                                              C-0.51 0.78 -1.08 0.69 -1.62 0.50
                                              Z
                                            "
                                            fill="#7298a7"
                                            stroke="none"
                                            opacity="0.10"
                                          />

                                          {snowStyle ===
                                      "ice" ? (
                                        <>
                                          {/*
                                           * Broken ice plate with
                                           * irregular fracture lines.
                                           */}
                                          <path
                                            d="
                                              M-1.34 0.15
                                              L-0.80 -0.66
                                              L0.03 -0.82
                                              L0.83 -0.49
                                              L1.34 0.18
                                              L0.72 0.74
                                              L-0.24 0.82
                                              L-1.05 0.56
                                              Z
                                            "
                                            strokeWidth="0.16"
                                          />

                                          <path
                                            d="
                                              M0.03 -0.82
                                              L-0.13 -0.12
                                              L0.25 0.18

                                              M-0.13 -0.12
                                              L-0.72 0.20

                                              M0.25 0.18
                                              L0.72 -0.12

                                              M0.25 0.18
                                              L0.08 0.69
                                            "
                                            strokeWidth="0.13"
                                            opacity="0.72"
                                          />

                                          <path
                                            d="
                                              M-1.18 1.03
                                              C-0.57 0.88 -0.04 0.99 0.38 0.91
                                              C0.76 0.84 1.04 0.93 1.27 1.00
                                            "
                                            strokeWidth="0.11"
                                            opacity="0.28"
                                          />
                                        </>
                                      ) : snowStyle ===
                                        "snow-peaks" ? (
                                        <>
                                          {/*
                                           * Small snowy ridge for the
                                           * Snow biome—not the main
                                           * Mountain feature renderer.
                                           */}
                                          <path
                                            d="
                                              M-1.45 0.76
                                              L-0.72 0.27
                                              L-0.20 -0.48
                                              L0.15 0.02
                                              L0.58 -0.78
                                              L1.43 0.76
                                            "
                                            strokeWidth="0.17"
                                          />

                                          <path
                                            d="
                                              M-0.20 -0.48
                                              L-0.42 -0.10
                                              L-0.12 -0.22
                                              L0.15 0.02

                                              M0.58 -0.78
                                              L0.30 -0.27
                                              L0.58 -0.40
                                              L0.83 -0.20
                                            "
                                            strokeWidth="0.13"
                                            opacity="0.70"
                                          />

                                          <path
                                            d="
                                              M-1.27 0.92
                                              C-0.66 0.74 -0.18 0.91 0.20 0.79
                                              C0.61 0.67 1.03 0.79 1.31 0.91
                                            "
                                            strokeWidth="0.11"
                                            opacity="0.30"
                                          />
                                        </>
                                      ) : (
                                        <>
                                          {/*
                                             * STORYFORGE ORGANIC SNOWFIELD V8
                                             *
                                             * Hand-drawn wind-sculpted snow.
                                             *
                                             * These are broad snowbanks and
                                             * accumulated drift lines rather
                                             * than fantasy mountain symbols.
                                             */}
                                            
                                              {/*
                                               * MAIN SNOWBANK CREST
                                               */}
                                              {/*
                                               * VARIANT A
                                               * Tall double snowbank.
                                               */}
                                              {snowVariant % 3 === 0 && (
                                                <path
                                                  d="
                                                    M-1.58 0.40
                                                    C-1.38 0.32 -1.24 0.15 -1.08 -0.06
                                                    C-0.91 -0.30 -0.74 -0.52 -0.55 -0.50
                                                    C-0.37 -0.48 -0.22 -0.25 -0.08 0.02
                                                    C0.03 0.23 0.17 0.27 0.30 0.07
                                                    C0.47 -0.19 0.59 -0.55 0.79 -0.66
                                                    C0.99 -0.76 1.17 -0.51 1.30 -0.24
                                                    C1.43 0.00 1.50 0.22 1.58 0.32
                                                  "
                                                  strokeWidth="0.20"
                                                  vectorEffect="non-scaling-stroke"
                                                />
                                              )}

                                              {/*
                                               * VARIANT B
                                               * Long wind-packed ridge.
                                               */}
                                              {snowVariant % 3 === 1 && (
                                                <path
                                                  d="
                                                    M-1.62 0.36
                                                    C-1.42 0.30 -1.27 0.13 -1.10 -0.04
                                                    C-0.92 -0.23 -0.74 -0.36 -0.56 -0.31
                                                    C-0.37 -0.26 -0.21 -0.06 -0.03 0.02
                                                    C0.16 0.10 0.31 0.02 0.46 -0.15
                                                    C0.62 -0.34 0.78 -0.46 0.95 -0.43
                                                    C1.15 -0.39 1.31 -0.17 1.45 0.05
                                                    C1.52 0.16 1.57 0.27 1.62 0.31
                                                  "
                                                  strokeWidth="0.195"
                                                  vectorEffect="non-scaling-stroke"
                                                />
                                              )}

                                              {/*
                                               * VARIANT C
                                               * Asymmetrical drift.
                                               */}
                                              {snowVariant % 3 === 2 && (
                                                <path
                                                  d="
                                                    M-1.55 0.37
                                                    C-1.34 0.29 -1.17 0.06 -0.99 -0.18
                                                    C-0.82 -0.40 -0.65 -0.45 -0.49 -0.34
                                                    C-0.33 -0.23 -0.21 -0.05 -0.04 0.02
                                                    C0.12 0.10 0.25 0.07 0.38 -0.06
                                                    C0.52 -0.20 0.65 -0.40 0.82 -0.46
                                                    C1.01 -0.52 1.17 -0.34 1.30 -0.14
                                                    C1.41 0.03 1.48 0.22 1.55 0.30
                                                  "
                                                  strokeWidth="0.20"
                                                  vectorEffect="non-scaling-stroke"
                                                />
                                              )}

                                              {/*
                                               * INNER SNOW CONTOURS
                                               */}
                                              <path
                                                d="
                                                  M-1.20 0.20
                                                  C-1.04 0.09 -0.91 -0.09 -0.77 -0.18
                                                  C-0.63 -0.27 -0.51 -0.20 -0.40 -0.06

                                                  M0.38 0.10
                                                  C0.52 -0.09 0.62 -0.31 0.77 -0.40
                                                  C0.91 -0.48 1.04 -0.33 1.15 -0.14
                                                "
                                                strokeWidth="0.105"
                                                opacity="0.80"
                                                vectorEffect="non-scaling-stroke"
                                              />

                                              {/*
                                               * LOWER ACCUMULATION
                                               */}
                                              <path
                                                d="
                                                  M-1.45 0.67
                                                  C-1.18 0.57 -0.94 0.48 -0.67 0.49
                                                  C-0.42 0.50 -0.20 0.61 0.03 0.60

                                                  M0.22 0.59
                                                  C0.47 0.55 0.69 0.44 0.94 0.44
                                                  C1.17 0.45 1.36 0.53 1.50 0.58
                                                "
                                                strokeWidth="0.105"
                                                opacity="0.58"
                                                vectorEffect="non-scaling-stroke"
                                              />

                                              {/*
                                               * SMALL BROKEN WIND MARKS
                                               */}
                                              <path
                                                d="
                                                  M-1.04 0.92
                                                  C-0.82 0.85 -0.60 0.86 -0.40 0.90

                                                  M0.04 0.88
                                                  C0.27 0.82 0.50 0.83 0.72 0.88
                                                "
                                                strokeWidth="0.075"
                                                opacity="0.29"
                                                vectorEffect="non-scaling-stroke"
                                              />
                                            </>
                                      )}
                                    </g>
                                  );
                                }

                                /*
                                 * STORYFORGE PLAINS ART V1
                                 *
                                 * Grass is drawn as irregular
                                 * hand-inked tufts instead of a
                                 * repeating Unicode mark.
                                 */
                                if (
                                  group.terrainType ===
                                  "plains"
                                ) {
                                  const plainsStyle =
                                    group.style ??
                                    "grass";

                                  return (
                                    <g
                                      key={
                                        `biome-direct-${groupKey}-${index}`
                                      }
                                      transform={
                                        `translate(${placement.x} ${placement.y}) ` +
                                        `rotate(${placement.rotation}) ` +
                                        `scale(${placement.scale * 0.60})`
                                      }
                                      fill="none"
                                      stroke={
                                        activeMap
                                          .colors
                                          .label
                                      }
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      opacity="0.64"
                                    >
                                      {plainsStyle ===
                                      "hatch" ? (
                                        <>
                                          <path
                                            d="
                                              M-1.32 0.68
                                              L-0.91 -0.05

                                              M-0.73 0.74
                                              L-0.28 -0.16

                                              M-0.10 0.68
                                              L0.30 -0.08

                                              M0.50 0.71
                                              L0.91 -0.02

                                              M1.02 0.67
                                              L1.28 0.20
                                            "
                                            strokeWidth="0.12"
                                          />

                                          <path
                                            d="
                                              M-1.43 0.83
                                              C-0.87 0.72 -0.35 0.82 0.08 0.74
                                              C0.52 0.66 0.95 0.75 1.38 0.82
                                            "
                                            strokeWidth="0.10"
                                            opacity="0.30"
                                          />
                                        </>
                                      ) : plainsStyle ===
                                        "sparse" ? (
                                        <>
                                          <path
                                            d="
                                              M-0.48 0.72
                                              C-0.45 0.15 -0.39 -0.22 -0.25 -0.59

                                              M-0.45 0.30
                                              L-0.82 -0.03

                                              M-0.39 0.13
                                              L-0.08 -0.20

                                              M0.36 0.70
                                              C0.37 0.28 0.42 0.01 0.52 -0.27

                                              M0.39 0.31
                                              L0.15 0.08
                                            "
                                            strokeWidth="0.14"
                                          />

                                          <path
                                            d="
                                              M-0.93 0.84
                                              C-0.48 0.74 -0.11 0.82 0.18 0.77
                                              C0.49 0.72 0.72 0.77 0.96 0.82
                                            "
                                            strokeWidth="0.10"
                                            opacity="0.28"
                                          />
                                        </>
                                      ) : (
                                        <>
                                          <path
                                            d="
                                              M-0.92 0.76
                                              C-0.90 0.18 -0.82 -0.28 -0.57 -0.72

                                              M-0.87 0.33
                                              L-1.22 -0.06

                                              M-0.81 0.12
                                              L-0.45 -0.27

                                              M-0.24 0.78
                                              C-0.25 0.10 -0.13 -0.39 0.04 -0.84

                                              M-0.20 0.30
                                              L-0.57 -0.12

                                              M-0.14 0.08
                                              L0.23 -0.34

                                              M0.50 0.76
                                              C0.54 0.22 0.61 -0.16 0.81 -0.56

                                              M0.55 0.32
                                              L0.31 -0.02

                                              M0.63 0.12
                                              L0.98 -0.18
                                            "
                                            strokeWidth="0.14"
                                          />

                                          <path
                                            d="
                                              M-1.24 0.88
                                              C-0.73 0.73 -0.28 0.87 0.06 0.77
                                              C0.49 0.65 0.91 0.77 1.28 0.86

                                              M-0.79 1.06
                                              C-0.33 0.95 0.14 1.01 0.55 0.96
                                            "
                                            strokeWidth="0.10"
                                            opacity="0.30"
                                          />
                                        </>
                                      )}
                                    </g>
                                  );
                                }


                                /*
                                 * STORYFORGE DESERT ART V2
                                 *
                                 * Desert placement still uses the
                                 * reliable shared biome engine.
                                 *
                                 * Each placement now represents a
                                 * broad FAMILY of overlapping dune
                                 * ridges instead of one small symbol.
                                 */
                                if (
                                  group.terrainType ===
                                  "desert"
                                ) {
                                  const desertStyle =
                                    group.style ??
                                    "dunes";

                                  /*
                                   * Nearby dunes retain roughly the
                                   * same prevailing direction while
                                   * still getting small variation.
                                   */
                                  const duneVariant =
                                    index % 5;

                                  const duneStretch =
                                    1.48 +
                                    (
                                      index % 3
                                    ) *
                                      0.10;

                                  const duneHeight =
                                    0.69 +
                                    (
                                      index % 4
                                    ) *
                                      0.035;

                                  const duneRotation =
                                    placement.rotation *
                                    0.42;

                                  return (
                                    <g
                                      key={
                                        `biome-direct-${groupKey}-${index}`
                                      }
                                      mask={
                                        `url(#${landMaskId})`
                                      }
                                    >
                                      <g
                                        mask={
                                          `url(#${maskId})`
                                        }
                                      >
                                        <g
                                          transform={
                                            `translate(${placement.x} ${placement.y}) ` +
                                            `rotate(${duneRotation}) ` +
                                            `scale(${placement.scale * duneStretch} ${placement.scale * duneHeight})`
                                          }
                                          fill="none"
                                          stroke={
                                            activeMap
                                              .colors
                                              .label
                                          }
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          opacity="0.70"
                                        >
                                          {desertStyle ===
                                          "sand-marks" ? (
                                            <>
                                              <path
                                                d="
                                                  M-1.52 -0.32
                                                  C-1.08 -0.53 -0.62 -0.48 -0.28 -0.34
                                                  C0.10 -0.18 0.45 -0.29 0.79 -0.21
                                                  C1.08 -0.14 1.31 -0.18 1.50 -0.11

                                                  M-1.26 0.13
                                                  C-0.82 -0.07 -0.38 -0.01 -0.04 0.12
                                                  C0.36 0.25 0.65 0.16 0.97 0.23

                                                  M-0.86 0.56
                                                  C-0.48 0.41 -0.08 0.43 0.29 0.55
                                                  C0.58 0.64 0.84 0.60 1.06 0.56
                                                "
                                                strokeWidth="0.10"
                                                vectorEffect="non-scaling-stroke"
                                              />

                                              <path
                                                d="
                                                  M-0.46 -0.69
                                                  C-0.17 -0.80 0.11 -0.77 0.34 -0.68

                                                  M0.72 -0.49
                                                  C0.99 -0.59 1.22 -0.55 1.40 -0.47
                                                "
                                                strokeWidth="0.075"
                                                opacity="0.42"
                                                vectorEffect="non-scaling-stroke"
                                              />
                                            </>
                                          ) : desertStyle ===
                                            "barren" ? (
                                            <>
                                              <path
                                                d="
                                                  M-1.42 0.33
                                                  L-0.91 0.15
                                                  L-0.55 0.31
                                                  L-0.13 0.08
                                                  L0.26 0.22
                                                  L0.69 0.02
                                                  L1.39 0.19

                                                  M-0.55 0.31
                                                  L-0.72 0.72

                                                  M-0.13 0.08
                                                  L-0.02 -0.43

                                                  M0.26 0.22
                                                  L0.42 0.64

                                                  M0.69 0.02
                                                  L0.72 -0.35
                                                "
                                                strokeWidth="0.11"
                                                vectorEffect="non-scaling-stroke"
                                              />

                                              <path
                                                d="
                                                  M-1.09 -0.43
                                                  C-0.70 -0.57 -0.32 -0.53 0.01 -0.42

                                                  M0.47 -0.53
                                                  C0.78 -0.63 1.08 -0.58 1.31 -0.48
                                                "
                                                strokeWidth="0.075"
                                                opacity="0.36"
                                                vectorEffect="non-scaling-stroke"
                                              />
                                            </>
                                          ) : (
                                            <>
                                              {/*
                                               * STORYFORGE DESERT TONAL SHADOW V4
                                               *
                                               * Soft tonal shadow beneath the dune
                                               * family. The main ink remains clean
                                               * while the sand gains gentle depth.
                                               */}
                                              <path
                                                d="
                                                  M-1.52 0.46
                                                  C-1.16 0.34 -0.91 0.04 -0.61 -0.15
                                                  C-0.34 -0.33 -0.09 -0.37 0.14 -0.23
                                                  C0.37 -0.09 0.52 0.15 0.78 0.27
                                                  C1.01 0.37 1.27 0.39 1.51 0.47
                                                  C1.08 0.61 0.58 0.68 0.05 0.69
                                                  C-0.51 0.70 -1.05 0.62 -1.52 0.46
                                                  Z
                                                "
                                                fill={
                                                  activeMap
                                                    .colors
                                                    .label
                                                }
                                                stroke="none"
                                                opacity="0.085"
                                              />

                                              {/*
                                               * BACK DUNE
                                               *
                                               * A shallower ridge sitting
                                               * behind the main formation.
                                               */}
                                              <path
                                                d={
                                                  duneVariant ===
                                                  0
                                                    ? `
                                                      M-1.62 -0.03
                                                      C-1.23 -0.10 -1.01 -0.47 -0.66 -0.55
                                                      C-0.32 -0.63 -0.10 -0.40 0.10 -0.27
                                                      C0.36 -0.09 0.58 -0.34 0.86 -0.31
                                                      C1.12 -0.28 1.30 -0.05 1.57 0.00
                                                    `
                                                    : duneVariant ===
                                                        1
                                                      ? `
                                                        M-1.60 0.02
                                                        C-1.24 -0.12 -1.05 -0.39 -0.73 -0.48
                                                        C-0.36 -0.58 -0.12 -0.31 0.08 -0.18
                                                        C0.34 0.00 0.55 -0.27 0.85 -0.34
                                                        C1.13 -0.39 1.34 -0.10 1.61 -0.03
                                                      `
                                                      : `
                                                        M-1.61 -0.01
                                                        C-1.27 -0.09 -1.03 -0.42 -0.70 -0.51
                                                        C-0.42 -0.59 -0.19 -0.43 0.02 -0.24
                                                        C0.28 0.00 0.52 -0.22 0.80 -0.29
                                                        C1.09 -0.36 1.31 -0.09 1.59 0.01
                                                      `
                                                }
                                                strokeWidth="0.11"
                                                opacity="0.38"
                                                vectorEffect="non-scaling-stroke"
                                              />


                                              {/*
                                               * MAIN DUNE CREST
                                               *
                                               * This is intentionally
                                               * asymmetric and wider than
                                               * the original dune icon.
                                               */}
                                              <path
                                                d={
                                                  duneVariant ===
                                                  0
                                                    ? `
                                                      M-1.72 0.38
                                                      C-1.34 0.31 -1.09 0.08 -0.84 -0.20
                                                      C-0.60 -0.47 -0.33 -0.69 -0.06 -0.60
                                                      C0.19 -0.52 0.32 -0.20 0.50 -0.03
                                                      C0.73 0.20 0.97 0.30 1.22 0.28
                                                      C1.40 0.27 1.56 0.32 1.73 0.38
                                                    `
                                                    : duneVariant ===
                                                        1
                                                      ? `
                                                        M-1.71 0.40
                                                        C-1.33 0.33 -1.09 0.15 -0.82 -0.10
                                                        C-0.52 -0.38 -0.25 -0.58 0.01 -0.52
                                                        C0.29 -0.45 0.43 -0.10 0.62 0.07
                                                        C0.86 0.28 1.11 0.32 1.35 0.30
                                                        C1.49 0.30 1.61 0.34 1.72 0.40
                                                      `
                                                      : duneVariant ===
                                                          2
                                                        ? `
                                                          M-1.73 0.41
                                                          C-1.39 0.32 -1.16 0.09 -0.91 -0.17
                                                          C-0.68 -0.42 -0.45 -0.62 -0.19 -0.59
                                                          C0.03 -0.57 0.16 -0.31 0.31 -0.12
                                                          C0.48 0.09 0.69 0.25 0.91 0.26
                                                          C1.20 0.28 1.44 0.28 1.73 0.41
                                                        `
                                                        : `
                                                          M-1.71 0.39
                                                          C-1.31 0.30 -1.10 0.02 -0.79 -0.24
                                                          C-0.51 -0.48 -0.23 -0.66 0.04 -0.54
                                                          C0.27 -0.44 0.38 -0.18 0.57 0.01
                                                          C0.78 0.23 1.04 0.34 1.28 0.29
                                                          C1.46 0.27 1.59 0.32 1.71 0.39
                                                        `
                                                }
                                                strokeWidth="0.14"
                                                opacity="0.77"
                                                vectorEffect="non-scaling-stroke"
                                              />


                                              {/*
                                               * FOREGROUND RIDGE
                                               *
                                               * Gives the dune family a
                                               * second overlapping hill,
                                               * instead of one isolated arc.
                                               */}
                                              <path
                                                d={
                                                  duneVariant % 2 ===
                                                  0
                                                    ? `
                                                      M-1.47 0.68
                                                      C-1.12 0.59 -0.91 0.37 -0.66 0.21
                                                      C-0.42 0.05 -0.21 0.09 -0.04 0.22
                                                      C0.17 0.39 0.35 0.52 0.58 0.50
                                                      C0.86 0.47 1.08 0.54 1.40 0.65
                                                    `
                                                    : `
                                                      M-1.40 0.66
                                                      C-1.09 0.58 -0.82 0.40 -0.60 0.24
                                                      C-0.37 0.07 -0.13 0.10 0.06 0.27
                                                      C0.25 0.45 0.44 0.53 0.65 0.48
                                                      C0.90 0.43 1.14 0.54 1.45 0.65
                                                    `
                                                }
                                                strokeWidth="0.105"
                                                opacity="0.50"
                                                vectorEffect="non-scaling-stroke"
                                              />


                                              {/*
                                               * Partial inner contour.
                                               * Not every formation gets
                                               * one, which breaks repetition.
                                               */}
                                              {duneVariant ===
                                                0 && (
                                                <path
                                                  d="
                                                    M-0.74 0.07
                                                    C-0.52 -0.17 -0.29 -0.35 -0.08 -0.32
                                                    C0.13 -0.29 0.24 -0.08 0.39 0.04
                                                  "
                                                  strokeWidth="0.075"
                                                  opacity="0.30"
                                                  vectorEffect="non-scaling-stroke"
                                                />
                                              )}


                                              {/*
                                               * Light ground contour keeps
                                               * the dune connected visually
                                               * to the desert rather than
                                               * floating above it.
                                               */}
                                              {duneVariant ===
                                                0 &&
                                                index % 3 ===
                                                  0 && (
                                                <path
                                                  d="
                                                    M-0.92 0.88
                                                    C-0.53 0.76 -0.13 0.80 0.21 0.74
                                                    C0.51 0.69 0.81 0.74 1.08 0.82
                                                  "
                                                  strokeWidth="0.065"
                                                  opacity="0.20"
                                                  vectorEffect="non-scaling-stroke"
                                                />
                                              )}
                                            </>
                                          )}
                                        </g>
                                      </g>
                                    </g>
                                  );
                                }


                                /*
                                 * STORYFORGE SWAMP ART V1
                                 *
                                 * Marsh artwork uses reeds,
                                 * water lines, and dead wood
                                 * rather than typographic marks.
                                 */
                                if (
                                  group.terrainType ===
                                  "swamp"
                                ) {
                                  const swampStyle =
                                    group.style ??
                                    "reeds";

                                  /*
                                   * SWAMP HYDROLOGY V1
                                   *
                                   * Stable variant selection means
                                   * pools/channels remain in exactly
                                   * the same place after rerenders
                                   * and reloads.
                                   */
                                  const swampWaterVariant =
                                    index % 5;

                                  return (
                                    <g
                                      key={
                                        `biome-direct-${groupKey}-${index}`
                                      }
                                      transform={
                                        `translate(${placement.x} ${placement.y}) ` +
                                        `rotate(${placement.rotation}) ` +
                                        `scale(${placement.scale * 0.64})`
                                      }
                                      fill="none"
                                      stroke={
                                        activeMap
                                          .colors
                                          .label
                                      }
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      opacity="0.66"
                                    >
                                      {/*
                                       * Small murky pools and wet
                                       * channels are part of the
                                       * swamp itself.
                                       *
                                       * They deliberately do NOT use
                                       * the normal map-water blue.
                                       */}
                                      {swampWaterVariant ===
                                        0 && (
                                        <>
                                          <path
                                            d="
                                              M-1.22 0.24
                                              C-0.92 -0.05 -0.51 -0.12 -0.18 0.00
                                              C0.14 0.12 0.40 -0.04 0.70 0.01
                                              C1.03 0.07 1.20 0.29 1.02 0.47
                                              C0.76 0.72 0.25 0.66 -0.07 0.58
                                              C-0.47 0.49 -0.90 0.67 -1.18 0.45
                                              C-1.30 0.36 -1.29 0.30 -1.22 0.24
                                              Z
                                            "
                                            fill="#68705a"
                                            fillOpacity="0.46"
                                            stroke="#4e5b4d"
                                            strokeWidth="0.08"
                                            opacity="0.82"
                                          />

                                          <path
                                            d="
                                              M-0.91 0.31
                                              C-0.51 0.19 -0.17 0.32 0.13 0.25
                                              C0.40 0.19 0.66 0.25 0.86 0.34
                                            "
                                            stroke="#4e5b4d"
                                            strokeWidth="0.07"
                                            opacity="0.38"
                                          />
                                        </>
                                      )}

                                      {swampWaterVariant ===
                                        1 && (
                                        <>
                                          {/*
                                           * Narrow winding swamp
                                           * channel rather than a
                                           * full normal river.
                                           */}
                                          <path
                                            d="
                                              M-1.34 -0.25
                                              C-0.94 -0.47 -0.66 -0.02 -0.30 0.00
                                              C0.06 0.02 0.20 -0.27 0.53 -0.20
                                              C0.82 -0.14 0.94 0.16 1.30 0.03
                                            "
                                            stroke="#68705a"
                                            strokeWidth="0.30"
                                            opacity="0.58"
                                          />

                                          <path
                                            d="
                                              M-1.34 -0.25
                                              C-0.94 -0.47 -0.66 -0.02 -0.30 0.00
                                              C0.06 0.02 0.20 -0.27 0.53 -0.20
                                              C0.82 -0.14 0.94 0.16 1.30 0.03
                                            "
                                            stroke="#4e5b4d"
                                            strokeWidth="0.055"
                                            opacity="0.36"
                                          />
                                        </>
                                      )}

                                      {swampWaterVariant ===
                                        2 && (
                                        <>
                                          <ellipse
                                            cx="-0.55"
                                            cy="0.30"
                                            rx="0.68"
                                            ry="0.28"
                                            fill="#68705a"
                                            fillOpacity="0.43"
                                            stroke="#4e5b4d"
                                            strokeWidth="0.07"
                                          />

                                          <ellipse
                                            cx="0.67"
                                            cy="-0.05"
                                            rx="0.43"
                                            ry="0.20"
                                            fill="#68705a"
                                            fillOpacity="0.34"
                                            stroke="#4e5b4d"
                                            strokeWidth="0.06"
                                          />

                                          <path
                                            d="
                                              M0.22 0.15
                                              C0.34 0.06 0.43 0.00 0.55 -0.02
                                            "
                                            stroke="#68705a"
                                            strokeWidth="0.16"
                                            opacity="0.48"
                                          />
                                        </>
                                      )}

                                      {swampWaterVariant ===
                                        3 && (
                                        <>
                                          <path
                                            d="
                                              M-0.92 0.41
                                              C-0.63 0.18 -0.23 0.16 0.03 0.27
                                              C0.31 0.38 0.47 0.59 0.23 0.72
                                              C-0.11 0.90 -0.65 0.76 -0.91 0.57
                                              C-1.00 0.50 -0.99 0.46 -0.92 0.41
                                              Z
                                            "
                                            fill="#68705a"
                                            fillOpacity="0.41"
                                            stroke="#4e5b4d"
                                            strokeWidth="0.07"
                                          />

                                          <path
                                            d="
                                              M0.15 0.34
                                              C0.51 0.20 0.65 -0.05 0.87 -0.18
                                              C1.02 -0.27 1.14 -0.25 1.28 -0.19
                                            "
                                            stroke="#68705a"
                                            strokeWidth="0.23"
                                            opacity="0.52"
                                          />
                                        </>
                                      )}

                                      {/*
                                       * Variant 4 deliberately has
                                       * no visible water. Natural
                                       * swamps need occasional drier
                                       * clumps and islands.
                                       */}

                                      {swampStyle ===
                                      "dead-trees" ? (
                                        <>
                                          <path
                                            d="
                                              M0.02 0.77
                                              C-0.02 0.25 0.02 -0.20 -0.08 -0.72

                                              M-0.05 -0.25
                                              L-0.61 -0.58

                                              M-0.31 -0.43
                                              L-0.50 -0.80

                                              M-0.01 -0.03
                                              L0.53 -0.43

                                              M0.28 -0.25
                                              L0.52 -0.72
                                            "
                                            strokeWidth="0.17"
                                          />

                                          <path
                                            d="
                                              M-1.26 0.78
                                              C-0.86 0.67 -0.53 0.75 -0.25 0.71
                                              C0.11 0.65 0.39 0.71 0.67 0.68
                                              C0.92 0.65 1.11 0.68 1.29 0.74

                                              M-0.98 1.02
                                              C-0.54 0.92 -0.14 1.00 0.20 0.94
                                              C0.53 0.88 0.85 0.93 1.11 0.99
                                            "
                                            strokeWidth="0.10"
                                            opacity="0.40"
                                          />
                                        </>
                                      ) : swampStyle ===
                                        "marsh" ? (
                                        <>
                                          <path
                                            d="
                                              M-1.36 0.26
                                              C-0.93 0.13 -0.54 0.20 -0.22 0.15
                                              C0.12 0.09 0.42 0.16 0.72 0.13
                                              C0.97 0.10 1.16 0.15 1.35 0.21

                                              M-1.17 0.67
                                              C-0.73 0.54 -0.36 0.63 -0.04 0.56
                                              C0.30 0.49 0.62 0.57 0.92 0.53
                                              C1.07 0.51 1.20 0.54 1.31 0.58
                                            "
                                            strokeWidth="0.11"
                                          />

                                          <path
                                            d="
                                              M-0.76 0.17
                                              C-0.72 -0.17 -0.67 -0.41 -0.54 -0.67

                                              M-0.69 -0.18
                                              L-0.91 -0.43

                                              M0.20 0.12
                                              C0.22 -0.20 0.27 -0.45 0.39 -0.70

                                              M0.26 -0.21
                                              L0.52 -0.43

                                              M0.83 0.17
                                              C0.85 -0.05 0.89 -0.24 0.98 -0.43
                                            "
                                            strokeWidth="0.13"
                                          />
                                        </>
                                      ) : (
                                        <>
                                          <path
                                            d="
                                              M-0.94 0.61
                                              C-0.94 0.07 -0.88 -0.36 -0.73 -0.79

                                              M-0.89 0.08
                                              L-1.18 -0.24

                                              M-0.39 0.65
                                              C-0.40 0.11 -0.32 -0.34 -0.15 -0.69

                                              M-0.34 0.13
                                              L-0.63 -0.18

                                              M0.28 0.63
                                              C0.29 0.05 0.36 -0.38 0.53 -0.77

                                              M0.34 0.10
                                              L0.66 -0.22

                                              M0.87 0.61
                                              C0.90 0.20 0.95 -0.12 1.09 -0.42
                                            "
                                            strokeWidth="0.14"
                                          />

                                          <path
                                            d="
                                              M-1.35 0.77
                                              C-0.91 0.66 -0.55 0.75 -0.24 0.69
                                              C0.09 0.63 0.41 0.70 0.70 0.66
                                              C0.96 0.63 1.16 0.67 1.34 0.72

                                              M-0.98 1.00
                                              C-0.59 0.91 -0.20 0.97 0.10 0.93
                                              C0.42 0.89 0.73 0.92 1.02 0.97
                                            "
                                            strokeWidth="0.10"
                                            opacity="0.38"
                                          />
                                        </>
                                      )}
                                    </g>
                                  );
                                }


                                return (
                                  
                                <g
                                  key={
                                    `biome-depth-${groupKey}-${index}`
                                  }
                                >
                                  {/*
                                    DESERT TONAL SHADOW V1

                                    This is not a second dune
                                    outline. It is a shallow,
                                    faded patch of the desert's
                                    own color, multiplied into
                                    the biome underneath.

                                    That creates depth without
                                    increasing line contrast.
                                  */}
                                  {group.terrainType ===
                                    "desert" &&
                                    group.style ===
                                      "dunes" && (
                                      <ellipse
                                        cx={
                                          placement.x +
                                          0.10
                                        }
                                        cy={
                                          placement.y +
                                          0.32
                                        }
                                        rx={
                                          1.10 *
                                          placement.scale
                                        }
                                        ry={
                                          0.31 *
                                          placement.scale
                                        }
                                        fill={fill}
                                        opacity="0.22"
                                        filter={
                                          `url(#${desertShadowFilterId})`
                                        }
                                        style={{
                                          mixBlendMode:
                                            "multiply",
                                        }}
                                        transform={
                                          `rotate(${placement.rotation} ${placement.x + 0.10} ${placement.y + 0.32})`
                                        }
                                      />
                                    )}

<text
                                    key={
                                      `biome-direct-${groupKey}-${index}`
                                    }
                                    x={placement.x}
                                    y={placement.y}
                                    fontSize={
                                      2.35 *
                                      placement.scale
                                    }
                                    opacity="0.68"
                                    fill={
                                      activeMap
                                        .colors
                                        .label
                                    }
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    transform={
                                      `rotate(${placement.rotation} ${placement.x} ${placement.y})`
                                    }
                                  >
                                    {symbol}
                                  </text>
                                </g>
                                );
                              }
                            )}
                          </g>
                        )}

</svg>
                );
              }
            );
          })()}

          {/*
            Political regions intentionally remain
            separate from terrain/biome rendering.
          */}
          {politicalMapRegions
            .flatMap((region) =>
              region.cells.map((key) => {
                const {
                  column,
                  row,
                } =
                  parseCellKey(key);

                return (
                  <div
                    key={
                      `${region.id}:${key}`
                    }
                    className={[
                      "sf-map-region-cell-v1",
                      "sf-map-region-political-v1",
                    ].join(" ")}
                    title={region.name}
                    style={{
                      left: `${
                        (column /
                          region.columns) *
                        100
                      }%`,
                      top: `${
                        (row /
                          region.rows) *
                        100
                      }%`,
                      width: `${
                        100 /
                        region.columns
                      }%`,
                      height: `${
                        100 /
                        region.rows
                      }%`,
                      backgroundColor:
                        activeMap
                          .colors
                          .accent,
                    }}
                  />
                );
              })
            )}

          {(() => {
            const groups =
              new Map<
                string,
                TerrainStamp[]
              >();

            activeMap.terrain.forEach(
              (stamp) => {
                /*
                 * Mountains are symbol-only features.
                 * Keep their data, but skip the generic
                 * smoothed terrain fill renderer.
                 */
                if (stamp.type === "mountain") {
                  return;
                }

                if (
                  !stamp.smoothed ||
                  !stamp.strokeId
                ) {
                  return;
                }

                const key = [
                    stamp.strokeId,
                    stamp.type,
                  ].join(":");

                const existing =
                  groups.get(key) ?? [];

                existing.push(stamp);

                groups.set(
                  key,
                  existing
                );
              }
            );

            const rect =
              canvasRef.current
                ?.getBoundingClientRect();

            const canvasAspect =
              rect && rect.height > 0
                ? rect.width /
                  rect.height
                : 1.6;

            return [
              ...groups.entries(),
            ].map(
              ([groupKey, group]) => {
                const first =
                  group[0];

                if (!first) {
                  return null;
                }

                  const containsFill =
                    group.some(
                      (stamp) =>
                        stamp.fillGenerated ===
                        true
                    );

                /*
                 * Smoothing strength is based on
                 * the original brush/cell size.
                 *
                 * Instead of rounding every cell,
                 * Gaussian blur creates one shared
                 * alpha field. The color matrix
                 * turns that field back into a
                 * solid merged landmass.
                 */
                const smoothX =
                    Math.max(
                      0.28,
                      Math.min(
                        0.8,
                        first.size * 0.18
                      )
                    );

                /*
                 * SVG uses a 0-100 map coordinate
                 * system. Correct Y smoothing for
                 * the actual rectangular canvas.
                 */
                const smoothY =
                    smoothX *
                    canvasAspect;

                  /*
                   * Slightly pull the final coastline
                   * inward. This compensates for the
                   * overlap used by Fill cells without
                   * noticeably shrinking the island.
                   */
                  const coastInset =
                    Math.max(
                      0.05,
                      Math.min(
                        0.14,
                        first.size * 0.025
                      )
                    );

                  const coastInsetY =
                    coastInset *
                    canvasAspect;

                const safeId =
                  (
                    "sf-smooth-" +
                    groupKey
                  ).replace(
                    /[^a-zA-Z0-9_-]/g,
                    "-"
                  );

                const fill =
                  terrainColor(
                    first.type,
                    activeMap.colors
                  );

                return (
                  <svg
                    key={groupKey}
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    style={{
                      position:
                        "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      overflow:
                        "hidden",
                      pointerEvents:
                        "none",

                      zIndex:
                        terrainRenderLayer(
                          first.type
                        ),
                    }}
                  >
                    <defs>
                      <filter
                        id={safeId}
                        x="-8"
                        y="-12"
                        width="116"
                        height="124"
                        filterUnits="userSpaceOnUse"
                        colorInterpolationFilters="sRGB"
                      >
                        <feGaussianBlur
                          in="SourceGraphic"
                          stdDeviation={`${smoothX} ${smoothY}`}
                          result="terrainBlur"
                        />

                        <feColorMatrix
                          in="terrainBlur"
                          type="matrix"
                          values="
                            1 0 0 0 0
                            0 1 0 0 0
                            0 0 1 0 0
                            0 0 0 22 -10
                          "
                          result="terrainMerged"
                        />

                          {/*
                            Very subtle stable noise keeps
                            the coastline organic without
                            redesigning the user's shape.
                          */}
                          <feTurbulence
                            type="fractalNoise"
                            baseFrequency="0.045 0.065"
                            numOctaves="2"
                            seed="31"
                            result="coastNoise"
                          />

                          <feDisplacementMap
                            in="terrainMerged"
                            in2="coastNoise"
                            scale="0.32"
                            xChannelSelector="R"
                            yChannelSelector="G"
                            result="naturalCoast"
                          />

                          <feGaussianBlur
                            in="naturalCoast"
                            stdDeviation="0.04 0.06"
                            result="coastSoft"
                          />

                          {!containsFill && (
                            <feMorphology
                            in="coastSoft"
                            operator="erode"
                            radius={`${coastInset} ${coastInsetY}`}
                            result="finalCoast"
                          />
                          )}
                      </filter>
                    </defs>

                    <g
                      filter={`url(#${safeId})`}
                      opacity={0.96}
                    >
                      {group.map(
                        (stamp) => {
                          const height =
                            stamp.size *
                            canvasAspect;

                          /*
                           * Round freehand stamps
                           * become ellipses in the
                           * normalized SVG space so
                           * they remain visually
                           * circular on screen.
                           */
                          if (
                            stamp.mode !==
                              "grid" &&
                            stamp.shape !==
                              "square"
                          ) {
                            return (
                              <ellipse
                                key={
                                  stamp.id
                                }
                                cx={
                                  stamp.x
                                }
                                cy={
                                  stamp.y
                                }
                                rx={
                                  stamp.size /
                                  2
                                }
                                ry={
                                  height /
                                  2
                                }
                                fill={fill}
                              />
                            );
                          }

                          return (
                            <rect
                              key={
                                stamp.id
                              }
                              x={
                                stamp.x -
                                stamp.size /
                                  2
                              }
                              y={
                                stamp.y -
                                height / 2
                              }
                              width={
                                stamp.size
                              }
                              height={
                                height
                              }
                              fill={fill}
                            />
                          );
                        }
                      )}
                    </g>
                  </svg>
                );
              }
            );
          })()}

          {activeMap.terrain.map((stamp) => {
            /*
             * Once a stroke is smoothed, the SVG
             * above becomes its visible form.
             *
             * These original stamps remain in the
             * terrain array so Eraser and Undo can
             * still edit the underlying map.
             */
            /*
             * Mountains never draw as colored terrain
             * stamps. Their dedicated peak renderer below
             * is their only visible representation.
             */
            if (
              stamp.smoothed ||
              stamp.type === "mountain"
            ) {
              return null;
            }

            const texture =
              terrainTexture(
                stamp.type,
                stamp.terrainStyle
              );

            return (
              <div
                key={stamp.id}
                className={[
                  "sf-map-stroke-v2",
                  stamp.mode === "grid"
                    ? "sf-map-stroke-grid-v2"
                    : "sf-map-stroke-freehand-v2",
                ].join(" ")}
                style={{
                  left: `${stamp.x}%`,
                  top: `${stamp.y}%`,
                  width: `${stamp.size}%`,
                  aspectRatio: "1 / 1",

                  borderRadius:
                    stamp.mode ===
                      "grid" ||
                    stamp.shape ===
                      "square"
                      ? "0"
                      : "999px",

                  backgroundColor:
                    terrainColor(
                      stamp.type,
                      activeMap.colors
                    ),

                  backgroundImage:
                    texture,

                  backgroundSize:
                    stamp.terrainStyle ===
                    "sand-marks"
                      ? "8px 8px"
                      : undefined,

                  opacity: 0.96,
                  overflow: "hidden",

                  zIndex:
                    terrainRenderLayer(
                      stamp.type
                    ),
                }}
              />
            );
          })}

          {(() => {
            const mountainStamps =
              mountainTerrainStamps;

            const visibleMountains:
              TerrainStamp[] = [];

            /*
             * Stable pseudo-randomness.
             *
             * A mountain keeps the same ridge shape
             * after React rerenders or map reloads.
             */
            const stableMountainValue = (
              value: string
            ) => {
              let hash = 2166136261;

              for (
                let index = 0;
                index < value.length;
                index += 1
              ) {
                hash ^=
                  value.charCodeAt(index);

                hash = Math.imul(
                  hash,
                  16777619
                );
              }

              return (
                (hash >>> 0) /
                4294967295
              );
            };

            /*
             * Reduce the extremely dense raw brush
             * samples into visible ridge clusters.
             */
            for (
              const stamp of
              mountainStamps
            ) {
                /*
                 * Mountain artwork size is independent from
                 * automatic ridge spacing.
                 *
                 * Changing Scale changes only the visible
                 * mountain artwork, not mountain density.
                 */
                const spacing = 2.75;

              const tooClose =
                visibleMountains.some(
                  (other) => {
                    const dx =
                      other.x -
                      stamp.x;

                    const dy =
                      other.y -
                      stamp.y;

                    return (
                      Math.sqrt(
                        dx * dx +
                          dy * dy
                      ) < spacing
                    );
                  }
                );

              if (!tooClose) {
                visibleMountains.push(
                  stamp
                );
              }
            }

            /*
             * Group visible ridge samples by their
             * original brush stroke.
             */
            const visibleStrokeGroups =
              new Map<
                string,
                TerrainStamp[]
              >();

            visibleMountains.forEach(
              (stamp) => {
                const strokeKey =
                  stamp.strokeId ??
                  stamp.id;

                const group =
                  visibleStrokeGroups.get(
                    strokeKey
                  ) ?? [];

                group.push(stamp);

                visibleStrokeGroups.set(
                  strokeKey,
                  group
                );
              }
            );

            return visibleMountains.map(
              (stamp) => {
                const strokeKey =
                  stamp.strokeId ??
                  stamp.id;

                const stroke =
                  visibleStrokeGroups.get(
                    strokeKey
                  ) ?? [stamp];

                const strokeIndex =
                  stroke.indexOf(stamp);

                const first =
                  stroke[0] ??
                  stamp;

                const last =
                  stroke[
                    stroke.length - 1
                  ] ?? stamp;

                const distanceToStart =
                  Math.sqrt(
                    (stamp.x -
                      first.x) **
                      2 +
                      (stamp.y -
                        first.y) **
                        2
                  );

                const distanceToEnd =
                  Math.sqrt(
                    (stamp.x -
                      last.x) **
                      2 +
                      (stamp.y -
                        last.y) **
                        2
                  );

                /*
                 * Range ends naturally get weaker.
                 */
                const edgeDepth =
                  Math.max(
                    2.0,
                    stamp.size * 1.2
                  );

                const endStrength =
                  Math.max(
                    0,
                    Math.min(
                      1,
                      Math.min(
                        distanceToStart,
                        distanceToEnd
                      ) /
                        edgeDepth
                    )
                  );

                /*
                 * Local ridge density.
                 *
                 * A straight range normally has fewer
                 * nearby clusters at its ends and more
                 * support through its interior.
                 */
                const neighborRadius =
                  Math.max(
                    2.5,
                    stamp.size * 1.5
                  );

                const neighborCount =
                  stroke.filter(
                    (other) => {
                      const dx =
                        other.x -
                        stamp.x;

                      const dy =
                        other.y -
                        stamp.y;

                      return (
                        Math.sqrt(
                          dx * dx +
                            dy * dy
                        ) <=
                        neighborRadius
                      );
                    }
                  ).length;

                const neighborStrength =
                  Math.max(
                    0,
                    Math.min(
                      1,
                      (neighborCount -
                        1) /
                        3
                    )
                  );

                /*
                 * Combine end-distance and local
                 * support into one density value.
                 */
                const density =
                  Math.max(
                    0,
                    Math.min(
                      1,
                      endStrength *
                        0.48 +
                        neighborStrength *
                          0.52
                    )
                  );

                const countRoll =
                  stableMountainValue(
                    `${stamp.id}:peaks`
                  );

                let peakCount = 1;

                if (density >= 0.72) {
                  peakCount =
                    countRoll < 0.58
                      ? 3
                      : 2;
                } else if (
                  density >= 0.38
                ) {
                  peakCount =
                    countRoll < 0.68
                      ? 2
                      : 1;
                }

                /*
                 * Outer-range clusters become smaller.
                 */
                const sizeVariation =
                  0.90 +
                  stableMountainValue(
                    `${stamp.id}:size`
                  ) *
                    0.18;

                const mountainScaleValue =
                  typeof stamp.mountainScale ===
                  "number"
                    ? Math.max(
                        0.65,
                        Math.min(
                          1.8,
                          stamp.mountainScale
                        )
                      )
                    : 1;

                /*
                 * Density still gives range edges a
                 * small natural taper.
                 *
                 * Scale is now the primary control over
                 * physical mountain size.
                 */
                const densityScale =
                  0.84 +
                  density * 0.16;

                const ridgeWidth =
                  Math.max(
                    1.8,
                    Math.min(
                      6.4,
                      3.25 *
                        mountainScaleValue *
                        densityScale *
                        sizeVariation
                    )
                  );

                const ridgeHeight =
                  ridgeWidth *
                  0.68;

                const mountainFill =
                  terrainColor(
                    "mountain",
                    activeMap.colors
                  );

                const ink =
                  activeMap.colors.label;

                  /*
                   * Each mountain stamp remembers the
                   * style selected when it was drawn.
                   */
                  const mountainStyle =
                    stamp.terrainStyle ??
                    "rocky";

                const peakVariation =
                  stableMountainValue(
                    `${stamp.id}:height`
                  );

                const mainPeakY =
                  7 +
                  peakVariation * 6;

                return (
                  <svg
                    key={
                      `mountain-ridge-${stamp.id}`
                    }
                    viewBox="0 0 100 64"
                    preserveAspectRatio="xMidYMid meet"
                    aria-hidden="true"
                    style={{
                      position:
                        "absolute",

                      left:
                        `${stamp.x}%`,

                      top:
                        `${stamp.y}%`,

                      width:
                        `${ridgeWidth}%`,

                      height:
                        `${ridgeHeight}%`,

                      transform:
                        "translate(-50%, -54%)",

                      overflow:
                        "visible",

                      pointerEvents:
                        "none",

                      zIndex: 4,
                    }}
                  >
                      {mountainStyle === "rocky" && (
                        <>
                          {/*
                           * STORYFORGE BASELINE PEAKS
                           *
                           * Inspired by the approved concept:
                           * clean dark cartographic outline,
                           * layered ridge faces and subtle
                           * parchment-map ground marks.
                           */}

                          <path
                            d={
                              peakCount === 1
                                ? `M5 59
                                   L17 53
                                   L29 39
                                   L38 31
                                   L50 ${mainPeakY}
                                   L59 31
                                   L68 40
                                   L80 52
                                   L95 59
                                   Z`
                                : peakCount === 2
                                  ? `M3 59
                                     L15 51
                                     L29 27
                                     L39 40
                                     L46 48
                                     L56 ${mainPeakY}
                                     L66 31
                                     L76 44
                                     L84 51
                                     L97 59
                                     Z`
                                  : `M2 59
                                     L13 51
                                     L24 32
                                     L34 43
                                     L41 49
                                     L51 ${mainPeakY}
                                     L62 39
                                     L70 45
                                     L79 27
                                     L89 46
                                     L99 59
                                     Z`
                            }
                            fill={mountainFill}
                            fillOpacity="0.88"
                            stroke={ink}
                            strokeWidth="2.7"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                          />

                          <path
                            d={
                              peakCount === 1
                                ? `M50 ${mainPeakY}
                                   L43 29
                                   L37 39

                                   M50 ${mainPeakY}
                                   L57 30
                                   L63 41

                                   M29 39
                                   L23 49

                                   M68 40
                                   L74 50`
                                : peakCount === 2
                                  ? `M29 27
                                     L23 39
                                     L17 48

                                     M29 27
                                     L35 36
                                     L39 40

                                     M56 ${mainPeakY}
                                     L49 29
                                     L43 41

                                     M56 ${mainPeakY}
                                     L63 27
                                     L66 31

                                     M76 44
                                     L82 52`
                                  : `M24 32
                                     L18 43
                                     L13 51

                                     M24 32
                                     L30 40
                                     L34 43

                                     M51 ${mainPeakY}
                                     L43 29
                                     L36 42

                                     M51 ${mainPeakY}
                                     L58 30
                                     L62 39

                                     M79 27
                                     L72 39
                                     L67 47

                                     M79 27
                                     L85 38
                                     L89 46`
                            }
                            fill="none"
                            stroke={ink}
                            strokeWidth="1.55"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.68"
                          />

                          <path
                            d="
                              M9 57
                              C20 54 29 58 40 55
                              C51 52 62 57 73 54
                              C82 52 89 55 94 56
                            "
                            fill="none"
                            stroke={ink}
                            strokeWidth="1"
                            strokeLinecap="round"
                            opacity="0.32"
                          />

                          <path
                            d="
                              M20 55 L28 47
                              M25 57 L33 49

                              M67 53 L72 47
                              M72 55 L77 50
                            "
                            fill="none"
                            stroke={ink}
                            strokeWidth="0.8"
                            strokeLinecap="round"
                            opacity="0.25"
                          />
                        </>
                      )}

                    {mountainStyle !== "rocky" && peakCount === 1 && (
                      <>
                        <path
                          d={
                            `M9 59 L50 ${mainPeakY} L91 59 Z`
                          }
                          fill={
                            mountainFill
                          }
                          fillOpacity="0.88"
                          stroke={ink}
                          strokeWidth="3"
                          strokeLinejoin="round"
                        />

                        <path
                          d={
                            `M50 ${mainPeakY} L41 30 L33 39`
                          }
                          fill="none"
                          stroke={ink}
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          opacity="0.58"
                        />
                      </>
                    )}

                    {mountainStyle !== "rocky" && peakCount === 2 && (
                      <>
                        <path
                          d="
                            M5 59
                            L32 25
                            L55 59
                            Z
                          "
                          fill={
                            mountainFill
                          }
                          fillOpacity="0.82"
                          stroke={ink}
                          strokeWidth="2.7"
                          strokeLinejoin="round"
                        />

                        <path
                          d={
                            `M32 59 L67 ${mainPeakY} L97 59 Z`
                          }
                          fill={
                            mountainFill
                          }
                          fillOpacity="0.9"
                          stroke={ink}
                          strokeWidth="3"
                          strokeLinejoin="round"
                        />

                        <path
                          d="
                            M32 25
                            L25 39
                            L19 44
                          "
                          fill="none"
                          stroke={ink}
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          opacity="0.5"
                        />

                        <path
                          d={
                            `M67 ${mainPeakY} L57 31 L50 40`
                          }
                          fill="none"
                          stroke={ink}
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          opacity="0.58"
                        />
                      </>
                    )}

                    {mountainStyle !== "rocky" && peakCount === 3 && (
                      <>
                        <path
                          d="
                            M2 59
                            L23 31
                            L43 59
                            Z
                          "
                          fill={
                            mountainFill
                          }
                          fillOpacity="0.8"
                          stroke={ink}
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                        />

                        <path
                          d={
                            `M23 59 L52 ${mainPeakY} L78 59 Z`
                          }
                          fill={
                            mountainFill
                          }
                          fillOpacity="0.92"
                          stroke={ink}
                          strokeWidth="3"
                          strokeLinejoin="round"
                        />

                        <path
                          d="
                            M59 59
                            L80 27
                            L99 59
                            Z
                          "
                          fill={
                            mountainFill
                          }
                          fillOpacity="0.82"
                          stroke={ink}
                          strokeWidth="2.5"
                          strokeLinejoin="round"
                        />

                        <path
                          d={
                            `M52 ${mainPeakY} L43 30 L36 39`
                          }
                          fill="none"
                          stroke={ink}
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          opacity="0.58"
                        />

                        <path
                          d="
                            M23 31
                            L18 41
                          "
                          fill="none"
                          stroke={ink}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          opacity="0.48"
                        />

                        <path
                          d="
                            M80 27
                            L74 40
                          "
                          fill="none"
                          stroke={ink}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          opacity="0.48"
                        />
                      </>
                    )}
                  </svg>
                );
              }
            );
          })()}

          {locationEditor?.isNew && (
            <div
              className="sf-map-marker-v2"
              aria-hidden="true"
              style={{
                left:
                  `${locationEditor.location.x}%`,

                top:
                  `${locationEditor.location.y}%`,

                zIndex: 6,

                color:
                  activeMap.colors.label,

                opacity: 0.72,

                pointerEvents: "none",
              }}
            >
              <span className="sf-map-marker-label-v2">
                {
                  locationEditor.location
                    .name.trim() ||
                  LOCATION_LABELS[
                    locationEditor.location
                      .type
                  ]
                }
              </span>

              <span
                className={[
                  "sf-map-marker-symbol-v3",
                  `sf-map-marker-size-${
                    locationEditor.location
                      .size ?? "small"
                  }-v3`,
                ].join(" ")}
              >
                {locationMapSymbol(
                  locationEditor.location.type
                )}
              </span>
            </div>
          )}

          {activeMap.locations.map(
            (location) => (
              <button
                key={location.id}
                type="button"
                className="sf-map-marker-v2"
                style={{
                  left: `${location.x}%`,
                  top: `${location.y}%`,
                  zIndex: 5,

                  /*
                   * Roads and rivers must be able
                   * to terminate directly at a
                   * settlement without the marker
                   * stealing the map click.
                   */
                  pointerEvents:
                    tool === "river" ||
                    tool === "road" ||
                    tool === "erase"
                      ? "none"
                      : "auto",

                  color:
                    activeMap.colors.label,
                }}
                onPointerDown={(event) =>
                  event.stopPropagation()
                }
                onClick={(event) => {
                  event.stopPropagation();

                  setTool("location");
                  setPlacingLocation(false);
                  setSelectedLocationType(
                    location.type
                  );

                  setLocationEditor({
                    isNew: false,
                    location: {
                      ...location,
                    },
                  });
                }}
              >
                <span className="sf-map-marker-label-v2">
                  {location.name}
                </span>

                <span
                  className={[
                    "sf-map-marker-symbol-v3",
                    `sf-map-marker-size-${
                      location.size ??
                      "small"
                    }-v3`,
                  ].join(" ")}
                >
                  {locationMapSymbol(
                    location.type
                  )}
                </span>
              </button>
            )
          )}

          {placingLocation &&
            selectedLocationType && (
              <div className="sf-map-canvas-message-v2">
                Click the map to place{" "}
                {
                  LOCATION_LABELS[
                    selectedLocationType
                  ]
                }.
              </div>
            )}

          {movingLocationId && (
            <div className="sf-map-canvas-message-v2">
              Click the new location.
            </div>
          )}
        </div>
      </div>

      <div className="sf-map-statusbar-v2">
        <span>
          Tool:{" "}
          <strong>{title(tool)}</strong>
        </span>

        <span>
          Mode:{" "}
          <strong>{title(drawMode)}</strong>
        </span>

        <span>
          {activeMap.terrain.length} terrain
          marks
        </span>

        <span>
          {activeMap.locations.length}{" "}
          locations
        </span>
      </div>

      {locationEditor && (
        <div
          ref={locationEditorRef}
          className="card sf-map-location-editor-v2"
        >
          <div className="sf-map-location-editor-title-v2">
            <h3>
              {locationEditor.isNew
                ? "Add Location"
                : "Edit Location"}
            </h3>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setLocationEditor(null);
                setPlacingLocation(false);
                setTool("select");
              }}
            >
              Close
            </button>
          </div>

          <div className="sf-map-location-grid-v2">
            <label>
              Name

              <input
                className="form-input"
                value={
                  locationEditor.location.name
                }
                onChange={(event) =>
                  setLocationEditor({
                    ...locationEditor,
                    location: {
                      ...locationEditor.location,
                      name: event.target.value,
                    },
                  })
                }
                placeholder="Example: Kingsgaurd"
              />
            </label>

            <label>
              Type

              <select
                className="form-input"
                value={
                  locationEditor.location.type
                }
                onChange={(event) => {
                  const type =
                    event.target
                      .value as LocationType;

                  setLocationEditor({
                    ...locationEditor,
                    location: {
                      ...locationEditor.location,
                      type,
                      icon:
                        LOCATION_ICONS[type],
                    },
                  });
                }}
              >
                {(
                  Object.keys(
                    LOCATION_ICONS
                  ) as LocationType[]
                ).map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {
                      LOCATION_LABELS[type]
                    }
                  </option>
                ))}
              </select>
            </label>

            <label>
              Map Size

              <select
                className="form-input"
                value={
                  locationEditor.location
                    .size ?? "small"
                }
                onChange={(event) =>
                  setLocationEditor({
                    ...locationEditor,
                    location: {
                      ...locationEditor.location,
                      size:
                        event.target
                          .value as LocationSize,
                    },
                  })
                }
              >
                {(
                  Object.keys(
                    LOCATION_SIZE_LABELS
                  ) as LocationSize[]
                ).map((size) => (
                  <option
                    key={size}
                    value={size}
                  >
                    {
                      LOCATION_SIZE_LABELS[
                        size
                      ]
                    }
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            Description

            <textarea
              className="form-input sf-map-location-notes-v2"
              value={
                locationEditor.location
                  .description ?? ""
              }
              onChange={(event) =>
                setLocationEditor({
                  ...locationEditor,
                  location: {
                    ...locationEditor.location,
                    description:
                      event.target.value,
                  },
                })
              }
              placeholder="What is this place known for?"
            />
          </label>

          <div className="sf-map-location-actions-v2">
            {!locationEditor.isNew && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={removeLocation}
                >
                  Delete
                </button>

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setMovingLocationId(
                      locationEditor.location.id
                    );

                    setLocationEditor(null);
                    setTool("location");
                  }}
                >
                  Move on Map
                </button>
              </>
            )}

            {locationEditor.isNew ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={
                  saveNewLocation
                }
              >
                Save Location
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary"
                onClick={
                  saveExistingLocation
                }
              >
                Save Location
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
