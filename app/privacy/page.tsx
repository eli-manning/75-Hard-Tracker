import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — 75 Hard Tracker',
};

const pixel = { fontFamily: '"Press Start 2P", monospace' } as React.CSSProperties;
const vt = { fontFamily: '"VT323", monospace' } as React.CSSProperties;

export default function PrivacyPage() {
  return (
    <main id="main-content" style={{ padding: '24px 20px 120px', maxWidth: 480, margin: '0 auto' }}>
      <Link
        href="/today"
        style={{ ...pixel, fontSize: '7px', color: 'var(--text-muted)', display: 'inline-block', marginBottom: 24 }}
        aria-label="Back to app"
      >
        ← BACK
      </Link>

      <h1 style={{ ...pixel, fontSize: '10px', color: 'var(--accent)', marginBottom: 8 }}>PRIVACY POLICY</h1>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginBottom: 32 }}>
        Last updated: May 31, 2025
      </p>

      {[
        {
          title: '1. WHAT WE COLLECT',
          body: `When you create an account we collect your email address, display name, and a profile avatar URL. We store your 75 Hard challenge progress (daily task completions, streak counts, start date, and any custom tasks you create) in Firebase Firestore. We do not collect payment information, location data, or any other sensitive personal data.`,
        },
        {
          title: '2. HOW WE USE IT',
          body: `Your data is used solely to operate the app — to display your progress, sync it across devices, and let other users on the same challenge see aggregate leaderboard data. We never sell, rent, or share your personal information with third parties for marketing purposes.`,
        },
        {
          title: '3. FIREBASE & GOOGLE SERVICES',
          body: `This app is built on Google Firebase (Authentication, Firestore). Firebase may collect diagnostic and usage data per Google's Privacy Policy (policies.google.com/privacy). We use Google Fonts which may log the request IP to Google's servers. By using this app you acknowledge these third-party services.`,
        },
        {
          title: '4. COOKIES & LOCAL STORAGE',
          body: `Firebase Auth stores a session token in your browser's localStorage/IndexedDB to keep you signed in. We do not use third-party advertising cookies. You may decline cookies via the banner, but authentication functionality will not work without session storage.`,
        },
        {
          title: '5. DATA RETENTION',
          body: `Your data is retained as long as your account exists. You may request deletion by emailing eli.patrick.manning@gmail.com — we will delete your Firestore records and Firebase Auth account within 30 days.`,
        },
        {
          title: '6. YOUR RIGHTS (GDPR / CCPA)',
          body: `You have the right to access, correct, port, or delete your personal data. California residents may also request disclosure of data we share. To exercise any of these rights, email eli.patrick.manning@gmail.com.`,
        },
        {
          title: '7. CHILDREN',
          body: `This app is not directed at children under 13. We do not knowingly collect data from children under 13. If you believe a child has provided us data, contact us and we will delete it promptly.`,
        },
        {
          title: '8. CHANGES',
          body: `We may update this policy. Continued use of the app after changes constitutes acceptance of the updated policy.`,
        },
        {
          title: '9. CONTACT',
          body: `Questions? Email eli.patrick.manning@gmail.com`,
        },
      ].map(({ title, body }) => (
        <section key={title} style={{ marginBottom: 28 }}>
          <h2 style={{ ...pixel, fontSize: '7px', color: 'var(--text)', marginBottom: 10 }}>{title}</h2>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: 'var(--text-muted)', lineHeight: 1.7 }}>
            {body}
          </p>
        </section>
      ))}

      <div style={{ marginTop: 32, paddingTop: 16, borderTop: '2px solid var(--border)' }}>
        <Link href="/terms" style={{ ...pixel, fontSize: '7px', color: 'var(--accent)' }}>
          VIEW TERMS OF SERVICE →
        </Link>
      </div>
    </main>
  );
}
