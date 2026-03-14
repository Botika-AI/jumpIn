import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-montserrat',
  display: 'swap'
});

export const metadata: Metadata = {
  title: "JumpIn",
  description: "QR Check-In per eventi JumpIn",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" className={`${inter.variable} ${montserrat.variable}`}>
      <body className={`font-inter mesh-bg min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
