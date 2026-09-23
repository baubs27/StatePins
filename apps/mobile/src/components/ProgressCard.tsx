import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";
import { Card } from "./ui";

export function ProgressCard({ visited }: { visited: number }) {
  const percent = Math.round((visited / 50) * 100);
  return <Card style={styles.card}>
    <View style={styles.row}>
      <View>
        <Text style={styles.label}>STATES VISITED</Text>
        <Text style={styles.count}>{visited} <Text style={styles.total}>/ 50</Text></Text>
      </View>
      <View style={styles.percent}><Text style={styles.percentText}>{percent}%</Text></View>
    </View>
    <View style={styles.track}><View style={[styles.fill, { width: `${percent}%` }]} /></View>
    <Text style={styles.remaining}>{50 - visited} states left to explore — plenty of road ahead.</Text>
  </Card>;
}

const styles = StyleSheet.create({
  card: { padding: 20, marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { color: colors.grayText, fontSize: 11, fontWeight: "900", letterSpacing: 1.2 },
  count: { color: colors.navy, fontSize: 31, fontWeight: "900", marginTop: 3 },
  total: { color: colors.grayText, fontSize: 18 },
  percent: { backgroundColor: colors.greenSoft, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  percentText: { color: colors.navy, fontWeight: "900" },
  track: { height: 9, backgroundColor: "#EDECE8", borderRadius: 99, overflow: "hidden", marginTop: 15 },
  fill: { height: "100%", backgroundColor: colors.green, borderRadius: 99 },
  remaining: { color: colors.grayText, marginTop: 10, fontSize: 13 }
});
