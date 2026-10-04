import type { Metadata } from "next";
import type { ReactNode } from "react";
import { appFontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Leaf Doctor",
  description: "A coffee farmer texts a description of a sick leaf and reaches a verified person within a day.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${appFontVariables} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
