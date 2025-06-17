// src/components/layout/footer.tsx
"use client";

import { Copyright, Github, Linkedin, Mail } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-secondary/50 border-t border-border/50 mt-16 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground font-body">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-1">
            <Copyright className="h-4 w-4" />
            <span>{new Date().getFullYear()} WanderAI. Your Personal AI Travel Planner.</span>
          </div>
          <div className="flex space-x-4">
            <Link href="mailto:contact@wanderai.app" target="_blank" rel="noopener noreferrer" aria-label="Contact via Email" className="hover:text-primary transition-colors">
              <Mail className="h-5 w-5" />
            </Link>
            <Link href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub Profile" className="hover:text-primary transition-colors">
              <Github className="h-5 w-5" />
            </Link>
            <Link href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn Profile" className="hover:text-primary transition-colors">
              <Linkedin className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
