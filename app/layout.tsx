import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pharmacy Catalog – Find Products by Category",
  description: "Browse our pharmacy's full catalog of medicines, staples, and household items, with branch‑specific pricing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-bg text-fg">{children}</body>
    </html>
  );
}
