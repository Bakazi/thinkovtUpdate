import type { Metadata } from "next";
import { Cinzel, Cormorant_Garamond, Courier_Prime } from "next/font/google";
import SessionProvider from "@/components/SessionProvider";
import "./globals.css";

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const courier = Courier_Prime({
  variable: "--font-courier",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Thinkovr — Think Over Everything",
  description: "We don't give you options. We give you the right move. Thinkovr processes your parameters and delivers the singular right move.",
  keywords: ["Thinkovr", "Think Over Everything", "decision making", "business strategy", "clarity", "directives"],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Thinkovr — Think Over Everything",
    description: "We don't give you options. We give you the right move.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${cinzel.variable} ${cormorant.variable} ${courier.variable}`}>
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
