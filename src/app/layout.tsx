import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "WORKOUT", template: "%s · WORKOUT" },
  description:
    "Planification, suivi des séances, nutrition et progression sur un programme de 12 semaines.",
  applicationName: "WORKOUT",
  appleWebApp: { capable: true, title: "WORKOUT", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#121315",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
