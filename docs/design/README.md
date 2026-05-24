# Design System & UX

## Design Philosophy

HealthGeek follows a calm, approachable health-focused design language that avoids clinical aesthetics while maintaining trust and clarity.

## Color System

```mermaid
graph LR
    subgraph Palette
        Primary["Primary: Soft Sky Blue #87CEEB"]
        Background["Background: Very Light Blue #F0F8FF"]
        Accent["Accent: Muted Green #98FB98"]
    end
```

| Role | Color | Usage |
|------|-------|-------|
| Primary | `#87CEEB` (Soft Sky Blue) | Trust, well-being, calm |
| Background | `#F0F8FF` (Very Light Blue) | Clarity, non-clinical feel |
| Accent | `#98FB98` (Muted Green) | CTAs, health association |

**Typography**: PT Sans (humanist sans-serif) — modern with warmth.

## Component Library

Built on **shadcn/ui** (Radix UI + Tailwind CSS + class-variance-authority):

```mermaid
graph TD
    subgraph Primitives ["Radix UI Primitives"]
        Dialog
        DropdownMenu
        Tabs
        Accordion
        Select
        Toast
        Popover
        Tooltip
        Switch
        Slider
        Checkbox
        RadioGroup
        ScrollArea
        Progress
        Separator
        Avatar
        AlertDialog
    end

    subgraph Composed ["Composed Components"]
        Sidebar
        Form["Form (RHF + Zod)"]
        Calendar["Calendar (react-day-picker)"]
        Carousel["Carousel (embla)"]
        Chart["Charts (recharts)"]
    end

    subgraph Custom ["Custom Components"]
        Logo
        LandingHeader
        Hero
        HowItWorks
        Footer
        AuthRedirect
    end
```

## Layout Architecture

```mermaid
graph TD
    subgraph AppShell ["Application Shell"]
        SidebarNav["Sidebar Navigation"]
        Header["Header Bar (page title + trigger)"]
        MainContent["Main Content Area"]
    end

    subgraph SidebarNav
        S1[Insights]
        S2[Analysis]
        S3[Tracking]
        S4[Recommendations]
        S5[Health Quiz]
        S6[Reports]
        S7[Provider]
        S8[Marketplace]
        S9[User Menu]
    end

    subgraph UserMenu ["User Dropdown"]
        Profile
        Settings
        Support
        Logout
    end

    S9 --> UserMenu
```

## User Journeys

### New User Onboarding

```mermaid
journey
    title New User Onboarding
    section Discovery
        Visit landing page: 5: User
        Read features: 4: User
        Click Get Started: 5: User
    section Registration
        Fill signup form: 3: User
        Account created: 5: System
        Profile reminder shown: 4: System
    section Profile Setup
        Enter personal info: 3: User
        Select health issues: 4: User
        Choose diet preferences: 4: User
        AI generates calorie target: 5: System
        Profile saved: 5: System
    section First Use
        Explore dashboard: 4: User
        Track first meal: 5: User
        Get first recommendation: 5: User
```

### Daily Health Tracking

```mermaid
journey
    title Daily Health Tracking Flow
    section Morning
        Open tracking page: 5: User
        Upload breakfast photo: 4: User
        AI analyzes food: 5: System
        Review calories: 4: User
        Log confirmed: 5: System
    section Midday
        Log lunch via camera: 4: User
        Check daily progress: 5: User
        View progress bar: 4: User
    section Evening
        Log dinner: 4: User
        Log workout: 4: User
        Log meditation: 3: User
        Review daily totals: 5: User
```

### Health Report Analysis

```mermaid
journey
    title Health Report Analysis
    section Upload
        Navigate to Analysis: 5: User
        Upload report image: 4: User
        Wait for AI processing: 3: User
    section Review
        View extracted metrics: 5: System
        Read interpretations: 5: User
        Review profile suggestions: 4: System
    section Action
        Accept profile updates: 5: User
        Profile auto-updated: 5: System
        New recommendations available: 4: System
```

## Page Layouts

### Dashboard Home (Insights)

```
+----------------------------------+
| Sidebar  |  Header: Insights     |
|          |------------------------|
| Nav      |  [Tracking Card]      |
| Items    |  Meals | Workouts |   |
|          |  Meditations          |
|          |                        |
|          |  [Analysis Card]      |
|          |  Health Reports        |
|          |                        |
|          |  [Recommendations]    |
|          |  Recipes | Workouts   |
|          |  Meditations | Habits |
|          |                        |
|          |  [Knowledge Card]     |
|          |  Quizzes Taken         |
+----------------------------------+
```

### Tracking Page (3-Tab Interface)

```
+----------------------------------+
| [Calories] [Workouts] [Meditation]|
|----------------------------------|
| [Track New Meal]     [Search]    |
|----------------------------------|
| Today's Progress:                |
| ████████░░░░ 1200/2000 kcal     |
|----------------------------------|
| History:                         |
| - Chicken Salad  | 350 cal | 12pm|
| - Oatmeal        | 280 cal | 8am |
+----------------------------------+
```

## Responsive Design

- **Desktop**: Full sidebar + content area
- **Mobile**: Collapsible sidebar with trigger button, full-width content
- **Breakpoint**: `md` (768px) for sidebar visibility toggle

## Animation & Motion

Uses **Framer Motion** for:
- Page transitions
- Card hover effects
- Loading states
- Modal entries/exits

## Iconography

**Lucide React** icon set throughout:
- `PieChart` — Insights
- `FileScan` — Analysis
- `ClipboardList` — Tracking
- `Sparkles` — Recommendations
- `BrainCircuit` — Health Quiz
- `Book` — Reports
- `Handshake` — Provider
- `Store` — Marketplace
