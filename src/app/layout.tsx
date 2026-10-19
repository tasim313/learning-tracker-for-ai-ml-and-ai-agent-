import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Learning Tracker", template: "%s · Learning Tracker" },
  description: "An evidence-based learning platform for AI, machine learning, and AI agent engineering."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
