"use client";

import { useEffect, useRef, useState } from "react";

import type { PlacePhoto, VenuePhoto } from "./place-photo";

export function usePlaceGallery(source: { branch?: string; candidate?: string; token?: string }) {
  const [photos, setPhotos] = useState<PlacePhoto[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "unavailable">("loading");
  const { branch, candidate, token } = source;

  useEffect(() => {
    if (!branch && !candidate) return;
    const controller = new AbortController();
    const query = candidate
      ? `candidate=${encodeURIComponent(candidate)}`
      : `branch=${encodeURIComponent(branch!)}`;
    void fetch(`/api/places/gallery?${query}`, {
      signal: controller.signal,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((result: { status: string; photos: PlacePhoto[] }) => {
        setPhotos(result.photos ?? []);
        setStatus(
          result.status === "ready" ? "ready" : result.status === "empty" ? "empty" : "unavailable",
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus("unavailable");
      });
    return () => controller.abort();
  }, [branch, candidate, token]);
  return { photos, status };
}

type GalleryCopy = ReturnType<typeof getGalleryCopy>;

function getGalleryCopy(locale: "ar" | "en") {
  return locale === "ar"
    ? {
        fallback: "صور المكان بانتظار مراجعة المؤسسين",
        open: "عرض صور المكان",
        source: "الصورة الأصلية على Google Maps",
        provided: "صورة مقدمة إلى Focus",
        close: "إغلاق",
        previous: "السابق",
        next: "التالي",
      }
    : {
        fallback: "Place photos are awaiting founder review",
        open: "View place photos",
        source: "Original photo on Google Maps",
        provided: "Photo provided to Focus",
        close: "Close",
        previous: "Previous",
        next: "Next",
      };
}

function photoAlt(photo: VenuePhoto, locale: "ar" | "en", name: string, index: number) {
  return "source" in photo
    ? locale === "ar"
      ? photo.altAr
      : photo.altEn
    : `${name} — ${index + 1}`;
}

function GalleryViewer({
  photos,
  index,
  setIndex,
  locale,
  name,
  copy,
  onClose,
}: {
  photos: VenuePhoto[];
  index: number;
  setIndex: (index: number) => void;
  locale: "ar" | "en";
  name: string;
  copy: GalleryCopy;
  onClose: () => void;
}) {
  const photo = photos[index];
  const googlePhoto = photo && "googleMapsUri" in photo ? photo : null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") setIndex((index - 1 + photos.length) % photos.length);
      if (event.key === "ArrowRight") setIndex((index + 1) % photos.length);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [index, onClose, photos.length, setIndex]);

  if (!photo) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={copy.open}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="max-h-full w-full max-w-5xl overflow-y-auto rounded-2xl bg-white text-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 p-3 sm:p-4">
          <strong dir={name === "WEE" ? "ltr" : undefined}>{name}</strong>
          <button type="button" onClick={onClose} className="min-h-10 rounded-full px-3 text-sm">
            {copy.close} ✕
          </button>
        </div>
        {/* Photo URLs from Google are short-lived and must not be cached by Next image optimization. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.uri}
          alt={photoAlt(photo, locale, name, index)}
          className="max-h-[65vh] w-full bg-slate-900 object-contain"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          {googlePhoto ? (
            <>
              <span translate="no" className="font-sans text-xs text-[#5e5e5e]">
                Google Maps
              </span>
              <a
                href={googlePhoto.googleMapsUri}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-sky-800 underline underline-offset-2"
              >
                {copy.source} ↗
              </a>
            </>
          ) : (
            <span>{copy.provided}</span>
          )}
        </div>
        {googlePhoto?.authorAttributions.length ? (
          <div className="flex flex-wrap gap-4 border-t border-slate-200 p-4">
            {googlePhoto.authorAttributions.map((author, authorIndex) => (
              <div
                key={`${author.displayName}-${authorIndex}`}
                className="flex items-center gap-2 text-sm"
              >
                {author.photoUri ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={author.photoUri} alt="" className="h-9 w-9 rounded-full" />
                ) : null}
                {author.uri ? (
                  <a href={author.uri} target="_blank" rel="noreferrer" className="underline">
                    {author.displayName}
                  </a>
                ) : (
                  <span>{author.displayName}</span>
                )}
              </div>
            ))}
          </div>
        ) : null}
        {photos.length > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={() => setIndex((index - 1 + photos.length) % photos.length)}
              className="min-h-10 rounded-full px-3 text-sm font-semibold"
            >
              {copy.previous}
            </button>
            <span dir="ltr" className="text-sm text-slate-500">
              {index + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={() => setIndex((index + 1) % photos.length)}
              className="min-h-10 rounded-full px-3 text-sm font-semibold"
            >
              {copy.next}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function PlaceGallery({
  photos,
  locale,
  name,
}: {
  photos: VenuePhoto[];
  locale: "ar" | "en";
  name: string;
}) {
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [failedPositions, setFailedPositions] = useState<number[]>([]);
  const touchStart = useRef<number | null>(null);
  const copy = getGalleryCopy(locale);
  const currentPhoto = photos[index] ?? photos[0];
  const photo =
    currentPhoto && !failedPositions.includes(currentPhoto.position) ? currentPhoto : null;
  const googlePhoto = photo && "googleMapsUri" in photo ? photo : null;

  function move(step: number) {
    setIndex((current) => (current + step + photos.length) % photos.length);
  }

  if (!photo) {
    return (
      <div className="relative flex aspect-[16/9] items-end overflow-hidden bg-[linear-gradient(145deg,#0b3345,#1b6376_60%,#d8e9e7)] p-5 text-white">
        <div
          aria-hidden="true"
          className="absolute -end-8 -top-12 h-52 w-52 rounded-full border border-white/15"
        />
        <div className="relative">
          <p className="text-4xl font-semibold tracking-tight" dir="ltr">
            {name}
          </p>
          <p className="mt-2 text-xs text-white/80">{copy.fallback}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className="relative aspect-[16/9] overflow-hidden bg-slate-100"
        onTouchStart={(event) => {
          touchStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchStart.current === null || photos.length < 2) return;
          const distance =
            (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
          if (Math.abs(distance) > 35) move(distance < 0 ? 1 : -1);
          touchStart.current = null;
        }}
      >
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          aria-label={copy.open}
          className="h-full w-full cursor-zoom-in"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo.uri}
            alt={photoAlt(photo, locale, name, index)}
            className="h-full w-full object-cover"
            loading={index === 0 ? "eager" : "lazy"}
            onError={() => setFailedPositions((current) => [...current, photo.position])}
          />
        </button>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/55 to-transparent" />
        {photos.length > 1 ? (
          <div className="absolute bottom-3 start-3 rounded-full bg-slate-950/65 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            <span dir="ltr">
              {index + 1} / {photos.length}
            </span>
          </div>
        ) : null}
        <div className="absolute bottom-3 end-3 rounded-full bg-white/90 px-2.5 py-1.5 text-[10px] text-slate-600 shadow-sm backdrop-blur-sm">
          {googlePhoto ? (
            <a
              href={googlePhoto.googleMapsUri}
              target="_blank"
              rel="noreferrer"
              translate="no"
              className="font-sans"
            >
              Google Maps ↗
            </a>
          ) : (
            copy.provided
          )}
        </div>
      </div>
      {viewerOpen ? (
        <GalleryViewer
          photos={photos}
          index={index}
          setIndex={setIndex}
          locale={locale}
          name={name}
          copy={copy}
          onClose={() => setViewerOpen(false)}
        />
      ) : null}
    </>
  );
}

export function PlacePhotoStrip({
  photos,
  locale,
  name,
}: {
  photos: VenuePhoto[];
  locale: "ar" | "en";
  name: string;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const copy = getGalleryCopy(locale);
  if (photos.length < 2) return null;

  const visible = photos.slice(0, 4);
  return (
    <>
      <div className="grid grid-cols-4 gap-2" aria-label={copy.open}>
        {visible.map((photo, visibleIndex) => {
          const remaining = photos.length - visible.length;
          const showRemaining = visibleIndex === visible.length - 1 && remaining > 0;
          return (
            <button
              key={photo.position}
              type="button"
              onClick={() => setViewerIndex(visibleIndex)}
              aria-label={`${copy.open} ${visibleIndex + 1}`}
              className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 transition-transform hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 motion-reduce:transition-none"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.uri} alt="" className="h-full w-full object-cover" loading="lazy" />
              {showRemaining ? (
                <span
                  className="absolute inset-0 flex items-center justify-center bg-slate-950/55 text-sm font-semibold text-white"
                  dir="ltr"
                >
                  +{remaining}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {viewerIndex !== null ? (
        <GalleryViewer
          photos={photos}
          index={viewerIndex}
          setIndex={setViewerIndex}
          locale={locale}
          name={name}
          copy={copy}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </>
  );
}
