"use client";
import { signIn } from "next-auth/react";

export default function LoginButton() {
  return (
    <button
      onClick={() => signIn("github")}
      className="px-4 py-2 bg-slate-900 text-white rounded-md hover:bg-slate-700 transition"
    >
      GitHub ile Giriş Yap
    </button>
  );
}
