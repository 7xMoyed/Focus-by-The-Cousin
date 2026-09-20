import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy | Focus by The Cousin" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-16 text-white">
      <h1 className="text-3xl font-semibold">Privacy · الخصوصية</h1>
      <div className="mt-8 space-y-5 text-sm leading-8 text-white/80">
        <p>
          Focus uses Supabase to manage accounts and keep your discovery preferences. Saved places
          on this device are stored in your browser. Contact messages are sent only when you submit
          the contact form.
        </p>
        <p>
          When place photos are available, Focus requests them from Google Places. Google may
          receive your browser request for the displayed image. Focus does not permanently host
          Google place photos. See{" "}
          <a
            className="underline"
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noreferrer"
          >
            Google Privacy Policy
          </a>
          .
        </p>
        <p>
          يستخدم Focus خدمة Supabase للحسابات وتفضيلات البحث. تُحفظ الأماكن التي تختارها على هذا
          الجهاز داخل المتصفح. عند عرض صور الأماكن، تُجلب من Google Places ولا تُخزّن كنسخ دائمة لدى
          Focus.
        </p>
      </div>
    </main>
  );
}
