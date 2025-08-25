'use server';
/**
 * @fileOverview An AI agent to analyze health reports.
 *
 * - analyzeHealthReport - Analyzes a health report image or document.
 * - HealthReportAnalysisInput - The input type for the analyzeHealthReport function.
 * - HealthReportAnalysisOutput - The return type for the analyzeHealthReport function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const HealthReportAnalysisInputSchema = z.object({
  reportPhotoDataUri: z
    .string()
    .describe(
      "A photo or document of a health report, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  existingProfile: z.string().describe("A JSON string of the user's current profile data."),
});
export type HealthReportAnalysisInput = z.infer<typeof HealthReportAnalysisInputSchema>;

const MetricSchema = z.object({
  name: z.string().describe('The name of the metric (e.g., "Total Cholesterol", "Blood Glucose").'),
  value: z.string().describe('The value of the metric (e.g., "200 mg/dL", "95 mg/dL").'),
  interpretation: z.string().describe('A brief interpretation of this specific value (e.g., "Borderline High", "Normal").'),
});

const HealthReportAnalysisOutputSchema = z.object({
  summary: z.string().describe('A concise, overall summary of the health report findings.'),
  extractedMetrics: z.array(MetricSchema).describe('An array of key metrics extracted from the report.'),
  profileUpdateSuggestions: z.object({
    healthIssues: z.array(z.string()).describe("A list of potential 'healthIssues' to add to the user's profile based on the report (e.g., ['hypertension', 'cholesterol'])."),
  }).describe('Suggestions for updating the user profile based on the analysis.'),
});
export type HealthReportAnalysisOutput = z.infer<typeof HealthReportAnalysisOutputSchema>;

export async function analyzeHealthReport(input: HealthReportAnalysisInput): Promise<HealthReportAnalysisOutput> {
  return healthReportAnalyzerFlow(input);
}

const prompt = ai.definePrompt({
  name: 'healthReportAnalyzerPrompt',
  input: { schema: HealthReportAnalysisInputSchema },
  output: { schema: HealthReportAnalysisOutputSchema },
  prompt: `You are an expert medical analyst.

Analyze the provided health report image or document. Extract key metrics, provide a clear interpretation for each, and write an overall summary of the findings.

Based on the analysis, suggest updates to the user's profile. Compare the findings with their existing profile to avoid suggesting issues they already have listed. The available 'healthIssues' IDs are: 'diabetes', 'hypertension', 'cholesterol', 'obesity', 'thyroid'. Only suggest IDs from this list.

Existing User Profile: {{{existingProfile}}}

Health Report: {{media url=reportPhotoDataUri}}`,
});

const healthReportAnalyzerFlow = ai.defineFlow(
  {
    name: 'healthReportAnalyzerFlow',
    inputSchema: HealthReportAnalysisInputSchema,
    outputSchema: HealthReportAnalysisOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
