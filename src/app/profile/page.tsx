
// src/app/profile/page.tsx
"use client";

import * as React from "react"; // Import React
import { useEffect } from "react";
import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ProfileEditSchema, type ProfileEditInput, ChangePasswordSchema, type ChangePasswordInput } from "@/lib/schemas";
import { User, Mail, Save, LogOut, KeyRound, AlertTriangle, Trash, UserX } from "lucide-react"; // Added UserX
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import ProtectedRoute from "@/components/auth/protected-route";
import { useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ProfilePage() {
  const { toast } = useToast();
  const { currentUser, updateProfile, logout, changePassword, deleteAccount, isLoading: authLoading } = useAuth(); // Added deleteAccount
  const router = useRouter();
  const [isUpdatingProfile, setIsUpdatingProfile] = React.useState(false);
  const [isChangingPassword, setIsChangingPassword] = React.useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false); // Added state for delete account

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
      passwordForm.reset(); 
    } catch (error: any) {
      toast({ title: "Password Change Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleClearAllData = () => {
    if (typeof window !== "undefined") {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("wanderai_")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      toast({
        title: "Data Cleared",
        description: "All WanderAI application data has been removed from this browser.",
        className: "bg-primary text-primary-foreground",
      });
      logout(); // This will also redirect to /auth
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      // Toast and redirection are handled by the deleteAccount function in AuthContext
    } catch (error: any) {
      // This catch is mainly for unexpected errors not handled by AuthContext's deleteAccount
      toast({ title: "Account Deletion Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsDeletingAccount(false);
    }
  };


  if (authLoading && !currentUser) {
    return (
      <div className="flex flex-col min-h-screen bg-background items-center justify-center">
        <LoadingSpinner size={48} text="Loading profile..." />
      </div>
    );
  }

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
              {currentUser ? ( 
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
            <CardFooter className="pt-6 flex flex-col gap-4"> 
              <Button variant="outline" onClick={logout} className="w-full text-destructive border-destructive hover:bg-destructive/10 font-body" disabled={isUpdatingProfile || isChangingPassword || authLoading || isDeletingAccount}>
                <LogOut className="mr-2 h-5 w-5" /> Logout
              </Button>
            </CardFooter>
          </Card>

          <Card className="w-full max-w-lg mx-auto shadow-xl bg-card/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl font-headline text-destructive flex items-center">
                <AlertTriangle className="mr-2 h-6 w-6" /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-body text-sm text-muted-foreground mb-2">
                  Deleting your account will permanently remove your profile and all associated itinerary history. This action cannot be undone.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full font-body" disabled={isDeletingAccount || authLoading}>
                      <UserX className="mr-2 h-5 w-5" /> Delete My Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your WanderAI account ({currentUser?.email}) and all associated data, including your profile information and itinerary history. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className={buttonVariants({ variant: "destructive" })}
                        disabled={isDeletingAccount}
                      >
                        {isDeletingAccount ? <LoadingSpinner size={20} /> : "Yes, delete my account"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <Separator />
              
              <div>
                <p className="font-body text-sm text-muted-foreground mb-2">
                  Clearing all WanderAI app data will remove user information, saved itineraries, and theme settings stored by WanderAI from this browser. This action cannot be undone and will affect all users of WanderAI on this browser.
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full font-body" disabled={isDeletingAccount || authLoading}>
                      <Trash className="mr-2 h-5 w-5" /> Clear All App Data (This Browser)
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action will permanently delete all WanderAI application data stored in this browser, including all user account details and itinerary history for WanderAI. You will be logged out. This affects all users of WanderAI on this browser.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearAllData} className={buttonVariants({ variant: "destructive" })}>
                        Yes, clear all data
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

            </CardContent>
          </Card>

        </main>
        <Footer />
      </div>
    </ProtectedRoute>
  );
}


    