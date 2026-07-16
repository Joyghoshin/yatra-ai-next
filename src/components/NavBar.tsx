"use client";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function NavBar() {
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

 if (!user) {
    return (
      <nav className="border-b p-4 flex justify-between items-center">
        <Link href="/" className="font-semibold">Yatra AI</Link>
        <div className="flex gap-3 text-sm">
          <Link href="/login" className="text-gray-600 hover:text-black">Log in</Link>
          <Link href="/signup" className="bg-black text-white px-3 py-1.5 rounded">Sign up</Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="border-b p-4 flex justify-between items-center">
      <div className="flex gap-4">
        <Link href="/dashboard" className="font-semibold">Yatra AI</Link>
        <Link href="/dashboard" className="text-sm text-gray-600 hover:text-black">My Trips</Link>
        <Link href="/create-new-trip" className="text-sm text-gray-600 hover:text-black">New Trip</Link>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-500">{user.name}</span>
        <button onClick={handleLogout} className="text-red-500 hover:underline">Log out</button>
      </div>
    </nav>
  );
}