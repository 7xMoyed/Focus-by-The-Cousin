"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import { useLocale } from "@/features/i18n/locale-provider";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";

type Status = "draft" | "submitted" | "changes_requested" | "approved" | "rejected";
type Submission = {
  id: string; status: Status; current_step: number; cafe_name: string; city_code: string | null;
  area_code: string | null; neighborhood: string | null; branch_name: string | null;
  google_maps_url: string | null; address: string | null; evaluation: Record<string, string | number>;
  review_text: string | null; photo_paths: string[]; visited_on: string | null;
  overall_rating: number | null; founder_note: string | null; updated_at: string;
};

const empty: Omit<Submission, "id" | "updated_at"> = {
  status: "draft", current_step: 1, cafe_name: "", city_code: null, area_code: null,
  neighborhood: null, branch_name: null, google_maps_url: null, address: null,
  evaluation: {}, review_text: null, photo_paths: [], visited_on: null, overall_rating: null,
  founder_note: null,
};

export function ReviewerPortal() {
  const { locale } = useLocale();
  const { user, loading: authLoading, openAuth } = useAuth();
  const [approved, setApproved] = useState<boolean | null>(null);
  const [items, setItems] = useState<Submission[]>([]);
  const [draft, setDraft] = useState<Submission | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const copy = locale === "ar" ? ar : en;

  useEffect(() => {
    if (authLoading || !user) return;
    const supabase = getBrowserSupabaseClient();
    let active = true;
    void supabase.from("reviewer_profiles" as string).select("is_approved").eq("user_id", user.id).maybeSingle<{ is_approved: boolean }>()
      .then(async ({ data }) => {
        if (!active) return;
        setApproved(Boolean(data?.is_approved));
        if (!data?.is_approved) return;
        const result = await supabase.from("reviewer_submissions" as string).select("*").eq("reviewer_id", user.id).order("updated_at", { ascending: false }).returns<Submission[]>();
        if (active) setItems(result.data ?? []);
      });
    return () => { active = false; };
  }, [authLoading, user]);

  if (authLoading || (user && approved === null)) return <div className="h-64 animate-pulse rounded-3xl bg-[hsl(var(--surface-soft))]" />;
  if (!user) return <Gate title={copy.loginTitle} detail={copy.loginDetail} action={copy.login} onClick={() => openAuth()} />;
  if (!approved) return <Gate title={copy.notApprovedTitle} detail={copy.notApprovedDetail} />;
  if (draft) return <ReviewForm value={draft} locale={locale} saving={saving} message={message} onChange={setDraft} onClose={() => { setDraft(null); setMessage(""); }} onSave={(submit) => void saveDraft(draft, submit)} />;

  async function saveDraft(value: Submission, submit: boolean) {
    if (!user) return;
    setSaving(true); setMessage("");
    const nextStatus = submit ? "submitted" : "draft";
    const payload = { ...value, reviewer_id: user.id, status: nextStatus, submitted_at: submit ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
    const { data, error } = await getBrowserSupabaseClient().from("reviewer_submissions" as string).update(payload as never).eq("id", value.id).select("*").single<Submission>();
    setSaving(false);
    if (error || !data) { setMessage(copy.saveError); return; }
    setItems((current) => [data, ...current.filter((item) => item.id !== data.id)]);
    setMessage(submit ? copy.submitted : copy.saved);
    if (submit) window.setTimeout(() => { setDraft(null); setMessage(""); }, 700);
    else setDraft(data);
  }

  async function newDraft() {
    if (!user) return;
    setSaving(true);
    const { data, error } = await getBrowserSupabaseClient().from("reviewer_submissions" as string).insert({ ...empty, reviewer_id: user.id } as never).select("*").single<Submission>();
    setSaving(false);
    if (error || !data) { setMessage(copy.saveError); return; }
    setItems((current) => [data, ...current]); setDraft(data);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="focus-accent-text text-sm font-semibold">Focus reviewers</p><h1 className="mt-2 text-3xl font-semibold">{copy.title}</h1><p className="focus-muted-text mt-2">{copy.detail}</p></div><button type="button" disabled={saving} onClick={() => void newDraft()} className="find-primary-button">＋ {copy.add}</button></div>
      {message ? <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{message}</p> : null}
      <div className="mt-7 grid gap-3">
        {items.length ? items.map((item) => <button key={item.id} type="button" onClick={() => item.status === "draft" || item.status === "changes_requested" ? setDraft(item) : undefined} className="find-choice justify-between"><span><strong className="block">{item.cafe_name || copy.untitled}</strong><span className="focus-muted-text mt-1 block text-xs">{new Date(item.updated_at).toLocaleDateString(locale === "ar" ? "ar-SA" : "en")}</span></span><StatusBadge status={item.status} locale={locale} /></button>) : <Gate title={copy.emptyTitle} detail={copy.emptyDetail} />}
      </div>
    </div>
  );
}

function ReviewForm({ value, locale, saving, message, onChange, onClose, onSave }: { value: Submission; locale: "ar" | "en"; saving: boolean; message: string; onChange: (value: Submission) => void; onClose: () => void; onSave: (submit: boolean) => void }) {
  const copy = locale === "ar" ? ar : en;
  const step = value.current_step;
  const patch = (next: Partial<Submission>) => onChange({ ...value, ...next });
  const evaluation = value.evaluation ?? {};
  const setEvaluation = (key: string, next: string | number) => patch({ evaluation: { ...evaluation, [key]: next } });
  const canContinue = step === 1 ? value.cafe_name.trim().length >= 2 && Boolean(value.city_code) : step === 2 ? typeof evaluation.coffee === "number" && typeof evaluation.quietness === "number" && typeof evaluation.seating === "number" : Boolean(value.visited_on && value.overall_rating);

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length) return;
    const supabase = getBrowserSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const paths = [...value.photo_paths];
    for (const file of Array.from(files).slice(0, 8 - paths.length)) {
      if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) continue;
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${data.user.id}/${value.id}/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("reviewer-photos").upload(path, file, { upsert: false });
      if (!error) paths.push(path);
    }
    patch({ photo_paths: paths });
  }

  return <div>
    <div className="flex items-center justify-between gap-3"><button type="button" onClick={onClose} className="find-back-button">{locale === "ar" ? "→ لوحة المقيّم" : "← Dashboard"}</button><span className="focus-chip">{step} / 3</span></div>
    <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[hsl(var(--surface-soft))]"><div className="h-full rounded-full bg-[hsl(var(--focus-accent))] transition-[width]" style={{ width: `${step / 3 * 100}%` }} /></div>
    <h2 className="mt-6 text-2xl font-semibold">{copy.steps[step - 1]}</h2>
    {step === 1 ? <div className="mt-5 grid gap-4 sm:grid-cols-2">
      <Field label={copy.cafe}><input className="find-input" value={value.cafe_name} onChange={(e) => patch({ cafe_name: e.target.value })} required /></Field>
      <Field label={copy.city}><select className="find-input" value={value.city_code ?? ""} onChange={(e) => patch({ city_code: e.target.value })}><option value="">—</option><option value="riyadh">{copy.riyadh}</option><option value="majmaah">{copy.majmaah}</option></select></Field>
      <Field label={copy.area}><input className="find-input" value={value.area_code ?? ""} onChange={(e) => patch({ area_code: e.target.value })} /></Field>
      <Field label={copy.neighborhood}><input className="find-input" value={value.neighborhood ?? ""} onChange={(e) => patch({ neighborhood: e.target.value })} /></Field>
      <Field label={copy.branch}><input className="find-input" value={value.branch_name ?? ""} onChange={(e) => patch({ branch_name: e.target.value })} /></Field>
      <Field label={copy.maps}><input className="find-input" type="url" dir="ltr" value={value.google_maps_url ?? ""} onChange={(e) => patch({ google_maps_url: e.target.value })} /></Field>
      <Field label={copy.address}><input className="find-input" value={value.address ?? ""} onChange={(e) => patch({ address: e.target.value })} /></Field>
    </div> : null}
    {step === 2 ? <div className="mt-5 grid gap-5"><Rating label="☕ Coffee" value={evaluation.coffee} onChange={(next) => setEvaluation("coffee", next)} /><Rating label="🤫 Quietness" value={evaluation.quietness} onChange={(next) => setEvaluation("quietness", next)} /><Rating label="🪑 Seating" value={evaluation.seating} onChange={(next) => setEvaluation("seating", next)} />{triFields.map((item) => <Segments key={item.key} label={item.label[locale]} value={evaluation[item.key]} options={item.options[locale]} onChange={(next) => setEvaluation(item.key, next)} />)}</div> : null}
    {step === 3 ? <div className="mt-5 grid gap-4"><Field label={copy.visit}><input className="find-input" type="date" value={value.visited_on ?? ""} onChange={(e) => patch({ visited_on: e.target.value })} /></Field><Rating label={copy.overall} value={value.overall_rating ?? undefined} onChange={(next) => patch({ overall_rating: next })} /><Field label={copy.note}><textarea className="find-input min-h-32 py-3" value={value.review_text ?? ""} onChange={(e) => patch({ review_text: e.target.value })} maxLength={1200} placeholder={copy.notePrompt} /></Field><Field label={copy.photos}><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => void uploadPhotos(e.target.files)} className="find-input py-3" /><span className="focus-muted-text mt-1 block text-xs">{copy.photoHint(value.photo_paths.length)}</span></Field></div> : null}
    {value.founder_note ? <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{copy.founderNote}: {value.founder_note}</p> : null}
    {message ? <p className="mt-4 text-sm text-[hsl(var(--focus-accent))]">{message}</p> : null}
    <div className="mt-7 flex flex-wrap gap-3"><button type="button" disabled={saving} onClick={() => onSave(false)} className="focus-chip">{copy.save}</button>{step > 1 ? <button type="button" onClick={() => patch({ current_step: step - 1 })} className="focus-chip">{copy.back}</button> : null}{step < 3 ? <button type="button" disabled={!canContinue} onClick={() => patch({ current_step: step + 1 })} className="find-primary-button disabled:opacity-40">{copy.continue}</button> : <button type="button" disabled={!canContinue || saving} onClick={() => onSave(true)} className="find-primary-button disabled:opacity-40">{copy.submit}</button>}</div>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><span className="find-field-label">{label}</span>{children}</label>; }
function Rating({ label, value, onChange }: { label: string; value: string | number | undefined; onChange: (value: number) => void }) { return <div><span className="find-field-label">{label}</span><div className="flex gap-2">{[1,2,3,4,5].map((n) => <button key={n} type="button" aria-pressed={value === n} onClick={() => onChange(n)} className="focus-chip min-w-11 justify-center">{n}</button>)}</div></div>; }
function Segments({ label, value, options, onChange }: { label: string; value: string | number | undefined; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) { return <div><span className="find-field-label">{label}</span><div className="flex flex-wrap gap-2">{options.map((item) => <button key={item.value} type="button" aria-pressed={value === item.value} onClick={() => onChange(item.value)} className="focus-chip">{item.label}</button>)}</div></div>; }
function Gate({ title, detail, action, onClick }: { title: string; detail: string; action?: string; onClick?: () => void }) { return <div className="py-10 text-center"><span className="text-5xl">📝</span><h1 className="mt-5 text-3xl font-semibold">{title}</h1><p className="focus-muted-text mx-auto mt-3 max-w-md leading-7">{detail}</p>{action && onClick ? <button type="button" onClick={onClick} className="find-primary-button mt-7">{action}</button> : null}</div>; }
function StatusBadge({ status, locale }: { status: Status; locale: "ar" | "en" }) { const labels = { draft: ["مسودة","Draft"], submitted: ["بانتظار الاعتماد","Pending"], changes_requested: ["مطلوب تعديل","Changes requested"], approved: ["منشور","Published"], rejected: ["مرفوض","Rejected"] } as const; return <span className="focus-chip">{labels[status][locale === "ar" ? 0 : 1]}</span>; }

const ynu = { ar: [{ value: "yes", label: "نعم" }, { value: "no", label: "لا" }, { value: "unknown", label: "غير متأكد" }], en: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }, { value: "unknown", label: "Unknown" }] };
const triFields = [
  { key: "wifi", label: { ar: "📶 Wi‑Fi", en: "📶 Wi‑Fi" }, options: ynu }, { key: "outlets", label: { ar: "🔌 الأفياش", en: "🔌 Outlets" }, options: ynu },
  { key: "laptop", label: { ar: "💻 مناسب للابتوب", en: "💻 Laptop-friendly" }, options: ynu }, { key: "study", label: { ar: "📚 مناسب للمذاكرة", en: "📚 Study-friendly" }, options: ynu },
  { key: "restrooms", label: { ar: "🚻 دورات المياه", en: "🚻 Restrooms" }, options: ynu }, { key: "food", label: { ar: "🥪 الأكل", en: "🥪 Food" }, options: ynu },
  { key: "parking", label: { ar: "🚗 المواقف", en: "🚗 Parking" }, options: { ar: [{ value: "easy", label: "سهلة" }, { value: "limited", label: "محدودة" }, { value: "difficult", label: "صعبة" }, { value: "unknown", label: "غير معروف" }], en: [{ value: "easy", label: "Easy" }, { value: "limited", label: "Limited" }, { value: "difficult", label: "Difficult" }, { value: "unknown", label: "Unknown" }] } },
  { key: "price", label: { ar: "💰 السعر", en: "💰 Price" }, options: { ar: [{ value: "budget", label: "اقتصادي" }, { value: "moderate", label: "متوسط" }, { value: "premium", label: "مرتفع" }, { value: "unknown", label: "غير معروف" }], en: [{ value: "budget", label: "Budget" }, { value: "moderate", label: "Moderate" }, { value: "premium", label: "Premium" }, { value: "unknown", label: "Unknown" }] } },
];
const ar = { title: "بوابة مقيّمي Focus", detail: "قيّم مكانًا بسرعة، واحفظ المسودة، والمؤسس يعتمدها قبل النشر.", add: "أضف مكان", loginTitle: "سجّل دخولك كمقيّم", loginDetail: "الأدوات متاحة فقط للحسابات المعتمدة من مؤسسي Focus.", login: "تسجيل الدخول", notApprovedTitle: "حسابك ليس مقيّمًا معتمدًا", notApprovedDetail: "صلاحية المقيّم يمنحها المؤسس يدويًا. لا يمكن تفعيلها من هذه الصفحة.", emptyTitle: "ما عندك مراجعات للحين", emptyDetail: "ابدأ بمكان زرته فعلًا، واحكِ لنا أهم شيء يستحق يعرفه الزائر.", untitled: "مسودة بدون اسم", saveError: "تعذر الحفظ. راجع اتصالك وحاول مرة ثانية.", saved: "تم حفظ المسودة 👌", submitted: "تم الإرسال للمراجعة ✨", steps: ["معلومات المكان", "تقييم سريع", "ملاحظات وصور"], cafe: "اسم المقهى", city: "المدينة", riyadh: "الرياض", majmaah: "المجمعة", area: "المنطقة", neighborhood: "الحي", branch: "الفرع", maps: "رابط Google Maps", address: "العنوان (اختياري)", visit: "تاريخ الزيارة", overall: "التقييم العام", note: "ملاحظتك", notePrompt: "وش أهم شيء ودّك يعرفه اللي بيزور المقهى؟", photos: "الصور (اختياري)", photoHint: (n: number) => `${n}/8 صور · JPG/PNG/WebP · 8MB كحد أقصى`, founderNote: "ملاحظة المؤسس", save: "حفظ مسودة", back: "السابق", continue: "التالي", submit: "إرسال للاعتماد" };
const en = { title: "Focus reviewer portal", detail: "Review a place quickly, save a draft, and let the founder approve it before publication.", add: "Add place", loginTitle: "Sign in as a reviewer", loginDetail: "Reviewer tools are available only to accounts approved by the Focus founders.", login: "Sign in", notApprovedTitle: "This account is not an approved reviewer", notApprovedDetail: "Reviewer access is granted manually by a founder and cannot be enabled here.", emptyTitle: "No reviews yet", emptyDetail: "Start with a place you actually visited and share the most useful thing to know.", untitled: "Untitled draft", saveError: "Could not save. Check your connection and try again.", saved: "Draft saved 👌", submitted: "Sent for approval ✨", steps: ["Place information", "Quick evaluation", "Notes & photos"], cafe: "Café name", city: "City", riyadh: "Riyadh", majmaah: "Al Majma’ah", area: "Area", neighborhood: "Neighborhood", branch: "Branch", maps: "Google Maps URL", address: "Address (optional)", visit: "Visit date", overall: "Overall rating", note: "Your note", notePrompt: "What is the most important thing a visitor should know?", photos: "Photos (optional)", photoHint: (n: number) => `${n}/8 photos · JPG/PNG/WebP · 8MB max`, founderNote: "Founder note", save: "Save draft", back: "Back", continue: "Continue", submit: "Submit for approval" };
