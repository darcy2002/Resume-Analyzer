import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Resume × JD Analyzer",
  description:
    "Find what's missing in your resume before the recruiter does. Free AI-powered match score, keyword gaps, bullet rewrites, and cover letter.",
  openGraph: {
    title: "Resume × JD Analyzer",
    description: "Find what's missing before the recruiter does.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Resume × JD Analyzer",
    description: "Find what's missing before the recruiter does.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${instrumentSerif.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <div className="dot-grid-bg" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
