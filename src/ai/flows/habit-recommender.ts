'use server';
/**
 * @fileOverview An AI agent for generating personalized habit recommendations.
 *
 * - generateHabitPlan - A function that generates a habit plan based on user goals.
 * - HabitRecommendationInput - The input type for the generateHabitPlan function.
 * - HabitRecommendationOutput - The return type for the generateHabitPlan function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const HabitRecommendationInputSchema = z.object({
  userProfile: z.string().describe("A JSON string of the user's profile data, including health issues."),
  goals: z.array(z.string()).describe('A list of primary goals the user wants to achieve (e.g., "Weight Management", "Better Sleep").'),
  customInstructions: z.string().optional().describe('Any specific free-text instructions or context from the user for the AI.'),
});
export type HabitRecommendationInput = z.infer<typeof HabitRecommendationInputSchema>;


const HabitSchema = z.object({
    name: z.string().describe('A short, actionable name for the habit (e.g., "Morning Hydration").'),
    description: z.string().describe('A detailed description of what the habit involves and why it is beneficial.'),
    implementationTip: z.string().describe('A practical tip to help the user easily integrate this habit into their daily routine.'),
    frequency: z.string().describe('The recommended frequency for this habit (e.g., "Daily", "3 times a week").'),
});

const HabitRecommendationOutputSchema = z.object({
  planTitle: z.string().describe('A suitable title for the habit plan.'),
  summary: z.string().describe('A brief, encouraging summary of the plan and how it addresses the user\'s goals.'),
  habits: z.array(HabitSchema).describe('A list of 3-5 recommended habits to help the user achieve their goals.'),
  benefits: z.string().describe('A short paragraph on the long-term benefits of sticking to this habit plan, considering the user\'s profile.'),
  tags: z.array(z.string()).describe("A list of 3-4 relevant tags for the plan (e.g., 'Mindfulness', 'Energy Boost', 'Healthy Living')."),
});
export type HabitRecommendationOutput = z.infer<typeof HabitRecommendationOutputSchema>;


export async function generateHabitPlan(input: HabitRecommendationInput): Promise<HabitRecommendationOutput> {
  return habitRecommenderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'habitRecommenderPrompt',
  input: { schema: HabitRecommendationInputSchema },
  output: { schema: HabitRecommendationOutputSchema },
  prompt: `You are an expert behavioral scientist and health coach.

Your task is to create a simple, actionable, and personalized habit plan for the user based on their stated goals and health profile. The plan should consist of 3-5 keystone habits that will have the most significant impact.

**Crucially, you must tailor the habits to the user's profile. For example, if a user has hypertension, a habit might be "Mindful Salt Reduction". For anxiety, it could be "5-Minute Morning Journaling".**

{{#if customInstructions}}
The user has provided the following specific instructions, please prioritize them:
"{{{customInstructions}}}"
{{/if}}

User Goals: {{#each goals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

User Profile: {{{userProfile}}}

Generate a complete habit plan that includes a title, a summary, a list of 3-5 habits (each with a name, description, implementation tip, and frequency), a "benefits" section, and 3-4 relevant tags. The habits should be easy to start and build upon.`,
});

const habitRecommenderFlow = ai.defineFlow(
  {
    name: 'habitRecommenderFlow',
    inputSchema: HabitRecommendationInputSchema,
    outputSchema: HabitRecommendationOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
