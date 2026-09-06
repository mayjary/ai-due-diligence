'use client';

import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { User, Lock, Palette, Bell, Shield, Brain } from 'lucide-react';

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account and application preferences</p>
        </div>

        {/* Profile */}
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Profile</h3>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" defaultValue="Morgan Kane" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="morgan@firm.com" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org">Organization</Label>
              <Input id="org" defaultValue="Kane Capital Partners" className="bg-background" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" defaultValue="Senior Analyst" className="bg-background" />
            </div>
          </div>
          <div className="mt-4">
            <Button size="sm">Save Changes</Button>
          </div>
        </div>

        {/* Account */}
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Account</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Change Password</div>
                <div className="text-xs text-muted-foreground">Update your password</div>
              </div>
              <Button size="sm" variant="outline">Change</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Two-Factor Authentication</div>
                <div className="text-xs text-muted-foreground">Add an extra layer of security</div>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Appearance</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Theme</div>
                <div className="text-xs text-muted-foreground">Dark financial terminal theme</div>
              </div>
              <Select defaultValue="dark">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Compact Mode</div>
                <div className="text-xs text-muted-foreground">Reduce spacing for higher information density</div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Notifications</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Analysis Complete</div>
                <div className="text-xs text-muted-foreground">Notify when an analysis finishes</div>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Document Indexed</div>
                <div className="text-xs text-muted-foreground">Notify when a document is ready for research</div>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Risk Alerts</div>
                <div className="text-xs text-muted-foreground">Notify when new risks are detected</div>
              </div>
              <Switch />
            </div>
          </div>
        </div>

        {/* Data & Privacy */}
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Data &amp; Privacy</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Export Data</div>
                <div className="text-xs text-muted-foreground">Download all your research and data</div>
              </div>
              <Button size="sm" variant="outline">Export</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-destructive">Delete Account</div>
                <div className="text-xs text-muted-foreground">Permanently delete your account and data</div>
              </div>
              <Button size="sm" variant="destructive">Delete</Button>
            </div>
          </div>
        </div>

        {/* AI Preferences */}
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">AI Preferences</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Preferred Model</div>
                <div className="text-xs text-muted-foreground">Choose the AI model for analysis</div>
              </div>
              <Select defaultValue="cloud">
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cloud">Cloud (GPT-4)</SelectItem>
                  <SelectItem value="local">Local (Ollama)</SelectItem>
                  <SelectItem value="auto">Auto-select</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Confidence Threshold</div>
                <div className="text-xs text-muted-foreground">Minimum confidence to display findings</div>
              </div>
              <Select defaultValue="70">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50%</SelectItem>
                  <SelectItem value="70">70%</SelectItem>
                  <SelectItem value="85">85%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-foreground">Contradiction Detection</div>
                <div className="text-xs text-muted-foreground">Automatically detect contradictions in claims</div>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
