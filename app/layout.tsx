import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resume ↔ JD Analyzer",
  description: "Analyze your resume against job descriptions with AI-powered insights",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
