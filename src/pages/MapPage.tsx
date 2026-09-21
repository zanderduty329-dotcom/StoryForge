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
    if (selected === "dunes") return "∿";
    if (selected === "barren") return "·";
    return "";
  }

  if (type === "plains") {
    if (selected === "grass") return "〽";
    if (selected === "sparse") return "ˎ ˎ";
    return "";
  }

  if (type === "swamp") {
    if (selected === "reeds") return "ǀǀ";
    if (selected === "dead-trees") return "†";
    return "";
  }

  if (type === "snow") {
    if (selected === "snowfield") return "✦";
    if (selected === "snow-peaks") return "△";
    return "";
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

function storyForgeForestPattern(
  style: string | undefined,
  ink: string,
  forestFill: string,
  detailTier:
    | "overview"
    | "standard"
    | "detailed"
    | "close" = "standard"
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
          salt * 78.233
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
                          true,
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
                  min={
                    tool === "river"
                      ? "0.5"
                      : "0.15"
                  }
                  max={
                    tool === "river"
                      ? "3"
                      : "1"
                  }
                  step={
                    tool === "river"
                      ? "0.1"
                      : "0.05"
                  }
                  value={pathWidth}
                  onChange={(event) => {
                    const nextWidth =
                      Number(
                        event.target
                          .value
                      );

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
                  {pathWidth.toFixed(1)}
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
                  min="1"
                  max="40"
                  step="1"
                  value={brushSize}
                  onChange={(event) =>
                    setBrushSize(
                      Number(event.target.value)
                    )
                  }
                />
                <span>{brushSize}</span>
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
                min="8"
                max="120"
                step="2"
                value={gridSize}
                onChange={(event) =>
                  setGridSize(
                    Number(event.target.value)
                  )
                }
              />
              <span>{gridSize}px</span>
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

                    <g
                        mask={`url(#${landMaskId})`}
                      >
<rect
                      x="0"
                      y="0"
                      width="100"
                      height="100"
                      fill={fill}
                      opacity="0.88"
                      mask={
                        `url(#${maskId})`
                      }
                    />

                    {symbol && (
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
