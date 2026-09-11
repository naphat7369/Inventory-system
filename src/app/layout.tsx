import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { getSession } from "@/lib/auth";
import { ThemeProvider } from "@/app/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Asset & Inventory Management",
  description: "Enterprise Asset Management System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable} flex flex-col md:flex-row min-h-screen bg-bg text-text print:block print:bg-white dark:bg-slate-900 print:min-h-0`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {session && <Sidebar user={session} />}
          <main className="flex-1 w-full overflow-x-hidden overflow-y-auto print:overflow-visible">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
