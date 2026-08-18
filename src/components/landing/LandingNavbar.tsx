import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Globe, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '../common/Button';
import { ThemeToggle } from '../common/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export const LandingNavbar: React.FC = () => {
  const { isAuthenticated, user, logout, showAuthModal } = useAuth();

  return (
    <header className="w-full bg-surface-card/90 backdrop-blur border-b border-surface-border sticky top-0 z-40">
      <div className="max-w-content-container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-md bg-brand-600 flex items-center justify-center text-white transition-colors group-hover:bg-brand-700 shadow-subtle">
            <Heart className="w-5 h-5 fill-white/20" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold text-lg tracking-tight text-content-primary leading-none">
              SehatMitra <span className="text-brand-600 font-semibold">AI</span>
            </span>
            <span className="text-[10px] text-content-muted leading-tight hidden sm:block">
              Healthcare Assistant
            </span>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link to="/language">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Globe className="w-4 h-4 text-brand-600" />}
            >
              Language
            </Button>
          </Link>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Badge variant="teal" size="md" icon={<UserIcon className="w-3.5 h-3.5" />}>
                {user?.email || 'Logged In'}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
                leftIcon={<LogOut className="w-4 h-4 text-red-600" />}
              >
                Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => showAuthModal('login')}
              >
                Login
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => showAuthModal('signup')}
              >
                Sign Up
              </Button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
