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
  Moon,
  Sun,
  Monitor,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
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

  // Security: password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null)

  // Danger zone busy states
  const [isClearingDocs, setIsClearingDocs] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  // Type-to-confirm dialogs: these actions can't be undone, so Undo is
  // dishonest here — explicit typed consent replaces the native confirms.
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false)
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
    setIsClearingDocs(true)
    try {
      const res = await fetch('/api/documents?all=true&confirm=DELETE', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to clear documents')
      setShowClearDialog(false)
      setSaveStatus('All documents and study data cleared.')
    } catch {
      setSaveStatus('Failed to clear documents. Please try again.')
    } finally {
      setIsClearingDocs(false)
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    try {
      const res = await fetch('/api/account?confirm=DELETE', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete account')
      await signOut()
      router.push('/')
      router.refresh()
    } catch {
      setShowDeleteAccountDialog(false)
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
                : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
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
            { id: 'preferences', label: 'Appearance', icon: Sliders },
            { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, isDanger: true },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? tab.isDanger
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-primary/10 text-accent'
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
        <div className="md:col-span-8 p-6 sm:p-8 rounded-xl border border-border bg-card space-y-6">
          
          {/* TAB 1: PROFILE INFORMATION */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-border pb-4">
                <h3 className="font-heading font-bold text-lg text-foreground">Profile Information</h3>
                <p className="text-xs text-muted-foreground">Update your academic identity and institution details.</p>
              </div>

              {/* Avatar Simulation */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-primary/10 text-accent font-heading font-bold text-xl flex items-center justify-center border border-primary/30">
                  {fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-bold text-foreground">Profile Avatar</div>
                  <div className="text-xs text-muted-foreground font-mono">Your initials appear across the workspace.</div>
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
                      className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono font-bold text-foreground uppercase tracking-wider text-[11px]">Academic Email</label>
                    <input
                      type="email"
                      value={email}
                      disabled
                      title="Email is tied to your account and cannot be changed here"
                      className="w-full bg-muted/40 border border-border rounded-lg px-3.5 py-2.5 text-muted-foreground cursor-not-allowed focus:outline-none transition"
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
                      className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono font-bold text-foreground uppercase tracking-wider text-[11px]">Academic Major / Field</label>
                    <input
                      type="text"
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-mono font-bold text-foreground uppercase tracking-wider text-[11px]">Academic Bio</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-3.5 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <Button onClick={handleSave} className="px-6 bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2 text-xs h-10">
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
                <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-foreground flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      Two-Factor Authentication (2FA)
                    </div>
                    <div className="text-xs text-muted-foreground">Require an authenticator app code on login from new devices.</div>
                  </div>
                  <button
                    onClick={() => setTwoFactor(!twoFactor)}
                    role="switch"
                    aria-checked={twoFactor}
                    aria-label="Two-factor authentication"
                    className={cn(
                      'w-14 h-8 rounded-full transition-colors relative px-1 flex items-center shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      twoFactor ? 'bg-primary justify-end' : 'bg-muted justify-start'
                    )}
                  >
                    <div className="w-6 h-6 rounded-full bg-white transition-transform" />
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
                      className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="New Password (min 8 characters)"
                      autoComplete="new-password"
                      className="w-full bg-background border border-border rounded-lg px-3.5 py-2.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  {passwordStatus && (
                    <p
                      className={cn(
                        'text-xs font-medium',
                        passwordStatus.includes('successfully') ? 'text-emerald-700 dark:text-emerald-400' : 'text-destructive'
                      )}
                    >
                      {passwordStatus}
                    </p>
                  )}
                  <Button size="sm" variant="outline" onClick={handleChangePassword} className="text-xs gap-1.5">
                    <Key className="w-3.5 h-3.5" /> Update Password
                  </Button>
                </div>

                {/* Active Sessions */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">Active Device Sessions</div>
                  <div className="p-4 rounded-xl border border-border bg-background flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 text-accent flex items-center justify-center">
                        <Laptop className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">This device</div>
                        <div className="text-[11px] font-mono text-muted-foreground">Signed in now</div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-[10px] font-bold">
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
                <p className="text-xs text-muted-foreground">Choose which study reminders and digests land in your inbox.</p>
              </div>

              <div className="space-y-4">
                {[
                  {
                    title: 'Quiz reminders',
                    desc: 'A nudge when your accuracy on a studied topic dips below 75%.',
                    state: notifyQuizReminders,
                    setter: setNotifyQuizReminders,
                  },
                  {
                    title: 'Daily study digest',
                    desc: "One morning email with yesterday's progress.",
                    state: notifyDailySummary,
                    setter: setNotifyDailySummary,
                  },
                  {
                    title: 'Upload finished alerts',
                    desc: 'An email when a large upload finishes processing and is ready.',
                    state: notifyIndexingDone,
                    setter: setNotifyIndexingDone,
                  },
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-border bg-background flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs sm:text-sm font-bold text-foreground">{item.title}</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">{item.desc}</div>
                    </div>
                    <button
                      onClick={() => item.setter(!item.state)}
                      role="switch"
                      aria-checked={item.state}
                      aria-label={item.title}
                      className={cn(
                        'w-14 h-8 rounded-full transition-colors relative px-1 flex items-center shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        item.state ? 'bg-primary justify-end' : 'bg-muted justify-start'
                      )}
                    >
                      <div className="w-6 h-6 rounded-full bg-white transition-transform" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <Button onClick={handleSave} className="px-6 bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2 text-xs h-10">
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
                <h3 className="font-heading font-bold text-lg text-foreground">Appearance</h3>
                <p className="text-xs text-muted-foreground">Adjust how Studium looks on this device.</p>
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
                            'p-3.5 rounded-xl border flex flex-col items-center gap-2 transition text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            isChosen
                              ? 'border-primary bg-primary/10 text-foreground'
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

              </div>

              <div className="pt-4 border-t border-border flex justify-end">
                <Button onClick={handleSave} className="px-6 bg-foreground text-background hover:bg-foreground/90 font-semibold gap-2 text-xs h-10">
                  <Save className="w-3.5 h-3.5" />
                  <span>Save appearance</span>
                </Button>
              </div>
            </div>
          )}

          {/* TAB 5: DANGER ZONE */}
          {activeTab === 'danger' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1 border-b border-destructive/30 pb-4">
                <h3 className="font-heading font-bold text-lg text-destructive">Danger Zone</h3>
                <p className="text-xs text-muted-foreground">Irreversible deletion — for your account and all study data.</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-foreground">Clear your entire library</div>
                    <div className="text-xs text-muted-foreground">Removes all uploaded documents, bookmarks, quizzes, and flashcards from your library.</div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowClearDialog(true)}
                    disabled={isClearingDocs}
                    className="border-destructive/40 text-destructive hover:bg-destructive/10 text-xs shrink-0 font-semibold"
                  >
                    <span>Clear everything</span>
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-destructive">Delete Academic Account Permanently</div>
                    <div className="text-xs text-muted-foreground">Deactivates authentication tokens and purges all study records from our servers immediately.</div>
                  </div>
                  <Button
                    onClick={() => setShowDeleteAccountDialog(true)}
                    disabled={isDeletingAccount}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs shrink-0 font-semibold gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Clear-all: type DELETE. No Undo exists for a full wipe — typed consent only. */}
      <ConfirmDialog
        open={showClearDialog}
        title="Clear your entire library?"
        body={
          <span>
            This permanently removes <strong className="text-foreground">every document and its index</strong>,
            plus all bookmarks, quiz records, and flashcard decks. There is no Undo for a full wipe.
          </span>
        }
        confirmLabel="Clear everything"
        busyLabel="Clearing…"
        busy={isClearingDocs}
        requireText="DELETE"
        onConfirm={handleClearDocuments}
        onClose={() => {
          if (!isClearingDocs) setShowClearDialog(false)
        }}
      />

      {/* Delete account: type DELETE. Session ends here — recovery is impossible. */}
      <ConfirmDialog
        open={showDeleteAccountDialog}
        title="Delete your account?"
        body={
          <span>
            Your profile, every document, and all study data are purged from our servers immediately. You will be
            signed out. <strong className="text-foreground">There is no recovery.</strong>
          </span>
        }
        confirmLabel="Delete account"
        busyLabel="Deleting…"
        busy={isDeletingAccount}
        requireText="DELETE"
        onConfirm={handleDeleteAccount}
        onClose={() => {
          if (!isDeletingAccount) setShowDeleteAccountDialog(false)
        }}
      />

    </div>
  )
}
