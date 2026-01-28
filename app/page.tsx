"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [pin, setPin] = useState("");
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "0000") router.push("/dashboard");
    else { alert("Hatalı!"); setPin(""); }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-black">
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold text-white text-center">Pastillo Mutfak</h1>
        <input 
          type="tel" maxLength={4} value={pin} autoFocus
          onChange={(e) => setPin(e.target.value)}
          placeholder="0000"
          className="bg-gray-900 text-white text-center text-4xl p-4 rounded-xl border border-gray-700 outline-none focus:border-orange-500 w-64 tracking-[1rem]"
        />
        <button type="submit" className="bg-orange-600 text-white py-4 rounded-xl font-bold text-xl">GİRİŞ</button>
      </form>
    </div>
  );
}
