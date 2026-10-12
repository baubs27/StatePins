import type * as LeafletTypes from "leaflet";
import type * as ReactLeafletTypes from "react-leaflet";

export type LeafletRuntime = {
  L: typeof LeafletTypes;
  ReactLeaflet: typeof ReactLeafletTypes;
};

export { MAP_ATTRIBUTION, MAP_TILE_URL } from "./leafletConfig";

export async function loadLeafletRuntime(): Promise<LeafletRuntime> {
  const [leafletModule, reactLeafletModule] = await Promise.all([
    import("leaflet"),
    import("react-leaflet")
  ]);

  return {
    L: leafletModule.default,
    ReactLeaflet: reactLeafletModule
  };
}
