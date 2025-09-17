/**
 * Root layout component for the Next.js application.
 * Provides global metadata, font configuration, and wraps the entire app
 * with the GameProvider context for state management.
 */
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { GameProvider } from "@/context/GameContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mafia Game",
  description: "A digital Mafia party game for large groups",
};

/**
 * Root layout that wraps all pages with GameProvider context
 * and applies global styling and font configuration.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <GameProvider>
          {children}
        </GameProvider>
      </body>
    </html>
  );
}