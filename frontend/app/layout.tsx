import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { SessionProvider } from "@/lib/contexts/SessionContext";
import { CachePruner } from "@/components/CachePruner";

export const metadata: Metadata = {
  title: "OriginBI Technical Assessment",
  description: "Technical assessment platform for candidates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="antialiased min-h-full flex flex-col"
      >
        <SessionProvider>
          <ThemeProvider>
            <CachePruner />
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
