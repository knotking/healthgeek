'use server';
/**
 * @fileOverview An AI agent for food assessment and recipe suggestions.
 *
 * - assessFood - A function that analyzes a food photo for healthiness and suggests recipes.
 * - FoodAssessorInput - The input type for the assessFood function.
 * - FoodAssessorOutput - The return type for the assessFood function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FoodAssessorInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of food, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  userProfile: z.string().describe("A JSON string of the user's profile data, including health issues and diet preferences."),
  latestHealthReport: z.string().optional().describe('A JSON string of the user\'s latest health report analysis.'),
});
export type FoodAssessorInput = z.infer<typeof FoodAssessorInputSchema>;

const FoodAssessorOutputSchema = z.object({
  foodName: z.string().describe('The name of the identified food item.'),
  isHealthyChoice: z.boolean().describe('Whether the food is considered a healthy choice for the user.'),
  healthAssessment: z.string().describe('A brief analysis of why this food is or is not a healthy choice for the user, based on their profile.'),
  recipeSuggestions: z.array(z.string()).describe('A list of recipe suggestions that can be made with the identified food item.'),
});
export type FoodAssessorOutput = z.infer<typeof FoodAssessorOutputSchema>;

export async function assessFood(input: FoodAssessorInput): Promise<FoodAssessorOutput> {
  return foodAssessorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'foodAssessorPrompt',
  input: { schema: FoodAssessorInputSchema },
  output: { schema: FoodAssessorOutputSchema },
  prompt: `You are an expert nutritionist and chef.

Analyze the food in the provided image. Based on the user's profile, determine if it is a healthy choice for them. Provide a clear 'yes' or 'no' for the 'isHealthyChoice' field and a detailed 'healthAssessment' explaining your reasoning.

Then, identify the primary food item and provide three creative and healthy 'recipeSuggestions' that could be made with it, keeping the user's health profile in mind.

{{#if latestHealthReport}}
Also consider the user's latest health report for a more in-depth analysis:
{{{latestHealthReport}}}
{{/if}}

User Profile: {{{userProfile}}}

Photo of food: {{media url=photoDataUri}}`,
});

const foodAssessorFlow = ai.defineFlow(
  {
    name: 'foodAssessorFlow',
    inputSchema: FoodAssessorInputSchema,
    outputSchema: FoodAssessorOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
