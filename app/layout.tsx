import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Credencial Luzu TV",
  description: "Generá tu credencial exclusiva de Luzu TV con IA",
  openGraph: {
    title: "Credencial Luzu TV",
    description: "Hacé tu credencial interactiva de Luzu TV 🎬",
    images: ["https://skills.morfeolabs.com/static/luzu-logo.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
