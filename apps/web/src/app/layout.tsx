import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wired — Project Intelligence",
  description: "Self-hosted project-memory, project-notes, and AI project-intelligence",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="ink" data-accent="amber" data-density="tight">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var p=localStorage.getItem(wired-ui-prefs);
              if(p){var d=JSON.parse(p);document.documentElement.setAttribute(data-theme,d.theme||ink);document.documentElement.setAttribute(data-accent,d.accent||amber);document.documentElement.setAttribute(data-density,d.density||tight);}
            }catch(e){}})();`,
          }}
        />
      </head>
      <body style={{ background: "var(--bg, #0e0e0f)", color: "var(--fg, #ececed)" }}>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
