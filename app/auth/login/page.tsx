import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function LoginPage() {
  const locale = await getServerLocale();

  return (
    <AuthShell
      kicker={t(locale, "auth.kicker", "Authentication")}
      title={t(locale, "auth.loginTitle", "Welcome back")}
      description={t(locale, "auth.loginDescription", "Sign in to your Sysnova AI workspace.")}
      footerText="New to Sysnova AI?"
      footerCta="Create account"
      footerHref="/auth/register"
    >
      <LoginForm />
    </AuthShell>
  );
}
