import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Suncore OS",
  description: "Solar operations CRM and workflow portal for Suncore Solar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
