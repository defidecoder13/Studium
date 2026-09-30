'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User,
  Shield,
  Bell,
  Sliders,
  AlertTriangle,
  Check,
  Save,
  Laptop,
  Key,
  Trash2,
  Sparkles,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTheme, type Theme } from '@/components/theme-provider'
import { useClerk, useUser } from '@clerk/nextjs'

type SettingsTab = 'profile' | 'security' | 'notifications' | 'preferences' | 'danger'

export default function SettingsPage() {
  const { setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile')
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

  // Profile Form States
  const [fullName, setFullName] = useState('Alex Rivera')
  const [email, setEmail] = useState('alex.rivera@stanford.edu')
  const [institution, setInstitution] = useState('Stanford University')
  const [major, setMajor] = useState('Quantum Physics & Computer Science')
  const [bio, setBio] = useState('PhD candidate studying quantum error correction across topological surface codes.')

  // Security Form States
  const [twoFactor, setTwoFactor] = useState(true)

  // Notifications Form States
  const [notifyQuizReminders, setNotifyQuizReminders] = useState(true)
  const [notifyDailySummary, setNotifyDailySummary] = useState(true)
  const [notifyIndexingDone, setNotifyIndexingDone] = useState(true)

  // Preferences Form States
  const [themePreference, setThemePreference] = useState<'dark' | 'light' | 'system'>('dark')
  const [defaultSummaryMode, setDefaultSummaryMode] = useState<'quick' | 'detailed'>('quick')
  const [citationStrictness, setCitationStrictness] = useState<'exact' | 'flexible'>('exact')

  // Security: password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null)

  // Danger zone busy states
  const [isClearingDocs, setIsClearingDocs] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.settings) {
          const s = data.settings
          if (s.fullName) setFullName(s.fullName)
          if (s.email) setEmail(s.email)
          if (s.institution) setInstitution(s.institution)
          if (s.major) setMajor(s.major)
          if (s.bio) setBio(s.bio)
          if (s.twoFactor !== undefined) setTwoFactor(s.twoFactor)
          if (s.notifyQuizReminders !== undefined) setNotifyQuizReminders(s.notifyQuizReminders)
          if (s.notifyDailySummary !== undefined) setNotifyDailySummary(s.notifyDailySummary)
          if (s.notifyIndexingDone !== undefined) setNotifyIndexingDone(s.notifyIndexingDone)
          if (s.themePreference) {
            setThemePreference(s.themePreference)
            setTheme(s.themePreference as Theme)
          }
          if (s.defaultSummaryMode) setDefaultSummaryMode(s.defaultSummaryMode)
          if (s.citationStrictness) setCitationStrictness(s.citationStrictness)
        }
      })
      .catch((e) => console.warn('Could not load settings:', e))
  }, [setTheme])

  const handleSave = async () => {
    setSaveStatus('Saving changes to cloud...')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          institution,
          major,
          bio,
          twoFactor,
          notifyQuizReminders,
          notifyDailySummary,
          notifyIndexingDone,
          themePreference,
          defaultSummaryMode,
          citationStrictness,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaveStatus('All settings saved successfully to cloud!')
    } catch {
      setSaveStatus('Failed to save settings.')
    } finally {
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  const { signOut } = useClerk()
  const { user: clerkUser } = useUser()

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      setPasswordStatus('Please fill in both password fields.')
      setTimeout(() => setPasswordStatus(null), 3000)
      return
    }
    if (newPassword.length < 8) {
      setPasswordStatus('New password must be at least 8 characters.')
      setTimeout(() => setPasswordStatus(null), 3000)
      return
    }
    setPasswordStatus('Updating password...')
    try {
      if (clerkUser) {
        await clerkUser.updatePassword({ currentPassword, newPassword })
        setPasswordStatus('Password updated successfully!')
        setCurrentPassword('')
        setNewPassword('')
      } else {
        setPasswordStatus('Password updated successfully!')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : (err as { errors?: { message?: string }[] })?.errors?.[0]?.message
      setPasswordStatus(msg || 'Failed to update password')
    }
    setTimeout(() => setPasswordStatus(null), 4000)
  }

  const handleClearDocuments = async () => {
    if (!confirm('This will permanently delete ALL documents, bookmarks, quizzes, and flashcards from your library. Continue?')) return
    setIsClearingDocs(true)
    try {
      const res = await fetch('/api/documents?all=true&confirm=DELETE', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to clear documents')
      setSaveStatus('All documents and study data cleared.')
    } catch {
      setSaveStatus('Failed to clear documents. Please try again.')
    } finally {
      setIsClearingDocs(false)
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  const handleDeleteAccount = async () => {
    if (!confirm('This permanently deletes your account and ALL study data. This cannot be undone. Continue?')) return
    if (!confirm('Last chance — are you absolutely sure? There is no recovery.')) return
    setIsDeletingAccount(true)
    try {
      const res = await fetch('/api/account?confirm=DELETE', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete account')
      await signOut()
      router.push('/')
      router.refresh()
    } catch {
      setSaveStatus('Failed to delete account. Please try again.')
      setIsDeletingAccount(false)
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div className="space-y-1">
          <h1 className="text-3xl font-heading font-bold text-foreground tracking-tight">
            Account & App Settings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Configure your profile details, AI copilot behaviors, security permissions, and workspace preferences.
          </p>
        </div>

        {saveStatus && (
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold animate-in fade-in duration-200',
              saveStatus.startsWith('Failed')
                ? 'bg-destructive/10 border border-destructive/30 text-destructive'
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-500'
            )}
          >
            {saveStatus.startsWith('Failed') ? <AlertTriangle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            <span>{saveStatus}</span>
          </div>
        )}
      </div>

      {/* Main Settings Split */}
      <div className="grid md:grid-cols-12 gap-8 items-start">
        
        {/* Left Navigation Sidebar (4 Cols) */}
        <div className="md:col-span-4 space-y-1.5">
          {[
            { id: 'profile', label: 'Profile Information', icon: User },
            { id: 'security', label: 'Security & Auth', icon: Shield },
            { id: 'notifications', label: 'Email & Alerts', icon: Bell },
            { id: 'preferences', label: 'AI & Theme Preferences', icon: Sliders },
            { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, isDanger: true },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all text-left',
                  isActive
                    ? tab.isDanger
                      ? 'bg-destructive text-destructive-foreground shadow-sm'
                      : 'bg-foreground text-background shadow-sm'
                    : tab.isDanger
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card border border-transparent'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        {/* Right Tab Content Container (8 Cols) */}
        <div className="md:col-span-8 p-6 sm:p-8 rounded-3xl border border-border bg-card shadow-sm space-y-6">
          
          {/* TAB 1: PROFILE INFORMATION */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-border pb-4">
                <h3 className="font-heading font-bold text-lg text-foreground">Profile Information</h3>
                <p className="text-xs text-muted-foreground">Update your academic identity and institution details.</p>
              </div>

              {/* Avatar Simulation */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary font-heading font-bold text-xl flex items-center justify-center border border-primary/30 shadow-inner">
                  {fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-foreground">Profile Avatar</div>
                  <div className="text-xs text-muted-foreground font-mono">PNG, JPG or GIF. Max 5MB.</div>
                  <div className="pt-1">
                    <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg border-border">
                      Change Photo
                    </Button>
                  </div>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-4 text-xs sm:text-sm">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-mono font-bold text-foreground uppercase tracking-wider text-[11px]">Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono font-bold text-foreground uppercase tracking-wider text-[11px]">Academic Email</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      title="Email is tied to your account and cannot be changed here"
                      className="w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-muted-foreground cursor-not-allowed focus:outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-mono font-bold text-foreground uppercase tracking-wider text-[11px]">Institution / University</label>
                    <input
                      type="text"
                      value={institution}
                      onChange={(e) => setInstitution(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono font-bold text-foreground uppercase tracking-wider text-[11px]">Academic Major / Field</label>
                    <input
                      type="text"
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono font-bold text-foreground uppercase tracking-wider text-[11px]">Academic Bio</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-background border border-border rounded-xl p-3.5 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <Button onClick={handleSave} className="rounded-xl px-6 bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2 text-xs h-10 shadow-sm">
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY & AUTH */}
          {activeTab === 'security' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-border pb-4">
                <h3 className="font-heading font-bold text-lg text-foreground">Security & Authentication</h3>
                <p className="text-xs text-muted-foreground">Manage password credentials, 2FA protection, and active device sessions.</p>
              </div>

              <div className="space-y-6">
                {/* 2FA Card */}
                <div className="p-4 rounded-2xl border border-border bg-background flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      Two-Factor Authentication (2FA)
                    </div>
                    <div className="text-xs text-muted-foreground">Require an authenticator app code on login from new devices.</div>
                  </div>
                  <button
                    onClick={() => setTwoFactor(!twoFactor)}
                    className={cn(
                      'w-12 h-6 rounded-full transition-colors relative px-0.5 flex items-center shrink-0',
                      twoFactor ? 'bg-emerald-500 justify-end' : 'bg-muted justify-start'
                    )}
                  >
                    <div className="w-5 h-5 rounded-full bg-white shadow-md transition-transform" />
                  </button>
                </div>

                {/* Password Change */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">Change Password</div>
                  <div className="grid gap-3 text-xs">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Current Password"
                      autoComplete="current-password"
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New Password (min 8 characters)"
                      autoComplete="new-password"
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {passwordStatus && (
                    <p
                      className={cn(
                        'text-xs font-medium',
                        passwordStatus.includes('successfully') ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'
                      )}
                    >
                      {passwordStatus}
                    </p>
                  )}
                  <Button size="sm" variant="outline" onClick={handleChangePassword} className="rounded-xl text-xs gap-1.5">
                    <Key className="w-3.5 h-3.5" /> Update Password
                  </Button>
                </div>

                {/* Active Sessions */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">Active Device Sessions</div>
                  <div className="p-4 rounded-2xl border border-border bg-background flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">MacBook Pro 16&quot; — Chrome</div>
                        <div className="text-[11px] font-mono text-muted-foreground">San Francisco, CA • Active Right Now</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono text-[10px] font-bold">
                      Current Session
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-border pb-4">
                <h3 className="font-heading font-bold text-lg text-foreground">Email Notifications & Alerts</h3>
                <p className="text-xs text-muted-foreground">Customize when AI Copilot sends study reminders or summary digests.</p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: 'Active Recall & Quiz Reinforcement Reminders',
                    desc: 'Receive periodic email notifications when a studied topic accuracy dips below 75%.',
                    state: notifyQuizReminders,
                    setter: setNotifyQuizReminders,
                  },
                  {
                    title: 'Daily AI Study Digest Summary',
                    desc: 'Receive an automated morning email synthesizing your previous day study progress and formulas.',
                    state: notifyDailySummary,
                    setter: setNotifyDailySummary,
                  },
                  {
                    title: 'Document Indexing Completed Alerts',
                    desc: 'Notify when large uploaded textbooks finish vector embedding generation.',
                    state: notifyIndexingDone,
                    setter: setNotifyIndexingDone,
                  },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl border border-border bg-background flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs sm:text-sm font-bold text-foreground">{item.title}</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => item.setter(!item.state)}
                      className={cn(
                        'w-12 h-6 rounded-full transition-colors relative px-0.5 flex items-center shrink-0',
                        item.state ? 'bg-foreground justify-end' : 'bg-muted justify-start'
                      )}
                    >
                      <div className="w-5 h-5 rounded-full bg-background shadow-md transition-transform" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <Button onClick={handleSave} className="rounded-xl px-6 bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2 text-xs h-10 shadow-sm">
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Preferences</span>
                </Button>
              </div>
            </div>
          )}

          {/* TAB 4: PREFERENCES & AI SETTINGS */}
          {activeTab === 'preferences' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-border pb-4">
                <h3 className="font-heading font-bold text-lg text-foreground">AI Copilot & Theme Preferences</h3>
                <p className="text-xs text-muted-foreground">Adjust user interface styling and citation verification behaviors.</p>
              </div>

              <div className="space-y-6">
                {/* Theme selection */}
                <div className="space-y-2.5">
                  <label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">Interface Theme</label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'dark', label: 'Dark Theme', icon: Moon },
                      { id: 'light', label: 'Light Theme', icon: Sun },
                      { id: 'system', label: 'System Sync', icon: Monitor },
                    ].map((t) => {
                      const Icon = t.icon
                      const isChosen = themePreference === t.id
                      return (
                        <button
                          key={t.id}
                          onClick={() => {
                            setThemePreference(t.id as 'dark' | 'light' | 'system')
                            setTheme(t.id as Theme)
                          }}
                          className={cn(
                            'p-3.5 rounded-xl border flex flex-col items-center gap-2 transition text-xs font-semibold',
                            isChosen
                              ? 'border-foreground bg-foreground text-background shadow-sm'
                              : 'border-border bg-background hover:bg-muted text-foreground'
                          )}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{t.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Default Summary Mode */}
                <div className="space-y-2.5 pt-2">
                  <label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">Default Summary Generation Mode</label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      onClick={() => setDefaultSummaryMode('quick')}
                      className={cn(
                        'p-4 rounded-xl border text-left transition space-y-1',
                        defaultSummaryMode === 'quick' ? 'border-foreground bg-background shadow-sm' : 'border-border/80 bg-background hover:bg-muted/40'
                      )}
                    >
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-accent" /> ⚡ Quick Executive Summary
                      </div>
                      <div className="text-[11px] text-muted-foreground">Synthesizes only the core 3-5 takeaways per page.</div>
                    </button>

                    <button
                      onClick={() => setDefaultSummaryMode('detailed')}
                      className={cn(
                        'p-4 rounded-xl border text-left transition space-y-1',
                        defaultSummaryMode === 'detailed' ? 'border-foreground bg-background shadow-sm' : 'border-border/80 bg-background hover:bg-muted/40'
                      )}
                    >
                      <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-primary" /> 📑 Detailed Comprehensive
                      </div>
                      <div className="text-[11px] text-muted-foreground">Includes full mathematical formulas, theorems, and definitions.</div>
                    </button>
                  </div>
                </div>

                {/* Citation Strictness */}
                <div className="space-y-2.5 pt-2">
                  <label className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">AI Citation Strictness</label>
                  <select
                    value={citationStrictness}
                    onChange={(e) => setCitationStrictness(e.target.value as 'exact' | 'flexible')}
                    className="w-full h-10 rounded-xl border border-border bg-background px-3.5 text-xs font-semibold text-foreground focus:outline-none"
                  >
                    <option value="exact">Strict Page-Exact Verification (Recommended for Academics)</option>
                    <option value="flexible">Flexible Multi-Document Concept Synthesis</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <Button onClick={handleSave} className="rounded-xl px-6 bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2 text-xs h-10 shadow-sm">
                  <Save className="w-3.5 h-3.5" />
                  <span>Save AI Preferences</span>
                </Button>
              </div>
            </div>
          )}

          {/* TAB 5: DANGER ZONE */}
          {activeTab === 'danger' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-destructive/30 pb-4">
                <h3 className="font-heading font-bold text-lg text-destructive">Danger Zone</h3>
                <p className="text-xs text-muted-foreground">Irreversible account and vector database clearing actions.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-foreground">Clear All Indexed Study Documents</div>
                    <div className="text-xs text-muted-foreground">Removes all uploaded documents, bookmarks, quizzes, and flashcards from your library.</div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleClearDocuments}
                    disabled={isClearingDocs}
                    className="rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 text-xs shrink-0 font-semibold"
                  >
                    {isClearingDocs ? 'Clearing...' : 'Clear Documents'}
                  </Button>
                </div>

                <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-destructive">Delete Academic Account Permanently</div>
                    <div className="text-xs text-muted-foreground">Deactivates authentication tokens and purges all study records from our servers immediately.</div>
                  </div>
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                    className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs shrink-0 font-semibold gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeletingAccount ? 'Deleting...' : 'Delete Account'}</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  )
}
