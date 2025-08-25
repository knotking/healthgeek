// This file is machine-generated - edit at your own risk!

'use server';

/**
 * @fileOverview FAQ generator AI agent.
 *
 * - generateFaq - A function that handles the FAQ generation process.
 * - GenerateFaqInput - The input type for the generateFaq function.
 * - GenerateFaqOutput - The return type for the generateFaq function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFaqInputSchema = z.object({
  userActivity: z
    .string()
    .describe(
      'A description of the user activity on the HealthGeek platform.'
    ),
  userInterests: z
    .string()
    .describe('A description of the user interests related to health.'),
});
export type GenerateFaqInput = z.infer<typeof GenerateFaqInputSchema>;

const GenerateFaqOutputSchema = z.object({
  faqs: z
    .array(z.string())
    .describe('An array of frequently asked questions.'),
});
export type GenerateFaqOutput = z.infer<typeof GenerateFaqOutputSchema>;

export async function generateFaq(input: GenerateFaqInput): Promise<GenerateFaqOutput> {
  return generateFaqFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFaqPrompt',
  input: {schema: GenerateFaqInputSchema},
  output: {schema: GenerateFaqOutputSchema},
  prompt: `You are an expert in generating FAQs for websites.

  Based on the user's activity and interests, generate a list of frequently asked questions that would be helpful for them.

  User Activity: {{{userActivity}}}
  User Interests: {{{userInterests}}}

  Please provide the FAQs in an array format.
  `,
});

const generateFaqFlow = ai.defineFlow(
  {
    name: 'generateFaqFlow',
    inputSchema: GenerateFaqInputSchema,
    outputSchema: GenerateFaqOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
