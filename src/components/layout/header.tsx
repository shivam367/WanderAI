// src/components/layout/header.tsx
"use client";

import Link from "next/link";
import { PlaneTakeoff, UserCircle, LogOut, LayoutDashboard, UserCog, History } from "lucide-react"; // Added History
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "./theme-toggle"; // Import ThemeToggle

export function Header() {
  const { currentUser, logout } = useAuth();

  return (
    <header className="bg-background/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
      <div className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center space-x-2 group">
          <PlaneTakeoff className="h-8 w-8 text-primary group-hover:animate-pulse" />
          <div>
            <h1 className="text-2xl font-bold font-headline text-primary">WanderAI</h1>
            <p className="text-xs text-muted-foreground font-body">Your Personal AI Travel Planner</p>
          </div>
        </Link>
        <nav className="flex items-center space-x-1 md:space-x-2">
          {currentUser ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/dashboard" className="font-body flex items-center text-lg">
                  <LayoutDashboard className="mr-0 md:mr-2 h-5 w-5" /> <span className="hidden md:inline">Dashboard</span>
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/history" className="font-body flex items-center text-lg">
                  <History className="mr-0 md:mr-2 h-5 w-5" /> <span className="hidden md:inline">History</span>
                </Link>
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/profile" className="font-body flex items-center text-lg">
                  <UserCog className="mr-0 md:mr-2 h-5 w-5" /> <span className="hidden md:inline">Profile</span>
                </Link>
              </Button>
              <Button variant="outline" onClick={logout} className="border-destructive text-destructive hover:bg-destructive/10 font-body flex items-center text-lg">
                <LogOut className="mr-0 md:mr-2 h-5 w-5" /> <span className="hidden md:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/auth" className="font-body text-lg">Plan New Trip</Link>
              </Button>
              <Button variant="outline" asChild className="border-primary text-primary hover:bg-primary/10">
                <Link href="/auth" className="font-body flex items-center text-lg">
                  <UserCircle className="mr-2 h-5 w-5" />
                  Login / Sign Up
                </Link>
              </Button>
            </>
          )}
          <ThemeToggle /> {/* Add ThemeToggle here */}
        </nav>
      </div>
    </header>
  );
}
