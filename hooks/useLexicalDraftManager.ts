import { useState, useEffect, useRef } from "react";
import { EditorState, LexicalEditor } from "lexical";

interface DraftData {
  content: string;
  timestamp: number;
}

export function useLexicalDraftManager(
  editor: LexicalEditor | null,
  key: string
) {
  const [draftAge, setDraftAge] = useState<string>("");
  const lastSaveTimeRef = useRef<number | null>(null);

  const storageKey = `draft_${key}`;

  const loadDraft = (defaultContent: () => string): string => {
    try {
      const data = localStorage.getItem(storageKey);
      if (data) {
        const parsed: DraftData = JSON.parse(data);
        setDraftAge(formatDraftAge(parsed.timestamp));
        return parsed.content;
      }
    } catch (err) {
      console.error("Error loading draft:", err);
    }
    return defaultContent();
  };

  const restoreDraft = (content: string) => {
    if (editor) {
      editor.update(() => {
        try {
          const parsed = JSON.parse(content);
          const editorState = editor.parseEditorState(parsed);
          editor.setEditorState(editorState);
        } catch {
          console.warn("Invalid editor state, restoring as plain text.");
        }
      });
    }
  };

  const saveDraft = (editorState?: EditorState) => {
    try {
      const timestamp = Date.now();
      let contentToSave = "";
      if (editorState) {
        contentToSave = JSON.stringify(editorState.toJSON());
      } else if (editor) {
        const currentState = editor.getEditorState();
        contentToSave = JSON.stringify(currentState.toJSON());
      }
      const draftData: DraftData = { content: contentToSave, timestamp };
      localStorage.setItem(storageKey, JSON.stringify(draftData));
      lastSaveTimeRef.current = timestamp;
      setDraftAge(formatDraftAge(timestamp));
    } catch (err) {
      console.error("Error saving draft:", err);
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(storageKey);
      setDraftAge("");
    } catch (err) {
      console.error("Error clearing draft:", err);
    }
  };

  return { loadDraft, restoreDraft, clearDraft, draftAge, saveDraft };
}

function formatDraftAge(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "less than a minute ago";
  if (minutes === 1) return "1 minute ago";
  return `${minutes} minutes ago`;
}
