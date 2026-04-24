import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const SUPER_ADMIN_EMAIL = 'russell@feeed.com';

const SuperAdminSetup: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  if (session) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    setInfo(null);

    const { data, error } = await supabase.auth.signUp({
      email: SUPER_ADMIN_EMAIL,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });

    if (error) {
      setSubmitting(false);
      // Most likely "User already registered"
      if (/already/i.test(error.message)) {
        toast.error('Super-admin account already exists. Please sign in instead.');
        navigate('/login', { replace: true });
        return;
      }
      toast.error(error.message);
      return;
    }

    // If email confirmation is required, no session is returned
    if (!data.session) {
      setSubmitting(false);
      setInfo(
        `Account created for ${SUPER_ADMIN_EMAIL}. Check your email to confirm, then sign in. ` +
          `(Tip: you can disable email confirmation in Supabase Auth → Providers → Email for instant access.)`
      );
      return;
    }

    // Otherwise sign-in succeeded automatically
    toast.success('Super-admin account created');
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Create super-admin account
          </CardTitle>
          <CardDescription>
            One-time setup for <strong>{SUPER_ADMIN_EMAIL}</strong>. If this account already exists, you'll be sent to sign-in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {info && (
            <Alert className="mb-4">
              <AlertDescription>{info}</AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={SUPER_ADMIN_EMAIL} readOnly disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminSetup;