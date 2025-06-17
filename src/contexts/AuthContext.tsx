// src/contexts/AuthContext.tsx
"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  registerUser as apiRegisterUser,
  loginUser as apiLoginUser,
  logoutUser as apiLogoutUser,
  getCurrentUser as apiGetCurrentUser,
  updateUserProfile as apiUpdateUserProfile,
  changeUserPassword as apiChangeUserPassword,
  deleteUserAccount as apiDeleteUserAccount, // Import new function
  type User,
} from "@/lib/auth";
import { deleteAllItinerariesForUser as apiDeleteAllItinerariesForUser } from "@/lib/itinerary-storage"; // Import new function
import type { RegisterFormInput, LoginFormInput, ProfileEditInput, ChangePasswordInput } from "@/lib/schemas";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast"; // Import useToast

interface AuthContextType {
  currentUser: User | null;
  isLoading: boolean;
  login: (data: LoginFormInput) => Promise<User | null>;
  register: (data: RegisterFormInput) => Promise<User | null>;
  logout: () => void;
  updateProfile: (data: ProfileEditInput) => Promise<User | null>;
  changePassword: (data: ChangePasswordInput) => Promise<void>;
  deleteAccount: () => Promise<void>; // Add new function type
  fetchCurrentUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast(); // Initialize useToast

  const fetchCurrentUser = useCallback(() => {
    setIsLoading(true);
    const user = apiGetCurrentUser();
    setCurrentUser(user);
    setIsLoading(false);
  }, [setIsLoading, setCurrentUser]); 

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (data: LoginFormInput): Promise<User | null> => {
    setIsLoading(true);
    try {
      const user = apiLoginUser(data);
      setCurrentUser(user);
      setIsLoading(false);
      return user;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (data: RegisterFormInput): Promise<User | null> => {
    setIsLoading(true);
    try {
      const user = apiRegisterUser(data);
      setIsLoading(false);
      return user; 
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = () => {
    apiLogoutUser();
    setCurrentUser(null);
    router.push("/auth");
  };

  const updateProfile = async (data: ProfileEditInput): Promise<User | null> => {
    if (!currentUser) throw new Error("No user logged in to update profile.");
    setIsLoading(true);
    try {
      const updatedUser = apiUpdateUserProfile(currentUser.email, data);
      setCurrentUser(updatedUser);
      setIsLoading(false);
      return updatedUser;
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const changePassword = async (data: ChangePasswordInput): Promise<void> => {
    if (!currentUser) throw new Error("No user logged in to change password.");
    setIsLoading(true);
    try {
      apiChangeUserPassword(currentUser.email, data);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };
  
  const deleteAccount = async (): Promise<void> => {
    if (!currentUser) {
      toast({ title: "Error", description: "No user logged in to delete account.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      apiDeleteAllItinerariesForUser(currentUser.email); // Delete itineraries first
      apiDeleteUserAccount(currentUser.email); // Then delete user account entry
      logout(); // This will clear current user email and redirect
      toast({ title: "Account Deleted", description: "Your account and all associated data have been removed.", className: "bg-primary text-primary-foreground" });
    } catch (error: any) {
      toast({ title: "Account Deletion Failed", description: error.message || "Could not delete account.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoading, login, register, logout, updateProfile, changePassword, deleteAccount, fetchCurrentUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
