// src/app/profile/page.tsx
"use client";

import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ProfileEditSchema, type ProfileEditInput } from "@/lib/schemas";
import { User, Mail, Save, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import ProtectedRoute from "@/components/auth/protected-route";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { toast } = useToast();
  const { currentUser, updateProfile, logout, isLoading: authLoading, fetchCurrentUser } = useAuth();
  const router = useRouter();

  const form = useForm<ProfileEditInput>({
    resolver: zodResolver(ProfileEditSchema),
    defaultValues: {
      name: currentUser?.name || "",
    },
  });

  useEffect(() => {
    if (currentUser) {
      form.reset({ name: currentUser.name });
    } else {
      // Fetch current user if not available, e.g., after a page refresh
      fetchCurrentUser();
    }
  }, [currentUser, form, fetchCurrentUser]);


  const onSubmit: SubmitHandler<ProfileEditInput> = async (data) => {
    try {
      await updateProfile(data);
      toast({ title: "Profile Updated", description: "Your changes have been saved.", className: "bg-primary text-primary-foreground"});
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    }
  };

  if (authLoading && !currentUser) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <LoadingSpinner size={48} text="Loading profile..." />
      </div>
    );
  }

  if (!currentUser && !authLoading) {
     // This case should ideally be handled by ProtectedRoute, but as a fallback:
     router.push('/auth');
     return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <LoadingSpinner size={48} text="Redirecting..." />
      </div>
    );
  }


  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12 sm:px-6 lg:px-8 flex items-center justify-center">
          <Card className="w-full max-w-lg mx-auto shadow-xl bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-3xl font-headline text-primary">Your Profile</CardTitle>
              <CardDescription className="font-body">View and update your account details.</CardDescription>
            </CardHeader>
            <CardContent>
              {currentUser ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center font-body"><User className="mr-2 h-4 w-4 text-primary" />Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Name" {...field} className="font-body" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormItem>
                      <FormLabel className="flex items-center font-body"><Mail className="mr-2 h-4 w-4 text-primary" />Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" value={currentUser.email} readOnly disabled className="font-body bg-muted/50" />
                      </FormControl>
                      <FormDescription className="font-body text-xs">Email address cannot be changed.</FormDescription>
                    </FormItem>
                    <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-body py-3" disabled={authLoading}>
                      {authLoading ? <LoadingSpinner size={20} /> : <><Save className="mr-2 h-5 w-5" /> Save Changes</>}
                    </Button>
                  </form>
                </Form>
              ) : (
                <p>Loading user data...</p>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={logout} className="w-full text-destructive border-destructive hover:bg-destructive/10 font-body" disabled={authLoading}>
                <LogOut className="mr-2 h-5 w-5" /> Logout
              </Button>
            </CardFooter>
          </Card>
        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}
