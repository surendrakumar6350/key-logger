'use client';

import LoginForm from '@/Components/LoginForm';

export default function LoginPage() {

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/30 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome back</h1>
          <p className="text-muted-foreground">
            Sign in to access your account
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}