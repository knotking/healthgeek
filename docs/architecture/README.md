# Architecture

## System Overview

HealthGeek is a full-stack AI health platform built on Next.js with Firebase infrastructure and Google Genkit AI pipelines.

```mermaid
graph TB
    subgraph Client ["Client (Browser)"]
        UI[React UI Components]
        RHF[React Hook Form]
        Media[MediaRecorder API]
    end

    subgraph NextJS ["Next.js 15 Application"]
        Pages[App Router Pages]
        ServerActions[Server Actions / AI Flows]
    end

    subgraph Firebase ["Firebase Platform"]
        Auth[Firebase Auth]
        Firestore[(Cloud Firestore)]
        Hosting[App Hosting]
    end

    subgraph AI ["AI Layer (Genkit)"]
        Genkit[Genkit Runtime]
        Gemini[Gemini 2.0 Flash]
    end

    UI --> Pages
    RHF --> Pages
    Media --> Pages
    Pages --> ServerActions
    Pages --> Auth
    Pages --> Firestore
    ServerActions --> Genkit
    Genkit --> Gemini
    Hosting --> NextJS
```

## Request Flow

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant N as Next.js Server
    participant G as Genkit AI
    participant F as Firestore
    participant A as Firebase Auth

    U->>B: Interact with UI
    B->>A: Verify auth token
    A-->>B: Auth state
    B->>N: Server action call
    N->>G: AI flow execution
    G-->>N: AI response (structured JSON)
    N-->>B: Rendered result
    B->>F: Persist data
    F-->>B: Confirmation
    B-->>U: Updated UI
```

## Data Architecture

```mermaid
erDiagram
    PROFILES {
        string userId PK
        string email
        string name
        int age
        object height
        object weight
        float bmi
        array healthIssues
        array diets
        int dailyCalorieTarget
    }

    FOOD_LOG {
        string docId PK
        string userId FK
        timestamp timestamp
        string foodName
        int calories
        string healthImpact
    }

    WORKOUT_LOG {
        string docId PK
        string userId FK
        timestamp timestamp
        string workoutType
        int duration
        int caloriesBurned
        string notes
    }

    MEDITATION_LOG {
        string docId PK
        string userId FK
        timestamp timestamp
        string meditationType
        int duration
        string description
    }

    HEALTH_REPORTS {
        string docId PK
        string userId FK
        timestamp timestamp
        string summary
        array extractedMetrics
        array profileUpdateSuggestions
    }

    RECOMMENDATION_HISTORY {
        string docId PK
        string userId FK
        string type
        object data
        boolean isPublic
        int rating
        timestamp timestamp
    }

    SAVED_QUIZZES {
        string docId PK
        string userId FK
        timestamp timestamp
        string topic
        string difficulty
        string title
        array questions
        int rating
    }

    PROFILES ||--o{ FOOD_LOG : "logs meals"
    PROFILES ||--o{ WORKOUT_LOG : "logs workouts"
    PROFILES ||--o{ MEDITATION_LOG : "logs meditations"
    PROFILES ||--o{ HEALTH_REPORTS : "uploads reports"
    PROFILES ||--o{ RECOMMENDATION_HISTORY : "saves recommendations"
    PROFILES ||--o{ SAVED_QUIZZES : "takes quizzes"
```

## AI Pipeline Architecture

```mermaid
graph LR
    subgraph Inputs
        Photo[Food Photo]
        Video[Posture Video]
        Report[Health Report Image]
        Profile[User Profile]
        Prefs[User Preferences]
    end

    subgraph Genkit ["Genkit AI Flows"]
        FA[Food Analyzer]
        HRA[Health Report Analyzer]
        PA[Posture Analyzer]
        WR[Workout Recommender]
        MR[Meditation Recommender]
        RG[Recipe Generator]
        CRG[Conversational Recipe Gen]
        HR[Habit Recommender]
        QG[Quiz Generator]
        CTG[Calorie Target Generator]
    end

    subgraph Outputs
        Calories[Calorie Estimate]
        Metrics[Extracted Metrics]
        Exercises[Corrective Exercises]
        Plan[Workout Plan]
        Guided[Guided Meditation]
        Recipe[Recipe Details]
        Habits[Habit Plan]
        Quiz[Quiz Questions]
        Target[Daily Calorie Target]
    end

    Photo --> FA --> Calories
    Report --> HRA --> Metrics
    Video --> PA --> Exercises
    Profile --> WR --> Plan
    Profile --> MR --> Guided
    Profile --> RG --> Recipe
    Prefs --> CRG --> Recipe
    Profile --> HR --> Habits
    Prefs --> QG --> Quiz
    Profile --> CTG --> Target
```

## Deployment Architecture

```mermaid
graph TB
    subgraph GitHub
        Repo[Git Repository]
    end

    subgraph FirebaseHosting ["Firebase App Hosting"]
        Build[Cloud Build]
        Runtime[Next.js Runtime]
    end

    subgraph FirebaseServices ["Firebase Services"]
        AuthService[Authentication]
        FirestoreDB[(Firestore Database)]
        Rules[Security Rules]
        Indexes[Composite Indexes]
    end

    subgraph GoogleCloud ["Google Cloud"]
        GenkitAI[Genkit / Gemini API]
    end

    Repo -->|deploy| Build
    Build --> Runtime
    Runtime --> AuthService
    Runtime --> FirestoreDB
    Rules --> FirestoreDB
    Indexes --> FirestoreDB
    Runtime --> GenkitAI
```

## Security Model

```mermaid
graph TD
    User[User Request] --> AuthCheck{Authenticated?}
    AuthCheck -->|No| Login[Redirect to Login]
    AuthCheck -->|Yes| OwnerCheck{Owner of resource?}
    OwnerCheck -->|No| Deny[Access Denied]
    OwnerCheck -->|Yes| Allow[Allow Read/Write]

    subgraph FirestoreRules ["Firestore Security Rules"]
        R1["profiles/{userId}: owner only"]
        R2["food-log/{docId}: owner only"]
        R3["workout-log/{docId}: owner only"]
        R4["meditation-log/{docId}: owner only"]
        R5["health-reports/{docId}: owner only"]
        R6["recommendation-history/{docId}: owner only"]
        R7["saved-quizzes/{docId}: owner only"]
    end
```

## Module Dependency Graph

```mermaid
graph TD
    Layout["dashboard/layout.tsx"] --> Auth["lib/firebase.ts (Auth)"]
    Layout --> DB["lib/firebase.ts (Firestore)"]

    Pages["Dashboard Pages"] --> Layout
    Pages --> UIComponents["components/ui/*"]
    Pages --> Hooks["hooks/*"]
    Pages --> AIFlows["ai/flows/*"]

    AIFlows --> GenkitConfig["ai/genkit.ts"]
    GenkitConfig --> GoogleAI["@genkit-ai/googleai"]

    UIComponents --> Radix["@radix-ui/*"]
    UIComponents --> Tailwind["tailwind-merge + cva"]
```
