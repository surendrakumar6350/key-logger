'use client';

import LoginForm from '@/Components/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-900 shadow-lg rounded-lg p-8 border border-gray-800">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">
            Welcome Back
          </h1>
          <p className="text-sm text-gray-400">
            <span className="font-semibold text-gray-200">Internal portal</span> for viewing logs <br />
          </p>
        </div>
        <LoginForm />
        <div className="mt-6 text-center text-xs text-gray-500">
          Secure login portal
        </div>
      </div>
    </div>
  );
}
