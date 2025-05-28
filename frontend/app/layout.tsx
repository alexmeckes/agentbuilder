import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Any-Agent Workflow Composer",
  description: "AI-powered workflow automation platform",
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
