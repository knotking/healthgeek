'use server';
/**
 * @fileOverview An AI agent to generate a daily calorie target.
 *
 * - generateCalorieTarget - A function that generates a daily calorie target based on user profile.
 * - CalorieTargetInput - The input type for the generateCalorieTarget function.
 * - CalorieTargetOutput - The return type for the generateCalorieTarget function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CalorieTargetInputSchema = z.object({
  age: z.number().describe('The age of the user.'),
  bmi: z.number().describe('The BMI of the user.'),
  currentWeight: z.number().describe('The current weight of the user.'),
  targetWeight: z.number().describe('The target weight of the user.'),
  weightUnit: z.enum(['LB', 'KG']).describe('The unit for weight (LB or KG).'),
  healthIssues: z.array(z.string()).describe('A list of health issues for the user.'),
  diets: z.array(z.string()).describe('A list of dietary preferences for the user.'),
});
export type CalorieTargetInput = z.infer<typeof CalorieTargetInputSchema>;

const CalorieTargetOutputSchema = z.object({
  dailyCalorieTarget: z.number().describe('The recommended daily calorie intake target.'),
});
export type CalorieTargetOutput = z.infer<typeof CalorieTargetOutputSchema>;

export async function generateCalorieTarget(input: CalorieTargetInput): Promise<CalorieTargetOutput> {
  return calorieTargetGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'calorieTargetGeneratorPrompt',
  input: { schema: CalorieTargetInputSchema },
  output: { schema: CalorieTargetOutputSchema },
  prompt: `You are an expert nutritionist.

Based on the user's profile, calculate a recommended daily calorie target for them. Consider their age, BMI, current and target weight, health issues, and diet preferences to make a reasonable recommendation for steady and healthy weight management.

User Profile:
- Age: {{{age}}}
- BMI: {{{bmi}}}
- Current Weight: {{{currentWeight}}} {{{weightUnit}}}
- Target Weight: {{{targetWeight}}} {{{weightUnit}}}
- Health Issues: {{#each healthIssues}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
- Diets: {{#each diets}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}

Provide only the numeric value for the daily calorie target.`,
});

const calorieTargetGeneratorFlow = ai.defineFlow(
  {
    name: 'calorieTargetGeneratorFlow',
    inputSchema: CalorieTargetInputSchema,
    outputSchema: CalorieTargetOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
