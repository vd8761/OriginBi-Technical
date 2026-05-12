import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { SessionProvider } from "@/lib/contexts/SessionContext";
import { PaymentProvider } from "@/lib/payments";
import { CachePruner } from "@/components/CachePruner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

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
        className={`${geistSans.variable} ${geistMono.variable} ${jakarta.variable} antialiased min-h-full flex flex-col`}
      >
        <SessionProvider>
          <PaymentProvider>
            <ThemeProvider>
              <CachePruner />
              {children}
            </ThemeProvider>
          </PaymentProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

