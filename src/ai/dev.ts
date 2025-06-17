
import { config } from 'dotenv';
config();

import '@/ai/flows/refine-itinerary.ts';
import '@/ai/flows/generate-itinerary.ts';
import '@/ai/flows/suggest-interests-flow.ts';
import '@/ai/flows/itinerary-chat-flow.ts';
