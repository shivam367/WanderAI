'use server';

/**
 * @fileOverview This file defines a Genkit flow for refining a travel itinerary based on user feedback.
 *
 * The flow takes an existing itinerary and user feedback as input, and uses a language model to generate a refined itinerary.
 * It exports:
 *   - refineItinerary: The main function to call to refine the itinerary.
 *   - RefineItineraryInput: The input type for the refineItinerary function.
 *   - RefineItineraryOutput: The output type for the refineItinerary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RefineItineraryInputSchema = z.object({
  existingItinerary: z.string().describe('The existing travel itinerary to refine.'),
  userFeedback: z.string().describe('Specific feedback from the user on the itinerary.'),
});
export type RefineItineraryInput = z.infer<typeof RefineItineraryInputSchema>;

const RefineItineraryOutputSchema = z.object({
  refinedItinerary: z.string().describe('The refined travel itinerary based on user feedback.'),
});
export type RefineItineraryOutput = z.infer<typeof RefineItineraryOutputSchema>;

export async function refineItinerary(input: RefineItineraryInput): Promise<RefineItineraryOutput> {
  return refineItineraryFlow(input);
}

const refineItineraryPrompt = ai.definePrompt({
  name: 'refineItineraryPrompt',
  input: {schema: RefineItineraryInputSchema},
  output: {schema: RefineItineraryOutputSchema},
  prompt: `You are a travel expert refining an existing itinerary based on user feedback.

Existing Itinerary:
{{{existingItinerary}}}

User Feedback:
{{{userFeedback}}}

Based on the user feedback, please refine the itinerary to better meet their needs and preferences. Ensure the refined itinerary is well-structured, comprehensive, and addresses the user's concerns.

Refined Itinerary:`, // No Handlebars in this section
});

const refineItineraryFlow = ai.defineFlow(
  {
    name: 'refineItineraryFlow',
    inputSchema: RefineItineraryInputSchema,
    outputSchema: RefineItineraryOutputSchema,
  },
  async input => {
    const {output} = await refineItineraryPrompt(input);
    return output!;
  }
);
