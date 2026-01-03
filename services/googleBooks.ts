import { Book, BookStatus } from '../types';

interface GoogleBookResult {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail: string;
    };
    publishedDate?: string;
  };
}

// Helper to strip HTML tags from Google Books descriptions
const cleanDescription = (html?: string): string => {
  if (!html) return 'Sin descripción disponible.';
  // Create a temporary element to strip HTML (browser-side safe)
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  let cleanText = tmp.textContent || tmp.innerText || "";
  
  // Remove excessive whitespace
  cleanText = cleanText.replace(/\s+/g, ' ').trim();
  
  // Return the full text, no truncation
  return cleanText;
};

export const searchGoogleBooks = async (query: string): Promise<Book[]> => {
  if (!query) return [];

  try {
    const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&langRestrict=es`);
    const data = await response.json();

    if (!data.items) return [];

    return data.items.map((item: GoogleBookResult) => ({
      id: item.id, // Use Google Book ID temporarily
      title: item.volumeInfo.title || 'Sin título',
      author: item.volumeInfo.authors ? item.volumeInfo.authors[0] : 'Autor desconocido',
      description: cleanDescription(item.volumeInfo.description),
      coverUrl: item.volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || `https://ui-avatars.com/api/?name=${item.volumeInfo.title}&background=random`,
      // Fallback logic for pages: Google sometimes returns 0 or null. Default to 250 avg or estimated based on description length.
      totalPages: item.volumeInfo.pageCount && item.volumeInfo.pageCount > 0 ? item.volumeInfo.pageCount : 250,
      currentPage: 0,
      status: BookStatus.TO_READ,
      genre: item.volumeInfo.categories ? item.volumeInfo.categories[0] : 'General',
      addedAt: Date.now(),
      publicationYear: item.volumeInfo.publishedDate?.substring(0, 4)
    }));
  } catch (error) {
    console.error("Error fetching Google Books:", error);
    return [];
  }
};