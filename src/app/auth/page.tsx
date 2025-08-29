
// src/app/auth/page.tsx
"use client"; // Required for useEffect and useRouter

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AuthForm } from "@/components/auth/auth-form";
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import type { Metadata } from 'next';

// Cannot export metadata from client component
// export const metadata: Metadata = {
//   title: 'Login / Register - WanderAI',
//   description: 'Access your WanderAI account or create a new one.',
// };

export default function AuthPage() {
  const { currentUser, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && currentUser) {
      router.push('/dashboard');
    }
  }, [currentUser, isLoading, router]);

  if (isLoading || (!isLoading && currentUser)) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <LoadingSpinner size={48} text="Loading..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-12 sm:px-6 lg:px-8 flex items-center justify-center">
        <AuthForm />
      </main>
      <Footer />
    </div>
  );
}
