"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UserSearch() {
  const [username, setUsername] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      router.push(`/analyze/${username.trim()}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-3 w-full">
      <input
        type="text"
        // placeholder-slate-500 ile yazıyı belirginleştirdik
        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 transition-all placeholder-slate-500 text-slate-900"
        placeholder="GitHub kullanıcı adı yazın..."
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <button
        type="submit"
        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
      >
        Analizi Başlat
      </button>
    </form>
  );
}
