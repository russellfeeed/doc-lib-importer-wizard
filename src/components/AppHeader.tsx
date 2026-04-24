import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, Settings as SettingsIcon, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

const AppHeader: React.FC = () => {
  const { user, isAdmin, signOut } = useAuth();

  if (!user) return null;

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="font-semibold text-foreground">Document Importer</Link>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Link to="/admin/users">
                <Button variant="ghost" size="sm">
                  <Users className="mr-2 h-4 w-4" />
                  Users
                </Button>
              </Link>
              <Link to="/settings">
                <Button variant="ghost" size="sm">
                  <SettingsIcon className="mr-2 h-4 w-4" />
                  Settings
                </Button>
              </Link>
            </>
          )}
          <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;