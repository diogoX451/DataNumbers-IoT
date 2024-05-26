"use client";

import "../styles/theme.scss";

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body className="bg-light">{children}</body>
    </html>
  );
}
