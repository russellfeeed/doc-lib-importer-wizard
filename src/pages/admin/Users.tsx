import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Copy, Loader2, Mail, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, type AppRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

interface RoleRow {
  user_id: string;
  role: AppRole;
}

interface InvitationRow {
  id: string;
  email: string;
  role: AppRole;
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
}

const roleLabel = (r: AppRole) =>
  r === 'super_admin' ? 'Super admin' : r === 'admin' ? 'Admin' : 'User';

const Users: React.FC = () => {
  const { user, isSuperAdmin } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, AppRole[]>>({});
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AppRole>('user');
  const [inviting, setInviting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [{ data: profileData }, { data: roleData }, { data: invData }] = await Promise.all([
      supabase.from('profiles').select('id, email, display_name, created_at').order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id, role'),
      supabase.from('invitations').select('id, email, role, token, accepted_at, expires_at, created_at').order('created_at', { ascending: false }),
    ]);
    setProfiles((profileData ?? []) as ProfileRow[]);
    const map: Record<string, AppRole[]> = {};
    ((roleData ?? []) as RoleRow[]).forEach((r) => {
      map[r.user_id] = [...(map[r.user_id] ?? []), r.role];
    });
    setRolesByUser(map);
    setInvitations((invData ?? []) as InvitationRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const inviteLink = (token: string) =>
    `${window.location.origin}/accept-invite?token=${token}`;

  const copyInvite = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink(token));
      toast.success('Invite link copied');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const createInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    if (!isSuperAdmin && inviteRole !== 'user') {
      toast.error('Only super admins can invite admins');
      return;
    }
    setInviting(true);
    const { data, error } = await supabase
      .from('invitations')
      .insert({ email: inviteEmail.trim().toLowerCase(), role: inviteRole, invited_by: user?.id })
      .select('token')
      .single();
    setInviting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Invitation created');
    setInviteEmail('');
    setInviteRole('user');
    if (data?.token) {
      await copyInvite(data.token);
    }
    loadData();
  };

  const revokeInvitation = async (id: string) => {
    const { error } = await supabase.from('invitations').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Invitation revoked');
    loadData();
  };

  const promoteToAdmin = async (userId: string) => {
    const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: 'admin' });
    if (error) toast.error(error.message);
    else {
      toast.success('Promoted to admin');
      loadData();
    }
  };

  const demoteFromAdmin = async (userId: string) => {
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin');
    if (error) toast.error(error.message);
    else {
      toast.success('Admin role removed');
      loadData();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">User management</h1>
          <p className="text-muted-foreground">Invite users and manage roles</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" /> Invite a user
          </CardTitle>
          <CardDescription>
            Generates a one-time link valid for 14 days. The link will be copied to your clipboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={createInvitation} className="grid gap-4 md:grid-cols-[1fr_180px_auto] items-end">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  {isSuperAdmin && <SelectItem value="admin">Admin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={inviting}>
              {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create invite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" /> Pending invitations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
          ) : invitations.filter((i) => !i.accepted_at).length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invitations.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.filter((i) => !i.accepted_at).map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.email}</TableCell>
                    <TableCell><Badge variant="secondary">{roleLabel(inv.role)}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => copyInvite(inv.token)}>
                        <Copy className="mr-2 h-3 w-3" /> Copy link
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => revokeInvitation(inv.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Members
          </CardTitle>
          <CardDescription>
            {isSuperAdmin ? 'Promote or demote admins as super admin.' : 'View members and their roles.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Joined</TableHead>
                  {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => {
                  const userRoles = rolesByUser[p.id] ?? [];
                  const isSuper = userRoles.includes('super_admin');
                  const isAdminUser = userRoles.includes('admin');
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{p.email}</TableCell>
                      <TableCell className="space-x-1">
                        {userRoles.length === 0 ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : (
                          userRoles.map((r) => (
                            <Badge key={r} variant={r === 'super_admin' ? 'default' : 'secondary'}>
                              {roleLabel(r)}
                            </Badge>
                          ))
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-right space-x-2">
                          {!isSuper && !isAdminUser && (
                            <Button size="sm" variant="outline" onClick={() => promoteToAdmin(p.id)}>
                              Promote to admin
                            </Button>
                          )}
                          {!isSuper && isAdminUser && (
                            <Button size="sm" variant="ghost" onClick={() => demoteFromAdmin(p.id)}>
                              Remove admin
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Users;