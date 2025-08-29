// src/components/layout/header.tsx
"use client";

import Link from "next/link";
import { PlaneTakeoff, UserCircle, LogOut, LayoutDashboard, UserCog, History, LogIn, Edit } from "lucide-react"; // Added History, LogIn, Edit
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "./theme-toggle"; 

export function Header() {
  const { currentUser, logout } = useAuth();

  return (
    <header className="bg-background/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
      <div className="container mx-auto flex h-16 sm:h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
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
              <Button variant="ghost" asChild size="sm">
                <Link href="/dashboard" className="font-body flex items-center text-lg md:text-xl">
                  <LayoutDashboard className="h-5 w-5 md:h-6 md:w-6 mr-0 md:mr-2" /> <span className="hidden md:inline">Dashboard</span>
                </Link>
              </Button>
              <Button variant="ghost" asChild size="sm">
                <Link href="/history" className="font-body flex items-center text-lg md:text-xl">
                  <History className="h-5 w-5 md:h-6 md:w-6 mr-0 md:mr-2" /> <span className="hidden md:inline">History</span>
                </Link>
              </Button>
              <Button variant="ghost" asChild size="sm">
                <Link href="/profile" className="font-body flex items-center text-lg md:text-xl">
                  <UserCog className="h-5 w-5 md:h-6 md:w-6 mr-0 md:mr-2" /> <span className="hidden md:inline">Profile</span>
                </Link>
              </Button>
              <Button variant="outline" onClick={logout} size="sm" className="border-destructive text-destructive hover:bg-destructive/10 font-body flex items-center text-lg md:text-xl">
                <LogOut className="h-5 w-5 md:h-6 md:w-6 mr-0 md:mr-2" /> <span className="hidden md:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex" size="sm">
                <Link href="/auth" className="font-body text-lg md:text-xl flex items-center">
                   <Edit className="h-5 w-5 md:h-6 md:w-6 mr-2"/> Plan New Trip
                </Link>
              </Button>
              <Button variant="outline" asChild size="sm" className="border-primary text-primary hover:bg-primary/10">
                <Link href="/auth" className="font-body flex items-center text-lg md:text-xl">
                  <UserCircle className="h-5 w-5 md:h-6 md:w-6 mr-0 md:mr-2" />
                  <span className="hidden md:inline">Login / Sign Up</span>
                  <span className="inline md:hidden">Login</span>
                </Link>
              </Button>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
