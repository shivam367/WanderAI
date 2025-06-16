// src/components/layout/header.tsx
"use client";

import Link from "next/link";
import { PlaneTakeoff, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
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
        <nav className="flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link href="/#generate" className="font-body">Plan New Trip</Link>
          </Button>
          {/* <Button variant="ghost" asChild>
            <Link href="/my-trips" className="font-body">My Trips</Link>
          </Button> */}
          <Button variant="outline" asChild className="border-primary text-primary hover:bg-primary/10">
            <Link href="/auth" className="font-body flex items-center">
              <UserCircle className="mr-2 h-5 w-5" />
              Login / Sign Up
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
