'use client';

import React from 'react';
import {
  Utensils,
  Coffee,
  Car,
  Home,
  ShoppingBag,
  ShoppingCart,
  HeartPulse,
  Film,
  BookOpen,
  MoreHorizontal,
  Wallet,
  Gift,
  TrendingUp,
  Coins,
  PlusCircle,
  Tag,
  Smartphone,
  Plane,
  Baby,
  Dog,
  Dumbbell,
  PiggyBank,
  Briefcase,
  Sparkles,
  SprayCan,
  Building2,
  KeyRound,
  Droplets,
  Receipt,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  car: Car,
  home: Home,
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  'heart-pulse': HeartPulse,
  film: Film,
  'book-open': BookOpen,
  'more-horizontal': MoreHorizontal,
  wallet: Wallet,
  gift: Gift,
  'trending-up': TrendingUp,
  coins: Coins,
  'plus-circle': PlusCircle,
  tag: Tag,
  smartphone: Smartphone,
  plane: Plane,
  baby: Baby,
  dog: Dog,
  dumbbell: Dumbbell,
  'piggy-bank': PiggyBank,
  briefcase: Briefcase,
  sparkles: Sparkles,
  'spray-can': SprayCan,
  'building-2': Building2,
  'key-round': KeyRound,
  droplets: Droplets,
  receipt: Receipt,
};

interface CategoryIconProps {
  name?: string;
  size?: number;
  className?: string;
}

// DB에 저장된 아이콘 키에 대응하는 Lucide 아이콘 렌더링
export function CategoryIcon({ name = 'tag', size = 18, className = '' }: CategoryIconProps) {
  const Icon = ICON_MAP[name] || Tag;
  return <Icon size={size} className={className} />;
}
