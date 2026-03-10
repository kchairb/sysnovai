import { AuthShell } from "@/components/auth/auth-shell";
import { InviteAcceptForm } from "@/components/auth/invite-accept-form";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function InvitePage() {
  const locale = await getServerLocale();

  return (
    <AuthShell
      kicker={t(locale, "auth.kicker", "Authentication")}
      title="You are invited to Sysnova AI"
      description="Set your password to join the workspace and continue to dashboard."
      footerText="Already have an account?"
      footerCta="Sign in"
      footerHref="/auth/login"
    >
      <InviteAcceptForm />
    </AuthShell>
  );
}
