export const metadata = {
  title: "Sekejap — Chat Privat 24 Jam",
  description: "Ruang obrolan pribadi yang pesannya hilang otomatis setelah 24 jam.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
    }
