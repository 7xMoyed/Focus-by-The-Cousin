export type PlacePhoto = {
  position: number;
  uri: string;
  googleMapsUri: string;
  widthPx: number;
  heightPx: number;
  authorAttributions: Array<{
    displayName: string;
    uri: string | null;
    photoUri: string | null;
  }>;
};

export type VenuePhoto =
  | PlacePhoto
  | {
      position: number;
      uri: string;
      altAr: string;
      altEn: string;
      source: "provided";
    };

export const weeProvidedPhotos: VenuePhoto[] = [
  {
    position: 0,
    uri: "/venues/wee/interior-wide.jpg",
    altAr: "طاولة طويلة وجلسات داخل ووي",
    altEn: "Long study table and indoor seating at WEE",
    source: "provided",
  },
  {
    position: 1,
    uri: "/venues/wee/study-table.jpg",
    altAr: "طاولة جماعية داخل ووي",
    altEn: "Shared table inside WEE",
    source: "provided",
  },
  {
    position: 2,
    uri: "/venues/wee/patio.jpg",
    altAr: "جلسات خارجية ونباتات في ووي",
    altEn: "Outdoor seating and plants at WEE",
    source: "provided",
  },
];

export type PublicVenueEnrichment = {
  googlePlaceId: string | null;
  summaryAr: string | null;
  summaryEn: string | null;
  bestFor: string[];
  signals: string[];
  photoPositions: number[];
};
