import { LegalPageShell, LegalSection } from "./legal-page-shell"
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal"

/**
 * Privacy Policy content.
 *
 * Every data claim here is grounded in src/db/schema.ts. Three things a generic template would
 * get wrong and that must stay accurate:
 *   1. Sessions store IP address and user agent.
 *   2. Task text is free-form user content, not structured data.
 *   3. Admin-email holders can read every user and hive and reset any password.
 *
 * Sentry is NOT integrated yet (Phase 16). Do not claim otherwise here — the wording below is
 * deliberately forward-looking, and LEGAL-04 rewrites it once PII scrubbing is configured.
 */
export function PrivacyPolicy() {
  return (
    <LegalPageShell title="Privacy Policy">
      <p>
        Honey_Do is a small, free app for households to share chores. This page explains exactly
        what it stores, who can see it, and how to get it deleted. It is written to describe what
        the app actually does rather than to cover every possibility.
      </p>

      <LegalSection heading="What we collect">
        <p>When you create an account, we store:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Your <strong>name</strong> and <strong>email address</strong>.</li>
          <li>
            Your <strong>password</strong>, stored only as a cryptographic hash. We never store or
            have access to your password in plain text.
          </li>
        </ul>

        <p>When you are signed in, each session record also stores:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            Your <strong>IP address</strong> and <strong>browser user agent</strong>, along with a
            session token and its expiry.
          </li>
        </ul>

        <p>As you use the app, we store:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Hive names, your membership, your honey count, and when you joined.</li>
          <li>
            <strong>Task text</strong> — up to 160 characters of free-form text that you or another
            member of your Hive types. This content is not reviewed or filtered, so please do not
            put sensitive personal information in a task.
          </li>
          <li>Task honey values, status, who created and was assigned each task, and completion times.</li>
          <li>Invite links, including who created an invite and who used it.</li>
        </ul>

        <p>
          We do not use advertising trackers or third-party analytics, and we do not sell your data.
          The only cookie we set is the one required to keep you signed in.
        </p>
      </LegalSection>

      <LegalSection heading="Who can see your data">
        <p>
          Other members of your Hive can see your name, your honey count, and the tasks shared
          within that Hive.
        </p>
        <p>
          <strong>Administrators.</strong> Honey_Do has an administrator role, granted to a short
          list of email addresses configured by the operator. Administrators can view a list of all
          registered users and all hives, and can reset any user&apos;s password. We are telling you
          this plainly because it is a real path to your account.
        </p>
      </LegalSection>

      <LegalSection heading="Services we rely on">
        <p>Honey_Do runs on infrastructure operated by other companies, which necessarily process your data:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Vercel</strong> — hosts the application and serves every request, so it
            processes traffic data including IP addresses.
          </li>
          <li>
            <strong>Neon</strong> — hosts the PostgreSQL database where everything described above
            is stored.
          </li>
        </ul>
        <p>
          We may in future add an error-tracking service to help diagnose crashes. If and when we
          do, we will name it here and describe what it receives before it is switched on.
        </p>
      </LegalSection>

      <LegalSection heading="How long we keep it, and how to delete it">
        <p>
          We keep your account and Hive data for as long as your account exists. Session records
          expire on their own.
        </p>
        <p>
          <strong>There is currently no self-serve &ldquo;delete my account&rdquo; button.</strong>{" "}
          To have your account and associated data deleted, email{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-amber-700 hover:underline">
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          and we will remove it manually. Tasks you created may remain visible to your Hive if they
          are part of another member&apos;s history, though they will no longer be linked to your
          account.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>
          Honey_Do is not directed at children under 13, and we do not knowingly collect their
          information. If you believe a child has created an account, contact us and we will remove
          it.
        </p>
      </LegalSection>

      <LegalSection heading="Changes and contact">
        <p>
          If this policy changes, the &ldquo;last updated&rdquo; date at the top will change with
          it. For any question about your data, email{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-amber-700 hover:underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}
