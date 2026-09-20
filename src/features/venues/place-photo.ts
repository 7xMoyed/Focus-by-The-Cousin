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

export type PublicVenueEnrichment = {
  googlePlaceId: string | null;
  summaryAr: string | null;
  summaryEn: string | null;
  bestFor: string[];
  signals: string[];
  photoPositions: number[];
};
