import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "鉄道運賃制度の比較",
  description:
    "鉄道各社の距離別運賃テーブル（IC/きっぷ）を、インタラクティブにグラフで比較できる非公式ツール。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">{children}</body>
    </html>
  );
}
