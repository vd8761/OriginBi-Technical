import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/contexts/ThemeContext";
import { SessionProvider } from "@/lib/contexts/SessionContext";
import { PaymentProvider } from "@/lib/payments";
import { CachePruner } from "@/components/CachePruner";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "OriginBI Technical Assessment",
  description: "Technical assessment platform for candidates.",
};

import { DataHydrationProvider } from "@/lib/contexts/DataHydrationContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${jetbrainsMono.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('theme');
                  if (stored === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else if (stored === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else {
                    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                      document.documentElement.classList.add('dark');
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className="antialiased min-h-full flex flex-col"
      >
        <SessionProvider>
          <PaymentProvider>
            <DataHydrationProvider>
              <ThemeProvider>
                <CachePruner />
                {children}
              </ThemeProvider>
            </DataHydrationProvider>
          </PaymentProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

