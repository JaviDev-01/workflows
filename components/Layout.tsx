import React from 'react';
import { Home, BookOpen, User, Layers, Search } from 'lucide-react';
import { View } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeView: View;
  onChangeView: (view: View) => void;
  onLogout: () => void;
  username: string;
  notificationCount?: number;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeView, 
  onChangeView, 
  onLogout,
  username,
  notificationCount = 0
}) => {
  return (
    <div className="flex flex-col h-screen max-w-md mx-auto relative bg-[#fdfbf7] overflow-hidden sm:border-x sm:border-gray-200 font-sans shadow-2xl">
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 px-0 scroll-smooth no-scrollbar relative z-0">
        {children}
      </main>

      {/* PAPER NAV - DOCKED BOTTOM */}
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-[#fdfbf7]/95 backdrop-blur-md border-t border-gray-200 pb-5 pt-3 px-6 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        <nav className="flex justify-between items-center w-full">
          
          <NavButton 
              active={activeView === View.HOME} 
              onClick={() => onChangeView(View.HOME)} 
              icon={<Home size={24} strokeWidth={activeView === View.HOME ? 2.5 : 2} />}
          />
          
          <NavButton 
              active={activeView === View.EXPLORE} 
              onClick={() => onChangeView(View.EXPLORE)} 
              icon={<Search size={24} strokeWidth={activeView === View.EXPLORE ? 2.5 : 2} />}
          />

          <NavButton 
              active={activeView === View.LIBRARY || activeView === View.BOOK_DETAILS} 
              onClick={() => onChangeView(View.LIBRARY)} 
              icon={<BookOpen size={24} strokeWidth={activeView === View.LIBRARY || activeView === View.BOOK_DETAILS ? 2.5 : 2} />}
          />
          
          <NavButton 
              active={activeView === View.CORK} 
              onClick={() => onChangeView(View.CORK)} 
              icon={<Layers size={24} strokeWidth={activeView === View.CORK ? 2.5 : 2} />}
          />
          
          <div className="relative">
              <NavButton 
                  active={activeView === View.PROFILE} 
                  onClick={() => onChangeView(View.PROFILE)} 
                  icon={<User size={24} strokeWidth={activeView === View.PROFILE ? 2.5 : 2} />}
              />
              {notificationCount > 0 && (
                  <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4 bg-red-500 text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-[#fdfbf7] animate-pop">
                      {notificationCount > 9 ? '9+' : notificationCount}
                  </div>
              )}
          </div>
        </nav>
      </div>
    </div>
  );
};

const NavButton = ({ active, onClick, icon }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 group ${active ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
  >
    <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'group-hover:scale-105'}`}>
        {icon}
    </div>
    {/* Indicator dot for active state */}
    {active && <div className="w-1 h-1 bg-gray-900 rounded-full mt-1.5 animate-pop"></div>}
  </button>
);