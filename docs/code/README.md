# Code Documentation

## Project Structure

```mermaid
graph TD
    subgraph src ["src/"]
        subgraph app ["app/ (Routes)"]
            Landing["page.tsx (Landing)"]
            LoginPage["login/"]
            SignupPage["signup/"]
            Dashboard["dashboard/"]
        end

        subgraph ai ["ai/ (AI Layer)"]
            GenkitConfig["genkit.ts"]
            DevServer["dev.ts"]
            Flows["flows/"]
        end

        subgraph components ["components/"]
            UILib["ui/ (shadcn)"]
            LandingComps["landing/"]
            LogoComp["logo.tsx"]
        end

        subgraph lib ["lib/"]
            FirebaseLib["firebase.ts"]
            Utils["utils.ts"]
        end

        subgraph hooks ["hooks/"]
            UseMobile["use-mobile.tsx"]
            UseToast["use-toast.ts"]
        end
    end
```

## AI Flows Reference

All AI flows live in `src/ai/flows/` and use the shared Genkit instance from `src/ai/genkit.ts`.

### Flow Catalog

```mermaid
graph TD
    subgraph Vision ["Vision-Based Flows"]
        FA["food-analyzer.ts<br/>Photo → Calories + Impact"]
        HRA["health-report-analyzer.ts<br/>Report Image → Metrics"]
        PA["posture-analyzer.ts<br/>Video → Corrective Plan"]
    end

    subgraph Generative ["Generative Flows"]
        WR["workout-recommender.ts<br/>Profile → Workout Plan"]
        MR["meditation-recommender.ts<br/>Profile → Guided Session"]
        RG["recipe-generator.ts<br/>Profile → 5 Recipes"]
        CRG["conversational-recipe-generator.ts<br/>Prefs → 1 Detailed Recipe"]
        HR["habit-recommender.ts<br/>Goals → Habit Plan"]
        QG["quiz-generator.ts<br/>Topic → Quiz Questions"]
        CTG["calorie-target-generator.ts<br/>Stats → Daily Target"]
    end
```

### Flow Input/Output Contracts

#### food-analyzer.ts
```typescript
Input: {
  photoUrl: string;       // data URI of food image
  profile: string;        // JSON stringified user profile
  healthReport?: string;  // optional health report context
}
Output: {
  foodName: string;
  calories: number;
  healthImpact: string;
}
```

#### health-report-analyzer.ts
```typescript
Input: {
  reportImage: string;    // data URI of health report
  profile: string;        // JSON stringified user profile
}
Output: {
  summary: string;
  extractedMetrics: Array<{name, value, unit, interpretation}>;
  profileUpdateSuggestions: Array<{field, value, reason}>;
}
```

#### workout-recommender.ts
```typescript
Input: {
  profile: string;
  healthReport?: string;
  duration: number;       // minutes
  location: string;       // "home" | "gym"
  focusAreas: string[];
}
Output: {
  planTitle: string;
  planSummary: string;
  warmUp: Array<{exercise, duration, instructions}>;
  mainWorkout: Array<{exercise, sets, reps, duration, instructions}>;
  coolDown: Array<{exercise, duration, instructions}>;
  notes: string;
  tags: string[];
}
```

#### meditation-recommender.ts
```typescript
Input: {
  profile: string;
  duration: number;
  timeOfDay: string;
  goals: string[];
  customInstructions?: string;
}
Output: {
  title: string;
  summary: string;
  steps: Array<{instruction, duration}>;
  benefits: string;
  tags: string[];
}
```

#### conversational-recipe-generator.ts
```typescript
Input: {
  profile: string;
  mealType: string;
  cuisine: string;
  includeIngredients: string[];
  excludeIngredients: string[];
  dietaryNotes: string;
}
Output: {
  name: string;
  description: string;
  ingredients: Array<{item, amount}>;
  instructions: string[];
  healthFocus: string;
  prepTime: string;
  cookTime: string;
  servings: number;
  tags: string[];
}
```

#### habit-recommender.ts
```typescript
Input: {
  profile: string;
  goals: string[];
  customInstructions?: string;
}
Output: {
  planTitle: string;
  summary: string;
  habits: Array<{name, description, frequency, tip}>;
  benefits: string;
  tags: string[];
}
```

#### quiz-generator.ts
```typescript
Input: {
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  questionCount: number;
}
Output: {
  title: string;
  questions: Array<{
    question: string;
    options: [string, string, string, string];
    correctAnswerIndex: number;
    explanation: string;
  }>;
}
```

#### calorie-target-generator.ts
```typescript
Input: {
  age: number;
  bmi: number;
  currentWeight: number;
  targetWeight: number;
  healthIssues: string[];
  diets: string[];
}
Output: {
  dailyCalorieTarget: number;
}
```

## Firestore Data Access Patterns

```mermaid
sequenceDiagram
    participant Page as Dashboard Page
    participant FB as Firebase SDK
    participant FS as Firestore

    Note over Page,FS: Read Pattern (onSnapshot / getDoc)
    Page->>FB: query(collection, where("userId", "==", uid))
    FB->>FS: Execute query
    FS-->>FB: Documents
    FB-->>Page: Typed data

    Note over Page,FS: Write Pattern (addDoc / setDoc)
    Page->>FB: addDoc(collection, { userId, ...data, timestamp })
    FB->>FS: Write document
    FS-->>FB: Document reference
    FB-->>Page: Success

    Note over Page,FS: Delete Pattern
    Page->>FB: deleteDoc(doc(db, collection, docId))
    FB->>FS: Delete
    FS-->>Page: Confirmation
```

### Collection Query Index Requirements

| Collection | Query Pattern | Index |
|-----------|--------------|-------|
| `food-log` | userId + timestamp ASC | Composite |
| `workout-log` | userId + timestamp DESC | Composite |
| `workout-log` | userId + workoutType ASC | Composite |
| `meditation-log` | userId + timestamp DESC | Composite |
| `meditation-log` | userId + meditationType ASC | Composite |
| `saved-quizzes` | userId + timestamp DESC | Composite |

## Authentication Flow

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    Unauthenticated --> Login: Visit /login
    Unauthenticated --> Signup: Visit /signup

    Login --> Authenticated: signInWithEmailAndPassword
    Signup --> ProfileCreation: createUserWithEmailAndPassword
    ProfileCreation --> Authenticated: Default profile saved

    Authenticated --> DashboardReady: onAuthStateChanged + profile loaded
    DashboardReady --> ProfileReminder: Profile incomplete
    DashboardReady --> FullAccess: Profile complete

    Authenticated --> Unauthenticated: signOut
```

## Conventions

- **Path alias**: `@/` maps to `src/`
- **Client components**: Explicitly marked with `'use client'` directive
- **AI flows**: Each flow is a self-contained file with Zod schema validation
- **State management**: React hooks + Firebase listeners (no external state library)
- **Form handling**: React Hook Form with Zod resolvers for validation
- **Styling**: Tailwind utility classes, `cn()` helper for conditional merging
- **Icons**: Lucide React exclusively
- **Date handling**: `date-fns` library
- **PDF export**: jsPDF with autotable plugin for tabular reports

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase client API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | FCM sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Google Analytics measurement ID |
| `GOOGLE_API_KEY` | Google AI (Gemini) API key for Genkit |
