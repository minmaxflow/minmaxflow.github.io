import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blog",
  description: "Minimal thoughts on software and life.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
