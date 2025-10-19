"use client"

import { useState, useEffect } from "react"
import { useUser } from "@/context/user"
import { useStreak } from "@/context/StreakContext"
import { getDefaultAvatar, type AvatarAnimal, type AvatarColor } from "@/lib/avatar/avatarSystem"
import { AccountDetailsTab } from "@/components/settings/AccountDetailsTab"
import { AvatarTab } from "@/components/settings/AvatarTab"
import { BillingTab } from "@/components/settings/BillingTab"
import { SettingsLoadingSkeleton } from "@/components/settings/SettingsLoadingSkeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserIcon, PaletteIcon, CreditCardIcon } from "lucide-react"

export default function SettingsPage() {
  const { user, profile, loading: userLoading, refreshProfile } = useUser()
  const { streak } = useStreak()
  const [name, setName] = useState("")

  useEffect(() => {
    if (profile?.name) {
      setName(profile.name)
    } else if (user?.user_metadata?.name) {
      setName(user.user_metadata.name)
    }
  }, [profile, user])

  // Get avatar from profile or generate default
  const avatarAnimal = profile?.avatar_animal as AvatarAnimal | undefined
  const avatarColor = profile?.avatar_color as AvatarColor | undefined
  const defaultAvatar = user?.email ? getDefaultAvatar(user.email) : null
  const currentAvatar = {
    animal: avatarAnimal || defaultAvatar?.animal || null,
    color: avatarColor || defaultAvatar?.color || null
  }

  const displayName = user?.user_metadata?.name || profile?.name || "User"
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)

  if (userLoading) {
    return <SettingsLoadingSkeleton />
  }

  return (
    <div className="max-w-4xl">
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="avatar" className="flex items-center gap-2">
            <PaletteIcon className="h-4 w-4" />
            Avatar
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCardIcon className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <AccountDetailsTab
            user={user}
            profile={profile}
            name={name}
            setName={setName}
            refreshProfile={refreshProfile}
          />
        </TabsContent>

        <TabsContent value="avatar">
          <AvatarTab
            user={user}
            currentAvatar={currentAvatar}
            streak={streak}
            initials={initials}
            userLoading={userLoading}
            refreshProfile={refreshProfile}
          />
        </TabsContent>

        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}