import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/features/auth/components/Providers";

export const metadata: Metadata = {
  title: "OsciPharm – Catalog",
  description: "Browse OsciPharm's full catalog of medicines, staples, and household items, with branch-specific pricing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-bg text-fg">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
