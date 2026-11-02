import './globals.css';
export const metadata = { title: 'AWS SBG · Member Intake', description: 'AWS Student Builder Group member form' };
export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="light" style={{ colorScheme: 'light' }} suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=JetBrains+Mono:wght@400;600&display=swap" />
      </head>
      <body>{children}</body>
    </html>
  );
}
