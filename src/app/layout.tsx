import { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Research Agent & Radar Dashboard',
  description: 'Autonomous research intelligence agent curating cutting-edge papers, threat models, and insights.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#090b0e] text-[#f0f3f6] antialiased selection:bg-cyan-500/30 selection:text-cyan-200 min-h-screen">
        {children}
      </body>
    </html>
  );
}
