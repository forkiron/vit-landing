import "./globals.css";

export const metadata = {
  title: "vit",
  description: "Git for Video Editing — version control for DaVinci Resolve.",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "vit",
    description: "Git for Video Editing — version control for DaVinci Resolve.",
    url: "https://vit-editor.vercel.app",
    siteName: "vit",
    images: [
      {
        url: "/paul-reiffer.jpg",
        width: 1200,
        height: 630,
        alt: "vit — Git for Video Editing",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "vit",
    description: "Git for Video Editing — version control for DaVinci Resolve.",
    images: ["/paul-reiffer.jpg"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Semi+Condensed:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
