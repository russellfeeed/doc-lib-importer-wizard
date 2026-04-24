
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'user');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'super_admin'))
$$;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin_or_super(auth.uid()));
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.is_admin_or_super(auth.uid()));
CREATE POLICY "Super admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can update roles" ON public.user_roles FOR UPDATE USING (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins can delete roles" ON public.user_roles FOR DELETE USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role public.app_role NOT NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_invitations_token ON public.invitations(token);

CREATE POLICY "Anyone can lookup invitations" ON public.invitations FOR SELECT USING (true);
CREATE POLICY "Admins can create invitations" ON public.invitations FOR INSERT WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY "Admins can update invitations" ON public.invitations FOR UPDATE USING (public.is_admin_or_super(auth.uid()));
CREATE POLICY "Admins can delete invitations" ON public.invitations FOR DELETE USING (public.is_admin_or_super(auth.uid()));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _invitation public.invitations%ROWTYPE;
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);

  IF lower(NEW.email) = 'russell@feeed.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'super_admin') ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  SELECT * INTO _invitation FROM public.invitations
  WHERE lower(email) = lower(NEW.email) AND accepted_at IS NULL AND expires_at > now()
  ORDER BY created_at DESC LIMIT 1;

  IF _invitation.id IS NULL THEN
    RAISE EXCEPTION 'Sign-up requires a valid invitation';
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _invitation.role) ON CONFLICT DO NOTHING;
  UPDATE public.invitations SET accepted_at = now() WHERE id = _invitation.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WordPress settings → global singleton
DROP POLICY IF EXISTS "Users can create their own WordPress settings" ON public.wordpress_settings;
DROP POLICY IF EXISTS "Users can delete their own WordPress settings" ON public.wordpress_settings;
DROP POLICY IF EXISTS "Users can update their own WordPress settings" ON public.wordpress_settings;
DROP POLICY IF EXISTS "Users can view their own WordPress settings" ON public.wordpress_settings;

DELETE FROM public.wordpress_settings;
ALTER TABLE public.wordpress_settings DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.wordpress_settings ADD COLUMN IF NOT EXISTS singleton BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX IF NOT EXISTS wordpress_settings_singleton_idx ON public.wordpress_settings(singleton);

CREATE POLICY "Authenticated users can view WP settings" ON public.wordpress_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert WP settings" ON public.wordpress_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_super(auth.uid()));
CREATE POLICY "Admins can update WP settings" ON public.wordpress_settings FOR UPDATE TO authenticated USING (public.is_admin_or_super(auth.uid()));
CREATE POLICY "Admins can delete WP settings" ON public.wordpress_settings FOR DELETE TO authenticated USING (public.is_admin_or_super(auth.uid()));
