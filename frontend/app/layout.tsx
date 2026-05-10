import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";

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
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
