'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Link, 
  Quote,
  Undo,
  Redo,
  Code
} from 'lucide-react';

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export default function SimpleRichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Text eingeben...", 
  className = "",
  onKeyDown
}: SimpleRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Set initial content and handle updates
  useEffect(() => {
    if (editorRef.current) {
      // Only update if content is different to prevent cursor jumping
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
        ensureLTRDirection();
      }
    }
  }, [value]);

  // Ensure LTR text direction
  const ensureLTRDirection = () => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    
    // Set LTR direction on the main editor
    editor.setAttribute('dir', 'ltr');
    editor.style.direction = 'ltr';
    
    // Remove any RTL attributes from child elements
    const allElements = editor.querySelectorAll('*');
    allElements.forEach(element => {
      element.removeAttribute('dir');
      (element as HTMLElement).style.direction = 'ltr';
    });
  };

  // Handle input events
  const handleInput = () => {
    if (!editorRef.current) return;
    
    // Ensure LTR direction after input
    ensureLTRDirection();
    
    // Get the clean content
    const content = editorRef.current.innerHTML;
    onChange(content);
    
    // Ensure cursor moves to end after typing
    moveCursorToEnd();
  };

  // Move cursor to end of content
  const moveCursorToEnd = () => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    const selection = window.getSelection();
    const range = document.createRange();
    
    // Select all content
    range.selectNodeContents(editor);
    
    // Collapse to end
    range.collapse(false);
    
    // Apply the selection
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Call custom key handler if provided
    if (onKeyDown) {
      onKeyDown(e);
    }
    
    // Handle Enter key
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertLineBreak', false, '');
      handleInput();
    }
  };

  // Handle paste events
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Get plain text from clipboard
    const text = e.clipboardData.getData('text/plain');
    
    // Insert text at cursor position
    document.execCommand('insertText', false, text);
    
    // Ensure LTR direction after paste
    setTimeout(() => {
      ensureLTRDirection();
      handleInput();
    }, 0);
  };

  // Format text commands
  const formatText = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    ensureLTRDirection();
    handleInput();
    editorRef.current?.focus();
  };

  // Insert link
  const insertLink = () => {
    const url = prompt('URL eingeben:');
    if (url) {
      formatText('createLink', url);
    }
  };

  // Format buttons
  const formatButtons = [
    { icon: Undo, command: 'undo', title: 'Rückgängig' },
    { icon: Redo, command: 'redo', title: 'Wiederholen' },
    { icon: Bold, command: 'bold', title: 'Fett' },
    { icon: Italic, command: 'italic', title: 'Kursiv' },
    { icon: List, command: 'insertUnorderedList', title: 'Aufzählung' },
    { icon: ListOrdered, command: 'insertOrderedList', title: 'Nummerierte Liste' },
    { icon: Quote, command: 'formatBlock', value: 'blockquote', title: 'Zitat' },
    { icon: Code, command: 'formatBlock', value: 'pre', title: 'Code' },
    { icon: Link, command: 'custom', value: 'link', title: 'Link einfügen', action: insertLink },
  ];

  return (
    <div className={`border rounded-lg overflow-hidden ${className}`} dir="ltr">
      {/* Toolbar */}
      <div className="border-b bg-gray-50 p-2 flex flex-wrap gap-1">
        {formatButtons.map(({ icon: Icon, command, title, value, action }) => (
          <Button
            key={command}
            variant="ghost"
            size="sm"
            onClick={() => action ? action() : formatText(command, value)}
            className="h-8 w-8 p-0"
            title={title}
          >
            <Icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={() => {
          setIsFocused(true);
          ensureLTRDirection();
        }}
        onBlur={() => setIsFocused(false)}
        className={`min-h-[150px] p-3 outline-none ${
          isFocused ? 'bg-white' : 'bg-gray-50'
        } ${!value ? 'text-gray-400' : ''}`}
        data-placeholder={placeholder}
        style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          direction: 'ltr',
          unicodeBidi: 'plaintext',
        }}
        spellCheck="true"
        lang="de"
        dir="ltr"
      />
      
      {!value && !isFocused && (
        <div className="absolute top-12 left-3 pointer-events-none text-gray-400" dir="ltr">
          {placeholder}
        </div>
      )}
    </div>
  );
}