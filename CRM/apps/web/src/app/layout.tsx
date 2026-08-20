import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { QueryProvider } from '@/context/QueryProvider';
import { CallingModal } from '@/components/CallingModal';

export const metadata: Metadata = {
  title: 'Dayaar Real Estate Sales CRM',
  description: 'Real estate CRM with employee SIM calling and Callyzer call capture',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen">
        <AuthProvider>
          <SocketProvider>
            <QueryProvider>
              {children}
              <CallingModal />
            </QueryProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
