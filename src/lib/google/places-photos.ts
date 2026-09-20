import type { PlacePhoto } from "@/features/venues/place-photo";

type GooglePhoto = {
  name?: string;
  widthPx?: number;
  heightPx?: number;
  googleMapsUri?: string;
  authorAttributions?: Array<{
    displayName?: string;
    uri?: string;
    photoUri?: string;
  }>;
};

function secureUrl(value: string | undefined) {
  if (!value) return null;
  const normalized = value.startsWith("//") ? `https:${value}` : value;
  try {
    return new URL(normalized).protocol === "https:" ? normalized : null;
  } catch {
    return null;
  }
}

export async function getPlacePhotos(placeId: string, positions?: number[]) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return { status: "unavailable" as const, photos: [] };
  if (!/^ChI[A-Za-z0-9_-]{8,}$/.test(placeId)) {
    return { status: "invalid" as const, photos: [] };
  }

  const details = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "id,photos",
      },
      cache: "no-store",
    },
  );
  if (!details.ok) return { status: "unavailable" as const, photos: [] };
  const payload = (await details.json()) as { photos?: GooglePhoto[] };
  const requested = positions ?? payload.photos?.map((_, index) => index) ?? [];
  const selected = [...new Set(requested)].filter(
    (position) => Number.isInteger(position) && position >= 0 && position < 10,
  );

  const photos = await Promise.all(
    selected.map(async (position): Promise<PlacePhoto | null> => {
      const photo = payload.photos?.[position];
      const sourceUri = secureUrl(photo?.googleMapsUri);
      if (!photo?.name || !sourceUri || !photo.name.startsWith(`places/${placeId}/photos/`)) {
        return null;
      }
      const media = await fetch(
        `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1400&skipHttpRedirect=true`,
        { headers: { "X-Goog-Api-Key": apiKey }, cache: "no-store" },
      );
      if (!media.ok) return null;
      const result = (await media.json()) as { photoUri?: string };
      const uri = secureUrl(result.photoUri);
      if (!uri) return null;
      return {
        position,
        uri,
        googleMapsUri: sourceUri,
        widthPx: photo.widthPx ?? 0,
        heightPx: photo.heightPx ?? 0,
        authorAttributions: (photo.authorAttributions ?? []).map((author) => ({
          displayName: author.displayName ?? "",
          uri: secureUrl(author.uri),
          photoUri: secureUrl(author.photoUri),
        })),
      };
    }),
  );
  return {
    status: "ready" as const,
    photos: photos.filter((photo): photo is PlacePhoto => !!photo),
  };
}
