'use server';
/**
 * @fileOverview A food analysis AI agent.
 *
 * - analyzeFood - A function that analyzes a food photo.
 * - FoodAnalysisInput - The input type for the analyzeFood function.
 * - FoodAnalysisOutput - The return type for the analyzeFood function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const FoodAnalysisInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of food, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  userProfile: z.string().describe('A JSON string of the user\'s profile data, including health issues and diet preferences.'),
  latestHealthReport: z.string().optional().describe('A JSON string of the user\'s latest health report analysis.'),
});
export type FoodAnalysisInput = z.infer<typeof FoodAnalysisInputSchema>;

const FoodAnalysisOutputSchema = z.object({
  foodName: z.string().describe('The name of the identified food item.'),
  calories: z.number().describe('The estimated calorie count of the food item.'),
  healthImpact: z.string().describe('A brief analysis of how this food impacts the user based on their profile.'),
});
export type FoodAnalysisOutput = z.infer<typeof FoodAnalysisOutputSchema>;

export async function analyzeFood(input: FoodAnalysisInput): Promise<FoodAnalysisOutput> {
  return foodAnalyzerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'foodAnalyzerPrompt',
  input: { schema: FoodAnalysisInputSchema },
  output: { schema: FoodAnalysisOutputSchema },
  prompt: `You are an expert nutritionist and health coach.

Analyze the food in the provided image. Identify the food item, estimate its calorie content, and provide a health impact analysis.

The user's profile is provided below. Use their health issues and dietary preferences to tailor the health impact analysis. For example, if they have diabetes, comment on the sugar content. If they are on a keto diet, comment on the carb content.

{{#if latestHealthReport}}
Also consider the user's latest health report for a more in-depth analysis:
{{{latestHealthReport}}}
{{/if}}

User Profile: {{{userProfile}}}

Photo of food: {{media url=photoDataUri}}`,
});

const foodAnalyzerFlow = ai.defineFlow(
  {
    name: 'foodAnalyzerFlow',
    inputSchema: FoodAnalysisInputSchema,
    outputSchema: FoodAnalysisOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
