"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/features/i18n/locale-provider";
import { calculateFocusEligibility, eligibilityBand } from "@/features/venue-research/eligibility";
import type {
  CandidateStatus,
  EvidenceCategory,
  EvidenceLevel,
  VenueCandidate,
} from "@/features/venue-research/types";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { loadFounderCandidates, moderateFounderCandidate } from "@/lib/supabase/founder-venues";
import { FounderPhotoReview } from "./founder-photo-review";

type AccessState = "checking" | "signed_out" | "denied" | "ready" | "error";
type CityFilter = "all" | "riyadh" | "majmaah";
type StatusFilter = "all" | CandidateStatus;

const statusOrder: CandidateStatus[] = [
  "pending",
  "needs_review",
  "approved",
  "rejected",
  "duplicate_candidate",
];

export function FounderDashboard() {
  const { locale } = useLocale();
  const copy = founderCopy[locale];
  const [access, setAccess] = useState<AccessState>("checking");
  const [candidates, setCandidates] = useState<VenueCandidate[]>([]);
  const [cityFilter, setCityFilter] = useState<CityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState<string>(copy.checkingAccess);

  const refresh = useCallback(async () => {
    const supabase = getBrowserSupabaseClient();
    setAccess("checking");
    setLoadingMessage(copy.checkingAccess);

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setAccess("signed_out");
      return;
    }

    const { data: verified, error: userError } = await supabase.auth.getUser();
    if (userError || !verified.user) {
      await supabase.auth.signOut();
      setAccess("signed_out");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", verified.user.id)
      .maybeSingle<{ role: string }>();

    if (profileError) {
      setAuthError(copy.setupNeeded);
      setAccess("error");
      return;
    }

    if (!profile || !["founder", "admin"].includes(profile.role)) {
      setAccess("denied");
      return;
    }

    try {
      setLoadingMessage(copy.loadingQueue);
      setCandidates(await loadFounderCandidates(supabase));
      setAccess("ready");
    } catch {
      setAuthError(copy.loadError);
      setAccess("error");
    }
  }, [copy]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const filtered = useMemo(
    () =>
      candidates.filter(
        (candidate) =>
          (cityFilter === "all" || candidate.city_code === cityFilter) &&
          (statusFilter === "all" || candidate.status === statusFilter),
      ),
    [candidates, cityFilter, statusFilter],
  );

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    const { error } = await getBrowserSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError(copy.signInError);
      return;
    }
    setPassword("");
    await refresh();
  }

  if (access === "checking") {
    return <FounderState title={loadingMessage} detail={copy.serverVerified} icon="🔐" />;
  }

  if (access === "signed_out") {
    return (
      <section className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/95 p-7 text-slate-950 shadow-[0_24px_90px_rgba(0,15,30,0.3)] sm:p-10">
        <p className="text-xs font-semibold tracking-[0.2em] text-sky-800 uppercase">
          {copy.founderMode}
        </p>
        <h1 className="mt-3 text-3xl font-semibold">{copy.signInTitle}</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">{copy.signInDetail}</p>
        <form className="mt-7 space-y-4" onSubmit={signIn}>
          <label className="block text-sm font-semibold text-slate-700">
            {copy.email}
            <input
              className="find-input mt-2"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            {copy.password}
            <input
              className="find-input mt-2"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {authError ? (
            <p className="rounded-2xl bg-rose-50 p-3 text-sm text-rose-800">{authError}</p>
          ) : null}
          <Button type="submit" className="find-primary-button w-full">
            {copy.signIn}
          </Button>
        </form>
      </section>
    );
  }

  if (access === "denied") {
    return (
      <FounderState
        title={copy.deniedTitle}
        detail={copy.deniedDetail}
        icon="🛡️"
        action={
          <Button
            className="find-back-button mt-5"
            onClick={async () => {
              await getBrowserSupabaseClient().auth.signOut();
              setAccess("signed_out");
            }}
          >
            {copy.signOut}
          </Button>
        }
      />
    );
  }

  if (access === "error") {
    return <FounderState title={copy.errorTitle} detail={authError || copy.loadError} icon="⚠️" />;
  }

  const counts = Object.fromEntries(
    statusOrder.map((status) => [
      status,
      candidates.filter((item) => item.status === status).length,
    ]),
  ) as Record<CandidateStatus, number>;

  return (
    <section className="w-full max-w-7xl rounded-[2rem] border border-white/70 bg-[#f8fbfc]/95 p-4 text-slate-950 shadow-[0_24px_100px_rgba(0,15,30,0.32)] sm:p-7 lg:p-10">
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-sky-800 uppercase">
            {copy.founderMode}
          </p>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{copy.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{copy.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Metric label={copy.pending} value={counts.pending} tone="amber" />
          <Metric label={copy.approved} value={counts.approved} tone="emerald" />
          <Metric label={copy.needsReview} value={counts.needs_review} tone="sky" />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <FilterButton active={statusFilter === "all"} onClick={() => setStatusFilter("all")}>
            {copy.all}
          </FilterButton>
          {statusOrder.map((status) => (
            <FilterButton
              key={status}
              active={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            >
              {copy.status[status]} · {counts[status]}
            </FilterButton>
          ))}
        </div>
        <div className="flex gap-2">
          {(["all", "riyadh", "majmaah"] as CityFilter[]).map((city) => (
            <FilterButton
              key={city}
              active={cityFilter === city}
              onClick={() => setCityFilter(city)}
            >
              {copy.city[city]}
            </FilterButton>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-6">
        {filtered.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            locale={locale}
            onUpdated={refresh}
          />
        ))}
        {!filtered.length ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/70 p-10 text-center text-slate-500">
            {copy.empty}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CandidateCard({
  candidate,
  locale,
  onUpdated,
}: {
  candidate: VenueCandidate;
  locale: "ar" | "en";
  onUpdated: () => Promise<void>;
}) {
  const copy = founderCopy[locale];
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");
  const calculatedScore = calculateFocusEligibility(candidate.venue_candidate_evidence);
  const band = eligibilityBand(candidate.focus_eligibility);
  const name = locale === "ar" ? candidate.name_ar : candidate.name_en;
  const branch = locale === "ar" ? candidate.branch_name_ar : candidate.branch_name_en;
  const address = locale === "ar" ? candidate.address_ar : candidate.address_en;

  async function moderate(decision: "approved" | "rejected" | "needs_review") {
    if (decision !== "approved" && !reason) {
      setActionError(copy.reasonRequired);
      return;
    }
    setActing(true);
    setActionError("");
    try {
      await moderateFounderCandidate(
        getBrowserSupabaseClient(),
        candidate.id,
        decision,
        reason,
        note,
      );
      await onUpdated();
    } catch {
      setActionError(copy.actionError);
    } finally {
      setActing(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_16px_45px_rgba(15,23,42,0.07)]">
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={candidate.status} label={copy.status[candidate.status]} />
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {copy.city[candidate.city_code]}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {locale === "ar" ? candidate.neighborhood_ar : candidate.neighborhood_en}
            </span>
          </div>
          <h2 className="mt-4 text-3xl font-semibold">{name}</h2>
          <p className="mt-1 text-sm font-medium text-slate-500">{branch}</p>
          <p className="mt-4 text-sm leading-7 text-slate-600">📍 {address}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-sky-800">
            {candidate.google_maps_url ? (
              <SourceLink href={candidate.google_maps_url}>{copy.googleMaps}</SourceLink>
            ) : null}
            {candidate.official_instagram_url ? (
              <SourceLink href={candidate.official_instagram_url}>{copy.instagram}</SourceLink>
            ) : null}
            {candidate.official_website_url ? (
              <SourceLink href={candidate.official_website_url}>{copy.website}</SourceLink>
            ) : null}
          </div>
        </div>

        <div className="rounded-[1.5rem] bg-slate-950 p-5 text-white">
          <p className="text-xs font-semibold tracking-[0.16em] text-sky-200 uppercase">
            {copy.internalOnly}
          </p>
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-4xl font-semibold">
                {candidate.focus_eligibility}
                <span className="text-lg text-white/55"> / 100</span>
              </p>
              <p className="mt-2 text-sm text-white/70">{copy.band[band]}</p>
            </div>
            <div className="text-end">
              <p className="text-xs text-white/50">{copy.confidence}</p>
              <p className="mt-1 font-semibold">{copy.confidenceValue[candidate.confidence]}</p>
            </div>
          </div>
          {calculatedScore !== candidate.focus_eligibility ? (
            <p className="mt-4 rounded-xl bg-amber-400/15 p-3 text-xs text-amber-100">
              {copy.scoreMismatch}
            </p>
          ) : null}
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4 text-center text-xs text-white/65">
            <span>
              🔗 {candidate.venue_candidate_sources.length}
              <br />
              {copy.sources}
            </span>
            <span>
              📸 {candidate.venue_candidate_images.length}
              <br />
              {copy.visualSets}
            </span>
            <span>
              🧾 {candidate.venue_candidate_evidence.length}
              <br />
              {copy.signals}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-t border-slate-100 bg-slate-50/70 p-5 sm:p-7 lg:grid-cols-2">
        <Insight title={copy.whyFit} icon="✨" text={candidate.why_it_may_fit} tone="emerald" />
        <Insight title={copy.concerns} icon="⚠️" text={candidate.possible_concerns} tone="amber" />
      </div>

      <div className="space-y-3 border-t border-slate-100 p-5 sm:p-7">
        <Disclosure title={copy.focusResearch} count={candidate.venue_candidate_evidence.length}>
          <div className="grid gap-3 md:grid-cols-2">
            {candidate.venue_candidate_evidence
              .slice()
              .sort((a, b) => evidenceOrder.indexOf(a.category) - evidenceOrder.indexOf(b.category))
              .map((evidence) => (
                <div
                  key={evidence.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold">{copy.evidenceCategory[evidence.category]}</p>
                    <EvidencePill
                      level={evidence.evidence_level}
                      label={copy.evidenceLevel[evidence.evidence_level]}
                    />
                  </div>
                  <p className="mt-2 text-xs font-semibold text-slate-500">
                    {evidence.score_awarded} / {evidence.max_score}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{evidence.summary}</p>
                </div>
              ))}
          </div>
        </Disclosure>

        <Disclosure title={copy.visualEvidence} count={candidate.venue_candidate_images.length}>
          <FounderPhotoReview candidate={candidate} locale={locale} onUpdated={onUpdated} />
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {candidate.venue_candidate_images.map((image) => (
              <div key={image.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="text-sm leading-6 text-slate-700">{image.inspection_summary}</p>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {image.attribution_text || copy.attributionUnknown}
                </p>
                <SourceLink href={image.source_url}>{copy.openSourceImage}</SourceLink>
              </div>
            ))}
          </div>
        </Disclosure>

        <Disclosure title={copy.sources} count={candidate.venue_candidate_sources.length}>
          <div className="grid gap-3 md:grid-cols-2">
            {candidate.venue_candidate_sources.map((source) => (
              <div key={source.id} className="rounded-2xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">{source.source_title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {source.information_summary}
                </p>
                {source.attribution_text ? (
                  <p className="mt-2 text-xs text-slate-400">{source.attribution_text}</p>
                ) : null}
                <SourceLink href={source.source_url}>{copy.inspectSource}</SourceLink>
              </div>
            ))}
          </div>
        </Disclosure>

        <Disclosure
          title={copy.duplicateCheck}
          count={candidate.duplicate_status === "no_visible_match" ? 0 : 1}
        >
          <p className="text-sm leading-7 text-slate-600">
            {candidate.duplicate_notes || copy.noDuplicateNotes}
          </p>
        </Disclosure>
      </div>

      <div className="border-t border-slate-200 bg-white p-5 sm:p-7">
        <div className="grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
          <select
            className="find-input"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          >
            <option value="">{copy.chooseReason}</option>
            {Object.entries(copy.reason).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            className="find-input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={copy.optionalNote}
          />
        </div>
        {actionError ? <p className="mt-3 text-sm text-rose-700">{actionError}</p> : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Button
            disabled={acting}
            className="min-h-12 rounded-full bg-emerald-700 px-5 text-white hover:bg-emerald-800"
            onClick={() => void moderate("approved")}
          >
            {copy.approve}
          </Button>
          <Button
            disabled={acting}
            className="min-h-12 rounded-full bg-amber-100 px-5 text-amber-900 hover:bg-amber-200"
            onClick={() => void moderate("needs_review")}
          >
            {copy.needsReviewAction}
          </Button>
          <Button
            disabled={acting}
            className="min-h-12 rounded-full bg-rose-100 px-5 text-rose-900 hover:bg-rose-200"
            onClick={() => void moderate("rejected")}
          >
            {copy.reject}
          </Button>
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">{copy.noAutoPublish}</p>
      </div>
    </article>
  );
}

const evidenceOrder: EvidenceCategory[] = [
  "seating",
  "study_laptop",
  "quietness",
  "wifi",
  "outlets",
  "parking_access",
  "long_stay",
  "environment",
];

function FounderState({
  title,
  detail,
  icon,
  action,
}: {
  title: string;
  detail: string;
  icon: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="w-full max-w-xl rounded-[2rem] border border-white/70 bg-white/95 p-8 text-center text-slate-950 shadow-[0_24px_90px_rgba(0,15,30,0.3)] sm:p-12">
      <div className="text-4xl">{icon}</div>
      <h1 className="mt-5 text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">{detail}</p>
      {action}
    </section>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-full px-4 text-xs font-semibold transition ${active ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
    >
      {children}
    </button>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "sky";
}) {
  const colors = {
    amber: "bg-amber-50 text-amber-900",
    emerald: "bg-emerald-50 text-emerald-900",
    sky: "bg-sky-50 text-sky-900",
  };
  return (
    <span className={`rounded-full px-3 py-2 font-semibold ${colors[tone]}`}>
      {value} {label}
    </span>
  );
}

function StatusPill({ status, label }: { status: CandidateStatus; label: string }) {
  const colors: Record<CandidateStatus, string> = {
    pending: "bg-amber-50 text-amber-800",
    approved: "bg-emerald-50 text-emerald-800",
    rejected: "bg-rose-50 text-rose-800",
    needs_review: "bg-sky-50 text-sky-800",
    duplicate_candidate: "bg-violet-50 text-violet-800",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${colors[status]}`}>
      {label}
    </span>
  );
}

function EvidencePill({ level, label }: { level: EvidenceLevel; label: string }) {
  const colors: Record<EvidenceLevel, string> = {
    verified: "bg-emerald-100 text-emerald-800",
    strong: "bg-emerald-50 text-emerald-800",
    some: "bg-sky-50 text-sky-800",
    unknown: "bg-slate-200 text-slate-700",
    negative: "bg-rose-100 text-rose-800",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[0.7rem] font-semibold ${colors[level]}`}>
      {label}
    </span>
  );
}

function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      className="mt-3 inline-flex min-h-9 items-center rounded-full border border-sky-200 bg-sky-50 px-3 text-xs font-semibold text-sky-800 hover:bg-sky-100"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children} ↗
    </a>
  );
}

function Insight({
  title,
  text,
  icon,
  tone,
}: {
  title: string;
  text: string;
  icon: string;
  tone: "emerald" | "amber";
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${tone === "emerald" ? "border-emerald-100 bg-emerald-50/60" : "border-amber-100 bg-amber-50/70"}`}
    >
      <p className="font-semibold">
        {icon} {title}
      </p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
    </div>
  );
}

function Disclosure({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <details className="group rounded-2xl border border-slate-200 bg-white p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
        <span>{title}</span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
          {count}
        </span>
      </summary>
      <div className="mt-4 border-t border-slate-100 pt-4">{children}</div>
    </details>
  );
}

const founderCopy = {
  ar: {
    founderMode: "Focus by The Cousin — Founder Mode",
    title: "استوديو مراجعة الأماكن",
    subtitle: "مساحة خاصة لمراجعة البحث والأدلة قبل اعتماد أي مكان. لا يُنشر شيء تلقائيًا.",
    checkingAccess: "نتأكد من صلاحية المؤسس…",
    serverVerified: "يتم التحقق من الحساب عبر Supabase ومن الدور عبر RLS.",
    loadingQueue: "نحمّل قائمة المراجعة…",
    signInTitle: "دخول المؤسسين",
    signInDetail: "سجّل بحساب Supabase المعتمد. الحسابات العادية لا تستطيع رؤية بيانات البحث.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    signIn: "دخول آمن",
    signInError: "تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة ثانية.",
    deniedTitle: "الحساب ليس لديه صلاحية Founder",
    deniedDetail: "لم نعرض أي بيانات داخلية. يلزم تعيين دور founder أو admin من Supabase أولًا.",
    signOut: "تسجيل الخروج",
    setupNeeded: "مخطط Founder غير مطبق بعد أو تعذر قراءة الدور.",
    errorTitle: "تعذر فتح استوديو المؤسسين",
    loadError: "تعذر تحميل البيانات الخاصة الآن.",
    pending: "قيد المراجعة",
    approved: "معتمد",
    needsReview: "يحتاج مراجعة",
    all: "الكل",
    empty: "لا توجد أماكن ضمن هذا الفلتر.",
    city: { all: "كل المدن", riyadh: "الرياض", majmaah: "المجمعة" },
    status: {
      pending: "قيد المراجعة",
      approved: "معتمد",
      rejected: "مرفوض",
      needs_review: "يحتاج مراجعة",
      duplicate_candidate: "تكرار محتمل",
    },
    googleMaps: "Google Maps",
    instagram: "Instagram الرسمي",
    website: "الموقع الرسمي",
    internalOnly: "Focus Eligibility — داخلي فقط",
    confidence: "الثقة",
    confidenceValue: { high: "عالية", medium: "متوسطة", low: "منخفضة" },
    band: { strong: "مرشح قوي لـFocus", judgment: "يحتاج حكم بشري", weak: "ملاءمته ضعيفة حاليًا" },
    scoreMismatch: "مجموع الأدلة لا يطابق الدرجة المحفوظة — راجع البحث.",
    sources: "المصادر",
    visualSets: "أدلة بصرية",
    signals: "محاور",
    whyFit: "ليش قد يناسب Focus",
    concerns: "مخاوف محتملة",
    focusResearch: "بحث Focus",
    visualEvidence: "الصور / الدليل البصري",
    duplicateCheck: "فحص التكرار",
    noDuplicateNotes: "لا توجد ملاحظات تكرار.",
    attributionUnknown: "نسبة المصور غير متاحة؛ استخدم رابط المصدر.",
    openSourceImage: "فتح مرجع الصورة",
    inspectSource: "فحص المصدر",
    chooseReason: "اختر السبب عند الرفض أو طلب المراجعة",
    optionalNote: "ملاحظة اختيارية للمؤسسين",
    reasonRequired: "اختر سببًا قبل الرفض أو طلب مراجعة.",
    actionError: "تعذر حفظ القرار. لم تتغير حالة المكان.",
    approve: "اعتماد",
    needsReviewAction: "يحتاج مراجعة",
    reject: "رفض",
    noAutoPublish: "الاعتماد يسمح بمرحلة النشر التالية فقط؛ لا يُنشئ صفحة عامة تلقائيًا.",
    evidenceCategory: {
      seating: "🪑 الجلسات",
      study_laptop: "💻 المذاكرة واللابتوب",
      quietness: "🤫 الهدوء",
      wifi: "📶 الواي فاي",
      outlets: "🔌 الأفياش",
      parking_access: "🚗 المواقف والوصول",
      long_stay: "🕐 الجلسات الطويلة",
      environment: "✨ ملاءمة البيئة",
    },
    evidenceLevel: {
      verified: "متحقق",
      strong: "دليل قوي",
      some: "بعض الأدلة",
      unknown: "غير معروف",
      negative: "دليل سلبي",
    },
    reason: {
      not_focus_suitable: "غير مناسب للتركيز",
      duplicate: "مكرر",
      wrong_location: "الموقع خطأ",
      insufficient_evidence: "الأدلة غير كافية",
      closed: "مغلق",
      not_a_cafe: "ليس مقهى",
      ambiguous_branch: "الفرع غير واضح",
      conflicting_photos: "الصور متعارضة",
      conflicting_reviews: "المراجعات متعارضة",
      other: "سبب آخر",
    },
  },
  en: {
    founderMode: "Focus by The Cousin — Founder Mode",
    title: "Venue Review Studio",
    subtitle:
      "A private workspace for reviewing research and evidence before any venue is approved. Nothing publishes automatically.",
    checkingAccess: "Verifying founder access…",
    serverVerified: "The account is verified through Supabase and the role is enforced by RLS.",
    loadingQueue: "Loading the review queue…",
    signInTitle: "Founder sign in",
    signInDetail: "Use an approved Supabase account. Regular users cannot see research data.",
    email: "Email",
    password: "Password",
    signIn: "Secure sign in",
    signInError: "Sign in failed. Check your details and try again.",
    deniedTitle: "This account does not have Founder access",
    deniedDetail:
      "No internal data was shown. A founder or admin role must be assigned in Supabase first.",
    signOut: "Sign out",
    setupNeeded: "The Founder schema is not applied yet or the role could not be read.",
    errorTitle: "Founder Studio is unavailable",
    loadError: "Private venue data could not be loaded right now.",
    pending: "Pending",
    approved: "Approved",
    needsReview: "Needs review",
    all: "All",
    empty: "No venues match this filter.",
    city: { all: "All cities", riyadh: "Riyadh", majmaah: "Al Majma’ah" },
    status: {
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      needs_review: "Needs review",
      duplicate_candidate: "Possible duplicate",
    },
    googleMaps: "Google Maps",
    instagram: "Official Instagram",
    website: "Official website",
    internalOnly: "Focus Eligibility — internal only",
    confidence: "Confidence",
    confidenceValue: { high: "High", medium: "Medium", low: "Low" },
    band: {
      strong: "Strong Focus candidate",
      judgment: "Needs human judgment",
      weak: "Currently a weak fit",
    },
    scoreMismatch: "The evidence total does not match the stored score — review the research.",
    sources: "Sources",
    visualSets: "Visual evidence",
    signals: "Signals",
    whyFit: "Why it may fit Focus",
    concerns: "Possible concerns",
    focusResearch: "Focus research",
    visualEvidence: "Photos / visual evidence",
    duplicateCheck: "Duplicate check",
    noDuplicateNotes: "No duplicate notes.",
    attributionUnknown: "Photographer attribution was unavailable; use the source link.",
    openSourceImage: "Open image source",
    inspectSource: "Inspect source",
    chooseReason: "Choose a reason for reject / needs review",
    optionalNote: "Optional founder note",
    reasonRequired: "Choose a reason before rejecting or requesting review.",
    actionError: "The decision could not be saved. No status changed.",
    approve: "Approve",
    needsReviewAction: "Needs review",
    reject: "Reject",
    noAutoPublish:
      "Approval only unlocks the next publication step; it never creates a public page automatically.",
    evidenceCategory: {
      seating: "🪑 Seating",
      study_laptop: "💻 Study & laptop",
      quietness: "🤫 Quietness",
      wifi: "📶 Wi-Fi",
      outlets: "🔌 Outlets",
      parking_access: "🚗 Parking & access",
      long_stay: "🕐 Long stay",
      environment: "✨ Environment fit",
    },
    evidenceLevel: {
      verified: "Verified",
      strong: "Strong evidence",
      some: "Some evidence",
      unknown: "Unknown",
      negative: "Negative evidence",
    },
    reason: {
      not_focus_suitable: "Not Focus suitable",
      duplicate: "Duplicate",
      wrong_location: "Wrong location",
      insufficient_evidence: "Insufficient evidence",
      closed: "Closed",
      not_a_cafe: "Not a café",
      ambiguous_branch: "Ambiguous branch",
      conflicting_photos: "Conflicting photos",
      conflicting_reviews: "Conflicting reviews",
      other: "Other",
    },
  },
} as const;
