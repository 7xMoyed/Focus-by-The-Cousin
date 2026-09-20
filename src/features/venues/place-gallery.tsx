"use client";

import Link from "next/link";
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

export function PlaceGallery({
  photos,
  locale,
  name,
  detailHref,
  expanded = false,
}: {
  photos: VenuePhoto[];
  locale: "ar" | "en";
  name: string;
  detailHref?: string;
  expanded?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [failedPositions, setFailedPositions] = useState<number[]>([]);
  const touchStart = useRef<number | null>(null);
  const currentPhoto = photos[index] ?? photos[0];
  const photo =
    currentPhoto && !failedPositions.includes(currentPhoto.position) ? currentPhoto : null;
  const googlePhoto = photo && "googleMapsUri" in photo ? photo : null;
  const copy =
    locale === "ar"
      ? {
          fallback: "صور المكان بانتظار مراجعة المؤسسين",
          open: "عرض الصورة",
          source: "الصورة الأصلية على Google Maps",
          provided: "صورة مقدمة إلى Focus",
          close: "إغلاق",
          previous: "السابق",
          next: "التالي",
        }
      : {
          fallback: "Place photos are awaiting founder review",
          open: "Open photo",
          source: "Original photo on Google Maps",
          provided: "Photo provided to Focus",
          close: "Close",
          previous: "Previous",
          next: "Next",
        };

  function move(step: number) {
    setIndex((current) => (current + step + photos.length) % photos.length);
  }

  useEffect(() => {
    if (!viewerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewerOpen(false);
      if (event.key === "ArrowLeft") {
        setIndex((current) => (current - 1 + photos.length) % photos.length);
      }
      if (event.key === "ArrowRight") {
        setIndex((current) => (current + 1) % photos.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewerOpen, photos.length]);

  if (!photo) {
    const fallback = (
      <>
        <div
          aria-hidden="true"
          className="absolute -right-8 -top-12 h-52 w-52 rounded-full border border-white/15"
        />
        <div className="relative">
          <p className="text-4xl font-semibold tracking-tight" dir="ltr">
            {name}
          </p>
          <p className="mt-2 text-xs text-white/80">{copy.fallback}</p>
        </div>
      </>
    );
    return (
      <div className="relative flex aspect-[16/9] items-end overflow-hidden bg-[linear-gradient(145deg,#0b3345,#1b6376_60%,#d8e9e7)] p-5 text-white">
        {detailHref ? (
          <Link href={detailHref} className="absolute inset-0 flex items-end p-5">
            {fallback}
          </Link>
        ) : (
          fallback
        )}
      </div>
    );
  }

  const image = (
    // The short-lived Google photo URL is loaded directly; Next image optimization would cache it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photo.uri}
      alt={
        "source" in photo ? (locale === "ar" ? photo.altAr : photo.altEn) : `${name} — ${index + 1}`
      }
      className="h-full w-full object-cover"
      loading={index === 0 ? "eager" : "lazy"}
      onError={() => setFailedPositions((current) => [...current, photo.position])}
    />
  );

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
          if (Math.abs(distance) > 35) {
            event.preventDefault();
            move(distance < 0 ? 1 : -1);
          }
          touchStart.current = null;
        }}
      >
        {detailHref ? (
          <Link href={detailHref} aria-label={copy.open} className="block h-full w-full">
            {image}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setViewerOpen(true)}
            aria-label={copy.open}
            className="h-full w-full cursor-zoom-in"
          >
            {image}
          </button>
        )}
        {photos.length > 1 ? (
          <div className="absolute bottom-12 end-3 flex items-center gap-2 rounded-full bg-slate-950/65 px-2 py-1 text-xs text-white backdrop-blur-sm">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label={copy.previous}
              className="min-h-7 min-w-7"
            >
              ‹
            </button>
            <span dir="ltr">
              {index + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label={copy.next}
              className="min-h-7 min-w-7"
            >
              ›
            </button>
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 flex min-h-9 items-center justify-between gap-2 bg-white/95 px-4 py-2 text-xs text-[#5e5e5e]">
          {googlePhoto ? (
            <>
              <span
                translate="no"
                className="shrink-0 whitespace-nowrap font-sans text-xs font-normal"
              >
                Google Maps
              </span>
              <a
                href={googlePhoto.googleMapsUri}
                target="_blank"
                rel="noreferrer"
                className="truncate underline underline-offset-2"
              >
                {copy.source} ↗
              </a>
            </>
          ) : (
            <span>{copy.provided}</span>
          )}
        </div>
      </div>
      {expanded && !detailHref ? (
        <button
          type="button"
          onClick={() => setViewerOpen(true)}
          className="mt-2 text-xs font-semibold text-sky-800"
        >
          {copy.open} ↗
        </button>
      ) : null}
      {viewerOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={copy.open}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4"
          onClick={() => setViewerOpen(false)}
        >
          <div
            className="max-h-full w-full max-w-5xl overflow-y-auto rounded-2xl bg-white text-slate-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between p-3">
              <strong>{name}</strong>
              <button type="button" onClick={() => setViewerOpen(false)}>
                {copy.close} ✕
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.uri}
              alt={
                "source" in photo
                  ? locale === "ar"
                    ? photo.altAr
                    : photo.altEn
                  : `${name} — ${index + 1}`
              }
              className="max-h-[65vh] w-full object-contain bg-slate-900"
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
                    className="font-semibold text-sky-800 underline"
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
              <div className="flex justify-between p-4">
                <button type="button" onClick={() => move(-1)}>
                  {copy.previous}
                </button>
                <span dir="ltr">
                  {index + 1} / {photos.length}
                </span>
                <button type="button" onClick={() => move(1)}>
                  {copy.next}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
