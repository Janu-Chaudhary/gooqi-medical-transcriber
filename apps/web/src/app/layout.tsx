import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gooqi Health Transcriber",
  description: "Clinical consultation transcription and note generation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
