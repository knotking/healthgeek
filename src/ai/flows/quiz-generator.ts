'use server';
/**
 * @fileOverview An AI agent for generating health-related quizzes.
 *
 * - generateQuiz - A function that generates a quiz based on a topic and difficulty.
 * - QuizGeneratorInput - The input type for the generateQuiz function.
 * - QuizGeneratorOutput - The return type for the generateQuiz function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const QuizGeneratorInputSchema = z.object({
  topic: z.string().describe('The health topic for the quiz (e.g., "Cardiovascular Health", "Nutrition Basics").'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of the quiz.'),
  numberOfQuestions: z.number().min(3).max(15).describe('The number of questions to generate for the quiz.'),
});
export type QuizGeneratorInput = z.infer<typeof QuizGeneratorInputSchema>;

const QuestionSchema = z.object({
  question: z.string().describe('The quiz question.'),
  options: z.array(z.string()).describe('A list of 4 possible answers for the question.'),
  correctAnswerIndex: z.number().describe('The 0-based index of the correct answer in the options array.'),
  explanation: z.string().describe('A brief explanation for why the correct answer is right.'),
});

const QuizGeneratorOutputSchema = z.object({
  title: z.string().describe('A short, catchy title for the quiz.'),
  questions: z.array(QuestionSchema).describe('A list of quiz questions based on the requested number.'),
});
export type QuizGeneratorOutput = z.infer<typeof QuizGeneratorOutputSchema>;

export async function generateQuiz(input: QuizGeneratorInput): Promise<QuizGeneratorOutput> {
  return quizGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'quizGeneratorPrompt',
  input: { schema: QuizGeneratorInputSchema },
  output: { schema: QuizGeneratorOutputSchema },
  prompt: `You are an expert in health education.

Your task is to create a quiz with {{{numberOfQuestions}}} multiple-choice questions on the specified health topic and difficulty level. Also generate a short, catchy title for the quiz.

Each question must have:
- A clear question text.
- Exactly 4 answer options.
- The 0-based index of the correct answer.
- A brief explanation of the correct answer.

Topic: {{{topic}}}
Difficulty: {{{difficulty}}}

Generate the quiz now.`,
});

const quizGeneratorFlow = ai.defineFlow(
  {
    name: 'quizGeneratorFlow',
    inputSchema: QuizGeneratorInputSchema,
    outputSchema: QuizGeneratorOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
