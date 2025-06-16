// src/app/auth/page.tsx
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { AuthForm } from "@/components/auth/auth-form";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login / Register - WanderAI',
  description: 'Access your WanderAI account or create a new one.',
};

export default function AuthPage() {
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
