'use client';

import { FcGoogle } from 'react-icons/fc';

export default function Home() {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  return (
    <div className="min-h-screen bg-[#0e1117] text-white flex items-center justify-center px-4">
      <div className="bg-[#161b22] border border-gray-700 rounded-xl shadow-lg p-10 max-w-md w-full text-center">
        <h1 className="text-3xl font-bold mb-6">📧 Email Triage Assistant</h1>
        <p className="mb-8 text-gray-400">
          Prioritize your emails automatically using smart rules and AI.
        </p>
        <a href={`${backendUrl}/auth/google`}>
          <button className="flex items-center justify-center gap-3 bg-white text-black px-6 py-3 rounded-lg text-base font-medium hover:bg-gray-100 transition">
            <FcGoogle size={22} />
            Sign in with Google
          </button>
        </a>
      </div>
    </div>
  );
}
