import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { getSession } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en">
      <body className={`${inter.className} flex min-h-screen bg-gray-50 text-gray-900 print:block print:bg-white print:min-h-0`}>
        {session && <Sidebar user={session} />}
        <main className="flex-1 overflow-auto print:overflow-visible">
          {children}
        </main>
      </body>
    </html>
  );
}
