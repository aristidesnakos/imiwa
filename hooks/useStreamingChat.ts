'use client';

import { useState, useEffect, useCallback } from 'react';
import { Message } from '@/types/chat';
import { streamingChatClient } from '@/lib/chat/streamingUtils';

interface UseStreamingChatProps {
  systemPrompt?: string;
  initialMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  onMessagesChange?: (messages: Message[]) => void;
  onFinish?: (message: Message) => void;
}

export function useStreamingChat({
  systemPrompt,
  initialMessages = [],
  onMessagesChange,
  onFinish
}: UseStreamingChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(
    initialMessages.map((msg, index) => ({
      id: `initial-${index}`,
      role: msg.role,
      content: msg.content
    }))
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notify parent when messages change
  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    const assistantMessageId = (Date.now() + 1).toString();
    
    // Add empty assistant message for streaming
    setMessages(prev => [...prev, {
      id: assistantMessageId,
      role: 'assistant',
      content: ''
    }]);

    let assistantContent = '';

    const result = await streamingChatClient.sendMessage(
      [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      systemPrompt,
      (chunk: string) => {
        assistantContent += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: assistantContent }
            : msg
        ));
      }
    );

    if (!result.success) {
      setError(result.error || 'An error occurred');
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId 
          ? { ...msg, content: `Error: ${result.error || 'An unknown error occurred'}` }
          : msg
      ));
    } else if (onFinish) {
      onFinish({
        id: assistantMessageId,
        role: 'assistant',
        content: result.content
      });
    }

    setIsLoading(false);
  }, [input, isLoading, messages, systemPrompt, onFinish]);

  return {
    input,
    messages,
    isLoading,
    error,
    handleInputChange,
    handleSubmit,
    clearError
  };
}
