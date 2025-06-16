// src/lib/auth.ts
"use client";

import type { RegisterFormInput, LoginFormInput, ProfileEditInput, ChangePasswordInput } from "./schemas";

const USERS_STORAGE_KEY = "wanderai_users";
const CURRENT_USER_EMAIL_KEY = "wanderai_currentUserEmail";

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Password stored directly for demo purposes
}

function getUsers(): User[] {
  if (typeof window === "undefined") return [];
  const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
  return usersJson ? JSON.parse(usersJson) : [];
}

function saveUsers(users: User[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
}

export function registerUser(data: RegisterFormInput): User | null {
  const users = getUsers();
  const existingUser = users.find(user => user.email === data.email);
  if (existingUser) {
    throw new Error("User with this email already exists.");
  }
  const newUser: User = {
    id: Date.now().toString(), // Simple ID generation
    name: data.name,
    email: data.email,
    password: data.password,
  };
  users.push(newUser);
  saveUsers(users);
  const { password, ...userWithoutPassword } = newUser; // Don't return password
  return userWithoutPassword;
}

export function loginUser(data: LoginFormInput): User | null {
  const users = getUsers();
  const user = users.find(u => u.email === data.email && u.password === data.password);
  if (user) {
    if (typeof window !== "undefined") {
      localStorage.setItem(CURRENT_USER_EMAIL_KEY, user.email);
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  // Check if user exists at all (for redirection to register)
  const userExists = users.find(u => u.email === data.email);
  if (!userExists) {
    throw new Error("User not found. Please register.");
  }
  throw new Error("Invalid email or password.");
}

export function logoutUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CURRENT_USER_EMAIL_KEY);
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const email = localStorage.getItem(CURRENT_USER_EMAIL_KEY);
  if (!email) return null;
  const users = getUsers();
  const user = users.find(u => u.email === email);
  if (user) {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  return null;
}

export function updateUserProfile(email: string, data: ProfileEditInput): User | null {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.email === email);
  if (userIndex === -1) {
    throw new Error("User not found for update.");
  }
  
  const updatedUser = { ...users[userIndex], name: data.name };
  users[userIndex] = updatedUser;
  saveUsers(users);
  
  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
}

export function changeUserPassword(email: string, data: ChangePasswordInput): void {
  const users = getUsers();
  const userIndex = users.findIndex(u => u.email === email);

  if (userIndex === -1) {
    throw new Error("User not found.");
  }

  const user = users[userIndex];
  if (user.password !== data.currentPassword) {
    throw new Error("Incorrect current password.");
  }

  users[userIndex] = { ...user, password: data.newPassword };
  saveUsers(users);
}


export function isUserLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(CURRENT_USER_EMAIL_KEY);
}
