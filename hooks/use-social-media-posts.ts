import { useState, useEffect, useCallback } from 'react'
import { SocialMediaPost } from '@/types/journal'
import { toast } from 'sonner'

interface UseSocialMediaPostsOptions {
  sessionId: string
}

export function useSocialMediaPosts({ sessionId }: UseSocialMediaPostsOptions) {
  const [posts, setPosts] = useState<SocialMediaPost[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPosting, setIsPosting] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    if (!sessionId) return
    
    setIsLoading(true)
    try {
      const response = await fetch(`/api/writing-sessions/${sessionId}/social-media`)
      if (response.ok) {
        const { data } = await response.json()
        setPosts(data || [])
      }
    } catch (error) {
      console.error('Error fetching social media posts:', error)
      toast.error('Failed to fetch social media posts')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  const postToSocialMedia = useCallback(async (
    platform: string,
    metadata?: Record<string, any>
  ) => {
    setIsPosting(platform)
    try {
      const response = await fetch(`/api/writing-sessions/${sessionId}/social-media`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          social_media_platform: platform,
          metadata
        })
      })

      if (response.ok) {
        toast.success(`Successfully posted to ${platform}`)
        await fetchPosts()
        return { success: true }
      } else if (response.status === 409) {
        toast.error(`Already posted to ${platform}`)
        return { success: false, error: 'Already posted' }
      } else {
        throw new Error('Failed to post')
      }
    } catch (error) {
      console.error('Error posting to social media:', error)
      toast.error(`Failed to post to ${platform}`)
      return { success: false, error: 'Failed to post' }
    } finally {
      setIsPosting(null)
    }
  }, [sessionId, fetchPosts])

  const getPostForPlatform = useCallback((platform: string) => {
    return posts.find(post => post.social_media_platform === platform)
  }, [posts])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return {
    posts,
    isLoading,
    isPosting,
    postToSocialMedia,
    getPostForPlatform,
    refreshPosts: fetchPosts
  }
}