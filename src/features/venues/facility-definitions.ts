export const facilityKeys = [
  "coffee",
  "food",
  "seating",
  "outlets",
  "restrooms",
  "wifi",
  "quiet",
  "work_friendly",
  "study_friendly",
  "group_friendly",
  "parking",
  "late_hours",
  "outdoor_seating",
] as const;

export type FacilityKey = (typeof facilityKeys)[number];
export type FacilityState = "yes" | "no" | "unknown";
export type PublicFacilityState = Exclude<FacilityState, "unknown">;

export const facilityDefinition: Record<
  FacilityKey,
  { icon: string; ar: string; en: string; usefulWhenNo: boolean }
> = {
  coffee: { icon: "☕", ar: "قهوة", en: "Coffee", usefulWhenNo: false },
  food: { icon: "🍽️", ar: "أكل", en: "Food", usefulWhenNo: false },
  seating: { icon: "🪑", ar: "جلسات مناسبة", en: "Good seating", usefulWhenNo: true },
  outlets: { icon: "🔌", ar: "أفياش", en: "Outlets", usefulWhenNo: true },
  restrooms: { icon: "🚻", ar: "دورات مياه", en: "Restrooms", usefulWhenNo: true },
  wifi: { icon: "📶", ar: "Wi-Fi", en: "Wi-Fi", usefulWhenNo: true },
  quiet: { icon: "🤫", ar: "هدوء", en: "Quiet", usefulWhenNo: true },
  work_friendly: { icon: "💻", ar: "مناسب للعمل", en: "Work-friendly", usefulWhenNo: true },
  study_friendly: { icon: "🧠", ar: "مناسب للمذاكرة", en: "Study-friendly", usefulWhenNo: true },
  group_friendly: { icon: "👥", ar: "مناسب للقروبات", en: "Group-friendly", usefulWhenNo: true },
  parking: { icon: "🚗", ar: "مواقف", en: "Parking", usefulWhenNo: true },
  late_hours: { icon: "🌙", ar: "جلسات متأخرة", en: "Late hours", usefulWhenNo: false },
  outdoor_seating: { icon: "☀️", ar: "جلسات خارجية", en: "Outdoor seating", usefulWhenNo: false },
};
