import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — 75 Hard Tracker',
};

const pixel = { fontFamily: '"Press Start 2P", monospace' } as React.CSSProperties;

export default function TermsPage() {
  return (
    <main id="main-content" style={{ padding: '24px 20px 120px', maxWidth: 480, margin: '0 auto' }}>
      <Link
        href="/today"
        style={{ ...pixel, fontSize: '7px', color: 'var(--text-muted)', display: 'inline-block', marginBottom: 24 }}
        aria-label="Back to app"
      >
        ← BACK
      </Link>

      <h1 style={{ ...pixel, fontSize: '10px', color: 'var(--accent)', marginBottom: 8 }}>TERMS OF SERVICE</h1>
      <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: 'var(--text-muted)', marginBottom: 32 }}>
        Last updated: May 31, 2025
      </p>

      {[
        {
          title: '1. ACCEPTANCE',
          body: `By accessing or using 75 Hard Tracker ("the App") you agree to be bound by these Terms. If you do not agree, do not use the App.`,
        },
        {
          title: '2. USE OF THE APP',
          body: `The App is a personal fitness challenge tracker. You must be at least 13 years old to use it. You agree to provide accurate information, keep your credentials secure, and not use the App for any unlawful purpose.`,
        },
        {
          title: '3. ACCOUNTS',
          body: `You are responsible for all activity under your account. Notify us immediately at eli.patrick.manning@gmail.com if you suspect unauthorized access.`,
        },
        {
          title: '4. INTELLECTUAL PROPERTY',
          body: `The App's code, design, and content are owned by Eli Manning. You may not copy, modify, distribute, or reverse-engineer any part of the App without written permission.`,
        },
        {
          title: '5. USER CONTENT',
          body: `You retain ownership of the data you enter (task names, progress logs). By saving data to the App you grant us a limited license to store and display it to operate the service. We do not claim ownership of your personal data.`,
        },
        {
          title: '6. DISCLAIMER OF WARRANTIES',
          body: `THE APP IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. WE DO NOT WARRANT THAT THE APP WILL BE ERROR-FREE, UNINTERRUPTED, OR FREE OF HARMFUL COMPONENTS.`,
        },
        {
          title: '7. LIMITATION OF LIABILITY',
          body: `TO THE MAXIMUM EXTENT PERMITTED BY LAW, ELI MANNING SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP.`,
        },
        {
          title: '8. TERMINATION',
          body: `We reserve the right to suspend or terminate your account if you violate these Terms.`,
        },
        {
          title: '9. GOVERNING LAW',
          body: `These Terms are governed by the laws of the State of California, USA.`,
        },
        {
          title: '10. CHANGES',
          body: `We may modify these Terms at any time. Continued use after changes constitutes acceptance.`,
        },
        {
          title: '11. CONTACT',
          body: `eli.patrick.manning@gmail.com`,
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
        <Link href="/privacy" style={{ ...pixel, fontSize: '7px', color: 'var(--accent)' }}>
          VIEW PRIVACY POLICY →
        </Link>
      </div>
    </main>
  );
}
