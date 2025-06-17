
'use server';
/**
 * @fileOverview A contextual chatbot for discussing a specific travel itinerary.
 *
 * - itineraryChat - A function that handles the chat interaction.
 * - ItineraryChatInput - The input type for the itineraryChat function.
 * - ItineraryChatOutput - The return type for the itineraryChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const ItineraryChatInputSchema = z.object({
  itineraryContent: z.string().describe('The full text of the travel itinerary being discussed.'),
  destination: z.string().describe('The primary destination of the itinerary.'),
  chatHistory: z.array(ChatMessageSchema).describe('The history of the conversation so far.'),
  userMessage: z.string().describe("The user's latest message."),
});
export type ItineraryChatInput = z.infer<typeof ItineraryChatInputSchema>;

const ItineraryChatOutputSchema = z.object({
  response: z.string().describe("The chatbot's response to the user's message."),
});
export type ItineraryChatOutput = z.infer<typeof ItineraryChatOutputSchema>;

export async function itineraryChat(input: ItineraryChatInput): Promise<ItineraryChatOutput> {
  return itineraryChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'itineraryChatPrompt',
  input: {schema: ItineraryChatInputSchema},
  output: {schema: ItineraryChatOutputSchema},
  prompt: `You are a helpful AI travel assistant embedded in a travel planning application.
Your current task is to discuss a specific travel itinerary with the user.

Here is the itinerary content you should focus on:
<itinerary_context>
{{{itineraryContent}}}
</itinerary_context>

The primary destination for this itinerary is: {{destination}}.

Your role is to:
1. Answer questions specifically about the provided itinerary (plan, activities, hotels, food, etc.).
2. Provide information about other interesting places, attractions, or activities near the itinerary's destination ({{destination}}).
3. Keep your responses concise and helpful for travel planning.
4. Maintain a friendly and conversational tone.

IMPORTANT RULE: You MUST ONLY discuss travel-related topics. If the user asks a question that is NOT related to travel, trip planning, the provided itinerary, or the destination, you MUST politely decline to answer. You should state that your purpose is to assist with travel and itinerary-related queries for this specific trip. For example: "I'm here to help you with your travel plans for {{destination}}. I can't assist with non-travel related questions."

Conversation History:
{{#each chatHistory}}
  {{role}}: {{this.content}}
{{/each}}

User's latest message: {{userMessage}}

Based on the itinerary, destination, conversation history, and the user's latest message, provide a helpful travel-related response. If the question is not travel-related, politely decline. Ensure your response is directly addressing the user message and does not just repeat instructions.
AI Response:
`,
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE'},
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE'},
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE'},
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE'},
    ],
  },
});

const itineraryChatFlow = ai.defineFlow(
  {
    name: 'itineraryChatFlow',
    inputSchema: ItineraryChatInputSchema,
    outputSchema: ItineraryChatOutputSchema,
  },
  async (input) => {
    // Basic check for empty user message to prevent unnecessary API calls
    if (!input.userMessage.trim()) {
      return { response: "Please provide a message to discuss." };
    }
    const {output} = await prompt(input);
    return output || {response: "I'm sorry, I couldn't generate a response at this time."};
  }
);

