import { useEffect, useMemo, useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Pin, USState } from "@/types";
import { colors } from "@/lib/theme";
import { isFeaturedPin, sortPinsForMap } from "@/lib/pinVisibility";
import { LeafletRuntime, loadLeafletRuntime, MAP_ATTRIBUTION, MAP_TILE_URL } from "./leafletRuntime.web";

export function StateMap({ state, pins, location, onRequestLocation }: { state: USState; pins: Pin[]; location: { latitude: number; longitude: number } | null; onRequestLocation?: () => void }) {
  const [runtime, setRuntime] = useState<LeafletRuntime | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [zoom, setZoom] = useState(location ? 12 : 8);
  const visiblePins = useMemo(() => [...pins].sort(sortPinsForMap), [pins]);
  const initialCenter = location ?? state.centerCoordinates;
  const initialZoom = location ? 12 : 8;

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
    return <View style={styles.frame}><View style={styles.loading}><Text style={styles.loadingTitle}>{loadError ? "Map could not load" : "Loading map…"}</Text><Text style={styles.loadingHint}>Connect to the internet to explore nearby places.</Text></View></View>;
  }

  const { MapContainer, TileLayer, Marker, CircleMarker, Popup, Tooltip, ZoomControl, useMap, useMapEvents } = runtime.ReactLeaflet;
  const { divIcon } = runtime.L;

  function ZoomLevel() {
    useMapEvents({ zoomend: (event) => setZoom(event.target.getZoom()) });
    return null;
  }

  function PinPopup({ pin }: { pin: Pin }) {
    return <Popup>
      <div className="stateup-map-popup">
        <img src={pin.imageUrl} alt="" loading="lazy" />
        <strong>{pin.name}</strong>
        <span>{pin.city} · {pin.upvotes} upvotes</span>
        <button type="button" onClick={() => router.push(`/pin/${pin.id}`)}>See recommendation</button>
      </div>
    </Popup>;
  }

  function RecenterControl() {
    const map = useMap();
    useEffect(() => {
      if (location) map.flyTo([location.latitude, location.longitude], Math.max(map.getZoom(), 12), { duration: 0.7 });
    }, [map, location?.latitude, location?.longitude]);
    return <button
      type="button"
      className="stateup-map-recenter"
      aria-label={location ? "Center map on my location" : "Location is not available"}
      title={location ? "Center on my location" : "Turn on location in Settings"}
      onClick={(event) => {
        event.stopPropagation();
        if (location) map.flyTo([location.latitude, location.longitude], Math.max(map.getZoom(), 12), { duration: 0.7 });
        else onRequestLocation?.();
      }}
    >⌖</button>;
  }

  return <View style={styles.frame} accessibilityLabel={`Interactive ${state.name} map with StateUp recommendations and nearby map details`}>
    <MapContainer
      className="stateup-leaflet-map"
      center={[initialCenter.latitude, initialCenter.longitude]}
      zoom={initialZoom}
      minZoom={5}
      maxZoom={19}
      maxBounds={[[18, -180], [72, -60]]}
      maxBoundsViscosity={0.75}
      zoomControl={false}
      scrollWheelZoom
    >
      <TileLayer url={MAP_TILE_URL} attribution={MAP_ATTRIBUTION} minZoom={2} maxZoom={19} />
      <ZoomControl position="topright" />
      <RecenterControl />
      <ZoomLevel />
      {visiblePins.map((pin) => {
        const featured = isFeaturedPin(pin);
        const imageUrl = /^https:\/\//i.test(pin.imageUrl) ? pin.imageUrl.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;") : "";
        const showPhoto = Boolean(imageUrl) && (featured || zoom >= 13);
        if (showPhoto) {
          const icon = divIcon({
            className: "stateup-photo-pin",
            html: `<span class="stateup-photo-marker"><img src="${imageUrl}" alt=""></span>`,
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          });
          return <Marker key={pin.id} position={[pin.coordinates.latitude, pin.coordinates.longitude]} icon={icon} zIndexOffset={featured ? 500 : 100}>
            <Tooltip direction="top" offset={[0, -18]}>{pin.name}</Tooltip>
            <PinPopup pin={pin} />
          </Marker>;
        }
        return <CircleMarker
          key={pin.id}
          center={[pin.coordinates.latitude, pin.coordinates.longitude]}
          radius={featured ? 13 : 9}
          pathOptions={{ color: "#fff", weight: 3, fillColor: featured ? "#ef6f5d" : "#2477e8", fillOpacity: 1 }}
        >
          <Tooltip direction="top" offset={[0, -8]}>{pin.name}</Tooltip>
          <PinPopup pin={pin} />
        </CircleMarker>;
      })}
      {location && <CircleMarker center={[location.latitude, location.longitude]} radius={8} pathOptions={{ color: "#fff", weight: 3, fillColor: "#1598e5", fillOpacity: 1 }}>
        <Tooltip direction="top" offset={[0, -8]} permanent>You are here</Tooltip>
      </CircleMarker>}
    </MapContainer>
    <View pointerEvents="none" style={styles.mapHint}><Text style={styles.mapHintText}>Explore nearby cafés, parks and landmarks on the map</Text></View>
    <View pointerEvents="none" style={styles.legend}><View style={styles.legendRow}><View style={styles.recommendationDot} /><Text style={styles.legendText}>StateUp pin</Text></View>{location && <View style={styles.legendRow}><View style={styles.locationDot} /><Text style={styles.legendText}>You</Text></View>}</View>
  </View>;
}

const styles = StyleSheet.create({
  frame: { height: 390, borderRadius: 26, overflow: "hidden", marginBottom: 18, backgroundColor: "#e8f0ee", position: "relative" },
  mapHint: { position: "absolute", left: 12, right: 56, top: 12, alignItems: "flex-start" },
  mapHintText: { maxWidth: "100%", backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 13, paddingHorizontal: 11, paddingVertical: 8, color: colors.grayText, fontSize: 11, fontWeight: "800", overflow: "hidden" },
  legend: { position: "absolute", left: 12, bottom: 12, flexDirection: "row", gap: 10, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.94)" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { color: colors.grayText, fontSize: 10, fontWeight: "800" },
  recommendationDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blue },
  locationDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#1598e5", borderWidth: 2, borderColor: "#fff" },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 6 },
  loadingTitle: { color: colors.navy, fontSize: 16, fontWeight: "900" },
  loadingHint: { color: colors.grayText, fontSize: 12 }
});
