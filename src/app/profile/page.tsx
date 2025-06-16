// src/app/profile/page.tsx
"use client";

import * as React from "react"; // Import React
import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ProfileEditSchema, type ProfileEditInput, ChangePasswordSchema, type ChangePasswordInput } from "@/lib/schemas";
import { User, Mail, Save, LogOut, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import ProtectedRoute from "@/components/auth/protected-route";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";

export default function ProfilePage() {
  const { toast } = useToast();
  const { currentUser, updateProfile, logout, changePassword, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);

  const profileForm = useForm<ProfileEditInput>({
    resolver: zodResolver(ProfileEditSchema),
    defaultValues: {
      name: "", // Initialize with empty string, will be set by useEffect
    },
  });

  const passwordForm = useForm<ChangePasswordInput>({
    resolver: zodResolver(ChangePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  useEffect(() => {
    if (currentUser) {
      profileForm.reset({ name: currentUser.name });
    }
    // No 'else' block or fetchCurrentUser needed here.
    // AuthContext handles initial fetch. ProtectedRoute handles redirection if no user.
  }, [currentUser, profileForm]);


  const onProfileSubmit: SubmitHandler<ProfileEditInput> = async (data) => {
    setIsUpdatingProfile(true);
    try {
      await updateProfile(data);
      toast({ title: "Profile Updated", description: "Your name has been saved.", className: "bg-primary text-primary-foreground"});
    } catch (error: any) {
      toast({ title: "Profile Update Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onChangePasswordSubmit: SubmitHandler<ChangePasswordInput> = async (data) => {
    setIsChangingPassword(true);
    try {
      await changePassword(data);
      toast({ title: "Password Changed", description: "Your password has been updated successfully.", className: "bg-primary text-primary-foreground" });
      passwordForm.reset(); // Clear password fields
    } catch (error: any) {
      toast({ title: "Password Change Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // This spinner shows while AuthContext is initially loading the user.
  // ProtectedRoute also shows a spinner and handles redirection if needed.
  if (authLoading && !currentUser) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <LoadingSpinner size={48} text="Loading profile..." />
      </div>
    );
  }

  // If ProtectedRoute allows rendering, currentUser should exist.
  // The direct router.push call that caused the error has been removed from here.
  // ProtectedRoute will handle redirection if !currentUser after authLoading is false.


  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-grow container mx-auto px-4 py-12 sm:px-6 lg:px-8 flex flex-col items-center justify-center gap-8">
          <Card className="w-full max-w-lg mx-auto shadow-xl bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-3xl font-headline text-primary">Your Profile</CardTitle>
              <CardDescription className="font-body">View and update your account details.</CardDescription>
            </CardHeader>
            <CardContent>
              {currentUser ? ( // currentUser should be available here due to ProtectedRoute
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <FormField
                      control={profileForm.control}
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
                    <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-body py-3" disabled={isUpdatingProfile || authLoading}>
                      {isUpdatingProfile ? <LoadingSpinner size={20} /> : <><Save className="mr-2 h-5 w-5" /> Save Name Changes</>}
                    </Button>
                  </form>
                </Form>
              ) : (
                 // This state should ideally not be reached if ProtectedRoute works correctly.
                 // If it is, ProtectedRoute's spinner should be showing or redirecting.
                <LoadingSpinner size={32} text="Verifying user..." />
              )}
            </CardContent>
          </Card>

          <Card className="w-full max-w-lg mx-auto shadow-xl bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-headline text-primary">Change Password</CardTitle>
            </CardHeader>
            <CardContent>
               <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onChangePasswordSubmit)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center font-body"><KeyRound className="mr-2 h-4 w-4 text-primary" />Current Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter current password" {...field} className="font-body" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center font-body"><KeyRound className="mr-2 h-4 w-4 text-primary" />New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Enter new password" {...field} className="font-body" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={passwordForm.control}
                      name="confirmNewPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center font-body"><KeyRound className="mr-2 h-4 w-4 text-primary" />Confirm New Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="Confirm new password" {...field} className="font-body" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-body py-3" disabled={isChangingPassword || authLoading}>
                      {isChangingPassword ? <LoadingSpinner size={20} /> : <><Save className="mr-2 h-5 w-5" /> Update Password</>}
                    </Button>
                  </form>
                </Form>
            </CardContent>
            <CardFooter className="pt-6"> 
              <Button variant="outline" onClick={logout} className="w-full text-destructive border-destructive hover:bg-destructive/10 font-body" disabled={isUpdatingProfile || isChangingPassword || authLoading}>
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
