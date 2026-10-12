import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { feature } from "topojson-client";
import us from "us-atlas/states-10m.json";
import { USState } from "@/types";
import { colors } from "@/lib/theme";
import { usePreferences } from "@/context/PreferencesContext";
import { Coordinates } from "@/lib/usGeo";
import { loadLeafletRuntime, LeafletRuntime, MAP_ATTRIBUTION, MAP_TILE_URL } from "./leafletRuntime.web";

const US_BOUNDS: [[number, number], [number, number]] = [[17, -170], [72, -64]];

export function USMap({ states, onToggle, visitedOnly = false, currentLocation }: {
  states: USState[];
  onToggle: (id: string) => void;
  visitedOnly?: boolean;
  currentLocation?: Coordinates | null;
}) {
  const { feedback } = usePreferences();
  const { width } = useWindowDimensions();
  const [runtime, setRuntime] = useState<LeafletRuntime | null>(null);
  const [loadError, setLoadError] = useState(false);
  const height = Math.max(430, Math.min(620, Math.round(width * 0.82)));
  const stateByName = useMemo(() => new Map(states.map((state) => [state.name, state])), [states]);
  const stateFeatures = useMemo(() => {
    const collection = feature(us as never, (us as any).objects.states) as any;
    return {
      ...collection,
      features: collection.features.filter((item: any) => stateByName.has(item.properties?.name))
    };
  }, [stateByName]);

  useEffect(() => {
    let active = true;
    loadLeafletRuntime().then((loaded) => {
      if (active) setRuntime(loaded);
    }).catch(() => {
      if (active) setLoadError(true);
    });
    return () => { active = false; };
  }, []);

  if (!runtime) {
    return <View style={[styles.frame, { height }]}>
      <View style={styles.loading}><Text style={styles.loadingTitle}>{loadError ? "Map could not load" : "Loading map…"}</Text><Text style={styles.loadingHint}>{loadError ? "Check your connection and try again." : "Preparing your U.S. map"}</Text></View>
    </View>;
  }

  const { MapContainer, TileLayer, GeoJSON, Marker, CircleMarker, Tooltip, ZoomControl } = runtime.ReactLeaflet;
  const { divIcon } = runtime.L;

  function LocationDot() {
    if (!currentLocation) return null;
    return <CircleMarker center={[currentLocation.latitude, currentLocation.longitude]} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#1598E5", fillOpacity: 1, bubblingMouseEvents: false }}>
      <Tooltip direction="top" offset={[0, -8]} permanent>You are here</Tooltip>
    </CircleMarker>;
  }

  return <View style={[styles.frame, { height }]} accessibilityLabel="Interactive U.S. map. Zoom and pan to explore states and recommendations.">
    <MapContainer
      className="stateup-leaflet-map"
      bounds={US_BOUNDS}
      boundsOptions={{ padding: [20, 20] }}
      minZoom={3}
      maxZoom={18}
      maxBounds={[[12, -178], [75, -55]]}
      maxBoundsViscosity={0.8}
      worldCopyJump={false}
      zoomControl={false}
      scrollWheelZoom
    >
      <TileLayer url={MAP_TILE_URL} attribution={MAP_ATTRIBUTION} minZoom={2} maxZoom={19} />
      <GeoJSON
        key={`${visitedOnly}-${states.map((state) => `${state.id}:${state.visited}`).join(",")}`}
        data={stateFeatures}
        style={(item: any) => {
          const state = stateByName.get(item.properties?.name);
          const muted = visitedOnly && !state?.visited;
          return { color: "#fff", weight: 1.2, opacity: muted ? 0.3 : 0.95, fillColor: state?.visited ? "#73c994" : "#e5edf0", fillOpacity: muted ? 0.12 : 0.24 };
        }}
        onEachFeature={(item: any, layer: any) => {
          const state = stateByName.get(item.properties?.name);
          if (!state) return;
          layer.bindTooltip(`${state.name} · ${state.visited ? "Visited" : "Not visited"}`, { sticky: true });
          layer.on("click", () => router.push(`/state/${state.id}`));
          layer.on("mouseover", () => layer.setStyle({ weight: 2.2, fillOpacity: 0.42 }));
          layer.on("mouseout", () => layer.setStyle({ weight: 1.2, fillOpacity: visitedOnly && !state.visited ? 0.12 : 0.24 }));
        }}
      />
      {states.map((state) => {
        const icon = divIcon({
          className: "stateup-state-icon",
          html: `<span class="stateup-state-check${state.visited ? " is-visited" : ""}">${state.visited ? "✓" : ""}</span>`,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });
        return <Marker
          key={state.id}
          position={[state.centerCoordinates.latitude, state.centerCoordinates.longitude]}
          icon={icon}
          keyboard
          title={`${state.name}: ${state.visited ? "visited" : "not visited"}. Select to change.`}
          eventHandlers={{ click: () => { feedback("success"); onToggle(state.id); } }}
          zIndexOffset={200}
        ><Tooltip direction="top" offset={[0, -10]}>{state.abbreviation} · {state.visited ? "Visited" : "Mark visited"}</Tooltip></Marker>;
      })}
      {currentLocation && <LocationDot />}
      <ZoomControl position="topright" />
    </MapContainer>
    <Text pointerEvents="none" style={styles.help}>Tap a state to explore · tap its check to mark visited</Text>
  </View>;
}

const styles = StyleSheet.create({
  frame: { width: "100%", borderRadius: 26, overflow: "hidden", backgroundColor: "#e8f0ee", position: "relative", marginBottom: 18 },
  help: { position: "absolute", left: 12, bottom: 12, maxWidth: "78%", overflow: "hidden", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "rgba(255,255,255,0.94)", color: colors.grayText, fontSize: 11, fontWeight: "800" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  loadingTitle: { color: colors.navy, fontSize: 16, fontWeight: "900" },
  loadingHint: { color: colors.grayText, fontSize: 12 }
});
