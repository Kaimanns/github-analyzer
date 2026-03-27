import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  // JWT-only: no database required for sessions
  session: { strategy: "jwt" },
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  pages: {
    signIn: "/",
    error: "/",
  },
  callbacks: {
    // GitHub login profilinden username'i JWT'ye kaydet
    jwt({ token, profile }) {
      if (profile) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.username = (profile as any).login as string;
      }
      return token;
    },
    // JWT'den username'i session'a taşı
    session({ session, token }) {
      if (session.user && token.username) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).username = token.username;
      }
      return session;
    },
  },
});
