import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Honey Do",
  description: "Gamified task management for households",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
