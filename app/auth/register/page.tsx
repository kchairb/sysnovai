import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function RegisterPage() {
  const locale = await getServerLocale();

  return (
    <AuthShell
      kicker={t(locale, "auth.kicker", "Authentication")}
      title={t(locale, "auth.registerTitle", "Create your workspace")}
      description={t(
        locale,
        "auth.registerDescription",
        "Start building your premium AI operations with Sysnova AI."
      )}
      footerText="Already have an account?"
      footerCta="Sign in"
      footerHref="/auth/login"
    >
      <RegisterForm />
    </AuthShell>
  );
}
