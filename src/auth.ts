import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { ALLOWED_EMAILS } from "./app/api/auth/_store"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    // Only allow whitelisted emails to sign in
    async signIn({ user }) {
      if (!user.email) return false;
      const allowed = ALLOWED_EMAILS.includes(user.email);
      if (!allowed) {
        console.warn(`[Auth] Blocked Google login for: ${user.email}`);
        return '/login?error=EmailNotAllowed';
      }
      if (ALLOWED_EMAILS.getStatus(user.email) === 'blocked') {
        console.warn(`[Auth] Blocked Google login (status=blocked) for: ${user.email}`);
        return '/login?error=AccountBlocked';
      }
      return true;
    },
    // Include email in session
    async session({ session }) {
      return session;
    },
  },
})
