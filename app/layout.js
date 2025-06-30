export const metadata = {
  title: '16bit Camera',
  description: '16bit風スタイルのWebカメラアプリケーション',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}