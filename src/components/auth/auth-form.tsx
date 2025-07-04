// src/components/auth/auth-form.tsx
"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginFormSchema, RegisterFormSchema, type LoginFormInput, type RegisterFormInput } from "@/lib/schemas";
import { Lock, Mail, User, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { LoadingSpinner } from "../common/loading-spinner";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

export function AuthForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const { login, register } = useAuth();
  const router = useRouter();

  const loginForm = useForm<LoginFormInput>({
    resolver: zodResolver(LoginFormSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterFormInput>({
    resolver: zodResolver(RegisterFormSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onLoginSubmit: SubmitHandler<LoginFormInput> = async (data) => {
    setIsLoading(true);
    try {
      await login(data);
      toast({ title: "Login Successful", description: "Welcome back!", className: "bg-primary text-primary-foreground" });
      router.push("/dashboard");
    } catch (error: any) {
      toast({ title: "Login Failed", description: error.message, variant: "destructive" });
      if (error.message.includes("User not found")) {
        setActiveTab("register"); // Switch to register tab
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onRegisterSubmit: SubmitHandler<RegisterFormInput> = async (data) => {
    setIsLoading(true);
    try {
      await register(data);
      toast({ title: "Registration Successful", description: "Please log in to continue.", className: "bg-primary text-primary-foreground" });
      registerForm.reset();
      setActiveTab("login"); // Switch to login tab after successful registration
    } catch (error: any) {
      toast({ title: "Registration Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl bg-card/80 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-headline text-primary">Welcome to WanderAI</CardTitle>
        <CardDescription className="font-body text-base">Access your personalized travel plans or create a new account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-secondary/70">
            <TabsTrigger value="login" className="font-body text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Login</TabsTrigger>
            <TabsTrigger value="register" className="font-body text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Register</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-6 pt-6">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center font-body"><Mail className="mr-2 h-4 w-4 text-primary" />Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} className="font-body" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center font-body"><Lock className="mr-2 h-4 w-4 text-primary" />Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="font-body" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-body py-3 text-base" disabled={isLoading}>
                  {isLoading ? <LoadingSpinner size={20} /> : <><LogIn className="mr-2 h-5 w-5" /> Login</>}
                </Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="register">
            <Form {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-6 pt-6">
                <FormField
                  control={registerForm.control}
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
                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center font-body"><Mail className="mr-2 h-4 w-4 text-primary" />Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} className="font-body" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center font-body"><Lock className="mr-2 h-4 w-4 text-primary" />Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="font-body" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center font-body"><Lock className="mr-2 h-4 w-4 text-primary" />Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} className="font-body" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-body py-3 text-base" disabled={isLoading}>
                 {isLoading ? <LoadingSpinner size={20} /> : "Create Account"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
