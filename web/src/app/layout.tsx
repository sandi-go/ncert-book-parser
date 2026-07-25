import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NCERT Book Reader",
  description: "Rebuild NCERT chapters from Marker-parsed JSON",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
