import { Utensils, Landmark, Trees, Gem } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { PlaceCategory } from '@/types';

export interface CategoryMeta {
  key: PlaceCategory;
  label: string;
  icon: LucideIcon;
}

export const CATEGORY_META: Record<PlaceCategory, CategoryMeta> = {
  food: { key: 'food', label: 'Food', icon: Utensils },
  culture: { key: 'culture', label: 'Culture', icon: Landmark },
  nature: { key: 'nature', label: 'Nature', icon: Trees },
  hidden: { key: 'hidden', label: 'Hidden Gems', icon: Gem },
};

/** Ordered list for filter chips. */
export const CATEGORY_ORDER: PlaceCategory[] = ['food', 'culture', 'nature', 'hidden'];
