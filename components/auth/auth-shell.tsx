import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";

interface AuthShellProps {
  kicker?: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footerText: string;
  footerCta: string;
  footerHref: string;
}

export function AuthShell({
  kicker = "Authentication",
  title,
  description,
  children,
  footerText,
  footerCta,
  footerHref
}: AuthShellProps) {
  return (
    <main className="page-shell grid min-h-screen items-center py-10">
      <section className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-2">
        <article className="premium-panel p-8">
          <div className="flex items-center justify-between">
            <Logo />
            <ThemeToggle />
          </div>
          <p className="premium-page-kicker mt-8">{kicker}</p>
          <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-secondary">{description}</p>
          <div className="mt-6">{children}</div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="auth-highlight">Secure auth flow</div>
            <div className="auth-highlight">Multilingual workspace</div>
          </div>
          <p className="mt-6 text-sm text-secondary">
            {footerText}{" "}
            <Link href={footerHref} className="text-accent hover:text-accent-hover">
              {footerCta}
            </Link>
          </p>
        </article>
        <article className="premium-panel hidden p-8 lg:block">
          <p className="premium-page-kicker">Why Sysnova AI</p>
          <h2 className="mt-2 text-2xl font-semibold">
            Premium AI for business execution and Tunisian intelligence
          </h2>
          <ul className="mt-6 space-y-3 text-sm text-secondary">
            <li className="premium-list-item">
              Multilingual outputs in Darija, Arabic, French, and English
            </li>
            <li className="premium-list-item">
              Product-aware and knowledge-grounded response generation
            </li>
            <li className="premium-list-item">
              Developer API for scalable internal and customer workflows
            </li>
          </ul>
        </article>
      </section>
    </main>
  );
}
