import React, { useState, useEffect, useRef } from 'react';
import { AuthScreen } from './components/AuthScreen';
import { Layout } from './components/Layout';
import { Book, UserData, View, BookStatus, LibraryViewMode, CorkItem, Achievement, SocialPost, EmotionType, ProfileTab, CorkTab, Comment } from './types';
import { saveUserData as saveUserToFirestore, getCorkFeed, SOCIAL_FEED, FRIENDS_LIST, fetchUserProfile, publishPost, uploadCorkItem, toggleFollow, togglePostLike, addCommentToPost, toggleCorkLike, searchUsers, getGlobalSocialFeed, deleteSocialPost, saveBookToLibrary, deleteBookFromLibrary, getUserPosts, subscribeToNotifications, getLibrary, markAllNotificationsAsRead } from './services/storage';
import { searchGoogleBooks } from './services/googleBooks';
import { BookCard } from './components/BookCard';
import { Button } from './components/Button';
import {
  Plus, Search, X,
  LayoutGrid, List, Star,
  Edit3, Heart, Zap, Frown, Smile, Skull, Sparkles, BookPlus, LogOut, PieChart, Target, Trophy, Flame, Calendar, Medal, ChevronRight, CheckCircle, TrendingUp,
  Bookmark, Share2, BookOpen, Trash2, MessageCircle, Send, Shield, FileText, Info, Paperclip, Camera, Image as ImageIcon, Loader2
} from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { auth } from './services/firebase';
import { CapacitorUpdater } from '@capgo/capacitor-updater';

function App() {
  useEffect(() => {
    const checkUpdate = async () => {
      try {
        await CapacitorUpdater.notifyAppReady();

        const update = await CapacitorUpdater.download({
            url: 'https://github.com/JaviDev-01/workflows/releases/latest/download/update.zip',
            version: ''
        });

        await CapacitorUpdater.set(update);
      } catch (err) {
        console.log('No update available');
      }
    };

    checkUpdate();
  }, []);

  // --- Global State ---
  const [user, setUser] = useState<UserData | null>(null);
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  
  // --- Social Feed State ---
  const [socialFeed, setSocialFeed] = useState<SocialPost[]>([]);
  const [activeStoryFilter, setActiveStoryFilter] = useState<string | null>(null);
  // Comments state
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  
  // --- Library State ---
  const [activeTab, setActiveTab] = useState<BookStatus>(BookStatus.READING);
  const [libraryView, setLibraryView] = useState<LibraryViewMode>('GRID');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  
  // --- Cork State ---
  const [corkFeed, setCorkFeed] = useState<CorkItem[]>([]);
  const [activeCorkTab, setActiveCorkTab] = useState<CorkTab>('EXPLORE');
  const [showCorkUpload, setShowCorkUpload] = useState(false);
  const [corkBookTitle, setCorkBookTitle] = useState('');
  const [corkDescription, setCorkDescription] = useState('');
  const [corkTag, setCorkTag] = useState('');
  const [selectedCorkItem, setSelectedCorkItem] = useState<CorkItem | null>(null);
  const [corkPreview, setCorkPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Explore State ---
  const [exploreQuery, setExploreQuery] = useState('');
  const [exploreMode, setExploreMode] = useState<'REVIEWS' | 'PEOPLE'>('REVIEWS');
  const [exploreResults, setExploreResults] = useState<SocialPost[]>([]);
  const [selectedExplorePost, setSelectedExplorePost] = useState<SocialPost | null>(null);
  const [userPosts, setUserPosts] = useState<SocialPost[]>([]); // Posts for profile view

  // --- Modals State ---
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  
  const [reviewStep, setReviewStep] = useState<1|2>(1); 
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [profileTab, setProfileTab] = useState<ProfileTab>('STATS');
  
  // Review Form Data
  const [selectedBookForReview, setSelectedBookForReview] = useState<Book | null>(null);
  const [reviewForm, setReviewForm] = useState({
      rating: 0,
      text: '',
      quotes: '', 
      characters: '', 
      emotions: {} as Record<string, number> 
  });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editBio, setEditBio] = useState('');

  // Init
  const { currentUser, loading: authLoading } = useAuth();
  const [dataLoading, setDataLoading] = useState(false);
  
  // Search State
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<UserData[]>([]);
  const [bookSearchResults, setBookSearchResults] = useState<Book[]>([]);
  const [searchType, setSearchType] = useState<'USERS' | 'BOOKS'>('BOOKS');
  const [isUserSearching, setIsUserSearching] = useState(false);
  
  // Notification State
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    async function loadData() {
        if (currentUser) {
            setDataLoading(true);
            try {
                // Fetch or create user profile in Firestore
                const userData = await fetchUserProfile(currentUser.uid, currentUser.email, currentUser.displayName);
                setUser(userData);
                
                const feed = await getGlobalSocialFeed();
                setSocialFeed(feed);

                // Fetch user's own posts for profile
                const myPosts = await getUserPosts(currentUser.uid);
                setUserPosts(myPosts);
            } catch (error) {
                console.error("Failed to load user data:", error);
            } finally {
                setDataLoading(false);
            }
        } else {
            setUser(null);
        }
    }
    loadData();
  }, [currentUser]);

  // Feed Auto-Refresh on View Change
  // Generalized View Refresh
  useEffect(() => {
      async function refreshViewData() {
          if (!user) return;

          try {
              if (currentView === View.HOME) {
                  const feed = await getGlobalSocialFeed();
                  setSocialFeed(feed);
              } else if (currentView === View.PROFILE) {
                 // Refresh User Profile (stats, followers, etc.)
                 const updatedUser = await fetchUserProfile(user.id, null, null);
                 setUser(prev => prev ? { ...prev, ...updatedUser } : updatedUser);
                 
                 // Also refresh own posts
                 const myPosts = await getUserPosts(user.id);
                 setUserPosts(myPosts);
                 
                 // Mark notifications as read
                 if (notificationCount > 0) {
                     markAllNotificationsAsRead(user.id);
                     // Optimistic update
                     setNotificationCount(0);
                 }
              } else if (currentView === View.CORK) {
                  const cork = await getCorkFeed();
                  setCorkFeed(cork);
              } else if (currentView === View.LIBRARY) {
                  const libBooks = await getLibrary(user.id);
                  setUser(prev => prev ? { ...prev, books: libBooks } : prev);
              }
          } catch (e) {
              console.error("Error refreshing view data:", e);
          }
      }
      refreshViewData();
  }, [currentView, user?.id]); // Depend on ID, not full user object to avoid loops

  // Notification Subscription
  useEffect(() => {
      if (!currentUser) return;
      
      const unsubscribe = subscribeToNotifications(currentUser.uid, (notifications) => {
          const unreadCount = notifications.filter(n => !n.read).length;
          setNotificationCount(unreadCount);
      });
      
      return () => unsubscribe();
  }, [currentUser]);

  // OLD handleLogin is replaced by AuthContext logic, but we keep a dummy for AuthScreen prop for now if needed, 
  // though AuthScreen now handles it internally.
  const handleLogin = (username: string) => {
     // No-op: AuthState change triggers reload
  };

  const updateUser = async (newData: Partial<UserData>) => {
    if (!user) return;
    const updated = { ...user, ...newData };
    setUser(updated);
    // Persist to Firestore
    await saveUserToFirestore(updated);
  };

  // --- Gamification System ---

  const calculateLevel = (xp: number) => {
      // Simple formula: Level 1 starts at 0. Level 2 at 100. Level 3 at 250...
      return Math.floor(Math.sqrt(xp / 50)) + 1;
  };

  const addXp = (amount: number) => {
      if(!user) return;
      const newXp = user.xp + amount;
      const oldLevel = user.level;
      const newLevel = calculateLevel(newXp);
      
      let updates: Partial<UserData> = { xp: newXp };
      
      if(newLevel > oldLevel) {
          updates.level = newLevel;
          setShowLevelUp(true);
          setTimeout(() => setShowLevelUp(false), 4000);
      }
      
      // We don't call updateUser here to avoid race conditions, we return the object to merge
      return updates;
  };

  const checkAchievements = (userData: UserData): UserData => {
      const finishedBooks = userData.books.filter(b => b.status === BookStatus.FINISHED);
      const uniqueGenres = new Set(finishedBooks.map(b => b.genre || 'General')).size;
      const reviewsCount = userData.books.filter(b => !!b.review).length;
      const corkCount = userData.corkItems.filter(c => c.uploadedBy === userData.username).length;
      const favCount = userData.corkFavorites.length;

      let newAchievements = [...userData.achievements];
      let achievementUnlocked = false;

      const unlock = (id: string) => {
          const idx = newAchievements.findIndex(a => a.id === id);
          if (idx !== -1 && !newAchievements[idx].unlocked) {
              newAchievements[idx] = { ...newAchievements[idx], unlocked: true, unlockedAt: Date.now() };
              setUnlockedAchievement(newAchievements[idx]);
              // Removed the timeout to force user interaction to close the "Stamp" modal
              achievementUnlocked = true;
          }
      };

      // Reading Checks
      if (finishedBooks.length >= 1) unlock('read_1');
      if (finishedBooks.length >= 5) unlock('read_5');
      if (finishedBooks.length >= 10) unlock('read_10');
      if (finishedBooks.length >= 25) unlock('read_25');
      
      // Streak Checks
      if (userData.currentStreak >= 7) unlock('streak_7');

      // Diversity Checks
      if (uniqueGenres >= 3) unlock('div_genre_3');
      if (uniqueGenres >= 5) unlock('div_genre_5');

      // Participation Checks
      if (reviewsCount >= 1) unlock('social_review_1');
      if (reviewsCount >= 10) unlock('social_review_10');
      if (corkCount >= 1) unlock('cork_upload_1');
      if (favCount >= 5) unlock('cork_fav_5');

      return achievementUnlocked ? { ...userData, achievements: newAchievements } : userData;
  };

  // --- Logic Impl ---

  const handleUpdateProgress = (bookId: string, page: number, status: BookStatus) => {
    if (!user || !selectedBook) return;
    
    // 1. Progress Logic
    const newPage = Math.max(0, Math.min(page, selectedBook.totalPages));
    let newStatus = status;
    const now = Date.now();
    let started = selectedBook.startedAt;
    let finished = selectedBook.finishedAt;

    if (newPage > 0 && selectedBook.currentPage === 0 && !started) {
        started = now;
        newStatus = BookStatus.READING;
    }
    
    if (newPage === selectedBook.totalPages && newStatus !== BookStatus.FINISHED) {
        newStatus = BookStatus.FINISHED;
        finished = now;
    }

    if (status === BookStatus.READING && !started) started = now;
    if (status === BookStatus.FINISHED && !finished) finished = now;
    
    // 2. XP & Challenge Logic
    let xpGain = 0;
    const pagesRead = newPage - selectedBook.currentPage;
    if(pagesRead > 0) xpGain += pagesRead; // 1 XP per page
    if(newStatus === BookStatus.FINISHED && selectedBook.status !== BookStatus.FINISHED) xpGain += 100; // 100 XP per book

    let newChallenge = { ...user.activeChallenge };
    if (user.activeChallenge.unit === 'pages' && pagesRead > 0) {
        newChallenge.current += pagesRead; 
    }

    // 3. Streak Logic
    const today = new Date().toISOString().split('T')[0];
    let newStreak = user.currentStreak;
    let lastDate = user.lastReadDate;

    if (lastDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (lastDate === yesterday) {
            newStreak += 1;
        } else {
            // Broken streak or new streak
            newStreak = 1; 
        }
        lastDate = today;
    }

    const xpUpdates = addXp(xpGain);

    const updatedBook: Book = { 
        ...selectedBook, 
        currentPage: newPage, 
        status: newStatus, 
        startedAt: started,
        finishedAt: finished 
    };

    const updatedBooks = user.books.map(b => b.id === bookId ? updatedBook : b);
    
    // Merge all updates
    let updatedUser = {
        ...user,
        ...xpUpdates,
        books: updatedBooks,
        activeChallenge: newChallenge,
        currentStreak: newStreak,
        longestStreak: Math.max(newStreak, user.longestStreak),
        lastReadDate: lastDate
    };

    // Run Achievements check on the updated state
    updatedUser = checkAchievements(updatedUser);

    updateUser(updatedUser);
    saveBookToLibrary(user.id, updatedBook); // Save progress to Firestore subcollection
    setSelectedBook(updatedBook);
  };

  const handleDeleteBook = (bookId: string) => {
      if(!user) return;
      if(confirm("¿Estás seguro de que quieres eliminar este libro de tu biblioteca?")) {
          const updatedBooks = user.books.filter(b => b.id !== bookId);
          updateUser({ books: updatedBooks });
          deleteBookFromLibrary(user.id, bookId); // Delete from Firestore subcollection
          setSelectedBook(null);
          setCurrentView(View.LIBRARY);
      }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setCorkPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleCorkUpload = () => {
      if(!corkPreview || !user) return;
      const newItem: CorkItem = {
          id: Date.now().toString(),
          imageUrl: corkPreview,
          uploadedBy: user.username,
          uploadedById: user.id,
          bookTitle: corkBookTitle || 'Sin título',
          description: corkDescription,
          tags: corkTag ? corkTag.split(',').map(t => t.trim()) : [],
          likes: 0,
          timestamp: Date.now()
      };
      
      const newFeed = [newItem, ...corkFeed];
      setCorkFeed(newFeed);
      uploadCorkItem(newItem);
      
      const xpUpdates = addXp(20); // 20 XP for upload
      let updatedUser = { ...user, ...xpUpdates, corkItems: [...user.corkItems, newItem] };
      updatedUser = checkAchievements(updatedUser);
      updateUser(updatedUser);

      // Reset
      setShowCorkUpload(false);
      setCorkPreview(null);
      setCorkBookTitle('');
      setCorkDescription('');
      setCorkTag('');
  };

  const handleToggleCorkFavorite = (itemId: string) => {
      if(!user) return;
      let newFavs = [...user.corkFavorites];
      if(newFavs.includes(itemId)) {
          newFavs = newFavs.filter(id => id !== itemId);
      } else {
          newFavs.push(itemId);
      }
      let updatedUser = { ...user, corkFavorites: newFavs };
      updatedUser = checkAchievements(updatedUser);
      updateUser(updatedUser);
  };

  const publishReview = () => {
      // 1. Validation
      if (!selectedBookForReview) return;
      if (!user) return;
      
      // Check for duplicate review
      const existingReview = user.books.find(b => b.id === selectedBookForReview.id)?.review;
      if (existingReview && existingReview.length > 5) { // Simple check for non-empty review
          alert("Ya has publicado una reseña para este libro. Por favor, borra la anterior si quieres publicar una nueva.");
          return;
      }
      
      const newPost: SocialPost = {
          id: `post_${Date.now()}`,
          userId: user.id,
          username: user.username,
          userAvatar: user.avatarUrl || '',
          bookId: selectedBookForReview.id,
          bookTitle: selectedBookForReview.title,
          bookAuthor: selectedBookForReview.author,
          bookCoverUrl: selectedBookForReview.coverUrl,
          rating: reviewForm.rating,
          reviewText: reviewForm.text,
          emotions: reviewForm.emotions,
          bestQuotes: reviewForm.quotes.split('\n').filter(q => q.trim().length > 0),
          characters: reviewForm.characters.split(',').map(c => c.trim()).filter(c => c.length > 0),
          likes: 0,
          comments: 0,
          commentsList: [],
          timestamp: Date.now(),
          isLiked: false
      };
      
      const updatedFeed = [newPost, ...socialFeed];
      setSocialFeed(updatedFeed);
      
      // Persist Post
      publishPost(newPost);
      
      const updatedBooks = user.books.map(b => b.id === selectedBookForReview.id ? {
          ...b,
          rating: reviewForm.rating,
          review: reviewForm.text,
          status: BookStatus.FINISHED
      } : b);

      const xpUpdates = addXp(50); // 50 XP for review
      let updatedUser = { ...user, ...xpUpdates, books: updatedBooks };
      updatedUser = checkAchievements(updatedUser);
      updateUser(updatedUser);
      
      // Save updated book (with review) to Firestore subcollection
      const updatedBook = updatedBooks.find(b => b.id === selectedBookForReview.id);
      if(updatedBook) {
          saveBookToLibrary(user.id, updatedBook);
      }

      setShowReviewModal(false);
      setReviewStep(1);
      setReviewForm({ rating: 0, text: '', quotes: '', characters: '', emotions: {} });
      setSelectedBookForReview(null);
  };

  const handleAddComment = (postId: string) => {
      if(!user || !commentText.trim()) return;
      const newComment: Comment = {
          id: Date.now().toString(),
          username: user.username,
          text: commentText,
          timestamp: Date.now()
      };
      
      setSocialFeed(prev => prev.map(post => {
          if(post.id === postId) {
              addCommentToPost(postId, newComment);
              return { 
                  ...post, 
                  comments: post.comments + 1,
                  commentsList: [...(post.commentsList || []), newComment]
              };
          }
          return post;
      }));
      setCommentText('');
  };

  // --- Other Handlers (Refined) ---
  const handleAddBookToLibrary = (book: Book) => {
    try {
        if(!user) return;
        
        // Force array initialization if undefined
        const currentBooks = user.books || [];
        
        if (currentBooks.some(b => b.title === book.title)) {
            alert("¡Ya tienes este libro!");
            return;
        }
        
        // Update
        updateUser({ books: [book, ...currentBooks] });
        saveBookToLibrary(user.id, book); // Save to Firestore subcollection
        
        // Reset UI
        setShowAddBookModal(false);
        setSearchQuery('');
        setSearchResults([]);
        alert("¡Libro añadido con éxito!");
    } catch (e) {
        console.error("Error adding book:", e);
        alert("Hubo un error al añadir el libro. Inténtalo de nuevo.");
    }
  }

  const navigateToBookDetail = (book: Book) => {
      setSelectedBook(book);
      setCurrentView(View.BOOK_DETAILS);
  };

  const handleSelectBookForReview = (book: Book) => {
      setSelectedBookForReview(book);
      setReviewStep(2);
  };

  const updateEmotionRating = (emo: EmotionType, rating: number) => {
      setReviewForm(prev => ({
          ...prev,
          emotions: { ...prev.emotions, [emo]: rating }
      }));
  };

  const handleLikePost = (postId: string) => {
      setSocialFeed(prev => prev.map(p => {
          if(p.id === postId) {
              return { ...p, likes: p.isLiked ? p.likes - 1 : p.likes + 1, isLiked: !p.isLiked };
          }
          return p;
      }));
  };

  const handleSavePostToLibrary = (post: SocialPost) => {
      if(!user) return;
      if(!post.bookTitle) {
          alert("Esta publicación no tiene un libro asociado.");
          return;
      }
      
      const currentBooks = user.books || [];

      if (currentBooks.some(b => b.title === post.bookTitle)) {
          alert("¡Ya tienes este libro!");
          return;
      }
      const newBook: Book = {
          id: Date.now().toString(),
          title: post.bookTitle!,
          author: post.bookAuthor!,
          coverUrl: post.bookCoverUrl!,
          totalPages: 300, 
          currentPage: 0,
          status: BookStatus.TO_READ,
          addedAt: Date.now()
      };
      updateUser({ books: [newBook, ...currentBooks] });
      saveBookToLibrary(user.id, newBook); // Save to Firetore subcollection
      alert("Guardado en tu biblioteca");
  };

  const handleToggleFollow = (targetUserId: string) => {
      if(!user) return;
      const isFollowing = user.following.includes(targetUserId);
      let newFollowing;
      if (isFollowing) {
          newFollowing = user.following.filter(id => id !== targetUserId);
      } else {
          newFollowing = [...user.following, targetUserId];
      }
      toggleFollow(user.id, targetUserId, isFollowing);

      const updatedUser = { ...user, following: newFollowing };
      updateUser(updatedUser);
  };

  const handleGlobalSearch = async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!userSearchQuery.trim()) return;
      setIsUserSearching(true);
      
      if (searchType === 'USERS') {
          const results = await searchUsers(userSearchQuery);
          setUserSearchResults(results);
      } else {
          // Book Search
          const results = await searchGoogleBooks(userSearchQuery);
          setBookSearchResults(results);
      }
      
      setIsUserSearching(false);
  };

  // Debounced Search Effect
  useEffect(() => {
      const timer = setTimeout(() => {
          if (userSearchQuery.trim().length >= 2) {
              handleGlobalSearch();
          } else {
              // Clear results if query is too short
              if (searchType === 'USERS') setUserSearchResults([]);
          }
      }, 600); // 600ms debounce

      return () => clearTimeout(timer);
  }, [userSearchQuery, searchType]);
  
  const handleFollowFromSearch = (targetId: string) => {
       handleToggleFollow(targetId);
       // Optimistically update search results UI if we had comprehensive following status there?
       // The `handleToggleFollow` updates `user` object, which drives the UI.
       // We'll pass `isFollowing` derived from `user.following` to the render.
  };

  useEffect(() => {
      if(exploreMode === 'REVIEWS') {
          if(!exploreQuery.trim()) {
              setExploreResults([]);
              return;
          }
          const lowerQuery = exploreQuery.toLowerCase();
          const matches = socialFeed.filter(p => 
              !p.isAnnouncement && 
              (p.bookTitle?.toLowerCase().includes(lowerQuery) || 
               p.bookAuthor?.toLowerCase().includes(lowerQuery) ||
               p.reviewText?.toLowerCase().includes(lowerQuery))
          );
          setExploreResults(matches);
      }
  }, [exploreQuery, exploreMode, socialFeed]);

  const getBookStats = (posts: SocialPost[]) => {
      if(posts.length === 0) return null;
      const totalRating = posts.reduce((acc, p) => acc + (p.rating || 0), 0);
      const avgRating = (totalRating / posts.length).toFixed(1);
      const totalLikes = posts.reduce((acc, p) => acc + p.likes, 0);
      const emotionCounts: Record<string, number> = {};
      posts.forEach(p => {
          if(p.emotions) {
              Object.keys(p.emotions).forEach(e => {
                  emotionCounts[e] = (emotionCounts[e] || 0) + 1;
              });
          }
      });
      const topEmotions = Object.entries(emotionCounts).sort((a,b) => b[1] - a[1]).slice(0, 3).map(e => e[0] as EmotionType);
      return { avgRating, totalReviews: posts.length, totalLikes, topEmotions, coverUrl: posts[0].bookCoverUrl, title: posts[0].bookTitle, author: posts[0].bookAuthor };
  };

  const bookStats = exploreMode === 'REVIEWS' ? getBookStats(exploreResults) : null;
  const cycleAvatar = () => {
      if(!user) return;
      const seed = Math.random().toString(36).substring(7);
      const newAvatar = `https://ui-avatars.com/api/?name=${user.username}&background=random&length=1&bold=true&seed=${seed}`;
      updateUser({ avatarUrl: newAvatar });
  };
  const saveProfile = () => {
      updateUser({ bio: editBio });
      setIsEditingProfile(false);
  };
  const handlePinToBook = (bookId: string) => { console.log('Pinned', bookId); };
  const getFilteredCorkItems = () => {
      if(!user) return [];
      switch(activeCorkTab) {
          case 'EXPLORE': return corkFeed;
          case 'TRENDING': return [...corkFeed].sort((a,b) => b.likes - a.likes);
          case 'FAVORITES': return corkFeed.filter(item => user.corkFavorites.includes(item.id));
          case 'MY_UPLOADS': return corkFeed.filter(item => item.uploadedBy === user.username);
          default: return corkFeed;
      }
  };
  const getFilteredBooks = () => {
      if(!user) return [];
      return user.books.filter(b => b.status === activeTab);
  };
  
  const calculateStats = () => {
      if(!user) return { totalBooks: 0, totalPages: 0, authors: {}, genres: {}, booksByMonth: {} as Record<string, Book[]> };
      
      const finished = user.books.filter(b => b.status === BookStatus.FINISHED);
      const pages = user.books.reduce((acc, b) => acc + b.currentPage, 0);
      
      const authors: Record<string, number> = {};
      const genres: Record<string, number> = {};
      const booksByMonth: Record<string, Book[]> = {};

      finished.forEach(b => {
          authors[b.author] = (authors[b.author] || 0) + 1;
          const g = b.genre || 'General';
          genres[g] = (genres[g] || 0) + 1;
          
          if(b.finishedAt) {
              const date = new Date(b.finishedAt);
              const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
              if(!booksByMonth[monthKey]) booksByMonth[monthKey] = [];
              booksByMonth[monthKey].push(b);
          }
      });

      return { totalPages: pages, totalBooks: finished.length, authors, genres, booksByMonth };
  };

  const getMonthName = (monthKey: string) => {
      const [year, month] = monthKey.split('-');
      const date = new Date(parseInt(year), parseInt(month));
      return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  const chunkBooks = (books: Book[], size: number) => {
      const chunks: Book[][] = [];
      for (let i = 0; i < books.length; i += size) {
          chunks.push(books.slice(i, i + size));
      }
      return chunks;
  };

  const getEmotionLabel = (type: string) => {
      switch(type) {
          case 'ROMANCE': return { icon: <Heart size={14}/>, label: 'Romance' };
          case 'SAD': return { icon: <Frown size={14}/>, label: 'Drama' };
          case 'FUNNY': return { icon: <Smile size={14}/>, label: 'Humor' };
          case 'MIND_BLOWING': return { icon: <Zap size={14}/>, label: 'Wow' };
          case 'ADVENTURE': return { icon: <Sparkles size={14}/>, label: 'Aventura' };
          case 'SCARY': return { icon: <Skull size={14}/>, label: 'Terror' };
          default: return { icon: <Star size={14}/>, label: type };
      }
  };

  if (authLoading || dataLoading) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-[#e8e6df]">
              <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
      );
  }

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  const stats = calculateStats();
  const bookShelves = chunkBooks(getFilteredBooks(), 3);
  const filteredSocialFeed = activeStoryFilter 
      ? socialFeed.filter(p => p.userId === activeStoryFilter) 
      : socialFeed;

  return (
    <div className="relative h-full w-full bg-paper">
        <Layout activeView={currentView} onChangeView={setCurrentView} onLogout={() => auth.signOut()} username={user.username} notificationCount={notificationCount}>
      
      {/* === NOTIFICATIONS / OVERLAYS === */}
      {showLevelUp && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
              <div className="bg-yellow-400 text-black px-8 py-6 rounded-3xl shadow-2xl animate-pop text-center border-4 border-black transform rotate-2">
                  <Trophy size={48} className="mx-auto mb-2 text-white drop-shadow-md"/>
                  <h2 className="text-3xl font-black uppercase italic">¡Nivel {user.level}!</h2>
                  <p className="font-bold">¡Sigue leyendo!</p>
              </div>
          </div>
      )}
      
      {/* NEW ACHIEVEMENT STAMP MODAL */}
      {unlockedAchievement && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setUnlockedAchievement(null)}>
              <div className="bg-[#fdfbf7] p-8 rounded-xl shadow-2xl text-center relative overflow-hidden animate-stamp-in border-4 border-double border-yellow-600 max-w-sm w-full">
                  {/* Particles */}
                  {[...Array(12)].map((_, i) => (
                      <div key={i} className="confetti" style={{left: `${Math.random()*100}%`, animationDelay: `${Math.random()*0.5}s`, backgroundColor: ['#ff0', '#f00', '#0f0', '#00f'][Math.floor(Math.random()*4)]}}></div>
                  ))}
                  
                  <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-gray-200"></div>
                  <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-gray-200"></div>
                  <div className="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-gray-200"></div>
                  <div className="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-gray-200"></div>

                  <div className="text-6xl mb-4 transform hover:scale-110 transition-transform cursor-pointer">{unlockedAchievement.icon}</div>
                  <h2 className="text-2xl font-serif-book font-bold text-gray-900 mb-2">{unlockedAchievement.title}</h2>
                  <p className="font-hand text-gray-600 text-lg leading-tight mb-6">{unlockedAchievement.description}</p>
                  
                  <div className="inline-block border-2 border-yellow-600 text-yellow-800 text-xs font-bold tracking-[0.2em] uppercase px-4 py-1 rounded-sm rotate-[-2deg]">
                      ¡Logro Desbloqueado!
                  </div>
                  <p className="mt-4 text-[10px] text-gray-400">Toca para continuar</p>
              </div>
          </div>
      )}

      {/* === HOME VIEW === */}
      {currentView === View.HOME && (
        <div className="p-4 space-y-6 page-enter relative z-10 pb-32">
            <header className="flex justify-between items-center pt-4 pb-0">
                 <h2 className="text-3xl font-serif-book font-bold text-gray-900">BookMol</h2>
                 <div className="flex gap-2">
                    <button onClick={() => setShowReviewModal(true)} className="bg-gray-900 text-white p-2.5 rounded-full shadow-lg hover:scale-105 transition-transform">
                        <Plus size={24}/>
                    </button>
                 </div>
            </header>

            {/* Stories */}
            <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
                <div onClick={() => setActiveStoryFilter(null)} className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group">
                    <div className={`w-16 h-16 rounded-full border-2 p-1 transition-all ${activeStoryFilter === null ? 'border-orange-500 scale-105' : 'border-gray-200'}`}>
                         <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-500">All</div>
                    </div>
                </div>
                {FRIENDS_LIST.map(friend => (
                    <div key={friend.id} onClick={() => setActiveStoryFilter(friend.id)} className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group animate-pop">
                        <div className={`w-16 h-16 rounded-full border-2 p-1 transition-all ${activeStoryFilter === friend.id ? 'border-orange-500 scale-105' : friend.isDev ? 'border-purple-300' : 'border-gray-200'}`}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-white">
                                <img src={friend.avatarUrl} className="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* WEEKLY CHALLENGE WIDGET */}
            <div className="relative bg-[#f0efe9] rounded-sm p-4 text-gray-800 shadow-[2px_4px_10px_rgba(0,0,0,0.08)] overflow-hidden border-2 border-dashed border-gray-300">
                 <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-paper rounded-full border border-gray-300"></div>
                 <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-paper rounded-full border border-gray-300"></div>
                 
                 <div className="flex justify-between items-start relative z-10 pl-2">
                     <div className="flex-1">
                         <div className="flex items-center gap-2 mb-2">
                             <span className="bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">Ticket Semanal</span>
                             <span className="text-xs font-hand text-red-600 font-bold">Expira: {Math.ceil((user.activeChallenge.expiresAt - Date.now()) / 86400000)} días</span>
                         </div>
                         <h3 className="font-serif-book font-bold text-xl mb-1 text-gray-900 leading-tight">{user.activeChallenge.title}</h3>
                         <p className="text-gray-500 text-sm font-hand mb-3">{user.activeChallenge.description}</p>
                         
                         <div className="relative pt-1">
                             <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                                 <span>Progreso</span>
                                 <span>{user.activeChallenge.current} / {user.activeChallenge.target} {user.activeChallenge.unit}</span>
                             </div>
                             <div className="w-full h-3 bg-white border border-gray-200 rounded-sm overflow-hidden p-[1px]">
                                 <div 
                                     className="h-full bg-orange-500 opacity-80" 
                                     style={{width: `${Math.min(100, (user.activeChallenge.current / user.activeChallenge.target) * 100)}%`, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.2) 5px, rgba(255,255,255,0.2) 10px)'}}
                                 ></div>
                             </div>
                         </div>
                     </div>
                     <div className="text-4xl opacity-10 rotate-12 ml-4">
                         <Target />
                     </div>
                 </div>
            </div>

            {/* The Feed - SCRAPBOOK STYLE REDESIGN */}
            <div className="space-y-10">
                {filteredSocialFeed.map((post, idx) => {
                    const isAnnouncement = !post.bookTitle;
                    const delayClass = idx < 3 ? `stagger-${idx+1} slide-up` : '';
                    const showComments = activeCommentPostId === post.id;

                    if (isAnnouncement) {
                        return (
                            <div key={post.id} className={`bg-white rounded-sm shadow-sm overflow-hidden relative border border-gray-100 p-6 border-l-4 border-l-purple-500 ${delayClass}`}>
                                <div className="flex items-center gap-3 mb-4">
                                     <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden"><img src={post.userAvatar} className="w-full h-full object-cover"/></div>
                                     <div>
                                         <h4 className="font-bold text-sm text-gray-900 flex items-center gap-2">{post.username} <Sparkles size={14} className="text-purple-500 fill-purple-500"/></h4>
                                         <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Anuncio • hace {Math.floor((Date.now() - Number(post.timestamp)) / 3600000)}h</p>
                                     </div>
                                </div>
                                <div className="font-serif-book text-base leading-relaxed text-gray-800 whitespace-pre-wrap">{post.reviewText}</div>
                                <div className="flex items-center gap-5 mt-4 pt-4 border-t border-gray-50 text-gray-400">
                                    <button onClick={() => handleLikePost(post.id)} className={`flex items-center gap-1.5 text-xs font-bold uppercase transition-colors ${post.isLiked ? 'text-red-500' : 'hover:text-gray-600'}`}>
                                        <Heart size={18} className={post.isLiked ? "fill-red-500" : ""} /> {post.likes}
                                    </button>
                                </div>
                            </div>
                        );
                    }
                    return (
                        <div key={post.id} className={`relative pt-4 ${delayClass}`}>
                            {/* Washi Tape Decoration */}
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-8 washi-tape z-20 rotate-[-1deg]"></div>

                            <div className="bg-white p-5 pt-8 rounded-sm shadow-[2px_4px_16px_rgba(0,0,0,0.08)] relative border border-gray-100">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="cursor-pointer"><img src={post.userAvatar} className="w-8 h-8 rounded-full object-cover border border-white shadow-sm" /></div>
                                        <div><h4 className="font-bold text-sm text-gray-900">{post.username}</h4><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">hace {Math.floor((Date.now() - Number(post.timestamp)) / 3600000)}h</p></div>
                                        
                                        {/* FOLLOW BUTTON IN REVIEW */}
                                        {user?.id !== post.userId && (
                                            <button 
                                                onClick={() => handleToggleFollow(post.userId)}
                                                className={`ml-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide transition-colors ${
                                                    user?.following.includes(post.userId)
                                                    ? 'bg-gray-100 text-gray-400 border border-gray-200'
                                                    : 'bg-gray-900 text-white'
                                                }`}
                                            >
                                                {user?.following.includes(post.userId) ? 'Siguiendo' : 'Seguir'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-0.5">{[...Array(5)].map((_, i) => (<Star key={i} size={14} className={i < post.rating! ? "fill-orange-400 text-orange-400" : "text-gray-200"} />))}</div>
                                </div>

                                {/* Content Grid */}
                                <div className="flex gap-5 mb-4">
                                    {/* Book Cover as Photo */}
                                    <div className="shrink-0 w-24 h-36 bg-gray-100 p-1 shadow-md rotate-[-2deg] border border-gray-200 self-start">
                                        <img src={post.bookCoverUrl} className="w-full h-full object-cover grayscale-[20%]" />
                                    </div>
                                    
                                    {/* Text Content */}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-serif-book font-bold text-lg leading-tight mb-1 text-gray-900">{post.bookTitle}</h3>
                                        <p className="font-mono text-[10px] text-gray-500 mb-3 uppercase tracking-wider">Autor: {post.bookAuthor}</p>
                                        
                                        {/* Handwritten review */}
                                        <div className="relative">
                                            <span className="absolute -left-3 -top-2 text-4xl text-gray-200 font-serif-book">“</span>
                                            <p className="font-hand text-lg leading-relaxed text-gray-700 pl-2">{post.reviewText}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Emotions Graph Display (BARS) */}
                                {post.emotions && Object.keys(post.emotions).some(k => (post.emotions as any)[k] > 0) && (
                                    <div className="mb-5 pt-2">
                                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-100 pb-1">Análisis Emocional</h4>
                                        <div className="space-y-2">
                                            {Object.entries(post.emotions)
                                                .filter(([_, v]) => Number(v) > 0)
                                                .map(([key, v]) => {
                                                    const emo = getEmotionLabel(key);
                                                    return (
                                                        <div key={key} className="flex items-center gap-3">
                                                             <div className="w-24 flex items-center gap-2 text-xs font-bold text-gray-600">
                                                                 {emo.icon} {emo.label}
                                                             </div>
                                                             <div className="flex gap-1 flex-1 max-w-[140px]">
                                                                 {[1,2,3,4,5].map(level => (
                                                                     <div 
                                                                        key={level} 
                                                                        className={`h-2.5 flex-1 rounded-[1px] ${level <= Number(v) ? 'bg-slate-300' : 'bg-gray-100'}`}
                                                                     ></div>
                                                                 ))}
                                                             </div>
                                                        </div>
                                                    );
                                                })
                                            }
                                        </div>
                                    </div>
                                )}

                                {/* Footer Actions */}
                                <div className="flex items-center justify-between pt-3 border-t border-dashed border-gray-200">
                                    <div className="flex gap-6">
                                        <button onClick={() => handleLikePost(post.id)} className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide transition-colors ${post.isLiked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}>
                                            <Heart size={16} className={post.isLiked ? "fill-red-500" : ""} /> {post.likes}
                                        </button>
                                        <button onClick={() => setActiveCommentPostId(showComments ? null : post.id)} className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide transition-colors ${showComments ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}>
                                            <MessageCircle size={16} /> {post.commentsList?.length || 0}
                                        </button>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); handleSavePostToLibrary(post); }} className="text-gray-400 hover:text-gray-900"><Paperclip size={18} /></button>
                                </div>

                                {/* Comments */}
                                {showComments && (
                                    <div className="mt-4 bg-gray-50 p-3 rounded-md border border-gray-100 text-sm">
                                        {/* Simplified for brevity */}
                                        <div className="flex gap-2">
                                            <input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Comentar..." className="flex-1 bg-white border border-gray-200 rounded-full px-3 py-1 outline-none text-xs"/>
                                            <button onClick={() => handleAddComment(post.id)} className="text-gray-900"><Send size={14}/></button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      )}

      {/* === LIBRARY VIEW === */}
      {currentView === View.LIBRARY && (
        <div className="flex flex-col h-full page-enter relative z-10">
            <div className="px-6 pt-6 pb-2 sticky top-0 bg-[#fdfbf7]/95 backdrop-blur-md z-20 border-b border-gray-200">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-serif-book font-bold text-gray-900">Mi Biblioteca</h2>
                    <div className="flex gap-2">
                        <button onClick={() => setShowAddBookModal(true)} className="flex items-center gap-1 bg-black text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-md hover:bg-gray-800">
                            <BookPlus size={14} /> Añadir
                        </button>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button onClick={() => setLibraryView('GRID')} className={`p-1.5 rounded ${libraryView === 'GRID' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}><LayoutGrid size={16}/></button>
                            <button onClick={() => setLibraryView('LIST')} className={`p-1.5 rounded ${libraryView === 'LIST' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}><List size={16}/></button>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1 text-sm font-bold tracking-wide">
                    {[BookStatus.READING, BookStatus.TO_READ, BookStatus.FINISHED].map(status => (
                        <button key={status} onClick={() => setActiveTab(status)} className={`pb-2 border-b-2 transition-colors ${activeTab === status ? 'border-orange-600 text-orange-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>{status}</button>
                    ))}
                </div>
            </div>
            <div className="flex-1 overflow-y-auto pb-32 pt-4">
                 {libraryView === 'GRID' ? (
                     <div className="px-4">
                        {bookShelves.length > 0 ? bookShelves.map((shelf, i) => (
                            <div key={i} className="mb-8 relative">
                                <div className="flex items-end justify-start gap-4 px-2 relative z-10">
                                    {shelf.map((book, idx) => (<div key={book.id} style={{ animationDelay: `${idx * 50}ms` }} className="animate-pop w-1/3"><BookCard book={book} onClick={navigateToBookDetail} variant='grid' /></div>))}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#e8e6df] shelf-shadow z-0 border-t border-[#d6d3c9]"></div>
                            </div>
                        )) : (<div className="text-center py-20 opacity-50"><p className="font-serif-book text-gray-400 italic">Biblioteca vacía.</p></div>)}
                     </div>
                 ) : (
                     <div className="px-4 space-y-0">
                        {getFilteredBooks().map((book, idx) => (<div key={book.id} className="animate-pop" style={{ animationDelay: `${idx * 50}ms` }}><BookCard book={book} onClick={navigateToBookDetail} variant='list' /></div>))}
                     </div>
                 )}
            </div>
        </div>
      )}

      {/* === EXPLORE, CORK === */}
      {currentView === View.EXPLORE && (
          <div className="flex flex-col h-full page-enter relative z-10 pb-32">
             <div className="sticky top-0 bg-[#fdfbf7]/95 backdrop-blur-md z-20 border-b border-gray-200 p-6 pb-2">
                 <h2 className="text-3xl font-serif-book font-bold text-gray-900 mb-4">BookSearch</h2>
                 <form onSubmit={(e) => { e.preventDefault(); }} className="relative group mb-4">
                     <input value={exploreQuery} onChange={(e) => setExploreQuery(e.target.value)} placeholder={exploreMode === 'REVIEWS' ? "Buscar reseñas..." : "Buscar personas..."} className="w-full bg-white border border-gray-300 px-4 py-3 rounded-xl focus:outline-none focus:border-gray-900 shadow-sm pl-11 transition-all"/>
                     <Search className="absolute left-3 top-3.5 text-gray-400" size={20}/>
                     {exploreQuery && <button type="button" onClick={() => { setExploreQuery(''); setExploreResults([]); }} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"><X size={20}/></button>}
                 </form>
                 <div className="flex gap-6 border-b border-gray-200">
                     <button onClick={() => { setExploreMode('REVIEWS'); setExploreQuery(''); }} className={`pb-2 text-sm font-bold uppercase tracking-wide transition-colors ${exploreMode === 'REVIEWS' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}>Reseñas</button>
                     <button onClick={() => { setExploreMode('PEOPLE'); setExploreQuery(''); }} className={`pb-2 text-sm font-bold uppercase tracking-wide transition-colors ${exploreMode === 'PEOPLE' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}>Personas</button>
                 </div>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-6">
                 {exploreMode === 'REVIEWS' && (
                     <>
                        {exploreResults.length > 0 ? (
                            <div className="space-y-4">
                                {exploreResults.map((post, idx) => (
                                    <div key={post.id} onClick={() => setSelectedExplorePost(post)} className={`bg-white rounded-sm shadow-sm overflow-hidden border border-gray-100 p-4 flex gap-4 cursor-pointer hover:border-gray-300 transition-colors group stagger-${(idx%4)+1} slide-up`}>
                                        <div className="w-16 h-24 shrink-0 shadow-sm"><img src={post.bookCoverUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all"/></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1"><h4 className="font-bold text-sm text-gray-900 truncate pr-2 group-hover:text-orange-600">{post.username}</h4><div className="flex text-orange-400"><Star size={12} className="fill-orange-400"/><span className="text-xs font-bold ml-1">{post.rating}</span></div></div>
                                            <p className="text-xs text-gray-500 font-hand line-clamp-3 mb-2">"{post.reviewText}"</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (exploreQuery && <div className="text-center py-10 opacity-50"><p>No hay reseñas con ese texto.</p></div>)}
                     </>
                 )}
                 {exploreMode === 'PEOPLE' && (
                     <div className="space-y-4">
                         {FRIENDS_LIST.filter(f => f.username.toLowerCase().includes(exploreQuery.toLowerCase()) && f.username !== user.username).map((friend, idx) => (
                             <div key={friend.id} className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between gap-4 stagger-${(idx%4)+1} slide-up`}>
                                 <div className="flex items-center gap-4 flex-1 min-w-0">
                                     <div className="w-14 h-14 rounded-full p-1 border border-gray-200 bg-white shadow-sm shrink-0"><img src={friend.avatarUrl} className="w-full h-full rounded-full object-cover bg-gray-100"/></div>
                                     <div><h4 className="font-bold text-lg text-gray-900 truncate">{friend.username}</h4><span className="text-xs text-gray-400">@{friend.username.toLowerCase()}</span></div>
                                 </div>
                                 <button onClick={() => handleToggleFollow(friend.id)} className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all min-w-[100px] ${user.following.includes(friend.id) ? 'bg-gray-100 text-gray-500' : 'bg-gray-900 text-white shadow-lg shadow-gray-200 hover:scale-105 active:scale-95'}`}>{user.following.includes(friend.id) ? 'Siguiendo' : 'Seguir'}</button>
                             </div>
                         ))}
                     </div>
                 )}
             </div>
          </div>
      )}

      {currentView === View.CORK && (
          <div className="flex flex-col h-full bg-[url('https://www.transparenttextures.com/patterns/cork-board.png')] bg-orange-50 page-enter relative z-10">
              <div className="p-6 pb-2 sticky top-0 bg-white/80 backdrop-blur-md z-20 border-b border-orange-100 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <div><h2 className="text-3xl font-serif-book font-bold text-gray-900">Corcho</h2><p className="font-hand text-gray-600 text-sm">Comunidad creativa</p></div>
                    <button onClick={() => setShowCorkUpload(true)} className="bg-gray-900 text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"><Plus size={20} /></button>
                  </div>
                  <div className="flex overflow-x-auto no-scrollbar gap-4 text-xs font-bold uppercase tracking-wider pb-1">
                      {['EXPLORE', 'TRENDING', 'FAVORITES', 'MY_UPLOADS'].map(tab => (
                          <button key={tab} onClick={() => setActiveCorkTab(tab as CorkTab)} className={`whitespace-nowrap pb-2 border-b-2 transition-colors ${activeCorkTab === tab ? 'border-black text-black' : 'border-transparent text-gray-500'}`}>{tab}</button>
                      ))}
                  </div>
              </div>
              <div className="p-4 pb-32 overflow-y-auto">
                  {getFilteredCorkItems().length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-center opacity-60">
                          <ImageIcon size={48} className="text-gray-400 mb-2"/>
                          <p className="font-hand text-lg text-gray-600">El corcho está vacío.</p>
                          <p className="text-xs text-gray-400">¡Sube la primera foto!</p>
                      </div>
                  ) : (
                    <div className="columns-2 gap-4 space-y-4">
                        {getFilteredCorkItems().map((item, idx) => (
                            <div key={item.id} onClick={() => setSelectedCorkItem(item)} className={`break-inside-avoid bg-white p-2 pb-3 rounded-sm shadow-md rotate-1 hover:rotate-0 transition-all duration-300 group relative stagger-${(idx%4)+1} slide-up cursor-pointer`}>
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-red-600 shadow-sm z-20 border border-black/20"></div>
                                <div className="relative overflow-hidden bg-gray-100 mb-2"><img src={item.imageUrl} className="w-full object-cover" /></div>
                                <p className="font-hand font-bold text-gray-800 leading-tight px-1 text-sm line-clamp-2">{item.bookTitle || 'Sin título'}</p>
                                <div className="flex justify-between items-center px-1 mt-1"><span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">@{item.uploadedBy}</span><div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold"><Heart size={10} className="fill-gray-300"/> {item.likes}</div></div>
                            </div>
                        ))}
                    </div>
                  )}
              </div>
          </div>
      )}

      {/* === REDESIGNED PROFILE VIEW WITH IMPROVED "LIBRARY CARD" STYLE === */}
      {currentView === View.PROFILE && (
        <div className="flex flex-col h-full page-enter relative z-10">
            {/* Library Member Card Header */}
            <div className="m-4 mb-0 bg-[#e8e6df] rounded-lg shadow-md border border-[#d6d3c9] p-5 relative overflow-hidden">
                   {/* Card Patterns */}
                   <div className="absolute top-0 left-0 w-full h-2 bg-red-800/20"></div>
                   <div className="absolute bottom-4 right-4 opacity-10 rotate-12"><BookPlus size={80}/></div>
                   
                   <div className="flex items-start justify-between relative z-10">
                       <div>
                           <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">Carnet de Socio</div>
                           <h2 className="text-xl font-serif-book font-bold">{user.username}</h2>
                           <p className="text-xs text-gray-400 font-mono mb-2">{user.handle}</p>
                           <div className="flex items-center gap-2 mt-1">
                               <div className="bg-gray-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-sm">Lvl {user.level}</div>
                                <span className="text-xs text-gray-600 font-mono">{user.shortId || (user.id ? `#${user.id.substring(5, 12).toUpperCase()}` : '#0000')}</span>
                           </div>
                       </div>
                       <div className="w-16 h-16 rounded-sm border-2 border-white shadow-sm overflow-hidden bg-gray-200" onClick={cycleAvatar}>
                           <img src={user.avatarUrl} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all cursor-pointer" />
                       </div>
                   </div>

                   <div className="mt-6 pt-4 border-t border-gray-300/50 flex justify-between items-center">
                       {isEditingProfile ? (
                           <input className="w-full bg-transparent border-b border-gray-400 font-hand text-lg focus:outline-none" value={editBio} onChange={(e) => setEditBio(e.target.value)} onBlur={saveProfile} autoFocus />
                       ) : (
                           <p className="font-hand text-gray-600 text-base italic flex-1 truncate pr-2" onClick={() => { setIsEditingProfile(true); setEditBio(user.bio || ''); }}>"{user.bio || "Firma aquí..."}"</p>
                       )}
                       <div className="flex gap-4 text-xs font-bold text-gray-500">
                           <div className="text-center"><div className="text-gray-900 font-serif-book text-sm">{user.books.filter(b=>b.status===BookStatus.FINISHED).length}</div>LIBROS</div>
                           <div className="text-center"><div className="text-gray-900 font-serif-book text-sm">{user.followers.length}</div>SEGUIDORES</div>
                       </div>
                   </div>
            </div>

            {/* Folder Tabs Navigation */}
            <div className="flex px-4 pt-6 gap-1 overflow-x-auto no-scrollbar w-full">
                 <button onClick={() => setProfileTab('STATS')} className={`shrink-0 whitespace-nowrap px-5 py-2 rounded-t-lg font-bold text-xs uppercase tracking-wider border-t border-x border-b-0 transition-all ${profileTab === 'STATS' ? 'bg-white border-gray-200 text-gray-900 mb-[-1px] pb-3 z-10' : 'bg-gray-100 border-transparent text-gray-400 hover:bg-gray-50'}`}>Estadísticas</button>
                 <button onClick={() => setProfileTab('SHELF')} className={`shrink-0 whitespace-nowrap px-5 py-2 rounded-t-lg font-bold text-xs uppercase tracking-wider border-t border-x border-b-0 transition-all ${profileTab === 'SHELF' ? 'bg-white border-gray-200 text-gray-900 mb-[-1px] pb-3 z-10' : 'bg-gray-100 border-transparent text-gray-400 hover:bg-gray-50'}`}>Estantería</button>
                 <button onClick={() => { setProfileTab('REVIEWS'); getUserPosts(user.id).then(setUserPosts); }} className={`shrink-0 whitespace-nowrap px-5 py-2 rounded-t-lg font-bold text-xs uppercase tracking-wider border-t border-x border-b-0 transition-all ${profileTab === 'REVIEWS' ? 'bg-white border-gray-200 text-gray-900 mb-[-1px] pb-3 z-10' : 'bg-gray-100 border-transparent text-gray-400 hover:bg-gray-50'}`}>Reseñas</button>
                 <button onClick={() => setProfileTab('SETTINGS')} className={`shrink-0 whitespace-nowrap px-5 py-2 rounded-t-lg font-bold text-xs uppercase tracking-wider border-t border-x border-b-0 transition-all ${profileTab === 'SETTINGS' ? 'bg-white border-gray-200 text-gray-900 mb-[-1px] pb-3 z-10' : 'bg-gray-100 border-transparent text-gray-400 hover:bg-gray-50'}`}>Ajustes</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 pb-28 border-t border-gray-200 bg-white">
                {profileTab === 'STATS' && (
                    <div className="space-y-10 animate-pop">
                        {/* Improved Stats - "Field Report" Style */}
                        <div>
                             <h3 className="font-mono-type font-bold text-xs text-gray-400 mb-3 uppercase tracking-wider border-b border-gray-100 pb-1">01 // Experiencia</h3>
                             <div className="bg-gray-50 p-4 rounded-sm border border-gray-100 flex gap-4 items-center">
                                 <div className="flex-1">
                                     <div className="flex justify-between text-xs font-bold text-gray-500 mb-2 font-mono-type">
                                         <span>NIVEL {user.level}</span>
                                         <span>{user.xp} XP</span>
                                     </div>
                                     <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
                                        <div className="h-full bg-gray-900" style={{width: `${(user.xp % 100)}%`}}></div>
                                     </div>
                                 </div>
                             </div>
                        </div>

                        <div>
                            <h3 className="font-mono-type font-bold text-xs text-gray-400 mb-3 uppercase tracking-wider border-b border-gray-100 pb-1">02 // Resumen Táctico</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-[#fdfbf7] p-4 rounded-sm shadow-sm border border-gray-100 relative overflow-hidden group">
                                    <div className="text-3xl font-mono-type font-bold text-gray-900 mb-1 group-hover:scale-110 transition-transform origin-left">{stats.totalPages.toLocaleString()}</div>
                                    <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Páginas Leídas</div>
                                    <BookOpen size={48} className="absolute -right-4 -bottom-4 text-gray-100 group-hover:rotate-12 transition-transform"/>
                                </div>
                                <div className="bg-[#fdfbf7] p-4 rounded-sm shadow-sm border border-gray-100 relative overflow-hidden group">
                                    <div className="text-3xl font-mono-type font-bold text-orange-600 mb-1 group-hover:scale-110 transition-transform origin-left">{user.currentStreak}</div>
                                    <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Días Racha</div>
                                    <Flame size={48} className="absolute -right-4 -bottom-4 text-orange-50 group-hover:scale-110 transition-transform"/>
                                </div>
                            </div>
                        </div>

                        {/* Medals improved visual */}
                        <div>
                             <h3 className="font-mono-type font-bold text-xs text-gray-400 mb-3 uppercase tracking-wider border-b border-gray-100 pb-1">03 // Condecoraciones</h3>
                             <div className="bg-gray-100/50 p-4 rounded-lg border border-gray-200">
                                 <div className="grid grid-cols-5 gap-4">
                                     {user.achievements.map(achievement => (
                                         <div key={achievement.id} className={`aspect-square rounded-full flex items-center justify-center text-xl border-4 transition-all relative group ${achievement.unlocked ? 'bg-white border-yellow-500 shadow-md scale-100' : 'bg-gray-200 border-gray-300 grayscale opacity-40 scale-90'}`}>
                                             {achievement.icon}
                                         </div>
                                     ))}
                                 </div>
                             </div>
                        </div>
                    </div>
                )}
                {profileTab === 'SHELF' && (
                    <div className="grid grid-cols-3 gap-x-4 gap-y-8 animate-pop px-2">
                        {user.books.filter(b => b.status === BookStatus.FINISHED).map(book => (
                            <div key={book.id} onClick={() => navigateToBookDetail(book)} className="group cursor-pointer">
                                <div className="w-full aspect-[2/3] shadow-md rounded-r-sm rounded-l-[1px] overflow-hidden border-l-2 border-white/20 relative transform transition-transform group-hover:-translate-y-2">
                                    <div className="absolute inset-0 spine-left z-10"></div>
                                    <img src={book.coverUrl} className="w-full h-full object-cover" />
                                </div>
                                <div className="mt-2 text-center">
                                    <div className="flex justify-center gap-0.5 text-orange-400 mb-1">
                                        {[...Array(book.rating || 0)].map((_, i) => <Star key={i} size={8} fill="currentColor"/>)}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {user.books.filter(b => b.status === BookStatus.FINISHED).length === 0 && <div className="col-span-3 text-center py-10 text-gray-400 font-hand text-lg">Tu estantería de leídos está vacía.</div>}
                    </div>
                )}
                {profileTab === 'REVIEWS' && (
                    <div className="space-y-4 animate-pop">
                         {userPosts.length === 0 ? (
                             <div className="text-center py-10 text-gray-400 font-hand text-lg">No has publicado reseñas aún.</div>
                         ) : (
                             userPosts.map(post => (
                                 <div key={post.id} className="bg-[#fdfbf7] p-4 border border-gray-100 shadow-sm rounded-sm flex gap-4 relative group">
                                     <div className="w-16 h-24 shrink-0 shadow-sm border border-white"><img src={post.bookCoverUrl} className="w-full h-full object-cover" /></div>
                                     <div className="flex-1 min-w-0">
                                         <h4 className="font-bold text-gray-900 text-sm truncate">{post.bookTitle}</h4>
                                         <div className="flex gap-0.5 mb-2">{[...Array(5)].map((_, i) => (<Star key={i} size={12} className={i < (post.rating || 0) ? "fill-orange-400 text-orange-400" : "text-gray-200"} />))}</div>
                                         <p className="text-sm text-gray-600 font-serif-book italic leading-relaxed line-clamp-3">"{post.reviewText}"</p>
                                         <div className="mt-2 text-xs text-gray-400 font-bold uppercase">{post.likes} Me gusta</div>
                                     </div>
                                     <button 
                                        onClick={async () => {
                                            if(confirm("¿Borrar esta reseña?")) {
                                                await deleteSocialPost(post.id);
                                                setUserPosts(prev => prev.filter(p => p.id !== post.id));
                                                // Also remove from global feed locally
                                                setSocialFeed(prev => prev.filter(p => p.id !== post.id));
                                            }
                                        }}
                                        className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                     >
                                         <Trash2 size={16}/>
                                     </button>
                                 </div>
                             ))
                         )}
                    </div>
                )}
                {profileTab === 'SETTINGS' && (
                      <div className="space-y-6 animate-pop">
                          <div className="bg-gray-50 p-6 rounded-sm border border-gray-100">
                              <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Target size={18}/> Meta Mensual</h3>
                              <p className="text-xs text-gray-500 mb-4">Define cuántos libros quieres leer este mes para mantener tu racha.</p>
                              <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
                                  <button onClick={() => updateUser({monthlyGoal: Math.max(1, user.monthlyGoal - 1)})} className="w-10 h-10 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-600">-</button>
                                  <span className="font-bold text-2xl font-serif-book w-12 text-center">{user.monthlyGoal}</span>
                                  <button onClick={() => updateUser({monthlyGoal: user.monthlyGoal + 1})} className="w-10 h-10 rounded-md bg-gray-900 text-white hover:bg-gray-800 flex items-center justify-center font-bold shadow-md">+</button>
                              </div>
                          </div>
                          
                          <div className="space-y-2">
                                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide"><Shield size={16}/> Legal y Privacidad</h3>
                                <div className="bg-white rounded-sm border border-gray-100 overflow-hidden">
                                    <button className="w-full p-4 text-left flex justify-between items-center border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <FileText size={18} className="text-gray-400"/>
                                            <span className="text-sm font-bold text-gray-700">Términos y Condiciones</span>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300"/>
                                    </button>
                                    <button className="w-full p-4 text-left flex justify-between items-center border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Shield size={18} className="text-gray-400"/>
                                            <span className="text-sm font-bold text-gray-700">Política de Privacidad</span>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300"/>
                                    </button>
                                </div>
                                <div className="text-center mt-2">
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Bookmol v1.0.2</p>
                                </div>
                          </div>

                          <div className="space-y-3 pt-4 border-t border-gray-200">
                              <button onClick={() => { if(confirm("¿Seguro que quieres cerrar sesión?")) { setUser(null); localStorage.removeItem('bookmol_current_user'); }}} className="w-full p-4 bg-red-50 rounded-lg border border-red-100 text-left text-sm font-bold text-red-600 hover:bg-red-100 flex items-center gap-3 transition-colors"><LogOut size={20}/> Cerrar Sesión</button>
                          </div>
                      </div>
                )}
            </div>
        </div>
      )}

      {/* ... Add Book Modal ... */}
      {showAddBookModal && (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col page-enter">
             <div className="p-6 flex items-center justify-between sticky top-0 bg-[#fdfbf7] z-10 border-b border-gray-100">
                <button onClick={() => { setShowAddBookModal(false); setSearchQuery(''); setSearchResults([]) }} className="bg-white border border-gray-200 p-2 rounded-full shadow-sm text-gray-600"><X size={20}/></button>
                <h3 className="font-serif-book font-bold text-lg">Añadir Libro</h3>
                <div className="w-10"></div>
             </div>
             <div className="flex-1 overflow-y-auto p-6 pb-20 max-w-md mx-auto w-full">
                <form onSubmit={async (e) => { e.preventDefault(); if(!searchQuery) return; setIsSearching(true); setSearchResults(await searchGoogleBooks(searchQuery)); setIsSearching(false); }}>
                    <div className="relative group mb-6">
                        <input autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Título o autor..." className="w-full bg-white border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:border-gray-900 shadow-sm"/><button className="absolute right-3 top-3 text-gray-400"><Search size={20}/></button>
                    </div>
                </form>
                <div className="space-y-3">
                    {isSearching ? <div className="text-center py-10 font-hand text-gray-400 text-xl">Buscando...</div> : searchResults.map(book => (
                        <div key={book.id} className="flex gap-4 p-3 bg-white border border-gray-100 shadow-sm hover:border-gray-400 cursor-pointer transition-colors group rounded-lg">
                            <img src={book.coverUrl} className="w-12 h-16 object-cover shadow-sm" />
                            <div className="flex-1 py-1"><h4 className="font-bold line-clamp-1 text-gray-900 font-serif-book">{book.title}</h4><p className="text-sm text-gray-500 font-hand">{book.author}</p></div>
                            <button onClick={(e) => { e.stopPropagation(); handleAddBookToLibrary(book); }} className="ml-auto self-center text-gray-300 hover:text-green-500 p-2"><Plus size={24}/></button>
                        </div>
                    ))}
                </div>
             </div>
        </div>
      )}

      {/* ... Cork Upload Modal (FIXED) ... */}
      {showCorkUpload && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 page-enter">
              <div className="bg-[#fdfbf7] w-full max-w-sm rounded-lg shadow-2xl overflow-hidden p-6 border-4 border-white">
                  <h3 className="text-xl font-serif-book font-bold mb-4 text-center">Subir al Corcho</h3>
                  
                  <div className="space-y-4">
                      {/* Image Preview / Input */}
                      <div className="aspect-square bg-gray-100 rounded-sm border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group">
                          {corkPreview ? (
                              <>
                                <img src={corkPreview} className="w-full h-full object-cover" />
                                <button onClick={() => setCorkPreview(null)} className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"><Trash2/></button>
                              </>
                          ) : (
                              <div onClick={() => fileInputRef.current?.click()} className="text-center cursor-pointer p-4 hover:text-gray-600 text-gray-400 transition-colors">
                                  <Camera size={32} className="mx-auto mb-2"/>
                                  <p className="text-xs font-bold uppercase tracking-wide">Toca para subir foto</p>
                              </div>
                          )}
                          <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*"/>
                      </div>

                      <input value={corkBookTitle} onChange={e => setCorkBookTitle(e.target.value)} placeholder="Título del libro (opcional)" className="w-full border-b border-gray-300 py-2 bg-transparent focus:outline-none focus:border-black font-serif-book"/>
                      <input value={corkDescription} onChange={e => setCorkDescription(e.target.value)} placeholder="Breve descripción..." className="w-full border-b border-gray-300 py-2 bg-transparent focus:outline-none focus:border-black font-hand"/>
                      
                      <div className="flex gap-2 pt-2">
                          <button onClick={() => { setShowCorkUpload(false); setCorkPreview(null); }} className="flex-1 py-3 text-gray-500 font-bold text-xs uppercase">Cancelar</button>
                          <button onClick={handleCorkUpload} disabled={!corkPreview} className="flex-1 py-3 bg-gray-900 text-white font-bold text-xs uppercase rounded-sm shadow-md disabled:opacity-50">Publicar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* ... Review Modal ... */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-[#fdfbf7] flex flex-col page-enter">
             <div className="p-6 flex items-center justify-between sticky top-0 bg-[#fdfbf7] z-10 border-b border-gray-100">
                <button onClick={() => { setShowReviewModal(false); setReviewStep(1); }} className="bg-white border border-gray-200 p-2 rounded-full shadow-sm text-gray-600"><X size={20}/></button>
                <h3 className="font-serif-book font-bold text-lg">Nueva Reseña</h3>
                <div className="w-10"></div>
             </div>
             <div className="flex-1 overflow-y-auto p-6 pb-20 max-w-md mx-auto w-full">
                {reviewStep === 1 ? (
                    <>
                        <h2 className="text-2xl font-serif-book font-bold mb-4">¿Qué has leído?</h2>
                        <div className="space-y-3">
                            {user.books.length > 0 ? user.books.map(book => (
                                <div key={book.id} onClick={() => handleSelectBookForReview(book)} className="flex gap-4 p-3 bg-white border border-gray-100 shadow-sm hover:border-orange-400 cursor-pointer transition-colors group rounded-lg">
                                    <img src={book.coverUrl} className="w-12 h-16 object-cover shadow-sm" />
                                    <div className="flex-1 py-1"><h4 className="font-bold line-clamp-1 text-gray-900 font-serif-book">{book.title}</h4><p className="text-sm text-gray-500 font-hand">{book.author}</p></div>
                                    <div className="ml-auto self-center text-gray-300 group-hover:text-orange-500"><Edit3 size={20}/></div>
                                </div>
                            )) : (<div className="text-center py-10"><p className="font-hand text-gray-500 text-xl mb-4">Tu mesa está vacía.</p><Button onClick={() => { setShowReviewModal(false); setShowAddBookModal(true); }}>Ir a buscar libros</Button></div>)}
                        </div>
                    </>
                ) : (
                    <div className="space-y-8">
                         <div className="flex gap-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                             <img src={selectedBookForReview?.coverUrl} className="w-12 h-16 object-cover shadow-sm" />
                             <div><h4 className="font-bold text-sm">{selectedBookForReview?.title}</h4><p className="text-xs text-gray-500">{selectedBookForReview?.author}</p></div>
                             <button onClick={() => setReviewStep(1)} className="ml-auto text-xs text-orange-600 font-bold underline">Cambiar</button>
                        </div>
                        <div>
                             <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Valoración General</label>
                             <div className="flex gap-2">{[1,2,3,4,5].map(star => (<button key={star} onClick={() => setReviewForm({...reviewForm, rating: star})}><Star size={32} className={star <= reviewForm.rating ? "fill-orange-400 text-orange-400" : "text-gray-200"} /></button>))}</div>
                        </div>
                        <div>
                             <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Análisis Emocional</label>
                             <div className="space-y-4">
                                 {(['ROMANCE', 'SAD', 'FUNNY', 'MIND_BLOWING', 'ADVENTURE', 'SCARY'] as EmotionType[]).map(emo => {
                                     const info = getEmotionLabel(emo);
                                     const currentVal = reviewForm.emotions[emo] || 0;
                                     return (<div key={emo} className="flex items-center gap-4"><div className="w-24 text-sm font-bold text-gray-600 flex items-center gap-1">{info.icon} {info.label}</div><div className="flex-1 flex gap-1">{[1,2,3,4,5].map(lvl => (<button key={lvl} onClick={() => updateEmotionRating(emo, lvl === currentVal ? 0 : lvl)} className={`h-6 flex-1 rounded-sm transition-colors ${lvl <= currentVal ? 'bg-gray-800' : 'bg-gray-200'}`}/>))}</div></div>)
                                 })}
                             </div>
                        </div>
                        <div><label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Tu reseña</label><textarea className="w-full h-32 p-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:border-gray-900 font-hand text-lg" placeholder="Escribe aquí..." value={reviewForm.text} onChange={e => setReviewForm({...reviewForm, text: e.target.value})}/></div>
                        <Button fullWidth onClick={publishReview} className="bg-gray-900 text-white shadow-lg">Publicar Reseña</Button>
                    </div>
                )}
             </div>
        </div>
      )}

      {/* Book Details Overlay - FIXED LAYOUT */}
      {currentView === View.BOOK_DETAILS && selectedBook && (
          <div className="fixed inset-0 z-[60] bg-[#fdfbf7] flex flex-col page-enter">
               {/* 1. FIXED HEADER BACKGROUND (Visual only) */}
               <div className="absolute top-0 left-0 w-full h-96 bg-gray-900 z-0">
                   <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                   {/* Ambient Title in Background */}
                   <div className="flex flex-col items-center justify-center h-full pb-20 px-8 text-center opacity-20">
                       <h1 className="font-serif-book font-bold text-3xl text-white select-none blur-[1px] transform scale-95">{selectedBook.title}</h1>
                   </div>
               </div>
               
               {/* 2. FIXED NAV BUTTONS (Z-50) */}
               <div className="fixed top-0 left-0 w-full z-50 flex justify-between items-center p-4">
                   <button onClick={() => setCurrentView(View.LIBRARY)} className="p-2 bg-black/30 rounded-full backdrop-blur-md hover:bg-black/50 transition-colors text-white"><ChevronRight size={24} className="rotate-180"/></button>
                   <button onClick={() => handleDeleteBook(selectedBook.id)} className="p-2 bg-black/30 rounded-full backdrop-blur-md hover:bg-red-500/80 transition-colors text-white"><Trash2 size={20}/></button>
               </div>
               
               {/* 3. SCROLLABLE CONTENT (Z-10) */}
               <div className="relative z-10 flex-1 overflow-y-auto no-scrollbar">
                   {/* Spacer to push content below the visual header area */}
                   <div className="h-28 w-full"></div>

                   {/* THE BOOK COVER - Overlapping the white card */}
                   <div className="flex justify-center mb-[-60px] relative z-20 px-10 pt-10">
                        <div className="w-36 h-56 rounded-sm shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] border-4 border-white shrink-0 bg-gray-200 rotate-[-2deg] transform transition-transform hover:scale-105 hover:rotate-0">
                            <img src={selectedBook.coverUrl} className="w-full h-full object-cover"/>
                        </div>
                   </div>

                   {/* WHITE CONTENT CARD */}
                   <div className="bg-[#fdfbf7] min-h-[70vh] rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.2)] relative z-10 px-6 pt-20 pb-20">
                        {/* Title & Author Block */}
                        <div className="text-center mb-8">
                            <h1 className="font-serif-book font-bold text-2xl text-gray-900 leading-tight mb-2">{selectedBook.title}</h1>
                            <p className="font-hand text-xl text-gray-500">{selectedBook.author}</p>
                        </div>

                        {/* Stats Row */}
                        <div className="flex justify-between items-center mb-8 border-b border-gray-200 pb-4">
                            <div className="text-center px-4 border-r border-gray-200">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Páginas</span>
                                <span className="font-mono text-xl text-gray-800">{selectedBook.totalPages}</span>
                            </div>
                            <div className="text-center px-4 border-r border-gray-200">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Año</span>
                                <span className="font-mono text-xl text-gray-800">{selectedBook.publicationYear || 'N/A'}</span>
                            </div>
                                <div className="text-center px-4">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Estado</span>
                                <span className={`font-bold text-xs px-2 py-1 rounded-full uppercase ${selectedBook.status === BookStatus.FINISHED ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{selectedBook.status}</span>
                            </div>
                        </div>

                        {selectedBook.status !== BookStatus.TO_READ && (
                            <div className="mb-10 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between mb-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase">Tu Progreso</span>
                                    <span className="text-xs font-bold text-gray-900">{Math.round((selectedBook.currentPage/selectedBook.totalPages)*100)}%</span>
                                </div>
                                <input type="range" min="0" max={selectedBook.totalPages} value={selectedBook.currentPage} onChange={(e) => handleUpdateProgress(selectedBook.id, parseInt(e.target.value), selectedBook.status)} className="w-full mb-4 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"/>
                                <div className="flex gap-2 justify-center">
                                    <button onClick={() => handleUpdateProgress(selectedBook.id, selectedBook.currentPage, BookStatus.READING)} className={`px-4 py-2 rounded-lg font-bold uppercase text-[10px] tracking-wider border transition-colors ${selectedBook.status === BookStatus.READING ? 'bg-gray-900 text-white border-gray-900' : 'bg-transparent text-gray-400 border-gray-200 hover:border-gray-400'}`}>Leyendo</button>
                                    <button onClick={() => handleUpdateProgress(selectedBook.id, selectedBook.totalPages, BookStatus.FINISHED)} className={`px-4 py-2 rounded-lg font-bold uppercase text-[10px] tracking-wider border transition-colors ${selectedBook.status === BookStatus.FINISHED ? 'bg-green-600 text-white border-green-600' : 'bg-transparent text-gray-400 border-gray-200 hover:border-gray-400'}`}>Terminado</button>
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="font-serif-book font-bold text-xl text-gray-900 mb-4 flex items-center gap-2"><Bookmark size={20} className="text-orange-500"/> Sinopsis</h3>
                            <div className="font-serif-book text-gray-700 text-base leading-loose text-justify space-y-4 first-letter:text-5xl first-letter:font-bold first-letter:text-gray-900 first-letter:float-left first-letter:mr-3 first-letter:mt-[-10px]">
                                {selectedBook.description}
                            </div>
                        </div>
                   </div>
               </div>
          </div>
      )}

    </Layout>
      {/* GLOBAL SEARCH MODAL */}
      {showUserSearch && (
          <div className="fixed inset-0 z-50 bg-[#e8e6df] flex flex-col page-enter">
              <div className="p-4 bg-white shadow-sm border-b border-gray-300">
                  <div className="flex items-center gap-2 mb-3">
                      <button onClick={() => setShowUserSearch(false)} className="p-2 -ml-2"><ChevronRight className="rotate-180" size={24}/></button>
                      <form onSubmit={handleGlobalSearch} className="flex-1 flex gap-2">
                          <input 
                            type="text" 
                            placeholder={searchType === 'USERS' ? "Buscar personas..." : "Buscar libros..."}
                            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            autoFocus
                          />
                          <button type="submit" className="bg-gray-900 text-white p-2 rounded-full" disabled={isUserSearching}>
                              {isUserSearching ? <Loader2 className="animate-spin" size={20}/> : <Search size={20}/>}
                          </button>
                      </form>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex border-b border-gray-200">
                      <button 
                        onClick={() => setSearchType('BOOKS')} 
                        className={`flex-1 pb-2 text-sm font-bold transition-colors border-b-2 ${searchType === 'BOOKS' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'}`}
                      >
                          LIBROS
                      </button>
                      <button 
                        onClick={() => setSearchType('USERS')} 
                        className={`flex-1 pb-2 text-sm font-bold transition-colors border-b-2 ${searchType === 'USERS' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400'}`}
                      >
                          PERSONAS
                      </button>
                  </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* USER RESULTS */}
                  {searchType === 'USERS' && (
                      <>
                        {userSearchResults.length === 0 && !isUserSearching && userSearchQuery && (
                            <div className="text-center text-gray-500 mt-10">No se encontraron usuarios.</div>
                        )}
                        {userSearchResults.map(result => {
                            const isFollowing = user?.following.includes(result.id);
                            const isMe = user?.id === result.id;
                            // Allowed self-search for verification, maybe add (You) label
                            
                            return (
                                <div key={result.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-3">
                                    <img src={result.avatarUrl} className="w-12 h-12 rounded-full bg-gray-100 object-cover border border-gray-200" />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-900 truncate">{result.username}</h4>
                                        <div className="text-xs text-gray-500 flex gap-2">
                                            <span>Lvl {result.level}</span>
                                            <span>•</span>
                                            <span>{result.books?.length || 0} libros</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleFollowFromSearch(result.id)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                                            isFollowing 
                                            ? 'bg-gray-100 text-gray-900 border border-gray-300' 
                                            : 'bg-gray-900 text-white'
                                        }`}
                                    >
                                        {isFollowing ? 'Siguiendo' : 'Seguir'}
                                    </button>
                                </div>
                            );
                        })}
                      </>
                  )}

                  {/* BOOK RESULTS */}
                  {searchType === 'BOOKS' && (
                      <div className="grid grid-cols-2 gap-4">
                          {bookSearchResults.length === 0 && !isUserSearching && userSearchQuery && (
                              <div className="col-span-2 text-center text-gray-500 mt-10">No se encontraron libros.</div>
                          )}
                          {bookSearchResults.map(book => (
                             <div key={book.id} className="relative">
                                 <BookCard 
                                    book={book} 
                                    onClick={() => handleAddBookToLibrary(book)} 
                                    variant="detailed"
                                 />
                                 <button onClick={() => handleAddBookToLibrary(book)} className="absolute top-2 right-2 bg-gray-900 text-white p-1.5 rounded-full shadow-md z-10">
                                     <Plus size={16} />
                                 </button>
                             </div>
                          ))}
                      </div>
                  )}
              </div>
          </div>
      )}

    </div>
  );
}

export default App;
