import Editor from '@monaco-editor/react';

export function FileEditor() {
  return <Editor height="90vh" defaultLanguage="shell" defaultValue="// some comment" />;
}