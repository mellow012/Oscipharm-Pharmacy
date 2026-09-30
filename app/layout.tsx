import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/features/auth/components/Providers";

export const metadata: Metadata = {
  title: "OsciPharm – pharmacy",
  description: "Good Health, Good Chemistry. Browse OsciPharm's catalog of medicines, staples, and health products, with product details, availability, and pricing.",
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
