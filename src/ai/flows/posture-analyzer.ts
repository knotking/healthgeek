'use server';
/**
 * @fileOverview An AI agent for posture analysis.
 *
 * - analyzePosture - A function that analyzes a user's posture from a video.
 * - PostureAnalysisInput - The input type for the analyzePosture function.
 * - PostureAnalysisOutput - The return type for the analyzePosture function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PostureAnalysisInputSchema = z.object({
  videoDataUri: z
    .string()
    .describe(
      "A video of a user's posture, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  question: z.string().describe("A specific question the user has about their posture in the video."),
  userProfile: z.string().describe("A JSON string of the user's profile data, including age, health issues, and fitness goals."),
});
export type PostureAnalysisInput = z.infer<typeof PostureAnalysisInputSchema>;

const PostureAnalysisOutputSchema = z.object({
  analysis: z.string().describe("A detailed analysis of the user's posture based on the video and their question."),
  recommendations: z.array(z.string()).describe("A list of actionable recommendations and corrective exercises to improve the user's posture."),
});
export type PostureAnalysisOutput = z.infer<typeof PostureAnalysisOutputSchema>;

export async function analyzePosture(input: PostureAnalysisInput): Promise<PostureAnalysisOutput> {
  return postureAnalyzerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'postureAnalyzerPrompt',
  input: { schema: PostureAnalysisInputSchema },
  output: { schema: PostureAnalysisOutputSchema },
  prompt: `You are an expert kinesiologist and physical therapist.

Analyze the user's posture in the provided video. The user has a specific question about their posture, which you must address directly in your analysis.

Consider the user's profile (age, health issues, etc.) to provide safe and relevant recommendations.

User's Question: "{{{question}}}"

User's Profile: {{{userProfile}}}

Video of user's posture: {{media url=videoDataUri}}

Based on the video and the user's question, provide a detailed 'analysis' of their posture. Then, provide a list of specific, actionable 'recommendations' for exercises or habit changes to correct any issues you identify.`,
});

const postureAnalyzerFlow = ai.defineFlow(
  {
    name: 'postureAnalyzerFlow',
    inputSchema: PostureAnalysisInputSchema,
    outputSchema: PostureAnalysisOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
