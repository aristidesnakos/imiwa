import { useState, useCallback } from "react";
import { EditorState, $getRoot } from "lexical";

export const useLexicalEditorState = () => {
  const [editorStateJSON, setEditorStateJSON] = useState<string>("");
  const [hasContent, setHasContent] = useState(false);

  const onChange = useCallback((state: EditorState) => {
    const json = JSON.stringify(state.toJSON());
    setEditorStateJSON(json);
    const plainText = state.read(() => $getRoot().getTextContent().trim());
    setHasContent(!!plainText);
  }, []);

  return {
    editorStateJSON,
    hasContent,
    onChange,
  };
};