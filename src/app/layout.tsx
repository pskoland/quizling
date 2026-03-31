import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "QUIZLING",
  description: "Kunnskap er makt, men bløff gjør samme nytte",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body className="font-['Space_Mono'] min-h-dvh flex items-center justify-center">
        <div className="w-full">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
