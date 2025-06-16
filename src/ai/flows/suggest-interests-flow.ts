
'use server';
/**
 * @fileOverview Provides AI-powered interest suggestions for travel planning.
 *
 * - suggestInterests - A function that suggests travel interests based on a query.
 * - SuggestInterestsInput - The input type for the suggestInterests function.
 * - SuggestInterestsOutput - The return type for the suggestInterests function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestInterestsInputSchema = z.object({
  query: z.string().describe('The user\'s current typed query for travel interests.'),
  existingInterests: z.string().optional().describe('Comma-separated list of already selected interests to avoid suggesting duplicates or to provide context.'),
});
export type SuggestInterestsInput = z.infer<typeof SuggestInterestsInputSchema>;

const SuggestInterestsOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('An array of 3-5 concise travel interest suggestions.'),
});
export type SuggestInterestsOutput = z.infer<typeof SuggestInterestsOutputSchema>;

export async function suggestInterests(input: SuggestInterestsInput): Promise<SuggestInterestsOutput> {
  return suggestInterestsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestInterestsPrompt',
  input: {schema: SuggestInterestsInputSchema},
  output: {schema: SuggestInterestsOutputSchema},
  prompt: `You are an AI travel assistant helping a user find interests for their trip.
Given the user's current typed query and their existing selected interests, provide 3-5 concise and relevant travel interest suggestions.
The suggestions should be short phrases, like "Historical Sites", "Street Food Tours", "Mountain Hiking", "Beach Relaxation", "Art Galleries".
Do not repeat any interests already listed in 'existingInterests'.
If the query is too short or vague, provide general popular suggestions related to travel.
Ensure suggestions are diverse and helpful.

User's current query: {{{query}}}
User's existing selected interests: {{{existingInterests}}}

Provide your suggestions in the specified output format. Respond with an empty suggestions array if no relevant suggestions can be made.
`,
});

const suggestInterestsFlow = ai.defineFlow(
  {
    name: 'suggestInterestsFlow',
    inputSchema: SuggestInterestsInputSchema,
    outputSchema: SuggestInterestsOutputSchema,
  },
  async (input) => {
    if (input.query.trim().length < 2) { // Avoid API calls for very short queries
        return { suggestions: [] };
    }
    const {output} = await prompt(input);
    return output || { suggestions: [] }; // Ensure output is not null
  }
);
