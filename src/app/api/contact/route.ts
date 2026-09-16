import { Resend } from "resend";

import { PUBLIC_CONTACT_EMAIL } from "@/lib/site";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ContactPayload = {
  name?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  website?: unknown;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 20_000) {
    return Response.json({ error: "Message is too large." }, { status: 413 });
  }

  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = cleanString(payload.name);
  const email = cleanString(payload.email).toLowerCase();
  const subject = cleanString(payload.subject);
  const message = cleanString(payload.message);
  const honeypot = cleanString(payload.website);

  if (honeypot) {
    return Response.json({ ok: true });
  }

  if (
    name.length < 2 ||
    name.length > 80 ||
    !emailPattern.test(email) ||
    email.length > 254 ||
    subject.length > 120 ||
    message.length < 10 ||
    message.length > 2_000
  ) {
    return Response.json({ error: "Check the contact form fields." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    return Response.json({ error: "Email delivery is not configured." }, { status: 503 });
  }

  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message).replaceAll("\n", "<br />");
  const safeSubject = subject.replace(/[\r\n]+/g, " ").slice(0, 120);
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: PUBLIC_CONTACT_EMAIL,
    replyTo: email,
    subject: `[Focus contact] ${safeSubject || "New message"}`,
    text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
    html: `<p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p><hr /><p>${safeMessage}</p>`,
  });

  if (error) {
    return Response.json({ error: "Email delivery failed." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
