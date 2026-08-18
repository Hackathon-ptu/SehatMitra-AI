import React, { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { 
  Heart, 
  Globe, 
  MessageSquare, 
  ClipboardList, 
  ShieldAlert, 
  Building2, 
  FileText, 
  Palette,
  Menu, 
  X,
  LogOut,
  User as UserIcon
} from 'lucide-react';
import { NavItem, PageMode } from '../../types/navigation';
import { IconButton } from '../common/IconButton';
import { Button } from '../common/Button';
import { cn } from '../../utils/cn';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';

export interface NavbarProps {
  pageMode?: PageMode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', path: '/' },
  { label: 'AI Chat', path: '/chat', icon: <MessageSquare className="w-4 h-4" /> },
  { label: 'Health Interview', path: '/health-interview', icon: <ClipboardList className="w-4 h-4" /> },
  { label: 'Risk Assessment', path: '/risk-assessment', icon: <ShieldAlert className="w-4 h-4" /> },
  { label: 'Hospitals', path: '/hospitals', icon: <Building2 className="w-4 h-4" /> },
  { label: 'Report Explanation', path: '/report', icon: <FileText className="w-4 h-4" /> },
  { label: 'Design System', path: '/design-system', icon: <Palette className="w-4 h-4 text-brand-600" /> },
];

export const Navbar: React.FC<NavbarProps> = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user, logout, showAuthModal } = useAuth();

  const toggleMobileMenu = () => setMobileMenuOpen((prev) => !prev);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full bg-surface-card/95 backdrop-blur border-b border-surface-border shadow-subtle">
      <div className="max-w-content-container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group" onClick={closeMobileMenu}>
          <div className="w-9 h-9 rounded-md bg-brand-600 flex items-center justify-center text-white transition-colors group-hover:bg-brand-700 shadow-subtle">
            <Heart className="w-5 h-5 fill-white/20" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-content-primary leading-none">
              SehatMitra <span className="text-brand-600 font-semibold">AI</span>
            </span>
            <span className="text-[10px] text-content-muted tracking-wider uppercase leading-tight">
              Healthcare Platform
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  'px-3 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-content-secondary hover:text-content-primary hover:bg-surface-elevated'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Right Action Controls */}
        <div className="hidden lg:flex items-center gap-3">
          <Link to="/language">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Globe className="w-4 h-4 text-brand-600" />}
            >
              Language
            </Button>
          </Link>

          {/* Authentication section */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
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

        {/* Mobile Menu Toggle Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <Link to="/language" onClick={closeMobileMenu}>
            <IconButton aria-label="Change Language" variant="ghost" size="sm">
              <Globe className="w-5 h-5 text-brand-600" />
            </IconButton>
          </Link>

          <IconButton
            aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            variant="ghost"
            size="md"
            onClick={toggleMobileMenu}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </IconButton>
        </div>
      </div>

      {/* Mobile Drawer / Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-surface-border bg-surface-card px-4 pt-2 pb-6 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-content-muted px-3 py-1">
            Navigation Menu
          </p>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMobileMenu}
                className={cn(
                  'px-3 py-2.5 text-sm font-medium rounded-md transition-colors flex items-center gap-2.5',
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-content-secondary hover:text-content-primary hover:bg-surface-elevated'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            );
          })}
          
          <div className="mt-4 pt-4 border-t border-surface-border flex flex-col gap-2">
            {isAuthenticated ? (
              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center justify-center p-2 rounded bg-brand-50/50 border border-brand-100 text-xs font-bold text-brand-800">
                  <UserIcon className="w-4 h-4 mr-1.5 text-brand-600" />
                  {user?.email}
                </div>
                <Button variant="outline" size="md" onClick={() => { logout(); closeMobileMenu(); }} className="w-full">
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full">
                <Button variant="outline" size="md" onClick={() => { showAuthModal('login'); closeMobileMenu(); }} className="w-full">
                  Login
                </Button>
                <Button variant="primary" size="md" onClick={() => { showAuthModal('signup'); closeMobileMenu(); }} className="w-full">
                  Sign Up
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
