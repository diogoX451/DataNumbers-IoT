"use client";

import "../styles/theme.scss";
import "../styles/globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body className="bg-light">{children}</body>
    </html>
  );
}
