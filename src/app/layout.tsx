import type { Metadata } from "next";
import "./globals.css";
import { HoneycombPattern } from "@/components/ui/honeycomb-pattern";

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
      <body>
        <HoneycombPattern className="min-h-screen">
          {children}
        </HoneycombPattern>
      </body>
    </html>
  );
}
