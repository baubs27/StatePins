import { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { Pin, USState } from "@/types";
import { colors } from "@/lib/theme";
import { isFeaturedPin, sortPinsForMap } from "@/lib/pinVisibility";
import { createLeafletDocument } from "./leafletNativeHtml";

export function StateMap({ state, pins, location, onRequestLocation }: {
  state: USState;
  pins: Pin[];
  location: { latitude: number; longitude: number } | null;
  onRequestLocation?: () => void;
}) {
  const mapRef = useRef<WebView>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const visiblePins = useMemo(() => [...pins].sort(sortPinsForMap), [pins]);
  const initialCenter = location ?? state.centerCoordinates;
  const initialZoom = location ? 12 : 8;
  const html = useMemo(() => createLeafletDocument({
    kind: "state",
    center: initialCenter,
    zoom: initialZoom,
    location,
    states: [state],
    pins: visiblePins
  }), [state.id]);

  useEffect(() => {
    if (!loaded) return;
    const payload = JSON.stringify({ pins: visiblePins }).replace(/</g, "\\u003c");
    mapRef.current?.injectJavaScript(`window.stateupUpdate(${payload});true;`);
  }, [loaded, visiblePins]);

  useEffect(() => {
    if (!loaded) return;
    const payload = JSON.stringify({ location, centerLocation: true }).replace(/</g, "\\u003c");
    mapRef.current?.injectJavaScript(`window.stateupUpdate(${payload});true;`);
  }, [loaded, location?.latitude, location?.longitude]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
      if (message.type === "ready") setLoaded(true);
      if (message.type === "openPin" && message.id) router.push(`/pin/${message.id}`);
      if (message.type === "requestLocation") onRequestLocation?.();
    } catch {
      // Ignore unexpected webview messages; map actions are revalidated in native code.
    }
  }

  return <View style={styles.frame} accessibilityLabel={`Interactive Leaflet map of ${state.name} recommendations and nearby places`}>
    <WebView
      ref={mapRef}
      source={{ html }}
      key={state.id}
      originWhitelist={["*"]}
      onShouldStartLoadWithRequest={(request) => request.url === "about:blank"}
      onLoadStart={() => setLoaded(false)}
      onMessage={handleMessage}
      onError={() => setError(true)}
      onHttpError={() => setError(true)}
      javaScriptEnabled
      domStorageEnabled={false}
      geolocationEnabled={false}
      allowFileAccess={false}
      allowFileAccessFromFileURLs={false}
      allowUniversalAccessFromFileURLs={false}
      mixedContentMode="never"
      setSupportMultipleWindows={false}
      style={styles.webview}
      scrollEnabled={false}
    />
    {error && <View pointerEvents="none" style={styles.error}><Text style={styles.errorText}>Map tiles are unavailable. Check your internet connection.</Text></View>}
    <View pointerEvents="none" style={styles.mapHint}><Text style={styles.mapHintText}>Explore nearby cafés, parks and landmarks on the map</Text></View>
    <View pointerEvents="none" style={styles.legend}><View style={styles.legendRow}><View style={styles.recommendationDot} /><Text style={styles.legendText}>StateUp pin</Text></View>{location && <View style={styles.legendRow}><View style={styles.locationDot} /><Text style={styles.legendText}>You</Text></View>}</View>
  </View>;
}

const styles = StyleSheet.create({
  frame: { height: 390, borderRadius: 26, overflow: "hidden", marginBottom: 18, backgroundColor: "#e8f0ee", position: "relative" },
  webview: { flex: 1, backgroundColor: "#e8f0ee" },
  mapHint: { position: "absolute", left: 12, right: 56, top: 12, alignItems: "flex-start" },
  mapHintText: { maxWidth: "100%", backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 13, paddingHorizontal: 11, paddingVertical: 8, color: colors.grayText, fontSize: 11, fontWeight: "800", overflow: "hidden" },
  legend: { position: "absolute", left: 12, bottom: 12, flexDirection: "row", gap: 10, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: "rgba(255,255,255,0.94)" },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendText: { color: colors.grayText, fontSize: 10, fontWeight: "800" },
  recommendationDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.blue },
  locationDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#1598e5", borderWidth: 2, borderColor: "#fff" },
  error: { position: "absolute", left: 12, right: 12, top: 12, borderRadius: 12, padding: 9, backgroundColor: "rgba(255,255,255,0.94)" },
  errorText: { color: colors.grayText, fontSize: 11, textAlign: "center", fontWeight: "700" }
});
