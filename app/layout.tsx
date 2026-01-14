import "./globals.css";
// styles required by react-inner-image-zoom
import "react-inner-image-zoom/lib/styles.min.css";

export const metadata = { title: "try-me POC" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        <div className="mx-auto max-w-5xl p-6">{children}</div>
      </body>
    </html>
  );
}
