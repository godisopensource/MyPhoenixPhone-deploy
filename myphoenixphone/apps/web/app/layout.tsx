import type { Metadata } from "next";
import Script from "next/script";
import "boosted/dist/css/boosted.min.css";
import "boosted/dist/css/orange-helvetica.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyPhoenixPhone - Secure Number Verification",
  description: "Verify your phone number with Orange for secure services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {children}
        <Script src="https://cdn.jsdelivr.net/npm/boosted@5.3.7/dist/js/boosted.bundle.min.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
