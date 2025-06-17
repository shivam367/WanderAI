
// src/components/wander-ai/itinerary-chatbot.tsx
"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { itineraryChat, type ItineraryChatInput, type ChatMessage } from "@/ai/flows/itinerary-chat-flow";
import { Send, MessageSquare, User, Bot, CornerDownLeft } from "lucide-react";
import { LoadingSpinner } from "@/components/common/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

interface ItineraryChatbotProps {
  itineraryContent: string;
  destination: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ItineraryChatbot({ itineraryContent, destination, isOpen, onClose }: ItineraryChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaViewportRef = useRef<HTMLDivElement>(null);
  const { currentUser } = useAuth(); // Get currentUser from AuthContext

  useEffect(() => {
    if (isOpen) {
      const userName = currentUser?.name ? currentUser.name.split(' ')[0] : "there"; // Get first name or use "there"
      setMessages([
        {
          role: "model",
          content: `Hello ${userName}! I'm your WanderAI assistant. How can I help you with your trip to ${destination}? Feel free to ask about your itinerary, activities, or anything else related to your travel plans.`,
        }
      ]);
      setInputValue("");
    }
  }, [isOpen, destination, currentUser]); // Added currentUser to dependencies
  
  useEffect(() => {
    if (scrollAreaViewportRef.current) {
      scrollAreaViewportRef.current.scrollTo({ top: scrollAreaViewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    const userMessage = inputValue.trim();
    if (!userMessage) return;

    const newUserMessage: ChatMessage = { role: "user", content: userMessage };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Use only the messages *before* the new user message for history
      const historyForAI = messages.slice(0, messages.length); 
      const aiInput: ItineraryChatInput = {
        itineraryContent,
        destination,
        chatHistory: historyForAI, 
        userMessage,
      };
      const result = await itineraryChat(aiInput);
      const aiResponse: ChatMessage = { role: "model", content: result.response };
      setMessages((prevMessages) => [...prevMessages, aiResponse]);
    } catch (error) {
      console.error("Error with chatbot:", error);
      const errorMessage: ChatMessage = { role: "model", content: "Sorry, I encountered an error. Please try again." };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
      toast({
        title: "Chatbot Error",
        description: (error as Error).message || "Could not get a response from the chatbot.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0" side="right">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="font-headline text-2xl text-primary flex items-center">
            <MessageSquare className="mr-2 h-6 w-6" />
            Chat about your trip to {destination}
          </SheetTitle>
          <SheetDescription className="font-body">
            Ask questions about your itinerary, nearby attractions, or travel tips.
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-grow p-4" viewportRef={scrollAreaViewportRef}>
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={cn(
                  "flex items-start gap-3",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "model" && (
                  <Avatar className="h-8 w-8 border border-primary/30">
                    <AvatarFallback className="bg-primary/20 text-primary">
                      <Bot size={18} />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-lg px-3 py-2 text-sm font-body",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-none"
                      : "bg-secondary text-secondary-foreground rounded-bl-none"
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                 {msg.role === "user" && (
                  <Avatar className="h-8 w-8 border border-accent/30">
                    <AvatarFallback className="bg-accent/20 text-accent-foreground">
                      <User size={18} />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start items-center gap-3">
                <Avatar className="h-8 w-8 border border-primary/30">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    <Bot size={18} />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-secondary text-secondary-foreground rounded-lg px-3 py-2 rounded-bl-none">
                  <LoadingSpinner size={18} text="Thinking..." className="flex-row space-x-2" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="p-4 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex w-full items-center space-x-2"
          >
            <Input
              type="text"
              placeholder="Ask about your trip..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 font-body"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isLoading && inputValue.trim()) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <Button type="submit" size="icon" disabled={isLoading || !inputValue.trim()} className="bg-accent hover:bg-accent/90">
              {isLoading ? <CornerDownLeft className="h-4 w-4 animate-pulse" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Send message</span>
            </Button>
          </form>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

