import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { initialPins, initialStates } from "@/data/mock";
import { Category, Pin, USState } from "@/types";
import { api, OFFLINE_DEV } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type NewPin = Pick<Pin, "stateId" | "name" | "city" | "description" | "category" | "imageUrl" | "coordinates">;
type Coordinates = { latitude: number; longitude: number };

type AppContextValue = {
  states: USState[];
  pins: Pin[];
  location: Coordinates | null;
  locationMessage: string | null;
  visitedCount: number;
  savedPins: Pin[];
  favoriteStateIds: string[];
  favoritePinIds: string[];
  favoriteLocationKeys: string[];
  favoritePins: Pin[];
  toggleVisited: (stateId: string) => void;
  toggleSaved: (pinId: string) => void;
  toggleFavoriteState: (stateId: string) => void;
  toggleFavoritePin: (pinId: string) => void;
  toggleFavoriteLocation: (locationKey: string) => void;
  toggleUpvote: (pinId: string) => void;
  addComment: (pinId: string, text: string) => void;
  addPin: (pin: NewPin) => void;
  requestLocation: () => Promise<void>;
  clearLocalData: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);
const STORAGE_PREFIX = "stateup.app-state.v2";

export function AppProvider({ children }: PropsWithChildren) {
  const { user, isGuest } = useAuth();
  const [states, setStates] = useState(initialStates);
  const [pins, setPins] = useState(initialPins);
  const [favoriteStateIds, setFavoriteStateIds] = useState<string[]>([]);
  const [favoritePinIds, setFavoritePinIds] = useState<string[]>([]);
  const [favoriteLocationKeys, setFavoriteLocationKeys] = useState<string[]>([]);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const storageKey = `${STORAGE_PREFIX}.${user?.id ?? (isGuest ? "guest" : "signed-out")}`;
  const serverMode = !OFFLINE_DEV && Boolean(user) && !isGuest;

  useEffect(() => {
    setHydrated(false);
    setStates(initialStates);
    setPins(initialPins);
    setFavoriteStateIds([]);
    setFavoritePinIds([]);
    setFavoriteLocationKeys([]);
    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (stored) {
          const value = JSON.parse(stored);
          if (Array.isArray(value.states)) setStates(value.states);
          if (Array.isArray(value.pins)) setPins(value.pins);
          if (Array.isArray(value.favoriteStateIds)) setFavoriteStateIds(value.favoriteStateIds);
          if (Array.isArray(value.favoritePinIds)) setFavoritePinIds(value.favoritePinIds);
          if (Array.isArray(value.favoriteLocationKeys)) setFavoriteLocationKeys(value.favoriteLocationKeys);
        }
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, [storageKey]);

  useEffect(() => {
    if (!serverMode || !hydrated) return;
    Promise.all([
      api<{ states: ApiState[] }>("/v1/states"),
      api<{ pins: ApiPin[] }>("/v1/pins"),
      api<{ items: { pinId: string }[] }>("/v1/itinerary"),
      api<{ favorites: { pinId: string }[] }>("/v1/pins/favorites/me")
    ]).then(([stateResult, pinResult, itineraryResult, favoriteResult]) => {
      const saved = new Set(itineraryResult.items.map((item) => item.pinId));
      setStates(stateResult.states.map(fromApiState));
      setPins(pinResult.pins.map((pin) => ({ ...fromApiPin(pin), savedToItinerary: saved.has(pin.id) })));
      setFavoritePinIds(favoriteResult.favorites.map((item) => item.pinId));
    }).catch(() => Alert.alert("Sync paused", "StateUp could not sync this account right now. Pull the app up again when the connection improves."));
  }, [serverMode, user?.id, hydrated]);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(storageKey, JSON.stringify({ states, pins, favoriteStateIds, favoritePinIds, favoriteLocationKeys })).catch(() => undefined);
  }, [hydrated, storageKey, states, pins, favoriteStateIds, favoritePinIds, favoriteLocationKeys]);

  const value = useMemo<AppContextValue>(() => ({
    states,
    pins,
    location,
    locationMessage,
    visitedCount: states.filter((state) => state.visited).length,
    savedPins: pins.filter((pin) => pin.savedToItinerary),
    favoriteStateIds,
    favoritePinIds,
    favoriteLocationKeys,
    favoritePins: pins.filter((pin) => favoritePinIds.includes(pin.id)),
    toggleVisited: (stateId) => {
      setStates((current) => current.map((state) => state.id === stateId ? { ...state, visited: !state.visited } : state));
      if (serverMode) void api(`/v1/states/${stateId}/visited`, { method: "PUT" }).catch(() => setStates((current) => current.map((state) => state.id === stateId ? { ...state, visited: !state.visited } : state)));
    },
    toggleSaved: (pinId) => {
      setPins((current) => current.map((pin) => pin.id === pinId ? { ...pin, savedToItinerary: !pin.savedToItinerary } : pin));
      if (serverMode) void api(`/v1/itinerary/${pinId}`, { method: "POST" }).catch(() => setPins((current) => current.map((pin) => pin.id === pinId ? { ...pin, savedToItinerary: !pin.savedToItinerary } : pin)));
    },
    toggleFavoriteState: (stateId) => setFavoriteStateIds((current) => current.includes(stateId) ? current.filter((id) => id !== stateId) : [stateId, ...current]),
    toggleFavoritePin: (pinId) => {
      setFavoritePinIds((current) => current.includes(pinId) ? current.filter((id) => id !== pinId) : [pinId, ...current]);
      if (serverMode) void api(`/v1/pins/${pinId}/favorite`, { method: "POST" }).catch(() => setFavoritePinIds((current) => current.includes(pinId) ? current.filter((id) => id !== pinId) : [pinId, ...current]));
    },
    toggleFavoriteLocation: (locationKey) => setFavoriteLocationKeys((current) => current.includes(locationKey) ? current.filter((key) => key !== locationKey) : [locationKey, ...current]),
    toggleUpvote: (pinId) => {
      setPins((current) => current.map((pin) => pin.id === pinId ? { ...pin, upvoted: !pin.upvoted, upvotes: pin.upvotes + (pin.upvoted ? -1 : 1) } : pin));
      if (serverMode) void api<{ upvoted: boolean; count: number }>(`/v1/pins/${pinId}/vote`, { method: "POST" }).then((result) => setPins((current) => current.map((pin) => pin.id === pinId ? { ...pin, upvoted: result.upvoted, upvotes: result.count } : pin))).catch(() => undefined);
    },
    addComment: (pinId, text) => {
      if (serverMode) {
        void api<{ comment: ApiComment }>(`/v1/pins/${pinId}/comments`, { method: "POST", body: JSON.stringify({ text: text.trim() }) }).then(({ comment }) => setPins((current) => current.map((pin) => pin.id === pinId ? { ...pin, comments: [...pin.comments, fromApiComment(comment, pinId)] } : pin))).catch((error) => Alert.alert("Comment not posted", error instanceof Error ? error.message : "Please try again."));
        return;
      }
      setPins((current) => current.map((pin) => pin.id === pinId ? { ...pin, comments: [...pin.comments, { id: `local-${Date.now()}`, pinId, username: "you", text: text.trim(), createdAt: "now" }] } : pin));
    },
    addPin: (pin) => {
      if (serverMode) {
        void uploadAndCreatePin(pin).then((created) => setPins((current) => [created, ...current])).catch((error) => Alert.alert("Pin not posted", error instanceof Error ? error.message : "Please try again."));
        return;
      }
      setPins((current) => [{
      ...pin,
      id: `local-pin-${Date.now()}`,
      upvotes: 0,
      comments: [],
      recommendedBy: "you",
      savedToItinerary: false,
      createdAt: new Date().toISOString()
      }, ...current]);
    },
    requestLocation: async () => {
      setLocationMessage(null);
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== "granted") {
          setLocation(null);
          setLocationMessage("Location is off. We’ll keep the map ready whenever you change your mind.");
          return;
        }
        const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setLocation({ latitude: result.coords.latitude, longitude: result.coords.longitude });
        setLocationMessage("You’re on the map.");
      } catch {
        setLocation(null);
        setLocationMessage("We couldn’t get your location. Check that location is enabled and try again.");
      }
    },
    clearLocalData: async () => {
      await AsyncStorage.removeItem(storageKey);
      setStates(initialStates);
      setPins(initialPins);
      setFavoriteStateIds([]);
      setFavoritePinIds([]);
      setFavoriteLocationKeys([]);
      setLocation(null);
      Alert.alert("Fresh start", "Your local demo data has been reset.");
    }
  }), [states, pins, favoriteStateIds, favoritePinIds, favoriteLocationKeys, location, locationMessage, serverMode, storageKey]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

type ApiState = { id: string; name: string; abbr: string; latitude: number; longitude: number; pinCount: number; visited: boolean };
type ApiComment = { id: string; text: string; createdAt: string; author: { username: string } };
type ApiPin = { id: string; stateId: string; name: string; city: string; description: string; category: Category; imageUrl: string; latitude: number; longitude: number; createdAt: string; author: { username: string }; comments: ApiComment[]; _count: { votes: number } };

function fromApiState(state: ApiState): USState {
  const map = initialStates.find((item) => item.id === state.id);
  return { id: state.id, name: state.name, abbreviation: state.abbr, visited: state.visited, centerCoordinates: { latitude: state.latitude, longitude: state.longitude }, pinCount: state.pinCount, mapPosition: map?.mapPosition ?? { row: 0, column: 0 } };
}

function fromApiComment(comment: ApiComment, pinId: string) {
  return { id: comment.id, pinId, username: comment.author.username, text: comment.text, createdAt: new Date(comment.createdAt).toLocaleDateString() };
}

function fromApiPin(pin: ApiPin): Pin {
  return { id: pin.id, stateId: pin.stateId, name: pin.name, city: pin.city, description: pin.description, category: pin.category, imageUrl: pin.imageUrl, coordinates: { latitude: pin.latitude, longitude: pin.longitude }, upvotes: pin._count.votes, comments: pin.comments.map((comment) => fromApiComment(comment, pin.id)), recommendedBy: pin.author.username, savedToItinerary: false, upvoted: false, createdAt: pin.createdAt };
}

async function uploadAndCreatePin(pin: NewPin) {
  const fileName = pin.imageUrl.split("/").pop() ?? "stateup-photo.jpg";
  const extension = fileName.split(".").pop()?.toLowerCase();
  const mime = extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : extension === "heic" || extension === "heif" ? "image/heic" : "image/jpeg";
  const form = new FormData();
  form.append("file", { uri: pin.imageUrl, name: fileName, type: mime } as unknown as Blob);
  const uploaded = await api<{ url: string }>("/v1/pins/uploads", { method: "POST", body: form });
  const result = await api<{ pin: ApiPin }>("/v1/pins", { method: "POST", body: JSON.stringify({ stateId: pin.stateId, name: pin.name, city: pin.city, description: pin.description, category: pin.category, imageUrl: uploaded.url, latitude: pin.coordinates.latitude, longitude: pin.coordinates.longitude }) });
  return fromApiPin(result.pin);
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
