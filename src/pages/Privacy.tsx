export default function PrivacyPolicy() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-neutral-800">
      <h1 className="mb-2 text-3xl font-bold">Privacy Policy for ShiftedTone</h1>
      <p className="mb-6 text-sm text-neutral-500">Effective: September 28, 2026</p>

      <section className="space-y-6 text-sm leading-relaxed">
        <div>
          <h2 className="mb-2 text-xl font-semibold">1. What we collect</h2>
          <p>
            ShiftedTone stores account details, practice scores, streaks,
            reframes, and other progress data needed to run the app.
          </p>
          <p>
            Your microphone recordings stay on your device unless you
            intentionally export or share them through a separate tool.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">2. How we use it</h2>
          <p>
            We use stored data to power your dashboard, save your history,
            personalize coaching, and improve reliability and security.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">3. Analytics and diagnostics</h2>
          <p>
            When configured, ShiftedTone may send privacy-respecting analytics
            events and error diagnostics to help understand usage and fix
            failures. These integrations are optional and no-op when
            unconfigured.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">4. Data retention and deletion</h2>
          <p>
            You can request deletion by using the in-app account deletion
            control. Deleting your account removes your stored app data and
            linked authentication records from this project.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold">5. Contact</h2>
          <p>
            If you operate this app in production, provide a support contact or
            policy mailbox before launch so users know where to send privacy
            requests.
          </p>
        </div>
      </section>
    </main>
  );
}
