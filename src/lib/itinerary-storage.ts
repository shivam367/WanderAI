// src/lib/itinerary-storage.ts
"use client";

import type { ChatMessage } from '@/ai/flows/itinerary-chat-flow'; // Import ChatMessage

export interface ItineraryRecord {
  id: string; // Unique ID, e.g., timestamp
  destination: string;
  generatedDate: string; // ISO string
  content: string; // The AI-generated itinerary text
  currency?: string;
  budgetAmount?: number;
  duration?: number;
  interests?: string;
}

// --- Itinerary Storage ---

function getItineraryStorageKey(userEmail: string): string {
  return `wanderai_itineraries_${userEmail}`;
}

export function getItineraries(userEmail: string): ItineraryRecord[] {
  if (typeof window === "undefined" || !userEmail) return [];
  const key = getItineraryStorageKey(userEmail);
  const itinerariesJson = localStorage.getItem(key);
  try {
    return itinerariesJson ? JSON.parse(itinerariesJson) : [];
  } catch (error) {
    console.error("Error parsing itineraries from localStorage:", error);
    return [];
  }
}

export function saveItinerary(userEmail: string, itinerary: Omit<ItineraryRecord, 'id' | 'generatedDate'>): ItineraryRecord {
  if (typeof window === "undefined" || !userEmail) {
    throw new Error("Cannot save itinerary: user email or window context is missing.");
  }
  const itineraries = getItineraries(userEmail);
  const newRecord: ItineraryRecord = {
    ...itinerary,
    id: Date.now().toString() + Math.random().toString(36).substring(2, 7), // More unique ID
    generatedDate: new Date().toISOString(),
  };
  itineraries.unshift(newRecord);
  localStorage.setItem(getItineraryStorageKey(userEmail), JSON.stringify(itineraries));
  return newRecord;
}

export function deleteItinerary(userEmail: string, itineraryId: string): void {
  if (typeof window === "undefined" || !userEmail) return;
  let itineraries = getItineraries(userEmail);
  itineraries = itineraries.filter(it => it.id !== itineraryId);
  localStorage.setItem(getItineraryStorageKey(userEmail), JSON.stringify(itineraries));
  // Also delete associated chat messages
  deleteChatMessagesForItinerary(userEmail, itineraryId);
}

export function deleteAllItinerariesForUser(userEmail: string): void {
  if (typeof window === "undefined" || !userEmail) return;
  const key = getItineraryStorageKey(userEmail);
  localStorage.removeItem(key);
  // Also delete all chat messages for this user
  deleteAllChatMessagesForUser(userEmail);
}

// --- Chat Message Storage ---

function getChatStorageKey(userEmail: string, itineraryId: string): string {
  return `wanderai_chat_${userEmail}_${itineraryId}`;
}

export function getChatMessages(userEmail: string, itineraryId: string): ChatMessage[] {
  if (typeof window === "undefined" || !userEmail || !itineraryId) return [];
  const key = getChatStorageKey(userEmail, itineraryId);
  const messagesJson = localStorage.getItem(key);
  try {
    return messagesJson ? JSON.parse(messagesJson) : [];
  } catch (error) {
    console.error(`Error parsing chat messages for itinerary ${itineraryId} from localStorage:`, error);
    return [];
  }
}

export function saveChatMessages(userEmail: string, itineraryId: string, messages: ChatMessage[]): void {
  if (typeof window === "undefined" || !userEmail || !itineraryId) {
    console.warn("Cannot save chat messages: user email, itinerary ID, or window context is missing.");
    return;
  }
  const key = getChatStorageKey(userEmail, itineraryId);
  localStorage.setItem(key, JSON.stringify(messages));
}

export function deleteChatMessagesForItinerary(userEmail: string, itineraryId: string): void {
  if (typeof window === "undefined" || !userEmail || !itineraryId) return;
  const key = getChatStorageKey(userEmail, itineraryId);
  localStorage.removeItem(key);
}

export function deleteAllChatMessagesForUser(userEmail: string): void {
  if (typeof window === "undefined" || !userEmail) return;
  // Iterate through all localStorage keys and remove ones matching the pattern for this user's chats
  const chatKeyPrefix = `wanderai_chat_${userEmail}_`;
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(chatKeyPrefix)) {
      localStorage.removeItem(key);
    }
  });
}
