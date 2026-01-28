import { type NextAuthOptions } from 'next-auth';
import GitHubProvider from 'next-auth/providers/github';
import { createServiceClient } from '@/lib/supabase/client';
import type { SessionUser, User } from '@/types/auth';

declare module 'next-auth' {
  interface Session {
    user: SessionUser;
  }

  interface User {
    id: string;
    github_id: string;
    github_username: string;
    github_email: string | null;
    github_avatar_url: string | null;
    github_access_token: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    github_id: string;
    github_username: string;
    github_email: string | null;
    github_avatar_url: string | null;
    github_access_token: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
      authorization: {
        params: {
          scope: 'read:user user:email repo',
        },
      },
    }),
  ],

  pages: {
    signIn: '/auth/signin',
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.provider !== 'github') {
        return false;
      }

      try {
        const supabase = createServiceClient();

        const githubProfile = profile as { id?: string | number; login?: string } | undefined;
        const githubId = String(githubProfile?.id ?? user.id);
        const githubUsername = githubProfile?.login ?? user.name ?? 'unknown';
        const githubEmail = user.email ?? null;
        const githubAvatarUrl = user.image ?? null;
        const accessToken = account.access_token ?? '';

        // Upsert user in database
        const { error } = await supabase.from('users').upsert(
          {
            github_id: githubId,
            github_username: githubUsername,
            github_email: githubEmail,
            github_avatar_url: githubAvatarUrl,
            github_access_token: accessToken,
            github_token_expires_at: account.expires_at
              ? new Date(account.expires_at * 1000).toISOString()
              : null,
          },
          {
            onConflict: 'github_id',
          },
        );

        if (error) {
          console.error('Failed to upsert user:', error);
          return false;
        }

        return true;
      } catch (error) {
        console.error('Sign in error:', error);
        return false;
      }
    },

    async jwt({ token, user, account, profile }) {
      if (account && profile) {
        // Initial sign in
        const supabase = createServiceClient();
        const githubProfile = profile as { id?: string | number } | undefined;
        const githubId = String(githubProfile?.id ?? user?.id);

        // Fetch user from database to get the UUID
        const { data: dbUser } = await supabase
          .from('users')
          .select('*')
          .eq('github_id', githubId)
          .single();

        if (dbUser) {
          token.id = dbUser.id;
          token.github_id = dbUser.github_id;
          token.github_username = dbUser.github_username;
          token.github_email = dbUser.github_email;
          token.github_avatar_url = dbUser.github_avatar_url;
          token.github_access_token = account.access_token ?? '';
        }
      }

      return token;
    },

    async session({ session, token }) {
      session.user = {
        id: token.id,
        github_id: token.github_id,
        github_username: token.github_username,
        github_email: token.github_email,
        github_avatar_url: token.github_avatar_url,
        github_access_token: token.github_access_token,
      };

      return session;
    },
  },

  session: {
    strategy: 'jwt',
  },

  secret: process.env.NEXTAUTH_SECRET,
};
