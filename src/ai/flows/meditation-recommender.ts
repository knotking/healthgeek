

'use server';
/**
 * @fileOverview An AI agent for generating personalized meditation practices.
 *
 * - generateMeditationPractice - A function that generates a meditation plan based on user preferences.
 * - MeditationPreferencesInput - The input type for the generateMeditationPractice function.
 * - MeditationPracticeOutput - The return type for the generateMeditationPractice function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MeditationPreferencesInputSchema = z.object({
  userProfile: z.string().describe("A JSON string of the user's profile data, including health issues."),
  duration: z.number().describe('The desired meditation duration in minutes.'),
  timeOfDay: z.enum(['morning', 'afternoon', 'evening']).describe('The time of day for the meditation.'),
  goals: z.array(z.string()).describe('A list of goals for the meditation session (e.g., "Reduce Stress", "Improve Focus", "Better Sleep").'),
});
export type MeditationPreferencesInput = z.infer<typeof MeditationPreferencesInputSchema>;


const MeditationStepSchema = z.object({
    step: z.number().describe('The step number.'),
    title: z.string().describe('The title of the meditation step (e.g., "Initial Settling", "Body Scan").'),
    instruction: z.string().describe('The detailed instruction for this step of the meditation.'),
    duration: z.string().describe('The estimated duration for this step (e.g., "1-2 minutes", "5 minutes").'),
});

const MeditationPracticeOutputSchema = z.object({
  title: z.string().describe('A suitable title for the meditation practice.'),
  summary: z.string().describe('A brief summary of the practice and its intended benefits.'),
  steps: z.array(MeditationStepSchema).describe('The step-by-step guide for the meditation session.'),
  benefits: z.string().describe('A short paragraph on how this specific practice helps achieve the user\'s goals, considering their profile.'),
  tags: z.array(z.string()).describe("A list of 3-4 relevant tags for the practice (e.g., 'Mindfulness', 'Stress Relief', 'Beginner-Friendly')."),
});
export type MeditationPracticeOutput = z.infer<typeof MeditationPracticeOutputSchema>;


export async function generateMeditationPractice(input: MeditationPreferencesInput): Promise<MeditationPracticeOutput> {
  return meditationRecommenderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'meditationRecommenderPrompt',
  input: { schema: MeditationPreferencesInputSchema },
  output: { schema: MeditationPracticeOutputSchema },
  prompt: `You are an expert mindfulness and meditation coach.

Your task is to create a detailed, safe, and effective guided meditation script for the user based on their goals, desired duration, and time of day.

**Crucially, you must tailor the meditation to their profile. For example, if a user has hypertension, you might focus on calming breathing techniques. For anxiety, focus on grounding exercises.**

User Preferences:
- Desired Duration: {{{duration}}} minutes
- Time of Day: {{{timeOfDay}}}
- Goals: {{#each goals}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

User Profile: {{{userProfile}}}

Generate a complete meditation practice that includes a title, summary, step-by-step instructions (with a title, detailed instruction, and estimated duration for each step), a "benefits" section explaining how it helps the user, and 3-4 relevant tags. The total time of the practice should be close to the user's desired duration.`,
});

const meditationRecommenderFlow = ai.defineFlow(
  {
    name: 'meditationRecommenderFlow',
    inputSchema: MeditationPreferencesInputSchema,
    outputSchema: MeditationPracticeOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
