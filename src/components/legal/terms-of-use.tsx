import { LegalPageShell, LegalSection } from "./legal-page-shell"
import { LEGAL_CONTACT_EMAIL } from "@/lib/legal"

/**
 * Terms of Use content.
 *
 * Deliberately contains NO governing-law or dispute-resolution clause. Honey_Do is a free app
 * with no payments and no commercial relationship; naming the wrong jurisdiction would be worse
 * than naming none. Add one if the app ever monetizes.
 */
export function TermsOfUse() {
  return (
    <LegalPageShell title="Terms of Use">
      <p>
        These terms cover your use of Honey_Do. They are intentionally short, because Honey_Do is a
        free app for households and not a commercial service. By creating an account you agree to
        them.
      </p>

      <LegalSection heading="What Honey_Do is">
        <p>
          Honey_Do is a free, gamified task app for households. You create a Hive, invite the people
          you live with, assign each other tasks, and earn points (&ldquo;honeys&rdquo;) for
          completing them. There is no paid tier and nothing to buy.
        </p>
      </LegalSection>

      <LegalSection heading="Your account">
        <p>
          Use a real email address you control — it is how we would reach you, and it is the
          address we verify deletion requests against. Keep your password to yourself. You are
          responsible for what happens under your account.
        </p>
        <p>
          You must be 13 or older to create an account.
        </p>
      </LegalSection>

      <LegalSection heading="Acceptable use">
        <p>
          Task text is free-form and is <strong>not moderated or filtered</strong>. Do not use it
          to harass anyone, to post unlawful content, or to store other people&apos;s personal
          information. Do not attempt to access Hives or accounts that are not yours, and do not
          try to disrupt the service for others.
        </p>
        <p>
          Accounts or Hives used this way may be suspended or removed.
        </p>
      </LegalSection>

      <LegalSection heading="No warranty, no guarantees">
        <p>
          Honey_Do is provided <strong>as is</strong>. There is no uptime guarantee, no guarantee
          that your data will not be lost, and no warranty of any kind. It is a hobby project run
          on a small budget — please do not rely on it for anything important, and keep your own
          copy of anything you would be upset to lose.
        </p>
        <p>
          To the extent permitted by law, we are not liable for any loss arising from your use of
          the app.
        </p>
      </LegalSection>

      <LegalSection heading="Ending your use">
        <p>
          You can stop using Honey_Do at any time. To have your account deleted, email us — see the{" "}
          <a href="/privacy" className="text-amber-700 hover:underline">
            Privacy Policy
          </a>{" "}
          for what deletion covers. We may discontinue the service entirely, and would try to give
          notice before doing so.
        </p>
      </LegalSection>

      <LegalSection heading="Changes and contact">
        <p>
          If these terms change, the &ldquo;last updated&rdquo; date at the top will change with
          them. Continuing to use Honey_Do after that means you accept the revised terms. Questions
          go to{" "}
          <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-amber-700 hover:underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageShell>
  )
}
