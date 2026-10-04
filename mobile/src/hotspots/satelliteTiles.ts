const TILE_SIZE = 256;
const GROUND_METERS_PER_PIXEL_AT_ZOOM_ZERO = 156_543.03392;
const MAX_IMAGERY_ZOOM = 19;
const SEAM_OVERLAP_PIXELS = 0.5;

export const IMAGERY_CREDIT = '© Esri, Maxar, Earthstar Geographics';

export type MapTile = { key: string; url: string; x: number; y: number; size: number };

export type TileView = {
  latitude: number;
  longitude: number;
  metersPerPixel: number;
  width: number;
  height: number;
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function groundMetersPerTilePixel(latitude: number, zoom: number): number {
  return (GROUND_METERS_PER_PIXEL_AT_ZOOM_ZERO * Math.cos(toRadians(latitude))) / 2 ** zoom;
}

function worldPixel(latitude: number, longitude: number, zoom: number) {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const sine = Math.sin(toRadians(latitude));
  return {
    x: ((longitude + 180) / 360) * worldSize,
    y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * worldSize,
  };
}

function tileUrl(zoom: number, column: number, row: number): string {
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${row}/${column}`;
}

function indexRange(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, offset) => from + offset);
}

export function imageryZoom(latitude: number, metersPerPixel: number): number {
  const exactZoom = Math.log2(groundMetersPerTilePixel(latitude, 0) / metersPerPixel);
  return Math.min(Math.max(Math.ceil(exactZoom), 0), MAX_IMAGERY_ZOOM);
}

export function tilesCovering(view: TileView): MapTile[] {
  const zoom = imageryZoom(view.latitude, view.metersPerPixel);
  const scale = groundMetersPerTilePixel(view.latitude, zoom) / view.metersPerPixel;
  const center = worldPixel(view.latitude, view.longitude, zoom);
  const halfWidth = view.width / 2 / scale;
  const halfHeight = view.height / 2 / scale;
  const tilesPerSide = 2 ** zoom;
  const columns = indexRange(Math.floor((center.x - halfWidth) / TILE_SIZE), Math.floor((center.x + halfWidth) / TILE_SIZE));
  const rows = indexRange(
    Math.max(Math.floor((center.y - halfHeight) / TILE_SIZE), 0),
    Math.min(Math.floor((center.y + halfHeight) / TILE_SIZE), tilesPerSide - 1),
  );
  return rows.flatMap((row) =>
    columns.map((column) => {
      const wrappedColumn = ((column % tilesPerSide) + tilesPerSide) % tilesPerSide;
      return {
        key: `${zoom}/${row}/${column}`,
        url: tileUrl(zoom, wrappedColumn, row),
        x: view.width / 2 + (column * TILE_SIZE - center.x) * scale,
        y: view.height / 2 + (row * TILE_SIZE - center.y) * scale,
        size: TILE_SIZE * scale + SEAM_OVERLAP_PIXELS,
      };
    }),
  );
}
