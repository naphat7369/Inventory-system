import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono, Sarabun } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { getSession } from "@/lib/auth";
import { ThemeProvider } from "@/app/components/ThemeProvider";
import { ExtensionCleaner } from "@/app/components/ExtensionCleaner";
import prisma from "@/lib/prisma";
import { SESSION_IDLE_TIMEOUT_SECONDS } from "@/lib/auth";
import { IdleSessionManager } from "@/app/components/IdleSessionManager";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-display" });
const jetBrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
const sarabun = Sarabun({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-sarabun",
  display: "swap",
});

export const metadata: Metadata = {
  title: "E-Approve System",
  description: "Enterprise Asset Management System",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const approvalProfile = session?.id ? await prisma.user.findUnique({
    where: { id: String(session.id) },
    select: { isApprover: true, _count: { select: { approvalSteps: { where: { status: 'PENDING' } } } } },
  }) : null;
  const sidebarUser = session ? {
    ...session,
    isApprover: approvalProfile?.isApprover ?? false,
    pendingApprovalCount: approvalProfile?._count.approvalSteps ?? 0,
  } : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable} ${jetBrainsMono.variable} ${sarabun.variable} min-h-screen bg-bg text-text print:block print:bg-white dark:bg-slate-900 print:min-h-0`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ExtensionCleaner />
          {session?.id ? <IdleSessionManager userId={String(session.id)} sessionStartedAt={Number(session.iat ?? 0) * 1000} timeoutSeconds={SESSION_IDLE_TIMEOUT_SECONDS} /> : null}
          <div className="flex flex-col md:flex-row min-h-screen w-full print:block print:min-h-0 print:w-auto print:m-0 print:p-0">
            {sidebarUser && <Sidebar user={sidebarUser} />}
            <main className="flex-1 w-full overflow-x-hidden overflow-y-auto print:overflow-visible print:w-auto print:m-0 print:p-0">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
