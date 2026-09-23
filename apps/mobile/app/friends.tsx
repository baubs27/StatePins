import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SettingsCard, SettingsScreen } from "@/components/SettingsScreen";
import { Button } from "@/components/ui";
import { api, OFFLINE_DEV } from "@/lib/api";
import { colors } from "@/lib/theme";

type Person = { id: string; username: string; displayName: string; avatarUrl?: string | null };
type Friendship = { friendshipId: string; user: Person };
type FriendState = { friends: Friendship[]; incoming: Friendship[]; outgoing: Friendship[] };
const empty: FriendState = { friends: [], incoming: [], outgoing: [] };
const localPeople: Person[] = [
  { id: "local-friend-1", username: "avery.roams", displayName: "Avery Brooks" },
  { id: "local-friend-2", username: "jules.outside", displayName: "Jules Carter" }
];

export default function FriendsScreen() {
  const [state, setState] = useState<FriendState>(empty);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (OFFLINE_DEV) return;
    try { setState(await api<FriendState>("/v1/social/friends")); } catch (error) { Alert.alert("Could not load friends", error instanceof Error ? error.message : "Please try again."); }
  }
  useEffect(() => { void load(); }, []);

  async function search() {
    const value = query.trim();
    if (value.length < 2) return;
    setLoading(true);
    try {
      if (OFFLINE_DEV) setResults(localPeople.filter((person) => `${person.username} ${person.displayName}`.toLowerCase().includes(value.toLowerCase())));
      else setResults((await api<{ users: Person[] }>(`/v1/social/users?q=${encodeURIComponent(value)}`)).users);
    } catch (error) { Alert.alert("Search failed", error instanceof Error ? error.message : "Please try again."); }
    finally { setLoading(false); }
  }

  async function add(person: Person) {
    if (OFFLINE_DEV) {
      setState((current) => ({ ...current, outgoing: [...current.outgoing, { friendshipId: `local-${person.id}`, user: person }] }));
      setResults((current) => current.filter((item) => item.id !== person.id));
      return;
    }
    try { await api(`/v1/social/friends/${person.id}`, { method: "POST" }); await load(); } catch (error) { Alert.alert("Could not send request", error instanceof Error ? error.message : "Please try again."); }
  }

  async function respond(item: Friendship, action: "ACCEPT" | "REJECT") {
    if (OFFLINE_DEV) {
      setState((current) => ({ ...current, incoming: current.incoming.filter((row) => row.friendshipId !== item.friendshipId), friends: action === "ACCEPT" ? [...current.friends, item] : current.friends }));
      return;
    }
    await api(`/v1/social/friends/${item.friendshipId}`, { method: "PATCH", body: JSON.stringify({ action }) });
    await load();
  }

  async function remove(item: Friendship) {
    if (OFFLINE_DEV) setState((current) => ({ ...current, friends: current.friends.filter((row) => row.friendshipId !== item.friendshipId), outgoing: current.outgoing.filter((row) => row.friendshipId !== item.friendshipId) }));
    else { await api(`/v1/social/friends/${item.friendshipId}`, { method: "DELETE" }); await load(); }
  }

  return <SettingsScreen eyebrow="SOCIAL" title="Friends" subtitle="Find travelers you know. Friend lists and requests are private.">
    <SettingsCard>
      <View style={styles.search}><Ionicons name="search" size={18} color={colors.grayText} /><TextInput value={query} onChangeText={setQuery} onSubmitEditing={search} placeholder="Search name or username" placeholderTextColor="#929AA3" autoCapitalize="none" style={styles.input} /><Button loading={loading} disabled={query.trim().length < 2} onPress={search}>Find</Button></View>
      {results.map((person) => <PersonRow key={person.id} person={person} action={<Button variant="ghost" onPress={() => add(person)}>Add</Button>} />)}
      {!results.length && query.trim().length >= 2 && !loading && <Text style={styles.empty}>No matching travelers yet.</Text>}
    </SettingsCard>
    {!!state.incoming.length && <SettingsCard><Text style={styles.heading}>Friend requests</Text>{state.incoming.map((item) => <PersonRow key={item.friendshipId} person={item.user} action={<View style={styles.actions}><Pressable onPress={() => respond(item, "REJECT")}><Text style={styles.remove}>Decline</Text></Pressable><Button onPress={() => respond(item, "ACCEPT")}>Accept</Button></View>} />)}</SettingsCard>}
    <SettingsCard><Text style={styles.heading}>Your friends</Text>{state.friends.length ? state.friends.map((item) => <PersonRow key={item.friendshipId} person={item.user} action={<Pressable onPress={() => remove(item)}><Text style={styles.remove}>Remove</Text></Pressable>} />) : <Text style={styles.empty}>Friends you accept will appear here.</Text>}</SettingsCard>
    {!!state.outgoing.length && <SettingsCard><Text style={styles.heading}>Sent requests</Text>{state.outgoing.map((item) => <PersonRow key={item.friendshipId} person={item.user} action={<Pressable onPress={() => remove(item)}><Text style={styles.remove}>Cancel</Text></Pressable>} />)}</SettingsCard>}
  </SettingsScreen>;
}

function PersonRow({ person, action }: { person: Person; action: React.ReactNode }) {
  return <View style={styles.person}><View style={styles.avatar}><Text style={styles.avatarText}>{person.displayName.slice(0, 1).toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={styles.name}>{person.displayName}</Text><Text style={styles.handle}>@{person.username}</Text></View>{action}</View>;
}

const styles = StyleSheet.create({
  search: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { flex: 1, height: 48, color: colors.navy },
  heading: { color: colors.navy, fontSize: 17, fontWeight: "900", marginBottom: 8 },
  person: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 11, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  avatar: { width: 40, height: 40, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.blueSoft },
  avatarText: { color: colors.blue, fontWeight: "900" },
  name: { color: colors.navy, fontWeight: "900" },
  handle: { color: colors.grayText, fontSize: 12, marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 10 },
  remove: { color: colors.coral, fontWeight: "800", fontSize: 12 },
  empty: { color: colors.grayText, lineHeight: 20, paddingVertical: 10 }
});
