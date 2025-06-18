
# WanderAI - Your Personal AI Travel Planner

WanderAI is a Next.js web application designed to help users create personalized travel itineraries using the power of generative AI. Users can input their travel preferences, and WanderAI, leveraging Google's Gemini models via Genkit, crafts detailed day-by-day plans. The application also features user authentication, itinerary history, refinement capabilities, contextual AI chat for travel discussions, and PDF export for itineraries.

## Core Features

*   **User Authentication**: Secure login and registration system (currently using local browser storage).
*   **Profile Management**: Users can update their name, change passwords, and manage their account (including deletion).
*   **AI-Powered Itinerary Generation**:
    *   Input form for destination, interests, currency, budget, and trip duration.
    *   Utilizes Google Gemini models via Genkit to generate detailed, personalized travel plans.
*   **Itinerary Display & Refinement**:
    *   Clear, organized display of the generated itinerary.
    *   Option to provide feedback and have the AI refine the itinerary.
*   **Itinerary History**:
    *   Saved itineraries are listed for registered users.
    *   Users can view, delete individual itineraries, or clear their entire history.
    *   Ability to refine itineraries directly from history (saves as a new entry).
*   **Contextual AI Chatbot**:
    *   Engage in a conversation about a specific itinerary (destination, activities, etc.).
    *   The chatbot is context-aware and focuses on travel-related queries.
    *   Chat history is saved per itinerary in local storage.
*   **PDF Export**: Download generated itineraries as PDF documents.
*   **Theme Toggle**: Switch between Light, Dark, and System default themes. Preference is saved in local storage.
*   **Responsive Design**: Optimized for various screen sizes (desktop, tablet, mobile).
*   **AI-Suggested Interests**: Get suggestions for travel interests while filling the form.

## Tech Stack

*   **Framework**: Next.js 15 (App Router)
*   **Language**: TypeScript
*   **UI Library**: React 18
*   **Styling**: Tailwind CSS
*   **UI Components**: ShadCN UI
*   **AI Integration**: Genkit
    *   **Model Provider**: `@genkit-ai/googleai` (for Google Gemini models like `gemini-1.5-flash-latest`)
*   **Form Management**: React Hook Form
*   **Schema Validation**: Zod
*   **Icons**: Lucide React
*   **PDF Generation**: jsPDF, html2canvas (client-side)

## Getting Started

### Prerequisites

*   Node.js (v18 or later recommended)
*   npm or yarn

### Environment Variables

This project uses Genkit, which requires a Google AI API key. Create a `.env` file in the root of the project and add your API key:

```env
GOOGLE_API_KEY=your_google_ai_api_key_here
```

You can obtain an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/shivam367/WanderAI.git
    cd wanderai-app
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or
    # yarn install
    ```

### Running the Application

1.  **Start the Next.js development server**:
    ```bash
    npm run dev
    ```
    The application will typically be available at `http://localhost:9002`.

2.  **Start the Genkit development UI (Inspector)**:
    In a separate terminal, run:
    ```bash
    npm run genkit:dev
    # or for auto-reloading on flow changes:
    # npm run genkit:watch
    ```
    The Genkit Inspector will be available at `http://localhost:4000`. This allows you to inspect flows, traces, and manage your Genkit development environment.

## Project Structure

*   `src/app/`: Next.js App Router pages and layouts.
    *   `src/app/api/genkit/`: Genkit API route integration for Next.js.
    *   `src/app/(pages)/page.tsx`: Main page components for different routes.
    *   `src/app/globals.css`: Global styles and ShadCN UI theme variables.
    *   `src/app/layout.tsx`: Root layout for the application.
*   `src/components/`: Reusable UI components.
    *   `src/components/ui/`: ShadCN UI components.
    *   `src/components/layout/`: Header, Footer components.
    *   `src/components/auth/`: Authentication related components.
    *   `src/components/wander-ai/`: Core application feature components.
*   `src/ai/`: Genkit related files.
    *   `src/ai/flows/`: Definitions for AI flows (e.g., itinerary generation, chat).
    *   `src/ai/genkit.ts`: Genkit initialization and configuration.
    *   `src/ai/dev.ts`: Entry point for `genkit start`.
*   `src/lib/`: Utility functions, schemas (Zod), and client-side data management (auth, itinerary storage).
*   `src/contexts/`: React context providers (e.g., AuthContext).
*   `public/`: Static assets.

## Key AI Flows

The application utilizes several Genkit flows defined in `src/ai/flows/`:

*   `generate-itinerary.ts`: Takes user preferences (destination, interests, budget, duration, currency) and generates a detailed travel itinerary.
*   `refine-itinerary.ts`: Takes an existing itinerary and user feedback to produce a revised itinerary.
*   `suggest-interests-flow.ts`: Provides AI-based suggestions for travel interests as the user types in the form.
*   `itinerary-chat-flow.ts`: Powers the contextual chatbot, allowing users to discuss a specific itinerary. It maintains conversation history and focuses on travel-related topics.

## Styling

WanderAI uses Tailwind CSS for utility-first styling and ShadCN UI for pre-built, customizable components. The base theme (colors, fonts, radius) is defined in `src/app/globals.css` using CSS HSL variables, which are then consumed by Tailwind and ShadCN components.

## Authentication & Data Persistence

*   **Authentication**: User authentication (registration, login, profile updates, password changes, account deletion) is handled client-side and stores user data (including a simple password representation for this demo version) in the browser's `localStorage`.
*   **Data Persistence**:
    *   **Itineraries**: Saved itineraries are stored in `localStorage`, scoped by the user's email.
    *   **Chat History**: Conversations with the chatbot are stored in `localStorage`, scoped by user email and itinerary ID.
    *   **Theme Preference**: The selected theme (Light/Dark/System) is saved in `localStorage`.

**Note**: The current local storage-based approach is suitable for demonstration and single-browser use. For a production application, a proper backend database and server-side session management would be necessary.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue. (Placeholder - can be expanded)

## License

This project is licensed under the MIT License. (Placeholder - can be changed)
