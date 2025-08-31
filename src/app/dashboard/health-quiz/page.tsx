
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, serverTimestamp, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { generateQuiz, QuizGeneratorOutput } from '@/ai/flows/quiz-generator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BrainCircuit, CheckCircle, XCircle, RotateCw, Trophy, Target, Lightbulb, Save, Play, BookOpen, Star, MoreHorizontal, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AnimatePresence, motion } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


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
  numberOfQuestions: z.number().min(3).max(15),
});
type QuizSetupFormData = z.infer<typeof quizSetupSchema>;

type QuizState = 'setup' | 'generating' | 'in_progress' | 'results';
type Question = QuizGeneratorOutput['questions'][0];
type UserAnswers = { [key: number]: number };

interface SavedQuiz extends QuizGeneratorOutput {
    id: string;
    userId: string;
    topic: string;
    difficulty: string;
    timestamp: Date;
    rating: number;
}

const QuizGenerator = ({ onQuizStart }: { onQuizStart: (quiz: QuizGeneratorOutput, settings: QuizSetupFormData) => void }) => {
    const [quizState, setQuizState] = useState<'setup' | 'generating'>('setup');
    const { toast } = useToast();

    const form = useForm<QuizSetupFormData>({
        resolver: zodResolver(quizSetupSchema),
        defaultValues: {
            topic: '',
            difficulty: 'medium',
            numberOfQuestions: 5,
        },
    });

     async function onSubmit(values: QuizSetupFormData) {
        setQuizState('generating');
        try {
            const result = await generateQuiz(values);
            if (result.questions.length === 0) {
                throw new Error("The AI didn't generate any questions. Please try a different topic.");
            }
            onQuizStart(result, values);
        } catch (error: any) {
            toast({ title: 'Quiz Generation Failed', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
            setQuizState('setup');
        }
    }

    const pageVariants = { initial: { opacity: 0, y: 20 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -20 } };
    const pageTransition = { type: "tween", ease: "anticipate", duration: 0.5 };

    if (quizState === 'generating') {
      return (
        <motion.div key="generating" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
            <Card className="flex flex-col items-center justify-center py-24">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <CardTitle className="mt-6">Generating your quiz...</CardTitle>
                <CardDescription className="mt-2">Our AI is preparing your questions.</CardDescription>
            </Card>
        </motion.div>
      )
    }

    return (
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
                            <FormField control={form.control} name="numberOfQuestions" render={({ field }) => (
                              <FormItem>
                                <FormLabel>Number of Questions: {field.value}</FormLabel>
                                <FormControl>
                                  <Slider
                                    value={[field.value]}
                                    onValueChange={(vals) => field.onChange(vals[0])}
                                    min={3}
                                    max={15}
                                    step={1}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )} />

                            <Button type="submit">Generate Quiz</Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </motion.div>
    )

}

export default function HealthQuizPage() {
  const [user] = useAuthState(auth);
  const [quizState, setQuizState] = useState<QuizState>('setup');
  const [quizData, setQuizData] = useState<QuizGeneratorOutput | null>(null);
  const [quizSettings, setQuizSettings] = useState<QuizSetupFormData | null>(null);
  const [userAnswers, setUserAnswers] = useState<UserAnswers>({});
  const [score, setScore] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const { toast } = useToast();
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [hasFetchedQuizzes, setHasFetchedQuizzes] = useState(false);
  const [activeTab, setActiveTab] = useState("generator");

  const fetchSavedQuizzes = useCallback(async () => {
    if (!user) return;
    setLoadingQuizzes(true);
    try {
        const q = query(
            collection(db, 'saved-quizzes'),
            where('userId', '==', user.uid),
            orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const quizzes = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: (doc.data().timestamp as Timestamp).toDate(),
        })) as SavedQuiz[];
        setSavedQuizzes(quizzes);
        setHasFetchedQuizzes(true); // Mark as fetched
    } catch (e: any) {
        toast({ title: 'Error', description: 'Failed to fetch saved quizzes.', variant: 'destructive' });
        console.error("Fetch error:", e);
    } finally {
        setLoadingQuizzes(false);
    }
  }, [user, toast]);
  
  useEffect(() => {
    if(activeTab === 'saved' && user && !hasFetchedQuizzes) {
      fetchSavedQuizzes();
    }
  }, [activeTab, user, hasFetchedQuizzes, fetchSavedQuizzes]);
  
  const startQuiz = (data: QuizGeneratorOutput, settings?: QuizSetupFormData) => {
    setQuizData(data);
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    if(settings) setQuizSettings(settings);
    setScore(0);
    setQuizState('in_progress');
  }

  const handleAnswerSelect = (questionIndex: number, answerIndex: number) => {
    setUserAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
  };

  const handleNextQuestion = () => {
    if (!quizData) return;
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      let finalScore = 0;
      quizData.questions.forEach((q, index) => {
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
    setQuizData(null);
    setQuizSettings(null);
    setUserAnswers({});
    setActiveTab('generator');
  };
  
  const handleQuit = () => {
    setQuizState('setup');
    setQuizData(null);
    setQuizSettings(null);
    setUserAnswers({});
  };

  const handleSaveQuiz = async () => {
    if (!user || !quizData || !quizSettings) return;
    try {
        await addDoc(collection(db, 'saved-quizzes'), {
            userId: user.uid,
            timestamp: serverTimestamp(),
            topic: quizSettings.topic,
            difficulty: quizSettings.difficulty,
            title: quizData.title,
            questions: quizData.questions,
            rating: 0,
        });
        toast({ title: 'Quiz Saved!', description: 'You can replay this quiz anytime from the "Saved Quizzes" tab.' });
        setHasFetchedQuizzes(false); // Allow refetching
        handleRestart();
        setActiveTab("saved");
    } catch(e: any) {
         toast({ title: 'Save failed', description: e.message || "Could not save the quiz.", variant: 'destructive' });
    }
  };
  
  const handleRateQuiz = async (quizId: string, rating: number) => {
      try {
        const docRef = doc(db, 'saved-quizzes', quizId);
        await updateDoc(docRef, { rating });
        toast({ title: "Rating updated", description: "Your rating has been saved." });
        setSavedQuizzes(prevQuizzes => 
            prevQuizzes.map(quiz => quiz.id === quizId ? { ...quiz, rating } : quiz)
        );
      } catch (e: any) {
          toast({ title: "Rating failed", description: e.message, variant: "destructive" });
      }
  };
  
  const handleDeleteQuiz = async (quizId: string) => {
      try {
        await deleteDoc(doc(db, 'saved-quizzes', quizId));
        toast({ title: "Quiz Deleted", description: "The quiz has been removed from your saved list." });
        setSavedQuizzes(prevQuizzes => prevQuizzes.filter(quiz => quiz.id !== quizId));
      } catch (e: any) {
        toast({ title: "Delete failed", description: e.message, variant: "destructive" });
      }
  }
  
  const pageVariants = { initial: { opacity: 0, y: 20 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -20 } };
  const pageTransition = { type: "tween", ease: "anticipate", duration: 0.5 };

  const currentQuestion = quizData?.questions[currentQuestionIndex];
  const quizLength = quizData?.questions.length ?? 0;
  
    const renderRating = (quiz: SavedQuiz) => {
        return (
            <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                    <Star
                        key={i}
                        className={`h-5 w-5 cursor-pointer ${i < quiz.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                        onClick={(e) => { e.stopPropagation(); handleRateQuiz(quiz.id, i + 1) }}
                    />
                ))}
            </div>
        );
    };

  return (
    <div className="max-w-3xl mx-auto">
      <AnimatePresence mode="wait">
        {quizState === 'setup' && (
          <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="generator">New Quiz</TabsTrigger>
                <TabsTrigger value="saved">Saved Quizzes</TabsTrigger>
              </TabsList>
              <TabsContent value="generator" className="mt-4">
                <QuizGenerator onQuizStart={startQuiz} />
              </TabsContent>
              <TabsContent value="saved" className="mt-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookOpen/> Saved Quizzes</CardTitle>
                        <CardDescription>Replay any quiz you have saved previously and rate them.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingQuizzes ? (
                            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
                        ) : savedQuizzes.length > 0 ? (
                            <div className="space-y-3">
                                {savedQuizzes.map(quiz => (
                                    <Card key={quiz.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div className="flex-grow">
                                            <p className="font-semibold">{quiz.title}</p>
                                            <p className="text-sm text-muted-foreground">{quiz.questions.length} questions &bull; Saved on {quiz.timestamp.toLocaleDateString()}</p>
                                            <div className="mt-2 sm:hidden">{renderRating(quiz)}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="hidden sm:flex">{renderRating(quiz)}</div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                     <DropdownMenuItem onClick={() => startQuiz(quiz, { topic: quiz.topic, difficulty: quiz.difficulty, numberOfQuestions: quiz.questions.length } as QuizSetupFormData)}>
                                                        <Play className="mr-2 h-4 w-4"/> Replay
                                                     </DropdownMenuItem>
                                                     <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600">
                                                                <Trash2 className="mr-2 h-4 w-4"/> Delete
                                                            </DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>This action cannot be undone. This will permanently delete this quiz.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDeleteQuiz(quiz.id)}>Delete</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                     </AlertDialog>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center py-8 text-muted-foreground">No saved quizzes yet.</p>
                        )}
                    </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        )}
        
        {quizState === 'in_progress' && currentQuestion && (
            <motion.div key="in_progress" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                <Card>
                    <CardHeader>
                        <CardTitle>Question {currentQuestionIndex + 1} of {quizLength}</CardTitle>
                        <CardDescription className="pt-4 text-lg font-semibold text-foreground">{currentQuestion.question}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup
                            onValueChange={(value) => handleAnswerSelect(currentQuestionIndex, parseInt(value))}
                            value={userAnswers[currentQuestionIndex]?.toString()}
                            className="space-y-4"
                        >
                            {currentQuestion.options.map((option, index) => (
                                <div key={index} className="flex items-center space-x-3 p-4 border rounded-md has-[:checked]:bg-muted has-[:checked]:border-primary transition-all">
                                    <RadioGroupItem value={index.toString()} id={`q${currentQuestionIndex}-o${index}`} />
                                    <label htmlFor={`q${currentQuestionIndex}-o${index}`} className="font-normal text-base cursor-pointer flex-1">{option}</label>
                                </div>
                            ))}
                        </RadioGroup>
                    </CardContent>
                    <CardFooter className="flex justify-between">
                        <Button onClick={handleQuit} variant="outline">
                            <XCircle className="mr-2 h-4 w-4" /> Quit
                        </Button>
                        <Button onClick={handleNextQuestion} disabled={userAnswers[currentQuestionIndex] === undefined}>
                            {currentQuestionIndex < quizLength - 1 ? 'Next Question' : 'Finish Quiz'}
                        </Button>
                    </CardFooter>
                </Card>
             </motion.div>
        )}

        {quizState === 'results' && quizData && (
            <motion.div key="results" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                <Card>
                    <CardHeader className="items-center text-center">
                        <Trophy className="w-16 h-16 text-yellow-400" />
                        <CardTitle className="text-3xl">Quiz Complete!</CardTitle>
                        <CardDescription className="text-xl">
                            You scored {score} out of {quizLength}!
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {quizData.questions.map((q, index) => {
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
                     <CardFooter className="flex-col sm:flex-row gap-4 justify-center">
                        <Button onClick={handleRestart} variant="outline">
                            <RotateCw className="mr-2 h-4 w-4" /> Try a New Quiz
                        </Button>
                        {quizSettings && (
                        <Button onClick={handleSaveQuiz}>
                            <Save className="mr-2 h-4 w-4" /> Save This Quiz
                        </Button>
                        )}
                    </CardFooter>
                </Card>
             </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
