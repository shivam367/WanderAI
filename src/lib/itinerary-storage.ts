// src/lib/itinerary-storage.ts
"use client";

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

function getStorageKey(userEmail: string): string {
  return `wanderai_itineraries_${userEmail}`;
}

export function getItineraries(userEmail: string): ItineraryRecord[] {
  if (typeof window === "undefined" || !userEmail) return [];
  const key = getStorageKey(userEmail);
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
    id: Date.now().toString(),
    generatedDate: new Date().toISOString(),
  };
  itineraries.unshift(newRecord); // Add new itineraries to the beginning of the list
  localStorage.setItem(getStorageKey(userEmail), JSON.stringify(itineraries));
  return newRecord;
}

export function deleteItinerary(userEmail: string, itineraryId: string): void {
  if (typeof window === "undefined" || !userEmail) return;
  let itineraries = getItineraries(userEmail);
  itineraries = itineraries.filter(it => it.id !== itineraryId);
  localStorage.setItem(getStorageKey(userEmail), JSON.stringify(itineraries));
}

export function deleteAllItinerariesForUser(userEmail: string): void {
  if (typeof window === "undefined" || !userEmail) return;
  const key = getStorageKey(userEmail);
  localStorage.removeItem(key);
}
