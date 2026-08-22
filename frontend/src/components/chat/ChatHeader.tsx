import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Globe } from 'lucide-react';
import { AiAvatar } from './AiAvatar';
import { IconButton } from '../common/IconButton';
import { Badge } from '../common/Badge';
import { ThemeToggle } from '../common/ThemeToggle';

export interface ChatHeaderProps {
  onOpenMobileSidebar?: () => void;
  selectedLanguageName?: string;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onOpenMobileSidebar,
  selectedLanguageName = 'English',
}) => {
  return (
    <header className="w-full bg-surface-card border-b border-surface-border h-16 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-subtle z-10">
      
      {/* Left: Mobile Menu + AI Info */}
      <div className="flex items-center gap-3">
        {onOpenMobileSidebar && (
          <IconButton
            aria-label="Open conversation menu"
            variant="ghost"
            size="md"
            onClick={onOpenMobileSidebar}
            className="md:hidden"
          >
            <Menu className="w-5 h-5" />
          </IconButton>
        )}

        <div className="flex items-center gap-2.5">
          <AiAvatar size="sm" isOnline />
          <div className="flex flex-col">
            <span className="text-sm font-bold text-content-primary leading-tight">
              SehatMitra AI
            </span>
            <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Ready to help
            </span>
          </div>
        </div>
      </div>

      {/* Right: Selected Language Badge & Theme Toggle */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Link to="/language">
          <Badge
            variant="teal"
            size="md"
            icon={<Globe className="w-3.5 h-3.5 text-brand-600" />}
            className="hover:border-brand-400 transition-colors cursor-pointer"
          >
            {selectedLanguageName}
          </Badge>
        </Link>
      </div>

    </header>
  );
};
