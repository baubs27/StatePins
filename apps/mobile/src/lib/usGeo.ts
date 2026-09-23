import { geoAlbersUsa, geoContains, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import us from "us-atlas/states-10m.json";
import { USState } from "@/types";

export const US_MAP_WIDTH = 760;
export const US_MAP_HEIGHT = 480;

export type Coordinates = { latitude: number; longitude: number };

type MapFeature = {
  type: "Feature";
  id?: string | number;
  properties: { name?: string };
  geometry: unknown;
};

export type ProjectedStateShape = {
  state: USState;
  feature: MapFeature;
  path: string;
  center: [number, number];
  bounds: [[number, number], [number, number]];
};

const allFeatures = (feature(us as never, (us as any).objects.states) as any).features as MapFeature[];

export function buildUsProjection(states: USState[], inset = 8) {
  const stateByName = new Map(states.map((state) => [state.name, state]));
  const included = allFeatures.filter((item) => item.properties?.name && stateByName.has(item.properties.name));
  const collection = { type: "FeatureCollection", features: included } as any;
  const projection = geoAlbersUsa().fitExtent([[inset, inset], [US_MAP_WIDTH - inset, US_MAP_HEIGHT - inset]], collection);
  const path = geoPath(projection);
  const shapes = included.map((item) => {
    const state = stateByName.get(item.properties.name!)!;
    return {
      state,
      feature: item,
      path: path(item as never) ?? "",
      center: path.centroid(item as never) as [number, number],
      bounds: path.bounds(item as never) as [[number, number], [number, number]]
    };
  });

  return { projection, shapes };
}

export function findStateForCoordinates(coordinates: Coordinates, states: USState[]) {
  const stateByName = new Map(states.map((state) => [state.name, state]));
  const point: [number, number] = [coordinates.longitude, coordinates.latitude];
  const match = allFeatures.find((item) => item.properties?.name && stateByName.has(item.properties.name) && geoContains(item as never, point));
  return match?.properties.name ? stateByName.get(match.properties.name) ?? null : null;
}

export function findNearestStateCenter(coordinates: Coordinates, states: USState[]) {
  return states.reduce((nearest, state) => {
    const distance = Math.hypot(
      state.centerCoordinates.latitude - coordinates.latitude,
      (state.centerCoordinates.longitude - coordinates.longitude) * 0.75
    );
    const nearestDistance = Math.hypot(
      nearest.centerCoordinates.latitude - coordinates.latitude,
      (nearest.centerCoordinates.longitude - coordinates.longitude) * 0.75
    );
    return distance < nearestDistance ? state : nearest;
  }, states[0]);
}

export function projectCoordinates(projection: ReturnType<typeof geoAlbersUsa>, coordinates: Coordinates) {
  return projection([coordinates.longitude, coordinates.latitude]) as [number, number] | null;
}
