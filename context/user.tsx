'use client';

import { User } from '@supabase/supabase-js';
import { createContext, useContext, ReactNode, useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Profile } from '@/types/profiles';

// Simplified context type with single update method
type UserContextType = {
  user: User | null;
  loading: boolean;
  profile: Profile | null;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (profileData: {
    nativeLanguage?: string;
    learningLanguage?: string;
    learningReason?: string;
    proficiencyLevel?: string;
    learningGoals?: string;
    onboardingComplete?: boolean;
  }) => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ 
  children 
}: { 
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const supabase = createClient();
  const hasFetchedProfileRef = useRef<string | null>(null);

  // Function to fetch user profile data
  const fetchUserProfile = useCallback(async (userId: string) => {
    // Skip if already fetched for this user
    if (hasFetchedProfileRef.current === userId && profile) {
      return;
    }
    
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
      hasFetchedProfileRef.current = userId;
      // User profile data loaded successfully
    } catch (error: any) {
      setProfile(null);
      hasFetchedProfileRef.current = null; // Allow retry on real errors
    } finally {
      setProfileLoading(false);
    }
  }, [supabase, profile]);

  // Public method to refresh user profile
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    hasFetchedProfileRef.current = null; // Force refresh
    await fetchUserProfile(user.id);
  }, [user, fetchUserProfile]);

  // Fetch user profile when user changes
  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      setProfileLoading(false);
      hasFetchedProfileRef.current = null;
      return;
    }

    fetchUserProfile(user.id);
  }, [user, fetchUserProfile]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: any, session: any) => {
        if (session?.user) {
          setUser(session.user);
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) {
        setUser(session.user);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Single method to update profile
  const updateProfile = useCallback(async (profileData: {
    nativeLanguage?: string;
    learningLanguage?: string;
    learningReason?: string;
    proficiencyLevel?: string;
    learningGoals?: string;
    onboardingComplete?: boolean;
  }) => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/profiles/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          native_language: profileData.nativeLanguage,
          learning_language: profileData.learningLanguage,
          learning_reason: profileData.learningReason,
          proficiency_level: profileData.proficiencyLevel,
          learning_goals: profileData.learningGoals,
          onboarding_complete: profileData.onboardingComplete ?? undefined
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update profile: ${response.status} - ${errorText}`);
      }
      
      // Refresh the profile to get updated data
      await refreshProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }, [user, refreshProfile]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        profile,
        profileLoading,
        refreshProfile,
        updateProfile
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
}
