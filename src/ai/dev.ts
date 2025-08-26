'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/food-analyzer.ts';
import '@/ai/flows/calorie-target-generator.ts';
import '@/ai/flows/food-assessor.ts';
import '@/ai/flows/health-report-analyzer.ts';
import '@/ai/flows/conversational-recipe-generator.ts';
import '@/ai/flows/workout-recommender.ts';
import '@/ai/flows/meditation-recommender.ts';
import '@/ai/flows/quiz-generator.ts';
