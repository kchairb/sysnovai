import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { getLocaleDirection } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { getServerTheme } from "@/lib/theme-server";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Sysnova AI",
  description:
    "Premium AI platform for modern businesses and Tunisian users. Knowledge, communication, automation, and local intelligence."
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getServerLocale();
  const theme = await getServerTheme();
  const direction = getLocaleDirection(locale);

  return (
    <html lang={locale} dir={direction} className={theme === "dark" ? "dark" : ""} suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} font-sans`}>
        <ThemeProvider initialTheme={theme}>
          <LocaleProvider locale={locale}>{children}</LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
