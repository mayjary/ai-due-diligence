'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { register } from '@/lib/api/client';

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!agreed) return;
    setLoading(true);
    setError('');
    const form = new FormData(e.currentTarget);
    const password = String(form.get('password'));
    if (password !== String(form.get('confirm'))) { setError('Passwords do not match'); setLoading(false); return; }
    try {
      await register({ name: String(form.get('name')), email: String(form.get('email')), organization: String(form.get('org') || ''), password, accepted_terms: agreed });
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create account');
    } finally { setLoading(false); }
  }

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
            <h1 className="text-lg font-semibold text-foreground">Create Account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Start your due diligence research in minutes
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error && <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" type="text" placeholder="Morgan Kane" required className="bg-background" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="you@firm.com" required className="bg-background" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="org">Company / Organization <span className="text-muted-foreground">(optional)</span></Label>
                <Input id="org" name="org" type="text" placeholder="Kane Capital Partners" className="bg-background" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a password"
                    required
                    className="bg-background pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <Input id="confirm" name="confirm" type="password" placeholder="Re-enter password" required className="bg-background" />
              </div>

              <div className="flex items-start gap-2">
                <Checkbox id="terms" checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} className="mt-0.5" />
                <Label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer leading-relaxed">
                  I agree to the{' '}
                  <Link href="/terms" className="text-primary hover:text-primary/80 transition-colors">Terms of Service</Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-primary hover:text-primary/80 transition-colors">Privacy Policy</Link>
                  .
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={loading || !agreed}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Account
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-primary/80 transition-colors font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
