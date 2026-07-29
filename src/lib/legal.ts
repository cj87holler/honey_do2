/**
 * Shared constants for the public legal pages (/privacy, /terms).
 *
 * The contact address lives here rather than inline in each page because it is expected to
 * change once Honey_Do has a custom domain — at which point this is the only line to edit.
 */

/**
 * Where privacy questions and account-deletion requests go.
 *
 * There is no in-app delete-account feature, so this mailbox is the ONLY route a user has to
 * request deletion. It must be a real, monitored inbox before these pages are shown to real users.
 */
export const LEGAL_CONTACT_EMAIL = "honeydoapp@gmail.com"

/** Shown on both pages. Bump when the substance of either document changes. */
export const LEGAL_LAST_UPDATED = "July 28, 2026"
