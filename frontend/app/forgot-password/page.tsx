'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/10 border border-primary/20">
            <span className="text-sm font-bold text-primary">DD</span>
          </div>
          <span className="text-base font-semibold text-foreground tracking-tight">
            DD COPILOT
          </span>
        </Link>

        <div className="w-full max-w-sm">
          <div className="rounded-md border border-border bg-card p-6">
            {sent ? (
              <div className="text-center py-4">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <CheckCircle2 className="h-6 w-6 text-success" />
                </div>
                <h1 className="text-lg font-semibold text-foreground">Check Your Email</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  We&apos;ve sent a password reset link to your email address. Follow the link to reset your password.
                </p>
                <Link href="/login" className="mt-6 inline-block text-sm text-primary hover:text-primary/80 transition-colors">
                  Back to Sign In
                </Link>
              </div>
            ) : (
              <>
                <h1 className="text-lg font-semibold text-foreground">Reset Password</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your email and we&apos;ll send you a reset link
                </p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@firm.com" required className="bg-background" />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Send Reset Link
                  </Button>
                </form>
              </>
            )}
          </div>

          <p className="mt-6 text-center">
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
