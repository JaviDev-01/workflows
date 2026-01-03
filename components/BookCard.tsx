import React from 'react';
import { Book, BookStatus } from '../types';
import { Check, Star } from 'lucide-react';

interface BookCardProps {
  book: Book;
  onClick: (book: Book) => void;
  variant?: 'grid' | 'list';
}

export const BookCard: React.FC<BookCardProps> = ({ book, onClick, variant = 'grid' }) => {
  const percentage = Math.round((book.currentPage / book.totalPages) * 100);

  // LIST VARIANT: "Reading Log Entry" Style
  if (variant === 'list') {
    return (
        <div 
        onClick={() => onClick(book)}
        className="group relative bg-white p-4 flex gap-5 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-orange-50/30 transition-colors"
      >
        <div className="relative shrink-0 shadow-md rounded-sm overflow-hidden w-14 h-20">
            <div className="absolute inset-0 z-10 spine-left"></div>
            <img src={book.coverUrl} className="w-full h-full object-cover" />
        </div>
        
        <div className="flex-1 flex flex-col justify-center min-w-0">
            <h3 className="font-serif-book font-bold text-gray-900 leading-tight text-lg truncate">{book.title}</h3>
            <p className="text-sm text-gray-500 font-medium font-hand">{book.author}</p>
            
            {book.status === BookStatus.READING && (
                <div className="mt-2 w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-400" style={{width: `${percentage}%`}}></div>
                </div>
            )}
        </div>
        
        <div className="flex flex-col items-end justify-center">
            {book.status === BookStatus.FINISHED ? (
                <div className="text-green-600 font-hand font-bold text-lg">Leído</div>
            ) : (
                <div className="text-right">
                    <span className="block text-lg font-bold text-gray-900 leading-none font-serif-book">{percentage}%</span>
                </div>
            )}
        </div>
      </div>
    );
  }

  // GRID VARIANT: "Book on Shelf" Style
  return (
    <div 
      onClick={() => onClick(book)}
      className="group flex flex-col items-center cursor-pointer w-full"
    >
      {/* The Physical Book */}
      <div className="relative w-24 h-36 mb-3 shadow-[3px_5px_15px_rgba(0,0,0,0.15)] rounded-r-md rounded-l-sm overflow-hidden transition-transform duration-300 group-hover:-translate-y-2 group-hover:rotate-1 bg-white">
        <div className="absolute inset-0 z-10 spine-left"></div>
        <img 
          src={book.coverUrl} 
          alt={book.title} 
          className="w-full h-full object-cover" 
        />
        {/* Bookmark ribbon if reading */}
        {book.status === BookStatus.READING && (
            <div className="absolute -top-1 right-2 w-3 h-8 bg-red-500 shadow-sm z-20 rounded-b-sm"></div>
        )}
      </div>
    </div>
  );
};