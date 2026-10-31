import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Due Diligence Copilot',
  description:
    'AI-powered financial due diligence and investment research platform. From company filings to investment insight.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}
