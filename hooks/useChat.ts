"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Message } from "@/types/chat";

interface UseChatProps {
  initialMessages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
}

export const useChat = ({
  initialMessages = [],
  onMessagesChange
}: UseChatProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Initialize messages with initialMessages when they change
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Notify parent when messages change
  useEffect(() => {
    if (onMessagesChange) {
      onMessagesChange(messages);
    }
  }, [messages, onMessagesChange]);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setInput("");
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
        }),
      });


      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API error: ${response.status} - ${errorText}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "",
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (reader) {
        let assistantContent = "";
        let buffer = "";
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || ""; // Keep incomplete line in buffer
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            
            // Parse Vercel AI SDK streaming format
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) continue;
            
            const type = line.slice(0, colonIndex);
            const data = line.slice(colonIndex + 1);
            
            
            if (type === '0') { // Text delta
              try {
                const parsed = JSON.parse(data);
                if (parsed) {
                  assistantContent += parsed;
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessage.id 
                      ? { ...msg, content: assistantContent }
                      : msg
                  ));
                }
              } catch (e) {
              }
            } else if (type === '3') { // Error
            }
          }
        }
      } else {
      }
    } catch (err) {
      console.error("Error:", err);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages]);

  const handleTemplateClick = useCallback((template: { content: string }) => {
    setInput(template.content);
    setTimeout(() => {
      const event = new Event('submit') as unknown as React.FormEvent;
      handleSubmit(event);
    }, 100);
  }, [handleSubmit]);

  return {
    messages,
    input,
    isLoading,
    handleNewChat,
    handleInputChange,
    handleSubmit,
    handleTemplateClick
  };
};
