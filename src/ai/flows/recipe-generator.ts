'use server';
/**
 * @fileOverview An AI agent for recipe generation.
 *
 * - generateRecipes - A function that suggests recipes based on user profile.
 * - RecipeGeneratorInput - The input type for the generateRecipes function.
 * - RecipeGeneratorOutput - The return type for the generateRecipes function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RecipeGeneratorInputSchema = z.object({
  userProfile: z.string().describe("A JSON string of the user's profile data, including health issues and diet preferences."),
  latestHealthReport: z.string().optional().describe('A JSON string of the user\'s latest health report analysis.'),
});
export type RecipeGeneratorInput = z.infer<typeof RecipeGeneratorInputSchema>;

const RecipeSchema = z.object({
    name: z.string().describe("The name of the recipe."),
    description: z.string().describe("A short, enticing description of the recipe."),
    ingredients: z.array(z.string()).describe("A list of ingredients for the recipe."),
    instructions: z.array(z.string()).describe("The step-by-step cooking instructions."),
    healthFocus: z.string().describe("How this recipe aligns with the user's health goals and profile."),
});

const RecipeGeneratorOutputSchema = z.object({
  recipes: z.array(RecipeSchema).describe('A list of 5 recipe suggestions tailored to the user.'),
});
export type RecipeGeneratorOutput = z.infer<typeof RecipeGeneratorOutputSchema>;

export async function generateRecipes(input: RecipeGeneratorInput): Promise<RecipeGeneratorOutput> {
  return recipeGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recipeGeneratorPrompt',
  input: { schema: RecipeGeneratorInputSchema },
  output: { schema: RecipeGeneratorOutputSchema },
  prompt: `You are an expert nutritionist, creative chef, and health coach.

Your task is to generate 5 unique, healthy, and delicious recipe ideas tailored specifically to the user's profile. You must consider their dietary needs, health issues, and weight goals to create recipes that are both beneficial and appealing.

For each recipe, provide a name, a short description, a list of ingredients, step-by-step instructions, and a brief explanation of its health focus.

{{#if latestHealthReport}}
Also consider the user's latest health report for a more in-depth analysis and personalization:
{{{latestHealthReport}}}
{{/if}}

User Profile: {{{userProfile}}}

Generate 5 distinct recipes based on this information.`,
});

const recipeGeneratorFlow = ai.defineFlow(
  {
    name: 'recipeGeneratorFlow',
    inputSchema: RecipeGeneratorInputSchema,
    outputSchema: RecipeGeneratorOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
