import type {
  Place,
  ItineraryDay,
  ItineraryItem,
  AudioTour,
  Booking,
  Weather,
} from '@/types';

import placesJson from './places.json';
import itineraryJson from './itinerary.json';
import swapsJson from './swaps.json';
import audioToursJson from './audioTours.json';
import bookingsJson from './bookings.json';
import weatherJson from './weather.json';

// Typed accessors over the raw JSON mock data.
export const places = placesJson as Place[];
export const itinerary = itineraryJson as ItineraryDay[];
export const swapPool = swapsJson as ItineraryItem[];
export const audioTours = audioToursJson as AudioTour[];
export const bookings = bookingsJson as Booking[];
export const weather = weatherJson as Weather;

export const findPlace = (id?: string): Place | undefined =>
  id ? places.find((p) => p.id === id) : undefined;

export const findAudioTour = (id: string): AudioTour | undefined =>
  audioTours.find((t) => t.id === id);
