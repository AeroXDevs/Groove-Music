import "./globals.css";

export const metadata = {
  title: "Groove Dashboard",
  description: "Groove Music Bot Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
