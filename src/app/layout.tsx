import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import MobileMenuWrapper from "../components/MobileMenuWrapper";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FoodShare - Reduce Food Waste",
  description: "A platform to share and reduce food wastage in your community",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen`}
      >
        <AuthProvider>
          <div className="flex flex-col min-h-screen  md:pb-0">
            <main className="flex-grow">
              {children}
            </main>
            <MobileMenuWrapper />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
