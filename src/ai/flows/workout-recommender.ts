'use server';
/**
 * @fileOverview An AI agent for generating personalized workout plans.
 *
 * - generateWorkoutPlan - A function that generates a workout plan based on user profile and preferences.
 * - WorkoutPreferencesInput - The input type for the generateWorkoutPlan function.
 * - WorkoutPlanOutput - The return type for the generateWorkoutPlan function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const WorkoutPreferencesInputSchema = z.object({
  userProfile: z.string().describe("A JSON string of the user's profile data, including health issues, age, and BMI."),
  latestHealthReport: z.string().optional().describe('A JSON string of the user\'s latest health report analysis for more detailed health context.'),
  workoutDuration: z.number().describe('The desired workout duration in minutes.'),
  location: z.enum(['home', 'gym']).describe('The location where the user will be working out.'),
  focusAreas: z.array(z.string()).describe('A list of focus areas for the workout (e.g., "Cardio", "Strength Training", "Flexibility").'),
});
export type WorkoutPreferencesInput = z.infer<typeof WorkoutPreferencesInputSchema>;


const ExerciseSchema = z.object({
    name: z.string().describe('The name of the exercise.'),
    sets: z.string().describe('The number of sets to perform (e.g., "3", "2-3").'),
    reps: z.string().describe('The number of repetitions or duration (e.g., "10-12 reps", "30 seconds").'),
    rest: z.string().describe('The rest period between sets (e.g., "60 seconds", "30-45 seconds").'),
    description: z.string().describe('A brief description of how to perform the exercise and its benefits for the user.'),
});

const WorkoutPlanOutputSchema = z.object({
  planTitle: z.string().describe('A catchy and descriptive title for the workout plan.'),
  planSummary: z.string().describe('A brief summary of the workout plan and its goals.'),
  warmUp: z.array(ExerciseSchema).describe('A list of warm-up exercises.'),
  mainWorkout: z.array(ExerciseSchema).describe('The main list of exercises for the workout session.'),
  coolDown: z.array(ExerciseSchema).describe('A list of cool-down exercises.'),
  notes: z.string().describe('Important notes, safety considerations, or words of encouragement for the user based on their health profile.'),
  tags: z.array(z.string()).describe("A list of 3-4 relevant tags for the workout plan (e.g., 'Home-Friendly', 'Strength', 'Low-Impact')."),
});
export type WorkoutPlanOutput = z.infer<typeof WorkoutPlanOutputSchema>;


export async function generateWorkoutPlan(input: WorkoutPreferencesInput): Promise<WorkoutPlanOutput> {
  return workoutRecommenderFlow(input);
}

const prompt = ai.definePrompt({
  name: 'workoutRecommenderPrompt',
  input: { schema: WorkoutPreferencesInputSchema },
  output: { schema: WorkoutPlanOutputSchema },
  prompt: `You are an expert fitness coach and physiotherapist.

Your task is to create a detailed, safe, and effective workout plan for the user based on their health profile, preferences, and latest health data.

**Crucially, you must consider all the user's health issues (like hypertension, diabetes, obesity) and physical data (age, BMI) to create a safe plan. For example, for a user with hypertension, suggest lower-impact cardio and avoid exercises that involve holding breath (Valsalva maneuver). For obesity, focus on low-impact, joint-friendly exercises.**

User Preferences:
- Desired Duration: {{{workoutDuration}}} minutes
- Location: {{{location}}}
- Focus Areas: {{#each focusAreas}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

User Profile: {{{userProfile}}}

{{#if latestHealthReport}}
Also consider the user's latest health report for a more in-depth personalization:
{{{latestHealthReport}}}
{{/if}}

Generate a complete workout plan that includes a title, summary, a warm-up section, the main workout, a cool-down section, and important notes. The main workout section should be the most substantial. For each exercise, provide the name, sets, reps/duration, rest time, and a brief description. Ensure the total time of the plan is close to the user's desired duration. Finally, add 3-4 relevant tags for the workout.`,
});

const workoutRecommenderFlow = ai.defineFlow(
  {
    name: 'workoutRecommenderFlow',
    inputSchema: WorkoutPreferencesInputSchema,
    outputSchema: WorkoutPlanOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
