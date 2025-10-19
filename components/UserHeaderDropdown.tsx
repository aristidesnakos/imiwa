"use client"

import { LogOutIcon, BookOpenIcon, MessageSquareIcon, SettingsIcon } from "lucide-react"
import { useUser } from "@/context/user"
import { useStreak } from "@/context/StreakContext"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"

import { StreakAvatar } from "@/components/avatar/StreakAvatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { getDefaultAvatar, type AvatarAnimal, type AvatarColor } from "@/lib/avatar/avatarSystem"

export function UserHeaderDropdown() {
  const { user, profile, loading } = useUser()
  const { streak } = useStreak()
  const router = useRouter()
  const supabase = createClient()
  
  // Get avatar from profile or generate default
  const avatarAnimal = profile?.avatar_animal as AvatarAnimal | undefined
  const avatarColor = profile?.avatar_color as AvatarColor | undefined
  
  // Generate default avatar if not set
  const defaultAvatar = user?.email ? getDefaultAvatar(user.email) : null
  const finalAvatar = {
    animal: avatarAnimal || defaultAvatar?.animal,
    color: avatarColor || defaultAvatar?.color
  }
  
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }
  
  // If still loading, show skeleton
  if (loading) {
    return <Skeleton className="h-20 w-20 rounded-full" />
  }
  
  // Default display name and email if user is not available
  const displayName = user?.user_metadata?.name || profile?.name || "User"
  const email = user?.email || "user@example.com"
  // Get initials for avatar fallback
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full outline-none transition-all">
          <StreakAvatar
            animal={finalAvatar.animal}
            color={finalAvatar.color}
            streak={streak}
            size="xl"
            initials={initials}
            className="cursor-pointer transition-all hover:scale-105"
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{email}</p>
            {streak > 0 && (
              <p className="text-xs text-muted-foreground">
                🔥 {streak} day streak
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/journal" className="cursor-pointer">
            <BookOpenIcon className="mr-2 h-4 w-4" />
            Journal
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/chat" className="cursor-pointer">
            <MessageSquareIcon className="mr-2 h-4 w-4" />
            Chat
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <SettingsIcon className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
          <LogOutIcon className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}