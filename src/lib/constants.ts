// 색상 팔레트 및 카테고리 아이콘 옵션 상수

export const COLOR_PALETTE = [
  { name: '파랑', value: '#3b82f6' },
  { name: '인디고', value: '#6366f1' },
  { name: '보라', value: '#8b5cf6' },
  { name: '핑크', value: '#ec4899' },
  { name: '빨강', value: '#ef4444' },
  { name: '주황', value: '#f97316' },
  { name: '노랑', value: '#f59e0b' },
  { name: '초록', value: '#10b981' },
  { name: '청록', value: '#06b6d4' },
  { name: '슬레이트', value: '#64748b' },
];

export const CATEGORY_ICON_OPTIONS = [
  { id: 'utensils', label: '식사' },
  { id: 'coffee', label: '카페' },
  { id: 'shopping-cart', label: '장보기' },
  { id: 'shopping-bag', label: '쇼핑' },
  { id: 'car', label: '교통' },
  { id: 'home', label: '주거' },
  { id: 'smartphone', label: '통신' },
  { id: 'heart-pulse', label: '의료' },
  { id: 'film', label: '여가' },
  { id: 'book-open', label: '교육' },
  { id: 'baby', label: '육아' },
  { id: 'dog', label: '반려' },
  { id: 'plane', label: '여행' },
  { id: 'dumbbell', label: '운동' },
  { id: 'wallet', label: '급여' },
  { id: 'gift', label: '선물' },
  { id: 'trending-up', label: '투자' },
  { id: 'coins', label: '용돈' },
  { id: 'piggy-bank', label: '저축' },
  { id: 'briefcase', label: '사업' },
  { id: 'sparkles', label: '청소' },
  { id: 'spray-can', label: '세정/장비' },
  { id: 'building-2', label: '상가/오피스' },
  { id: 'key-round', label: '입주/퇴실' },
  { id: 'droplets', label: '스팀/세척' },
  { id: 'receipt', label: '정산/인보이스' },
  { id: 'tag', label: '일반' },
  { id: 'more-horizontal', label: '기타' },
];

export const PAYMENT_METHODS = ['카드', '현금', '계좌이체'] as const;
