import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, G, Path, Rect } from "react-native-svg";
import { USState } from "@/types";
import { colors } from "@/lib/theme";
import { usePreferences } from "@/context/PreferencesContext";
import { Coordinates, US_MAP_HEIGHT, US_MAP_WIDTH, buildUsProjection, projectCoordinates } from "@/lib/usGeo";

export function USMap({ states, onToggle, visitedOnly = false, currentLocation }: {
  states: USState[];
  onToggle: (id: string) => void;
  visitedOnly?: boolean;
  currentLocation?: Coordinates | null;
}) {
  const { feedback } = usePreferences();
  const { width } = useWindowDimensions();
  const [zoom, setZoom] = useState(1);
  const { projection, shapes } = useMemo(() => buildUsProjection(states, 6), [states]);
  const userPoint = currentLocation ? projectCoordinates(projection, currentLocation) : null;
  const detailMode = zoom > 1;
  const fitHeight = Math.max(250, Math.round(width * 0.66));
  const detailWidth = Math.max(820, Math.round(width * 2.15)) * zoom / 1.6;
  const canvasWidth = Math.round(detailMode ? detailWidth : Math.max(320, width - 44));
  const canvasHeight = Math.round(canvasWidth / (US_MAP_WIDTH / US_MAP_HEIGHT));
  const viewportHeight = detailMode ? Math.min(560, Math.max(430, Math.round(width * 1.08))) : Math.min(370, fitHeight);

  function zoomIn() {
    feedback("tap");
    setZoom((value) => value >= 2.15 ? 2.2 : value >= 1.45 ? 2.2 : 1.6);
  }

  function zoomOut() {
    feedback("tap");
    setZoom((value) => value <= 1.05 ? 1 : value <= 1.65 ? 1 : 1.6);
  }

  const mapSvg = <Svg
    width={detailMode ? canvasWidth : "100%"}
    height={detailMode ? canvasHeight : "100%"}
    viewBox={`0 14 ${US_MAP_WIDTH} ${US_MAP_HEIGHT - 28}`}
    preserveAspectRatio="xMidYMid meet"
  >
    {shapes.map(({ state, path, center, bounds }) => {
      const muted = visitedOnly && !state.visited;
      const stateWidth = bounds[1][0] - bounds[0][0];
      const stateHeight = bounds[1][1] - bounds[0][1];
      const checkboxSize = Math.round(Math.max(5.5, Math.min(13, Math.min(stateWidth, stateHeight) * 0.38)));
      const pressRadius = Math.max(12, checkboxSize + 5);
      const checkScale = checkboxSize / 14;
      return <G key={state.id} opacity={muted ? 0.18 : 1}>
        <Path
          d={path}
          fill={state.visited ? "#7FD09E" : "#DDE1E4"}
          stroke="#FFFFFF"
          strokeWidth={1.5}
          onPress={() => { feedback("tap"); router.push(`/state/${state.id}`); }}
          accessibilityLabel={`${state.name}, ${state.visited ? "visited" : "not visited"}`}
        />
        <G
          x={center[0] - checkboxSize / 2}
          y={center[1] - checkboxSize / 2}
          onPress={() => { feedback("success"); onToggle(state.id); }}
          accessibilityLabel={`Mark ${state.name} ${state.visited ? "not visited" : "visited"}`}
        >
          <Circle cx={checkboxSize / 2} cy={checkboxSize / 2} r={pressRadius} fill="#000000" opacity={0.001} />
          <Rect
            width={checkboxSize}
            height={checkboxSize}
            rx={3}
            fill={state.visited ? colors.blue : "#FFFFFF"}
            stroke={state.visited ? colors.blue : colors.navy}
            strokeWidth={Math.max(1, checkboxSize * 0.12)}
          />
          {state.visited && <G scale={checkScale}><Path d="M3.4 7.2l2.2 2.2 5-5" fill="none" stroke="#FFFFFF" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></G>}
        </G>
      </G>;
    })}
    {userPoint && <G>
      <Circle cx={userPoint[0]} cy={userPoint[1]} r={12} fill="#1598E5" opacity={0.16} />
      <Circle cx={userPoint[0]} cy={userPoint[1]} r={5.5} fill="#1598E5" stroke="#FFFFFF" strokeWidth={2.5} />
    </G>}
  </Svg>;

  return <View style={[styles.frame, { height: viewportHeight }]} accessibilityLabel="Interactive map of the United States">
    {detailMode ? <ScrollView
        horizontal
        bounces={false}
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalPan}
      >
        <ScrollView
          bounces={false}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          style={{ width: canvasWidth }}
          contentContainerStyle={{ width: canvasWidth, height: canvasHeight }}
        >
          {mapSvg}
        </ScrollView>
      </ScrollView>
      : <View style={styles.fitMap}>{mapSvg}</View>}

    <View style={styles.zoomDock}>
      <Pressable accessibilityRole="button" accessibilityLabel="Zoom out map" onPress={zoomOut} style={[styles.zoomButton, zoom === 1 && styles.zoomDisabled]}>
        <Text style={styles.zoomText}>−</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Fit full map" onPress={() => { feedback("tap"); setZoom(1); }} style={[styles.fitButton, zoom === 1 && styles.fitActive]}>
        <Text style={[styles.fitText, zoom === 1 && styles.fitTextActive]}>{zoom === 1 ? "Fit" : "Pan"}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Zoom in map" onPress={zoomIn} style={styles.zoomButton}>
        <Text style={styles.zoomText}>+</Text>
      </Pressable>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    backgroundColor: "#FBFCFC",
    borderRadius: 28,
    overflow: "hidden"
  },
  fitMap: {
    flex: 1,
    paddingHorizontal: 4,
    paddingBottom: 8
  },
  horizontalPan: {
    minHeight: "100%"
  },
  zoomDock: {
    position: "absolute",
    right: 12,
    bottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: "hidden"
  },
  zoomButton: {
    width: 39,
    height: 38,
    alignItems: "center",
    justifyContent: "center"
  },
  zoomDisabled: {
    opacity: 0.38
  },
  zoomText: {
    color: colors.navy,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: "900"
  },
  fitButton: {
    height: 38,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderSoft
  },
  fitActive: {
    backgroundColor: colors.navy
  },
  fitText: {
    color: colors.grayText,
    fontSize: 11,
    fontWeight: "900"
  },
  fitTextActive: {
    color: colors.white
  }
});
