import type { Metadata } from "next";
import "./globals.css";
import dynamic from "next/dynamic";

const WelcomeBanner = dynamic(() => import("./components/WelcomeBanner"), { ssr: false });

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
        <WelcomeBanner />
        {children}
      </body>
    </html>
  );
}
