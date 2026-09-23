export type Category =
  | "Food"
  | "Nature"
  | "Landmark"
  | "Hidden Gem"
  | "Road Trip Stop"
  | "Museum"
  | "Other";

export type USState = {
  id: string;
  name: string;
  abbreviation: string;
  visited: boolean;
  centerCoordinates: { latitude: number; longitude: number };
  pinCount: number;
  mapPosition: { row: number; column: number };
};

export type Comment = {
  id: string;
  pinId: string;
  username: string;
  text: string;
  createdAt: string;
};

export type Pin = {
  id: string;
  stateId: string;
  name: string;
  city: string;
  description: string;
  category: Category;
  imageUrl: string;
  coordinates: { latitude: number; longitude: number };
  upvotes: number;
  comments: Comment[];
  recommendedBy: string;
  savedToItinerary: boolean;
  upvoted?: boolean;
  createdAt?: string;
};

export type ReportTarget = "PIN" | "COMMENT" | "MESSAGE" | "USER";
