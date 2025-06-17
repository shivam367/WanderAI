
# WanderAI - Project Design & Technical Report

## Webpage Design UI (Responsive Web Application for Desktop & Mobile)

This report outlines the design specifications, user features, technical architecture, and UI components of the WanderAI application, a responsive web application designed to assist users in planning travel itineraries using Artificial Intelligence.

---

## 🔷 Brand Identity & Design Specifications

### 🖋 Typography

The typography for WanderAI aims for a blend of elegance and readability, catering to a modern travel planning experience.

*   **Main Heading Font (e.g., Page Titles, Hero Sections)**:
    *   Font Family: 'Playfair Display', serif
    *   Weight: Bold (700)
    *   Size: Typically 2.5rem - 3.5rem (40px - 56px), responsive.
*   **Section Heading Font (e.g., Card Titles, Form Titles)**:
    *   Font Family: 'Playfair Display', serif
    *   Weight: Bold (700) or Semibold
    *   Size: Typically 1.75rem - 2.25rem (28px - 36px).
*   **Sub Heading Font (e.g., Form Section Labels, Itinerary Day Titles)**:
    *   Font Family: 'Playfair Display', serif
    *   Weight: Regular or Semibold
    *   Size: Typically 1.25rem - 1.5rem (20px - 24px).
*   **Text Content Font (Body Text, Paragraphs, Descriptions)**:
    *   Font Family: 'PT Sans', sans-serif
    *   Weight: Regular (400)
    *   Size: Typically 1rem (16px) or 0.9rem (14.4px).
*   **Small/Supporting Text Font (e.g., Captions, Meta Info, Form Helper Text)**:
    *   Font Family: 'PT Sans', sans-serif
    *   Weight: Regular (400)
    *   Size: Typically 0.75rem - 0.875rem (12px - 14px).
*   **Button Text Font**:
    *   Font Family: 'PT Sans', sans-serif
    *   Weight: Regular (400) or Medium (if available for PT Sans, otherwise Bold 700)
    *   Size: Typically 0.875rem - 1rem (14px - 16px).
*   **Code Font (Conceptual, for AI interaction/display if needed)**:
    *   Font Family: `monospace` (e.g., Consolas, 'Courier New')
*   **Brand Name & Logo Font (Header)**:
    *   Font Family: 'Playfair Display', serif
    *   Weight: Bold (700)
    *   Size: Approx. 1.5rem - 2rem (24px - 32px) for "WanderAI" title.

_These fonts are defined in `src/app/layout.tsx` (via Google Fonts) and applied through `tailwind.config.ts` and `src/app/globals.css`._

### 🎨 Color Scheme (Effective Theme from `globals.css`)

The color scheme is designed to be inviting and travel-friendly, with clear distinctions for interactive elements.

**Core Theme HSL Variables (Light Mode):**

*   **Primary (Sky Blue)**: `hsl(208 76% 72%)` (Approx. `#87CEEB`)
    *   Used for: Main calls to action, primary buttons, active states, key highlights.
    *   Primary Foreground: `hsl(208 76% 20%)` (Dark Blue for text on Sky Blue)
*   **Accent (Soft Orange)**: `hsl(33 100% 64%)` (Approx. `#FFB347`)
    *   Used for: Secondary calls to action, highlighting important elements, form submission buttons.
    *   Accent Foreground: `hsl(33 100% 20%)` (Dark Orange/Brown for text on Soft Orange)
*   **Background (Light Gray/Alice Blue)**: `hsl(208 100% 97%)` (Approx. `#F0F8FF`)
    *   Main application background.
*   **Foreground (Text - Dark)**: `hsl(222.2 84% 4.9%)`
    *   Default text color on light backgrounds.
*   **Card Background (White)**: `hsl(0 0% 100%)`
    *   Background for card components.
*   **Border (Softer Blue/Gray)**: `hsl(208 50% 88%)`
    *   Default border color for elements.
*   **Input Background**: `hsl(208 50% 92%)`
*   **Destructive (Errors/Warnings - Reddish)**: `hsl(0 72% 51%)`
    *   Destructive Foreground: `hsl(0 0% 98%)`

**Dark Mode Variants:**
The dark mode provides an alternative, low-light UI option, maintaining brand consistency. (Refer to `.dark` scope in `globals.css` for specific HSL values).
*   Dark Background: `hsl(222.2 84% 4.9%)`
*   Dark Foreground (Text - Light): `hsl(210 40% 98%)`
*   Primary and Accent colors are adjusted for better contrast on dark backgrounds.

### 🌙 Dark Mode & ☀️ Light Mode Variants (Effective Implementation)

The application supports Light, Dark, and System default themes.

*   **Light Mode**:
    *   Background: Light Gray/Alice Blue (`#F0F8FF`)
    *   Text: Dark (`#09090b` approx.)
    *   Primary Elements: Sky Blue (`#87CEEB`)
    *   Accent Elements: Soft Orange (`#FFB347`)
*   **Dark Mode**:
    *   Background: Very Dark Blue/Black (`#09090b` approx.)
    *   Text: Light Gray/White (`#f2f2f2` approx.)
    *   Primary Elements: Adjusted Sky Blue for dark theme.
    *   Accent Elements: Adjusted Soft Orange for dark theme.

Theme preferences are persisted in the user's browser via `localStorage`.

---

## 🔹 User Features & Main Pages

### 👤 General User Experience

WanderAI offers a personalized experience through user accounts. Users can register, log in, and manage their profiles and travel plans.

### 📌 Key Features:

*   **User Authentication**:
    *   Registration with name, email, and password.
    *   Login for existing users.
    *   Secure session management (currently via local storage for demonstration).
*   **Personalized Dashboard**: (Assumed as `/dashboard`)
    *   Main landing area for logged-in users to start planning.
    *   Access to the itinerary input form.
*   **Itinerary Input & Generation**:
    *   Form fields for Destination, Interests, Currency, Budget Amount, and Duration.
    *   Input validation using Zod schemas.
    *   AI-powered itinerary generation via Genkit (Google Gemini).
    *   AI-powered interest suggestions while typing.
*   **Itinerary Display & Interaction**:
    *   Clear, sectioned display of the generated travel plan.
    *   Accordion-style layout for day-by-day details and other sections.
*   **Itinerary Refinement**:
    *   Users can provide textual feedback to modify the generated itinerary.
    *   AI refines the itinerary based on the feedback.
*   **Contextual AI Chatbot**:
    *   Chat interface associated with each generated/viewed itinerary.
    *   Allows users to ask follow-up questions about their plan, local tips, nearby attractions, etc.
    *   Constrained to travel-related topics for the specific destination.
    *   Chat history is saved and loaded per itinerary.
*   **Itinerary History**:
    *   Logged-in users can view a list of their previously generated itineraries.
    *   Options to view, delete individual itineraries, or clear all history.
    *   Ability to refine itineraries directly from the history page (saved as a new entry).
*   **User Profile Management**:
    *   View and update user name.
    *   Change account password.
    *   Option to delete their account (removes profile and all associated data from local storage).
    *   Option to clear all WanderAI application data from the current browser.
*   **PDF Export**:
    *   Download generated itineraries as formatted PDF documents.
*   **Theme Toggle**:
    *   Switch between Light, Dark, and System default UI themes.
    *   User preference is persisted in `localStorage`.
*   **Responsive Design**:
    *   The application interface adapts to various screen sizes (desktop, tablet, mobile).

### 📍 Key Navigation Flows (User Journeys):

1.  **New User Onboarding & First Itinerary**:
    *   User lands on Homepage (`/`) → Clicks "Login / Sign Up" → Navigates to Auth Page (`/auth`).
    *   Selects "Register" tab → Fills registration form → Account created.
    *   Redirected to "Login" tab → Enters credentials → Logs in.
    *   Redirected to Dashboard (`/dashboard`).
    *   Fills Itinerary Input Form → Submits → Views generated Itinerary → Optionally refines, chats, or exports PDF.
2.  **Existing User Login & Planning**:
    *   User lands on Homepage (`/`) or Auth Page (`/auth`).
    *   Enters login credentials → Logs in → Redirected to Dashboard (`/dashboard`).
    *   Proceeds to create a new itinerary or accesses history.
3.  **Managing Itinerary History**:
    *   User navigates to Header → Clicks "History" → Navigates to History Page (`/history`).
    *   Views list of saved itineraries.
    *   Clicks "View, Refine & Chat" on an itinerary → Views full itinerary details.
    *   Can refine the itinerary (saves as new), chat about it, or delete it.
    *   Can "Clear All History".
4.  **Profile Management**:
    *   User navigates to Header → Clicks "Profile" → Navigates to Profile Page (`/profile`).
    *   Updates name, changes password, logs out, deletes account, or clears app data.
5.  **Theme Customization**:
    *   User clicks theme toggle icon in Header → Selects Light, Dark, or System mode from dropdown → Interface updates instantly.

### 💡 Unique Selling Propositions / Key Differentiators

*   **Personalized AI Travel Planning**: Core focus on generating custom travel itineraries tailored to individual preferences.
*   **Integrated Contextual Chat**: Enables interactive refinement and exploration of travel plans directly with an AI assistant that understands the current itinerary.
*   **Comprehensive User Account Features**: Allows users to save, manage, and revisit their travel plans over time.
*   **Modern & Responsive UI**: Built with ShadCN UI and Tailwind CSS for a clean, accessible, and professional user experience across devices.
*   **Client-Side AI Interaction**: Leverages Genkit to dynamically call Google Gemini models, providing rich, generative content directly in the browser.

---

## 📌 Data Flow & Backend (Client-Side Focus)

WanderAI primarily operates on the client-side for its core AI interactions and data storage in this version.

### 🤖 AI Model Integration:

*   **Core AI Engine**: Genkit framework (`genkit` and `@genkit-ai/next`).
*   **Language Models**: Google Gemini models accessed via the `@genkit-ai/googleai` plugin. The default model is specified in `src/ai/genkit.ts` (e.g., `gemini-1.5-flash-latest`).
*   **Capabilities Utilized**:
    *   **Text Generation**: Used for creating detailed itineraries, refining existing plans based on feedback, suggesting interests, and powering chatbot responses.
    *   **Structured Data Output**: AI models are prompted to return data that can be parsed or directly used (e.g., Zod schemas define input/output for flows).
*   **AI Flows Defined (`src/ai/flows/`)**:
    *   `generate-itinerary.ts`: Takes user preferences (destination, interests, currency, budget, duration) to generate a full travel plan.
    *   `refine-itinerary.ts`: Accepts an existing itinerary and user feedback to produce a modified version.
    *   `suggest-interests-flow.ts`: Dynamically suggests travel interests based on user input in the form.
    *   `itinerary-chat-flow.ts`: Manages the conversational AI, taking itinerary context, chat history, and user messages to provide travel-related assistance.

### ☁️ Cloud Services:

*   **Google AI Platform**: Utilized via Genkit for accessing Gemini models. Requires a `GOOGLE_API_KEY` configured in the environment.

### 🔒 User Data Management:

All user-specific data in the current version of WanderAI is stored in the **user's browser via `localStorage`**.

*   **User Accounts**: User profiles (name, email, and a simple representation of password for this demo) are stored in a list within `localStorage`.
*   **Itineraries**: Generated and refined itineraries are stored in `localStorage`, keyed by the user's email, allowing each user to have their own history.
*   **Chat History**: Conversations with the AI chatbot are stored in `localStorage`, associated with a specific user and itinerary ID.
*   **Theme Preference**: The selected UI theme (light/dark/system) is stored in `localStorage`.
*   **Data Scope**: Data is local to the browser it was created in. There is no central server-side database for persistent storage of user accounts or itineraries beyond `localStorage`.

---

## ⚙️ UI Components & Design Patterns (ShadCN UI & Custom Components)

WanderAI leverages the ShadCN UI component library, built on Radix UI and Tailwind CSS, for a consistent and accessible user interface.

### 🧩 Key UI Components Used:

*   **Layout & Navigation**:
    *   `Header`, `Footer` (custom layout components).
    *   `Sheet`: For the AI chatbot interface.
    *   `Link` (from `next/link`): For client-side navigation.
    *   `DropdownMenu`: For theme selection and potentially other actions.
*   **Content Display**:
    *   `Card`: Extensively used for forms, itinerary display sections, profile sections, history items.
    *   `Accordion`: For collapsible sections within the itinerary display (e.g., day-by-day plans).
    *   `ScrollArea`: For scrollable content regions like itinerary display and chat.
    *   `Avatar`: For user/bot representation in chat.
    *   `Image` (from `next/image`): For static images (e.g., on the homepage).
*   **Forms & Input**:
    *   `Form` (from `react-hook-form` via ShadCN).
    *   `Input`, `Textarea`, `Select`, `Button`.
*   **Interaction & Feedback**:
    *   `AlertDialog`: For confirmations (e.g., delete actions, clear history).
    *   `Toast` (via `useToast` hook): For non-intrusive notifications.
    *   `LoadingSpinner` (custom): To indicate processing states.
    *   `Tooltip`: For providing additional information on hover.
*   **Structure & Styling**:
    *   `Separator`: For visual division of content.
    *   `cn` utility: For conditional class name merging.
    *   Tailwind CSS: For all styling and responsive design.

### 🎨 Theming:

*   **Dark/Light/System Mode**: Managed by the `ThemeToggle` component (`src/components/layout/theme-toggle.tsx`), which adds/removes a `.dark` class on the `<html>` element and uses `localStorage` for persistence.
*   **CSS Variables**: Theme colors (primary, accent, background, foreground, etc.) are defined as CSS HSL variables in `src/app/globals.css` for both light and dark modes. These variables are used by ShadCN components and custom styles.
*   **Responsive Design**: Achieved primarily through Tailwind CSS's responsive utility classes (e.g., `sm:`, `md:`, `lg:`) and flex/grid layouts to ensure usability across different screen sizes.
```