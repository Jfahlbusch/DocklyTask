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

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Text eingeben...", 
  className = "",
  onKeyDown
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (editorRef.current) {
      // Store current cursor position
      const selection = window.getSelection();
      let cursorPosition: Range | null = null;
      
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // Only store cursor position if it's within our editor
        if (editorRef.current.contains(range.startContainer)) {
          cursorPosition = range.cloneRange();
        }
      }
      
      // Clear and reset content to avoid Bidi issues
      editorRef.current.innerHTML = '';
      
      // Create a clean LTR container
      const ltrContainer = document.createElement('div');
      ltrContainer.setAttribute('dir', 'ltr');
      ltrContainer.style.direction = 'ltr';
      ltrContainer.style.unicodeBidi = 'plaintext';
      
      // Parse and insert content safely
      if (value && value.trim()) {
        // Create a temporary div to parse HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = value;
        
        // Extract text content and re-insert in LTR context
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        if (textContent) {
          ltrContainer.textContent = textContent;
        }
      }
      
      editorRef.current.appendChild(ltrContainer);
      
      // Force LTR direction
      forceLTRDirection();
      
      // Restore cursor position if it was inside our editor
      if (cursorPosition) {
        try {
          selection?.removeAllRanges();
          selection?.addRange(cursorPosition);
        } catch (e) {
          // If restoring fails, move cursor to end
          moveCursorToEnd();
        }
      } else if (value) {
        // If no cursor position was stored, move to end
        moveCursorToEnd();
      }
    }
  }, [value]);

  const forceLTRDirection = () => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    
    // Remove any existing dir attributes and RTL styling
    editor.removeAttribute('dir');
    editor.style.direction = 'ltr';
    editor.style.unicodeBidi = 'plaintext';
    
    // Process all child elements to ensure LTR
    const allElements = editor.querySelectorAll('*');
    allElements.forEach(element => {
      element.removeAttribute('dir');
      (element as HTMLElement).style.direction = 'ltr';
      (element as HTMLElement).style.unicodeBidi = 'plaintext';
    });
    
    // Process text nodes directly - wrap them in LTR spans if needed
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const textNodesToWrap: Text[] = [];
    let textNode;
    while ((textNode = walker.nextNode())) {
      textNodesToWrap.push(textNode as Text);
    }
    
    // Wrap text nodes in LTR spans
    textNodesToWrap.forEach(textNode => {
      const parentElement = textNode.parentElement;
      if (parentElement && parentElement.tagName !== 'SPAN') {
        const ltrSpan = document.createElement('span');
        ltrSpan.setAttribute('dir', 'ltr');
        ltrSpan.style.direction = 'ltr';
        ltrSpan.style.unicodeBidi = 'plaintext';
        ltrSpan.textContent = textNode.textContent;
        
        textNode.parentNode?.replaceChild(ltrSpan, textNode);
      }
    });
  };

  const moveCursorToEnd = () => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    const range = document.createRange();
    const selection = window.getSelection();
    
    // Find the last text node or create one if empty
    let lastChild = editor.lastChild;
    while (lastChild && lastChild.nodeType === Node.ELEMENT_NODE && !(lastChild as Element).textContent) {
      lastChild = lastChild.lastChild || lastChild.previousSibling;
    }
    
    if (lastChild && lastChild.nodeType === Node.TEXT_NODE) {
      // Move to end of last text node
      range.setStart(lastChild, lastChild.textContent?.length || 0);
      range.setEnd(lastChild, lastChild.textContent?.length || 0);
    } else if (lastChild && lastChild.nodeType === Node.ELEMENT_NODE) {
      // If element node, try to find text content within it
      const textContent = (lastChild as Element).textContent;
      if (textContent) {
        const textNode = lastChild.firstChild;
        if (textNode && textNode.nodeType === Node.TEXT_NODE) {
          range.setStart(textNode, textNode.textContent?.length || 0);
          range.setEnd(textNode, textNode.textContent?.length || 0);
        }
      }
    } else {
      // If no text node, create one and move cursor there
      const textNode = document.createTextNode('');
      editor.appendChild(textNode);
      range.setStart(textNode, 0);
      range.setEnd(textNode, 0);
    }
    
    selection?.removeAllRanges();
    selection?.addRange(range);
    
    // Ensure LTR direction after cursor movement
    forceLTRDirection();
  };

  const moveCursorToStart = () => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    const range = document.createRange();
    const selection = window.getSelection();
    
    // Find the first text node or create one if empty
    let firstChild = editor.firstChild;
    while (firstChild && firstChild.nodeType === Node.ELEMENT_NODE && !(firstChild as Element).textContent) {
      firstChild = firstChild.firstChild || firstChild.nextSibling;
    }
    
    if (firstChild && firstChild.nodeType === Node.TEXT_NODE) {
      // Move to start of first text node
      range.setStart(firstChild, 0);
      range.setEnd(firstChild, 0);
    } else if (firstChild && firstChild.nodeType === Node.ELEMENT_NODE) {
      // If element node, try to find text content within it
      const textNode = firstChild.firstChild;
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        range.setStart(textNode, 0);
        range.setEnd(textNode, 0);
      }
    } else {
      // If no text node, create one and move cursor there
      const textNode = document.createTextNode('');
      editor.insertBefore(textNode, editor.firstChild);
      range.setStart(textNode, 0);
      range.setEnd(textNode, 0);
    }
    
    selection?.removeAllRanges();
    selection?.addRange(range);
    
    // Ensure LTR direction after cursor movement
    forceLTRDirection();
  };

  const handleInput = (e?: React.FormEvent<HTMLDivElement>) => {
    if (!editorRef.current) return;
    
    // Force LTR direction immediately
    forceLTRDirection();
    
    // Fix text direction issues by processing the content
    fixTextDirection();
    
    // Get the content and ensure proper formatting
    const content = editorRef.current.innerHTML;
    onChange(content);
    
    // Ensure cursor moves with input
    ensureCursorFollowsInput();
  };

  const fixTextDirection = () => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    
    // Get all text content and check if it's reversed
    const textContent = editor.textContent || '';
    
    // If text looks like it might be reversed (common RTL pattern), fix it
    if (textContent.length > 0) {
      // Clear the editor and re-insert content in correct order
      const cursorPosition = saveCursorPosition();
      
      // Create clean LTR content
      editor.innerHTML = '';
      const ltrContainer = document.createElement('div');
      ltrContainer.setAttribute('dir', 'ltr');
      ltrContainer.style.direction = 'ltr';
      ltrContainer.style.unicodeBidi = 'plaintext';
      ltrContainer.textContent = textContent;
      
      editor.appendChild(ltrContainer);
      
      // Restore cursor position
      restoreCursorPosition(cursorPosition);
    }
    
    // Force LTR direction
    forceLTRDirection();
  };

  const saveCursorPosition = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;
    
    const range = selection.getRangeAt(0);
    if (!editorRef.current?.contains(range.startContainer)) return null;
    
    // Save the cursor position relative to the text content
    const textContent = editorRef.current.textContent || '';
    const cursorOffset = getCursorOffset(range);
    
    return { offset: cursorOffset, textContent };
  };

  const restoreCursorPosition = (savedPosition: any) => {
    if (!savedPosition || !editorRef.current) return;
    
    try {
      const selection = window.getSelection();
      if (!selection) return;
      
      const range = document.createRange();
      const textNode = editorRef.current.firstChild?.firstChild;
      
      if (textNode && textNode.nodeType === Node.TEXT_NODE) {
        const offset = Math.min(savedPosition.offset, textNode.textContent?.length || 0);
        range.setStart(textNode, offset);
        range.setEnd(textNode, offset);
        
        selection.removeAllRanges();
        selection.addRange(range);
      }
    } catch (e) {
      // If restoring fails, move cursor to end
      moveCursorToEnd();
    }
  };

  const getCursorOffset = (range: Range): number => {
    try {
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(editorRef.current!);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      
      return preCaretRange.toString().length;
    } catch (e) {
      return 0;
    }
  };

  const ensureCursorFollowsInput = () => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // Force LTR direction
    forceLTRDirection();
    
    // Check if we need to fix cursor position
    const textContent = editorRef.current.textContent || '';
    if (textContent.length > 0) {
      // Move cursor to end of content to ensure proper LTR behavior
      moveCursorToEnd();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle custom key events if provided
    if (onKeyDown) {
      onKeyDown(e);
    }
    
    // Handle Enter key to prevent default behavior and ensure proper line breaks
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.execCommand('insertLineBreak', false, '');
      handleInput();
      return;
    }
    
    // Handle Backspace and Delete to ensure proper cursor behavior
    if (e.key === 'Backspace' || e.key === 'Delete') {
      setTimeout(() => {
        forceLTRDirection();
        fixTextDirection();
        handleInput();
      }, 0);
    }
    
    // Handle text input keys to prevent RTL behavior
    if (e.key.length === 1) {
      setTimeout(() => {
        forceLTRDirection();
        fixTextDirection();
        handleInput();
      }, 0);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Get plain text from clipboard
    const text = e.clipboardData.getData('text/plain');
    
    // Insert the text at cursor position using insertText command
    document.execCommand('insertText', false, text);
    
    // Fix any Bidi issues after paste and ensure cursor moves
    setTimeout(() => {
      forceLTRDirection();
      fixTextDirection();
      ensureCursorFollowsInput();
      handleInput();
    }, 0);
  };

  const handleMouseUp = () => {
    // Ensure LTR direction after mouse selection
    setTimeout(() => {
      forceLTRDirection();
      fixTextDirection();
    }, 0);
  };

  const handleKeyUp = () => {
    // Ensure LTR direction after key release
    setTimeout(() => {
      forceLTRDirection();
      fixTextDirection();
    }, 0);
  };

  const formatText = (command: string, value: string = '') => {
    // Store current cursor position
    const savedPosition = saveCursorPosition();
    
    document.execCommand(command, false, value);
    
    // Force LTR direction after formatting
    forceLTRDirection();
    fixTextDirection();
    
    // Restore cursor position
    restoreCursorPosition(savedPosition);
    
    handleInput();
    editorRef.current?.focus();
  };

  const insertLink = () => {
    const url = prompt('URL eingeben:');
    if (url) {
      formatText('createLink', url);
    }
  };

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
    <div className={`border rounded-lg overflow-hidden ${className}`} style={{ direction: 'ltr' }}>
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
        onMouseUp={handleMouseUp}
        onKeyUp={handleKeyUp}
        onFocus={() => {
          setIsFocused(true);
          // Ensure LTR direction when focused
          forceLTRDirection();
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
        <div className="absolute top-12 left-3 pointer-events-none text-gray-400" style={{ direction: 'ltr' }}>
          {placeholder}
        </div>
      )}
    </div>
  );
}