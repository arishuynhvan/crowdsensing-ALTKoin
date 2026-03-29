import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from '../components/providers';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Public Service Reporting dApp",
  description: "A decentralized application for public service reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
