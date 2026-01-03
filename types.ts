export enum BookStatus {
  TO_READ = 'Por Leer',
  READING = 'Leyendo',
  FINISHED = 'Leído',
  ABANDONED = 'Abandonado'
}

export type EmotionType = 'ROMANCE' | 'SAD' | 'FUNNY' | 'MIND_BLOWING' | 'ADVENTURE' | 'SCARY';

export interface Book {
  id: string;
  title: string;
  author: string;
  coverUrl: string;
  totalPages: number;
  currentPage: number;
  status: BookStatus;
  description?: string;
  genre?: string;
  rating?: number; // 1-5
  review?: string; // Short review
  notes?: string; // User journal notes
  publicationYear?: string;
  addedAt: number;
  startedAt?: number; // Timestamp when status changed to READING
  finishedAt?: number; // Timestamp when status changed to FINISHED
}

export interface FriendProfile {
  id: string;
  username: string;
  avatarUrl: string;
  isDev?: boolean;
  followers: string[]; // List of userIds
  following: string[]; // List of userIds
}

export interface Comment {
  id: string;
  username: string;
  text: string;
  timestamp: number;
}

export interface SocialPost {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  bookId: string;
  bookTitle?: string;
  bookAuthor?: string;
  bookCoverUrl?: string;
  rating?: number;
  reviewText: string;
  emotions?: Record<string, number>; 
  bestQuotes?: string[];
  characters?: string[];
  likes: number;
  comments: number;
  commentsList?: Comment[]; // Added comments list
  timestamp: number;
  isLiked?: boolean;
  isAnnouncement?: boolean; 
}

export interface CorkItem {
  id: string;
  imageUrl: string;
  uploadedBy: string; // username
  uploadedById?: string; // userId
  bookTitle?: string; 
  description?: string;
  tags: string[];
  likes: number;
  timestamp: number;
  isLiked?: boolean;
  isFavorite?: boolean; // For local user state
}

// --- Gamification Types ---

export type AchievementCategory = 'READING' | 'SOCIAL' | 'DIVERSITY' | 'STREAK' | 'COLLECTION';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  category: AchievementCategory;
  targetCount?: number; // e.g. 10 books
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: 'pages' | 'books' | 'reviews' | 'days';
  expiresAt: number;
  rewardXp: number;
}

export interface UserData {
  id: string; 
  username: string; // The display name
  handle: string;   // The unique ID (e.g. @user_1234)
  shortId?: string; // The short searchable ID (e.g. #ABC1234)
  bio?: string;
  avatarUrl?: string;
  
  // Leveling
  level: number;
  xp: number;
  
  joinedAt: number;
  monthlyGoal: number;
  
  // Streak Logic
  currentStreak: number;
  longestStreak: number;
  lastReadDate: string; // ISO Date String YYYY-MM-DD
  
  following: string[]; 
  followers: string[]; 

  books: Book[]; 
  corkItems: CorkItem[];
  corkFavorites: string[]; 
  achievements: Achievement[];
  activeChallenge: WeeklyChallenge;
}

export enum View {
  HOME = 'HOME', 
  EXPLORE = 'EXPLORE', 
  LIBRARY = 'LIBRARY', 
  BOOK_DETAILS = 'BOOK_DETAILS', 
  CORK = 'CORK',
  PROFILE = 'PROFILE'
}

export type LibraryViewMode = 'GRID' | 'LIST';
export type ProfileTab = 'STATS' | 'SHELF' | 'REVIEWS' | 'SETTINGS';
export type CorkTab = 'EXPLORE' | 'TRENDING' | 'FAVORITES' | 'MY_UPLOADS';

export interface Notification {
  id: string;
  type: 'FOLLOW';
  fromUserId: string;
  fromUsername: string;
  fromUserAvatar: string;
  timestamp: number;
  read: boolean;
}