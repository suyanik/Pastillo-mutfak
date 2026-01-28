import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

// 1. VIEWPORT AYARI (Telefonda zoom yapmayı engeller, "Uygulama" hissi verir)
export const viewport: Viewport = {
  themeColor: "#ea580c", // Turuncu (Marka rengimiz)
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Kullanıcının elle zoom yapmasını engeller
};

// 2. METADATA AYARI (PWA ve Kimlik Bilgileri)
export const metadata: Metadata = {
  title: "Pastillo Mutfak",
  description: "Global Mutfak Yönetimi",
  manifest: "/manifest.json", // Kimlik kartımız burada
  icons: {
    icon: "/icon-192x192.png",
    shortcut: "/icon-192x192.png",
    apple: "/icon-512x512.png", // iPhone'lar bu ikonu kullanır
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pastillo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}