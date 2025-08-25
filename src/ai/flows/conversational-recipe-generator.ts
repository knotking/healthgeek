'use server';
/**
 * @fileOverview An AI agent for conversational recipe generation.
 *
 * - generateSingleRecipe - A function that generates a single recipe based on detailed user preferences.
 * - RecipePreferencesInput - The input type for the generateSingleRecipe function.
 * - SingleRecipeOutput - The return type for the generateSingleRecipe function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const RecipePreferencesInputSchema = z.object({
  mealType: z.string().describe('The desired meal type (e.g., Breakfast, Lunch, Dinner, Snack).'),
  cuisine: z.string().describe('The desired cuisine style (e.g., Italian, Mexican, etc.).'),
  ingredientsToInclude: z.string().optional().describe('A comma-separated list of ingredients the user wants to include.'),
  ingredientsToExclude: z.string().optional().describe('A comma-separated list of ingredients the user wants to exclude.'),
  dietaryNotes: z.string().optional().describe('Any other specific dietary notes or restrictions (e.g., "low-fodmap", "gluten-free").'),
  userProfile: z.string().describe("A JSON string of the user's profile data, including health issues and diet preferences."),
});
export type RecipePreferencesInput = z.infer<typeof RecipePreferencesInputSchema>;

const SingleRecipeOutputSchema = z.object({
  name: z.string().describe("The name of the recipe."),
  description: z.string().describe("A short, enticing description of the recipe."),
  ingredients: z.array(z.string()).describe("A list of ingredients for the recipe."),
  instructions: z.array(z.string()).describe("The step-by-step cooking instructions."),
  healthFocus: z.string().describe("How this recipe aligns with the user's health goals and profile."),
  prepTime: z.string().describe("Estimated preparation time."),
  cookTime: z.string().describe("Estimated cooking time."),
  servings: z.string().describe("Number of servings the recipe makes."),
  tags: z.array(z.string()).describe("A list of 3-4 relevant tags for the recipe (e.g., 'High-Protein', 'Quick Meal', 'Vegetarian')."),
});
export type SingleRecipeOutput = z.infer<typeof SingleRecipeOutputSchema>;

export async function generateSingleRecipe(input: RecipePreferencesInput): Promise<SingleRecipeOutput> {
  return conversationalRecipeGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'conversationalRecipeGeneratorPrompt',
  input: { schema: RecipePreferencesInputSchema },
  output: { schema: SingleRecipeOutputSchema },
  prompt: `You are an expert nutritionist, creative chef, and health coach.

Your task is to generate a single, healthy, and delicious recipe based on the user's specific preferences and their overall health profile.

User Preferences:
- Meal Type: {{{mealType}}}
- Cuisine: {{{cuisine}}}
{{#if ingredientsToInclude}}- Must-include Ingredients: {{{ingredientsToInclude}}}{{/if}}
{{#if ingredientsToExclude}}- Exclude Ingredients: {{{ingredientsToExclude}}}{{/if}}
{{#if dietaryNotes}}- Additional Notes: {{{dietaryNotes}}}{{/if}}

Base your recommendations on the user's health profile below, considering their health issues and general diet.
User Profile: {{{userProfile}}}

Generate one complete recipe that includes a name, description, ingredients list, step-by-step instructions, health focus, prep time, cook time, and serving size. Also, provide 3-4 relevant tags for the recipe.`,
});

const conversationalRecipeGeneratorFlow = ai.defineFlow(
  {
    name: 'conversationalRecipeGeneratorFlow',
    inputSchema: RecipePreferencesInputSchema,
    outputSchema: SingleRecipeOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
