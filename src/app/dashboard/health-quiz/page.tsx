'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { generateQuiz, QuizGeneratorOutput } from '@/ai/flows/quiz-generator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BrainCircuit, CheckCircle, XCircle, RotateCw, Trophy, Target, Lightbulb } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AnimatePresence, motion } from 'framer-motion';

const healthTopics = [
    "Nutrition Basics",
    "Cardiovascular Health",
    "Strength Training Principles",
    "Mental Wellness",
    "Sleep Hygiene",
    "Diabetes Management",
    "Understanding Fats",
    "Hydration and Health",
];

const quizSetupSchema = z.object({
  topic: z.string().min(1, 'Please select a topic.'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});
type QuizSetupFormData = z.infer<typeof quizSetupSchema>;

type QuizState = 'setup' | 'generating' | 'in_progress' | 'results';
type Question = QuizGeneratorOutput['questions'][0];
type UserAnswers = { [key: number]: number };

export default function HealthQuizPage() {
  const [quizState, setQuizState] = useState<QuizState>('setup');
  const [quiz, setQuiz] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [score, setScore] = useState(0);
  const { toast } = useToast();

  const form = useForm<QuizSetupFormData>({
    resolver: zodResolver(quizSetupSchema),
    defaultValues: {
      topic: '',
      difficulty: 'medium',
    },
  });

  async function onSubmit(values: QuizSetupFormData) {
    setQuizState('generating');
    try {
      const result = await generateQuiz(values);
      if (result.questions.length === 0) {
        throw new Error("The AI didn't generate any questions. Please try a different topic.");
      }
      setQuiz(result.questions);
      setUserAnswers({});
      setCurrentQuestionIndex(0);
      setScore(0);
      setQuizState('in_progress');
    } catch (error: any) {
      toast({ title: 'Quiz Generation Failed', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
      setQuizState('setup');
    }
  }

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    setUserAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // End of quiz, calculate score
      let finalScore = 0;
      quiz.forEach((q, index) => {
        if (userAnswers[index] === q.correctAnswerIndex) {
          finalScore++;
        }
      });
      setScore(finalScore);
      setQuizState('results');
    }
  };

  const handleRestart = () => {
    setQuizState('setup');
    form.reset();
  };
  
  const pageVariants = { initial: { opacity: 0, y: 20 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -20 } };
  const pageTransition = { type: "tween", ease: "anticipate", duration: 0.5 };

  return (
    <div className="max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
            {quizState === 'setup' && (
                 <motion.div key="setup" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BrainCircuit/> Health Knowledge Quiz</CardTitle>
                            <CardDescription>Select a topic and difficulty to test your health knowledge.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                    <FormField control={form.control} name="topic" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Topic</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue placeholder="Choose a health topic..." /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {healthTopics.map(topic => <SelectItem key={topic} value={topic}>{topic}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={form.control} name="difficulty" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Difficulty</FormLabel>
                                             <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="easy">Easy</SelectItem>
                                                    <SelectItem value="medium">Medium</SelectItem>
                                                    <SelectItem value="hard">Hard</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <Button type="submit">Generate Quiz</Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                 </motion.div>
            )}

            {quizState === 'generating' && (
                 <motion.div key="generating" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                    <Card className="flex flex-col items-center justify-center py-24">
                        <Loader2 className="h-16 w-16 animate-spin text-primary" />
                        <CardTitle className="mt-6">Generating your quiz...</CardTitle>
                        <CardDescription className="mt-2">Our AI is preparing your questions.</CardDescription>
                    </Card>
                 </motion.div>
            )}

            {quizState === 'in_progress' && quiz.length > 0 && (
                <motion.div key="in_progress" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Question {currentQuestionIndex + 1} of {quiz.length}</CardTitle>
                            <CardDescription className="pt-4 text-lg font-semibold text-foreground">{quiz[currentQuestionIndex].question}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <RadioGroup
                                onValueChange={(value) => handleAnswerSelect(currentQuestionIndex, parseInt(value))}
                                value={userAnswers[currentQuestionIndex]?.toString()}
                                className="space-y-4"
                            >
                                {quiz[currentQuestionIndex].options.map((option, index) => (
                                    <FormItem key={index} className="flex items-center space-x-3 p-4 border rounded-md has-[:checked]:bg-muted has-[:checked]:border-primary transition-all">
                                        <FormControl>
                                            <RadioGroupItem value={index.toString()} />
                                        </FormControl>
                                        <FormLabel className="font-normal text-base cursor-pointer flex-1">{option}</FormLabel>
                                    </FormItem>
                                ))}
                            </RadioGroup>
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleNextQuestion} disabled={userAnswers[currentQuestionIndex] === undefined}>
                                {currentQuestionIndex < quiz.length - 1 ? 'Next Question' : 'Finish Quiz'}
                            </Button>
                        </CardFooter>
                    </Card>
                 </motion.div>
            )}

            {quizState === 'results' && (
                <motion.div key="results" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                    <Card>
                        <CardHeader className="items-center text-center">
                            <Trophy className="w-16 h-16 text-yellow-400" />
                            <CardTitle className="text-3xl">Quiz Complete!</CardTitle>
                            <CardDescription className="text-xl">
                                You scored {score} out of {quiz.length}!
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {quiz.map((q, index) => {
                                const userAnswer = userAnswers[index];
                                const isCorrect = userAnswer === q.correctAnswerIndex;
                                return (
                                    <Card key={index} className={`p-4 ${isCorrect ? 'border-green-500' : 'border-red-500'}`}>
                                        <p className="font-semibold">{index + 1}. {q.question}</p>
                                        <div className="mt-2 text-sm space-y-1">
                                            <p className={`flex items-center gap-2 ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                                                {isCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                                Your answer: {q.options[userAnswer] ?? "Not answered"}
                                            </p>
                                            {!isCorrect && (
                                                <p className="flex items-center gap-2 text-green-600">
                                                    <Target size={16} />
                                                    Correct answer: {q.options[q.correctAnswerIndex]}
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-3 text-xs bg-muted p-2 rounded-md flex items-start gap-2">
                                            <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                                            <p className="text-muted-foreground">{q.explanation}</p>
                                        </div>
                                    </Card>
                                );
                            })}
                        </CardContent>
                         <CardFooter>
                            <Button onClick={handleRestart}>
                                <RotateCw className="mr-2 h-4 w-4" /> Try a New Quiz
                            </Button>
                        </CardFooter>
                    </Card>
                 </motion.div>
            )}

        </AnimatePresence>
    </div>
  );
}
