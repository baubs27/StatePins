import { Pin, USState } from "@/types";

export function StateMap(props: {
  state: USState;
  pins: Pin[];
  location: { latitude: number; longitude: number } | null;
}): React.ReactElement;
