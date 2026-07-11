// ---------------------------------------------------------------------------
// Domain types shared across screens, stores and mock data.
// ---------------------------------------------------------------------------

export type BudgetRange = 'budget' | 'mid' | 'luxury';

export type Interest = 'culture' | 'food' | 'adventure' | 'relaxation';

/** Categories used for Discover pins + filter chips. */
export type PlaceCategory = 'food' | 'culture' | 'nature' | 'hidden';

export interface Preferences {
  budget: BudgetRange | null;
  interests: Interest[];
  durationDays: number;
  destination: string;
  startDate: string | null; // ISO date string
  endDate: string | null; // ISO date string
}

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  rating: number;
  reviews: number;
  priceLevel: '$' | '$$' | '$$$';
  description: string;
  latitude: number;
  longitude: number;
  durationMin: number;
}

export interface ItineraryItem {
  id: string;
  time: string; // "09:00"
  title: string;
  description: string;
  durationMin: number;
  category: PlaceCategory;
  placeId?: string;
  // Present on AI-generated items (mock items resolve coords via placeId instead).
  latitude?: number;
  longitude?: number;
}

export interface ItineraryDay {
  day: number;
  label: string; // "Day 1 · Mon"
  items: ItineraryItem[];
}

export interface AudioStop {
  name: string;
  latitude: number;
  longitude: number;
}

export interface AudioTour {
  id: string;
  title: string;
  durationMin: number;
  language: string;
  price: number; // USD
  narrator: string;
  description: string;
  stops: AudioStop[];
}

export type BookingCategory = 'restaurants' | 'activities' | 'transport';

export type BookingStatus = 'Confirmed' | 'Pending';

export interface Booking {
  id: string;
  category: BookingCategory;
  name: string;
  detail: string;
  dateTime: string; // human readable
  status: BookingStatus;
  partySize?: number;
}

