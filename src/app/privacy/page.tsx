import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy | Focus by The Cousin" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-2xl px-5 py-16 text-foreground">
      <h1 className="text-3xl font-semibold">Privacy · الخصوصية</h1>
      <div className="mt-8 space-y-5 text-sm leading-8 text-muted-foreground">
        <p>
          Focus uses Supabase to manage accounts, saved places and discovery preferences. Before
          sign-in, your current session, theme and saved places stay in this browser and are merged
          with your account after sign-in. Focus does not use your IP address as an identity or a
          personalization key. Vercel and Supabase may retain operational security logs under their
          own policies. Contact messages are sent only when you submit the contact form.
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
          يستخدم Focus خدمة Supabase للحسابات والأماكن المحفوظة وتفضيلات البحث. قبل تسجيل الدخول،
          تبقى جلستك والثيم والأماكن المحفوظة داخل متصفحك، ثم تُدمج مع حسابك بعد الدخول. لا يستخدم
          Focus عنوان IP كهوية للمستخدم أو وسيلة للتخصيص. قد تحتفظ Vercel وSupabase بسجلات تشغيلية
          وأمنية وفق سياساتهما. عند عرض صور الأماكن، تُجلب من Google Places ولا تُخزّن كنسخ دائمة
          لدى Focus.
        </p>
      </div>
    </main>
  );
}
