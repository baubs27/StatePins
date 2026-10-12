import { useEffect, useMemo, useRef, useState } from "react";
import { router } from "expo-router";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { feature } from "topojson-client";
import us from "us-atlas/states-10m.json";
import { USState } from "@/types";
import { colors } from "@/lib/theme";
import { usePreferences } from "@/context/PreferencesContext";
import { Coordinates } from "@/lib/usGeo";
import { createLeafletDocument } from "./leafletNativeHtml";

export function USMap({ states, onToggle, visitedOnly = false, currentLocation }: {
  states: USState[];
  onToggle: (id: string) => void;
  visitedOnly?: boolean;
  currentLocation?: Coordinates | null;
}) {
  const { feedback } = usePreferences();
  const { width } = useWindowDimensions();
  const mapRef = useRef<WebView>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const height = Math.max(430, Math.min(620, Math.round(width * 0.82)));
  const featureCollection = useMemo(() => feature(us as never, (us as any).objects.states) as any, []);
  const features = useMemo(() => featureCollection.features.map((item: any) => ({
    type: "Feature" as const,
    properties: { name: item.properties?.name },
    geometry: item.geometry
  })), [featureCollection]);
  const html = useMemo(() => createLeafletDocument({
    kind: "us",
    center: { latitude: 39.8, longitude: -98.5 },
    zoom: 4,
    location: currentLocation ?? null,
    states,
    visitedOnly,
    pins: [],
    features
  }), []);

  useEffect(() => {
    if (!loaded) return;
    const payload = JSON.stringify({ states, visitedOnly }).replace(/</g, "\\u003c");
    mapRef.current?.injectJavaScript(`window.stateupUpdate(${payload});true;`);
  }, [loaded, states, visitedOnly]);

  useEffect(() => {
    if (!loaded) return;
    const payload = JSON.stringify({ location: currentLocation ?? null, centerLocation: false }).replace(/</g, "\\u003c");
    mapRef.current?.injectJavaScript(`window.stateupUpdate(${payload});true;`);
  }, [loaded, currentLocation?.latitude, currentLocation?.longitude]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string; id?: string };
      if (message.type === "ready") setLoaded(true);
      if (message.type === "toggleState" && message.id) {
        feedback("success");
        onToggle(message.id);
      }
      if (message.type === "openState" && message.id) router.push(`/state/${message.id}`);
    } catch {
      // Ignore unexpected webview messages; map actions are revalidated in native code.
    }
  }

  return <View style={[styles.frame, { height }]} accessibilityLabel="Interactive Leaflet map of the United States">
    <WebView
      ref={mapRef}
      source={{ html }}
      originWhitelist={["*"]}
      onShouldStartLoadWithRequest={(request) => request.url === "about:blank"}
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
    <View pointerEvents="none" style={styles.help}><Text style={styles.helpText}>{visitedOnly ? "Visited states are highlighted" : "Tap a state to explore · tap its check to mark visited"}</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  frame: { width: "100%", borderRadius: 26, overflow: "hidden", backgroundColor: "#e8f0ee", position: "relative", marginBottom: 18 },
  webview: { flex: 1, backgroundColor: "#e8f0ee" },
  help: { position: "absolute", left: 12, bottom: 12, maxWidth: "78%", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "rgba(255,255,255,0.94)" },
  helpText: { color: colors.grayText, fontSize: 11, fontWeight: "800" },
  error: { position: "absolute", left: 12, right: 12, top: 12, borderRadius: 12, padding: 9, backgroundColor: "rgba(255,255,255,0.94)" },
  errorText: { color: colors.grayText, fontSize: 11, textAlign: "center", fontWeight: "700" }
});
