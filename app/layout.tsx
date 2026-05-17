import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { NavBar } from "@/components/NavBar";

export const metadata: Metadata = {
  title: "旅行星球 · 点一点，看世界",
  description: "在 3D 地球上点击任意位置，自动生成当地旅游攻略。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-black text-white">
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
