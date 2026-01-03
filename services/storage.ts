import { UserData, CorkItem, Achievement, WeeklyChallenge, SocialPost, FriendProfile, Book, Notification } from '../types';
import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, orderBy, query, limit, addDoc, where, arrayUnion, arrayRemove, increment, deleteDoc, onSnapshot } from 'firebase/firestore';
import LZString from 'lz-string';

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  // Progreso de Lectura
  { id: 'read_1', title: 'Primer Libro', description: 'Termina tu primera lectura.', icon: '🌱', unlocked: false, category: 'READING', targetCount: 1 },
  { id: 'read_5', title: 'Lector Constante', description: 'Lee 5 libros.', icon: '📚', unlocked: false, category: 'READING', targetCount: 5 },
  { id: 'read_10', title: 'Bibliófilo', description: 'Lee 10 libros.', icon: '🤓', unlocked: false, category: 'READING', targetCount: 10 },
  { id: 'read_25', title: 'Devoralibros', description: 'Lee 25 libros.', icon: '🦈', unlocked: false, category: 'READING', targetCount: 25 },
  { id: 'read_50', title: 'Biblioteca Viviente', description: 'Lee 50 libros.', icon: '🏛️', unlocked: false, category: 'READING', targetCount: 50 },
  
  // Streak
  { id: 'streak_7', title: 'Racha de Fuego', description: 'Lee 7 días seguidos.', icon: '🔥', unlocked: false, category: 'STREAK', targetCount: 7 },
  
  // Diversidad
  { id: 'div_genre_3', title: 'Explorador', description: 'Lee 3 géneros distintos.', icon: '🧭', unlocked: false, category: 'DIVERSITY', targetCount: 3 },
  { id: 'div_genre_5', title: 'Viajero Literario', description: 'Lee 5 géneros distintos.', icon: '🌍', unlocked: false, category: 'DIVERSITY', targetCount: 5 },
  
  // Participación
  { id: 'social_review_1', title: 'Primera Reseña', description: 'Publica tu primera reseña.', icon: '✍️', unlocked: false, category: 'SOCIAL', targetCount: 1 },
  { id: 'social_review_10', title: 'Crítico Literario', description: 'Publica 10 reseñas.', icon: '🎖️', unlocked: false, category: 'SOCIAL', targetCount: 10 },
  { id: 'cork_upload_1', title: 'Artista del Cork', description: 'Sube tu primera ilustración.', icon: '🎨', unlocked: false, category: 'SOCIAL', targetCount: 1 },
  { id: 'cork_fav_5', title: 'Coleccionista', description: 'Guarda 5 ilustraciones favoritas.', icon: '📌', unlocked: false, category: 'COLLECTION', targetCount: 5 },
];

const CURRENT_CHALLENGE: WeeklyChallenge = {
  id: 'week-current',
  title: 'Maratón de Páginas',
  description: 'Lee 150 páginas esta semana.',
  target: 150,
  current: 0,
  unit: 'pages',
  expiresAt: Date.now() + 604800000, // 7 days
  rewardXp: 300
};

export const FRIENDS_LIST: FriendProfile[] = [
    { 
        id: 'bookmol_official', 
        username: 'Bookmol', 
        avatarUrl: 'https://api.dicebear.com/7.x/identicon/svg?seed=BookmolApp&backgroundColor=e6e6e6', 
        isDev: true,
        followers: [],
        following: []
    }
];

export const SOCIAL_FEED: SocialPost[] = [
    {
        id: '1',
        userId: 'user1',
        username: 'Maria Garcia',
        userAvatar: 'https://ui-avatars.com/api/?name=Maria+Garcia&background=0D8ABC&color=fff',
        bookId: 'dummy_1',
        bookTitle: 'Cien años de soledad',
        bookAuthor: 'Gabriel García Márquez',
        bookCoverUrl: 'http://books.google.com/books/content?id=cgDHAAAACAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api',
        rating: 5,
        reviewText: 'Una obra maestra absoluta. La historia de los Buendía me atrapó desde la primera página.',
        likes: 12,
        comments: 2,
        commentsList: [],
        timestamp: Date.now() - 86400000,
        isLiked: false
    },
    {
        id: '2',
        userId: 'admin',
        username: 'BookMol Team',
        userAvatar: 'https://ui-avatars.com/api/?name=Book+Mol&background=000&color=fff',
        bookId: 'announcement_1',
        reviewText: '¡Bienvenidos a la beta de BookMol! Esperamos que disfrutéis de la lectura.',
        likes: 45,
        comments: 10,
        commentsList: [],
        timestamp: Date.now() - 172800000,
        isLiked: false,
        // isAnnouncement: true // Removed as it's not in interface, or added to interface if needed. Assuming standard post structure for now.
    }
];

// --- COMPRESSION HELPERS ---
const compressBook = (book: Book): any => {
    return {
        ...book,
        description: book.description ? LZString.compressToUTF16(book.description) : undefined,
        review: book.review ? LZString.compressToUTF16(book.review) : undefined,
        notes: book.notes ? LZString.compressToUTF16(book.notes) : undefined,
        _compressed: true
    };
};

const decompressBook = (book: any): Book => {
    if (!book._compressed) return book as Book;
    return {
        ...book,
        description: book.description ? LZString.decompressFromUTF16(book.description) : undefined,
        review: book.review ? LZString.decompressFromUTF16(book.review) : undefined,
        notes: book.notes ? LZString.decompressFromUTF16(book.notes) : undefined,
    } as Book;
};

// --- FIREBASE SERVICE FUNCTIONS ---

// Helper to migrate legacy books
const migrateLegacyBooks = async (userId: string, legacyBooks: Book[]) => {
    if (!legacyBooks || legacyBooks.length === 0) return;
    
    console.log(`Migrating ${legacyBooks.length} books for user ${userId}...`);
    const batch = [];
    const libraryRef = collection(db, 'users', userId, 'library');
    
    // We'll migrate one by one for safety or use Promise.all since logic is simple
    // Batch writes are better but let's stick to simple individual saves for clarity in this snippet or use parallel.
    // Given the constraints and typical user library size, parallel setDoc is fine.
    
    await Promise.all(legacyBooks.map(book => {
         const bookRef = doc(libraryRef, book.id);
         return setDoc(bookRef, { ...book, _migrated: true });
    }));

    // Clear legacy books from main user doc to prevent re-migration
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, { books: [] }); 
    console.log("Migration complete.");
};

export const saveBookToLibrary = async (userId: string, book: Book) => {
    try {
        const bookRef = doc(db, 'users', userId, 'library', book.id);
        await setDoc(bookRef, book);
    } catch (e) {
        console.error("Error saving book to library:", e);
        throw e;
    }
};

export const deleteBookFromLibrary = async (userId: string, bookId: string) => {
    try {
        await deleteDoc(doc(db, 'users', userId, 'library', bookId));
    } catch (e) {
        console.error("Error deleting book from library:", e);
        throw e;
    }
};

export const getLibrary = async (userId: string): Promise<Book[]> => {
    try {
        const libraryRef = collection(db, 'users', userId, 'library');
        // Retrieve all books. In a real app with huge libraries, we'd paginate.
        const snapshot = await getDocs(libraryRef);
        return snapshot.docs.map(doc => doc.data() as Book);
    } catch (e) {
        console.error("Error fetching library:", e);
        return [];
    }
};

export const fetchUserProfile = async (uid: string, email: string | null, displayName: string | null): Promise<UserData> => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        const data = userSnap.data() as UserData;
        
        // 1. Check for legacy books array
        let legacyBooks: Book[] = [];
        if (data.books && data.books.length > 0) {
             legacyBooks = data.books.map(decompressBook);
        }

        // 2. Fetch books from subcollection
        let libraryBooks = await getLibrary(uid);

        // 3. Migration Logic: If subcollection is empty but we have legacy books, migrate them
        if (libraryBooks.length === 0 && legacyBooks.length > 0) {
            await migrateLegacyBooks(uid, legacyBooks);
            libraryBooks = legacyBooks; // Use legacy books for immediate return
        }
        
        // Populate local state object with library books
        data.books = libraryBooks;

        if (!data.corkItems) data.corkItems = [];
        if (!data.achievements) data.achievements = DEFAULT_ACHIEVEMENTS;
        if (!data.activeChallenge) data.activeChallenge = CURRENT_CHALLENGE;
        if (!data.followers) data.followers = [];
        if (!data.following) data.following = [];

        // Ensure shortId exists (persistent)
        if (!data.shortId) {
            const shortId = `#${uid.substring(5, 12).toUpperCase()}`;
            data.shortId = shortId;
            // Save it immediately so it's searchable
            await updateDoc(userRef, { shortId: shortId }); 
        }

        return data;
    } else {
        // Initialize new user in Firestore
            const baseName = displayName || email?.split('@')[0] || 'Lector';
            const uniqueSuffix = Date.now().toString().slice(-4) + Math.floor(Math.random() * 1000).toString(); 
            const handle = `@${baseName.replace(/\s+/g, '')}_${uniqueSuffix}`;
            const shortId = `#${uid.substring(5, 12).toUpperCase()}`;

            const newUser: UserData = {
                id: uid,
                username: baseName,
                handle: handle,
                shortId: shortId,
                bio: 'Lector novato en Bookmol.',
            avatarUrl: `https://ui-avatars.com/api/?name=${displayName || 'User'}&background=random&color=fff`,
            level: 1,
            xp: 0,
            joinedAt: Date.now(),
            monthlyGoal: 3,
            currentStreak: 0,
            longestStreak: 0,
            lastReadDate: '',
            books: [],
            corkItems: [],
            corkFavorites: [],
            achievements: DEFAULT_ACHIEVEMENTS,
            activeChallenge: CURRENT_CHALLENGE,
            following: [],
            followers: []
        };
        await setDoc(userRef, newUser);
        return newUser;
    }
};

export const saveUserData = async (data: UserData) => {
    if (!data.id) return;
    try {
        const userRef = doc(db, 'users', data.id);
        // Exclude books from the main user document
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { books, ...dataToSave } = data;
        
        await setDoc(userRef, dataToSave, { merge: true });
    } catch (e) {
        console.error("Error saving user data to Firestore:", e);
    }
};

// --- CORK BOARD FUNCTIONS ---
export const uploadCorkItem = async (item: CorkItem) => {
    try {
        // We save to a 'cork_items' collection for global feed
        await setDoc(doc(db, 'cork_items', item.id), item);
        // We also rely on 'saveUserData' to save it to the user's profile for "My Uploads"
        // (App.tsx currently handles adding it to the user object)
    } catch (e) {
        console.error("Error uploading cork item:", e);
    }
};

export const getCorkFeed = async (): Promise<CorkItem[]> => {
    try {
        const q = query(collection(db, 'cork_items'), orderBy('timestamp', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as CorkItem);
    } catch (e) {
        console.warn("Error fetching cork feed:", e);
        return [];
    }
};

// --- SOCIAL / FOLLOW FUNCTIONS ---
// --- SOCIAL / FOLLOW FUNCTIONS ---
export const toggleFollow = async (currentUserId: string, targetUserId: string, isFollowing: boolean) => {
    try {
        const currentUserRef = doc(db, 'users', currentUserId);
        const targetUserRef = doc(db, 'users', targetUserId);

        if (isFollowing) {
            // Unfollow
            await updateDoc(currentUserRef, { following: arrayRemove(targetUserId) });
            await updateDoc(targetUserRef, { followers: arrayRemove(currentUserId) });
        } else {
            // Follow
            await updateDoc(currentUserRef, { following: arrayUnion(targetUserId) });
            await updateDoc(targetUserRef, { followers: arrayUnion(currentUserId) });

            // Send Notification
            // We need current user details (simplest is to pass them or fetch them, but passing is better for perf)
            // However, we only have IDs here. Let's fetch quick or rely on client to pass details? 
            // For now, let's fetch sender details quickly to ensure data integrity
            const senderSnap = await getDoc(currentUserRef);
            const senderData = senderSnap.data() as UserData;
            
            if (senderData) {
                 await sendNotification(targetUserId, {
                     type: 'FOLLOW',
                     fromUserId: currentUserId,
                     fromUsername: senderData.username,
                     fromUserAvatar: senderData.avatarUrl || '',
                     timestamp: Date.now(),
                     read: false
                 });
            }
        }
    } catch (e) {
        console.error("Error toggling follow:", e);
    }
};

export const sendNotification = async (toUserId: string, notification: Omit<Notification, 'id'>) => {
    try {
        const notifRef = collection(db, 'users', toUserId, 'notifications');
        await addDoc(notifRef, notification);
    } catch (e) {
        console.error("Error sending notification:", e);
    }
};

export const subscribeToNotifications = (userId: string, callback: (notifications: Notification[]) => void) => {
    const notifRef = collection(db, 'users', userId, 'notifications');
    // Only unread notifications? or all? Let's get all for now, client can filter.
    // Actually for badge count, unread is key.
    const q = query(notifRef, orderBy('timestamp', 'desc'), limit(20));
    
    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
        callback(notifications);
    });
};

export const markNotificationAsRead = async (userId: string, notificationId: string) => {
    try {
         await updateDoc(doc(db, 'users', userId, 'notifications', notificationId), { read: true });
    } catch (e) {
        console.error("Error marking notification read:", e);
    }
};

export const markAllNotificationsAsRead = async (userId: string) => {
    try {
        const notifRef = collection(db, 'users', userId, 'notifications');
        const q = query(notifRef, where('read', '==', false));
        const snapshot = await getDocs(q);
        
        const batch = [];
        snapshot.docs.forEach(docSnap => {
            updateDoc(doc(db, 'users', userId, 'notifications', docSnap.id), { read: true });
        });
        // Ideally use writeBatch for atomicity but simple loop works for now or Promise.all
        await Promise.all(snapshot.docs.map(d => updateDoc(doc(db, 'users', userId, 'notifications', d.id), { read: true })));
    } catch (e) {
        console.error("Error marking all notifications read:", e);
    }
};


// --- GLOBAL FEED FUNCTIONS ---

export const getGlobalSocialFeed = async (): Promise<SocialPost[]> => {
    try {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, orderBy('timestamp', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        const posts: SocialPost[] = snapshot.docs.map(doc => doc.data() as SocialPost);
        return posts.length > 0 ? posts : SOCIAL_FEED;
    } catch (e) {
        console.warn("Error fetching feed, returning default:", e);
        return SOCIAL_FEED;
    }
};

export const publishPost = async (post: SocialPost) => {
    const postsRef = collection(db, 'posts');
    if (post.id) {
        await setDoc(doc(db, 'posts', post.id), post);
    } else {
        await addDoc(postsRef, post);
    }
};

export const togglePostLike = async (postId: string, userId: string, isLiked: boolean) => {
    try {
        const postRef = doc(db, 'posts', postId);
        // Using increment because multiple users might like at once
        await updateDoc(postRef, {
             likes: isLiked ? increment(-1) : increment(1) 
             // Note: In a real app we'd store a 'likes' subcollection to prevent double-liking by ID,
             // but for this migration we'll stick to the counter as per the existing type, 
             // assuming client-side state handles the 'isLiked' toggle for the session.
        });
    } catch (e) {
        console.error("Error toggling post like:", e);
    }
};

export const addCommentToPost = async (postId: string, comment: any) => {
    try {
        const postRef = doc(db, 'posts', postId);
        await updateDoc(postRef, {
            comments: increment(1),
            commentsList: arrayUnion(comment)
        });
    } catch (e) {
         console.error("Error adding comment:", e);
    }
};

export const toggleCorkLike = async (itemId: string, userId: string, isLiked: boolean) => {
    try {
        const itemRef = doc(db, 'cork_items', itemId);
        await updateDoc(itemRef, {
            likes: isLiked ? increment(-1) : increment(1)
        });
    } catch (e) {
        console.error("Error toggling cork like:", e);
    }
};

export const deleteSocialPost = async (postId: string) => {
    try {
        await deleteDoc(doc(db, 'posts', postId));
    } catch (e) {
        console.error("Error deleting post:", e);
    }
};

export const getUserPosts = async (userId: string): Promise<SocialPost[]> => {
    try {
        const postsRef = collection(db, 'posts');
        const q = query(postsRef, where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as SocialPost);
    } catch (e) {
        console.error("Error fetching user posts:", e);
        return [];
    }
};

export const searchUsers = async (searchTerm: string): Promise<UserData[]> => {
    try {
        const usersRef = collection(db, 'users');
        
        // 1. Query by Username (Display Name) - Prefix search
        const qName = query(
            usersRef, 
            where('username', '>=', searchTerm), 
            where('username', '<=', searchTerm + '\uf8ff'),
            limit(5)
        );

        // 2. Query by Handle (Unique ID) - Exact or Prefix
        const qHandle = query(
            usersRef, 
            where('handle', '>=', searchTerm), 
            where('handle', '<=', searchTerm + '\uf8ff'),
            limit(5)
        );

        // 3. Query by Short ID (e.g. #ABC1234) - Prefix Search
        const normalizedTerm = searchTerm.toUpperCase();
        const shortIdTerm = normalizedTerm.startsWith('#') ? normalizedTerm : '#' + normalizedTerm;
        
        const qShortId = query(
            usersRef,
            where('shortId', '>=', shortIdTerm),
            where('shortId', '<=', shortIdTerm + '\uf8ff'),
            limit(5)
        );

        const [snapName, snapHandle, snapShortId] = await Promise.all([
            getDocs(qName), 
            getDocs(qHandle),
            getDocs(qShortId)
        ]);
        
        const results = new Map();
        snapName.docs.forEach(doc => results.set(doc.id, doc.data() as UserData));
        snapHandle.docs.forEach(doc => results.set(doc.id, doc.data() as UserData));
        snapShortId.docs.forEach(doc => results.set(doc.id, doc.data() as UserData));

        return Array.from(results.values());
    } catch (e) {
        console.error("Error searching users:", e);
        return [];
    }
};