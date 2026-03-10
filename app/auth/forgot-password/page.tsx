import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

export default async function ForgotPasswordPage() {
  const locale = await getServerLocale();

  return (
    <AuthShell
      kicker={t(locale, "auth.kicker", "Authentication")}
      title={t(locale, "auth.forgotTitle", "Reset password")}
      description={t(
        locale,
        "auth.forgotDescription",
        "Password recovery is available as an MVP placeholder."
      )}
      footerText="Remember your password?"
      footerCta="Sign in"
      footerHref="/auth/login"
    >
      <form className="space-y-4">
        <div>
          <label className="premium-form-label">Email</label>
          <Input type="email" placeholder="you@company.com" />
        </div>
        <Button className="w-full">Send reset link</Button>
      </form>
    </AuthShell>
  );
}
