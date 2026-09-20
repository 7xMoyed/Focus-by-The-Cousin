import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms | Focus by The Cousin" };

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-16 text-white">
      <h1 className="text-3xl font-semibold">Terms · الشروط</h1>
      <div className="mt-8 space-y-5 text-sm leading-8 text-white/80">
        <p>
          Focus helps you compare potential places for study and work. Venue details and opening
          hours can change, so confirm important information with the venue before visiting.
          Research signals are separate from Focus community scores.
        </p>
        <p>
          Google Maps and Google Places content shown here remains subject to the{" "}
          <a
            className="underline"
            href="https://www.google.com/help/terms_maps/"
            target="_blank"
            rel="noreferrer"
          >
            Google Maps/Google Earth Additional Terms
          </a>{" "}
          and{" "}
          <a
            className="underline"
            href="https://policies.google.com/terms"
            target="_blank"
            rel="noreferrer"
          >
            Google Terms of Service
          </a>
          . Photo authors and source links are displayed with the content.
        </p>
        <p>
          Focus يساعدك تقارن أماكن المذاكرة والعمل. تفاصيل الأماكن وساعات العمل قد تتغير، فتأكد من
          المعلومات المهمة قبل الزيارة. إشارات البحث الأولية ليست تقييمات من مجتمع Focus.
        </p>
      </div>
    </main>
  );
}
