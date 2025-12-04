'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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

interface FixedRichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  mentionCandidates?: Array<{ id: string; name?: string; email: string; avatar?: string }>;
}

export default function FixedRichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Text eingeben...", 
  className = "",
  onKeyDown,
  mentionCandidates = []
}: FixedRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  // Mentions (Rich-Text)
  const [mOpen, setMOpen] = useState(false);
  const [mQuery, setMQuery] = useState('');
  const [mIndex, setMIndex] = useState(0);
  const [mPos, setMPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Initialize and update content
  useEffect(() => {
    if (editorRef.current) {
      // Only update if content actually changed to prevent cursor jumping
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
        fixDirection();
      }
    }
  }, [value]);

  // Fix text direction issues
  const fixDirection = () => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    
    // Set LTR direction on main editor
    editor.setAttribute('dir', 'ltr');
    editor.style.direction = 'ltr';
    editor.style.unicodeBidi = 'plaintext';
    
    // Remove any RTL attributes from all child elements and ensure proper formatting
    const allElements = editor.querySelectorAll('*');
    allElements.forEach(element => {
      const htmlElement = element as HTMLElement;
      htmlElement.removeAttribute('dir');
      htmlElement.style.direction = 'ltr';
      htmlElement.style.unicodeBidi = 'plaintext';
      
      // Special handling for list items to ensure proper formatting
      if (element.tagName === 'LI') {
        // Ensure list items have proper content structure
        if (!htmlElement.innerHTML.trim()) {
          htmlElement.innerHTML = '<br>'; // Add line break for empty list items
        }
        // Add proper styling for list items
        htmlElement.style.marginBottom = '4px';
        htmlElement.style.lineHeight = '1.5';
      }
      
      // Ensure lists have proper list-style-type and indentation
      if (element.tagName === 'UL') {
        htmlElement.style.listStyleType = 'disc';
        htmlElement.style.paddingLeft = '40px';
        htmlElement.style.marginLeft = '0';
        htmlElement.style.marginTop = '8px';
        htmlElement.style.marginBottom = '8px';
      } else if (element.tagName === 'OL') {
        htmlElement.style.listStyleType = 'decimal';
        htmlElement.style.paddingLeft = '40px';
        htmlElement.style.marginLeft = '0';
        htmlElement.style.marginTop = '8px';
        htmlElement.style.marginBottom = '8px';
      }
    });
    
    // Handle text nodes to ensure they're properly wrapped
    const walker = document.createTreeWalker(
      editor,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const textNodes: Text[] = [];
    let node;
    while ((node = walker.nextNode())) {
      textNodes.push(node as Text);
    }
    
    // Wrap orphaned text nodes in paragraphs for better structure
    textNodes.forEach(textNode => {
      const parentElement = textNode.parentElement;
      if (parentElement === editor && textNode.textContent?.trim()) {
        // Create paragraph wrapper for direct text children
        const p = document.createElement('p');
        p.setAttribute('dir', 'ltr');
        p.style.direction = 'ltr';
        p.style.unicodeBidi = 'plaintext';
        p.textContent = textNode.textContent;
        
        textNode.parentNode?.replaceChild(p, textNode);
      }
    });
  };

  // Handle input events
  const handleInput = (e?: React.FormEvent<HTMLDivElement>) => {
    if (!editorRef.current) return;
    
    // Fix direction immediately
    fixDirection();
    
    // Get content and notify parent
    const content = editorRef.current.innerHTML;
    onChange(content);
    
    // Ensure cursor moves with input for better UX
    ensureCursorBehavior();
    // Detect mentions after content updates
    detectMentionRT();
  };

  // Ensure proper cursor behavior
  const ensureCursorBehavior = () => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    
    // If cursor is at the beginning of a text node that has content,
    // move it to the end to prevent RTL-like behavior
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      const textNode = range.startContainer as Text;
      const textContent = textNode.textContent || '';
      
      if (textContent.length > 0 && range.startOffset === 0) {
        // Move cursor to end of current text node
        range.setStart(textNode, textContent.length);
        range.setEnd(textNode, textContent.length);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Mention Navigation
    if (mOpen) {
      if (e.key === 'ArrowDown') { e.preventDefault(); const list = getMentionList(); setMIndex(i => list.length ? ((i + 1) % list.length) : 0); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); const list = getMentionList(); setMIndex(i => list.length ? ((i - 1 + list.length) % list.length) : 0); return; }
      if (e.key === 'Escape') { e.preventDefault(); setMOpen(false); return; }
      if (e.key === 'Enter') {
        const list = getMentionList();
        if (list.length > 0) {
          e.preventDefault();
          applyMention(list[Math.min(mIndex, list.length - 1)]);
          return;
        }
      }
    }
    // Call custom handler if provided
    if (onKeyDown) {
      onKeyDown(e);
    }
    
    // Handle Enter key - create proper line breaks or list items
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      let listItem: Node | null = range.commonAncestorContainer;
      
      // Find if we're in a list item
      while (listItem && listItem !== editorRef.current) {
        if (listItem.nodeType === Node.ELEMENT_NODE && listItem.nodeName === 'LI') {
          break;
        }
        listItem = listItem.parentNode || null;
      }
      
      if (listItem && listItem !== editorRef.current && listItem.nodeType === Node.ELEMENT_NODE) {
        // We're in a list item, create a new list item
        const newListItem = document.createElement('li');
        newListItem.setAttribute('dir', 'ltr');
        newListItem.style.direction = 'ltr';
        newListItem.style.unicodeBidi = 'plaintext';
        newListItem.innerHTML = '<br>';
        
        // Insert after current list item
        (listItem as HTMLElement).parentNode?.insertBefore(newListItem, (listItem as HTMLElement).nextSibling);
        
        // Move cursor to new list item
        const newRange = document.createRange();
        newRange.setStart(newListItem, 0);
        newRange.setEnd(newListItem, 0);
        selection.removeAllRanges();
        selection.addRange(newRange);
      } else {
        // We're not in a list, create a regular line break
        document.execCommand('insertLineBreak', false, '');
      }
      
      handleInput();
      return;
    }
    
    // Handle Backspace in empty list items to exit list
    if (e.key === 'Backspace') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        let listItem: Node | null = range.commonAncestorContainer;
        
        // Find if we're in a list item
        while (listItem && listItem !== editorRef.current) {
          if (listItem.nodeType === Node.ELEMENT_NODE && listItem.nodeName === 'LI') {
            break;
          }
          listItem = listItem.parentNode || null;
        }
        
        if (listItem && listItem !== editorRef.current && listItem.nodeType === Node.ELEMENT_NODE) {
          const liElement = listItem as HTMLElement;
          // If list item is empty or only contains BR
          if (!liElement.textContent?.trim() || liElement.innerHTML === '<br>') {
            e.preventDefault();
            // Remove the list item
            liElement.parentNode?.removeChild(liElement);
            // Create a paragraph where the list was
            const p = document.createElement('p');
            p.setAttribute('dir', 'ltr');
            p.style.direction = 'ltr';
            p.style.unicodeBidi = 'plaintext';
            p.innerHTML = '<br>';
            editorRef.current?.appendChild(p);
            // Move cursor to paragraph
            const newRange = document.createRange();
            newRange.setStart(p, 0);
            newRange.setEnd(p, 0);
            selection.removeAllRanges();
            selection.addRange(newRange);
            handleInput();
          }
        }
      }
    }
    
    // Handle text input to prevent RTL issues
    if (e.key.length === 1) {
      // Small delay to ensure the character is inserted first
      setTimeout(() => {
        fixDirection();
        handleInput();
      }, 0);
    }
  };

  // Handle paste events
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    // Get plain text to avoid formatting issues
    const text = e.clipboardData.getData('text/plain');
    
    // Insert text at cursor position
    document.execCommand('insertText', false, text);
    
    // Fix direction after paste
    setTimeout(() => {
      fixDirection();
      handleInput();
    }, 0);
  };

  // Handle mouse events to ensure direction is maintained
  const handleMouseUp = () => {
    setTimeout(() => {
      fixDirection();
    }, 0);
  };

  const handleKeyUp = () => {
    setTimeout(() => {
      fixDirection();
      detectMentionRT();
    }, 0);
  };

  // Mention-Logik (Rich-Text)
  const getMentionList = () => {
    const q = (mQuery || '').toLowerCase();
    const pool = Array.isArray(mentionCandidates) ? mentionCandidates : [];
    if (!mOpen) return [] as typeof mentionCandidates;
    if (!q) return pool.slice(0, 50);
    return pool.filter(u => ((u.name || u.email || '').toLowerCase().includes(q))).slice(0, 50);
  };
  const detectMentionRT = () => {
    const editor = editorRef.current;
    if (!editor) return setMOpen(false);
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return setMOpen(false);
    const range = sel.getRangeAt(0);
    // Text bis Caret bestimmen
    const preRange = range.cloneRange();
    preRange.selectNodeContents(editor);
    preRange.setEnd(range.endContainer, range.endOffset);
    const preText = preRange.toString();
    const match = /@([^\s@#.,;:!?()<>]*)$/i.exec(preText);
    if (!match) { setMOpen(false); return; }
    setMQuery(match[1] || '');
    setMIndex(0);
    setMOpen(true);
    // Position: Caret-BoundingRect
    const rects = range.getClientRects();
    const rect = rects.length ? rects[rects.length - 1] : editor.getBoundingClientRect();
    const width = Math.min(editor.getBoundingClientRect().width, 480);
    setMPos({ top: (rect.bottom + window.scrollY), left: (rect.left + window.scrollX), width });
  };
  const applyMention = (user: { id: string; name?: string; email: string }) => {
    const editor = editorRef.current;
    if (!editor) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    // Ersetze @query durch @Label 
    const label = `@${user.name || user.email}` + ' ';
    // Versuche, im aktuellen TextNode rückwärts zu löschen
    try {
      const startContainer = range.startContainer;
      if (startContainer.nodeType === Node.TEXT_NODE) {
        const textNode = startContainer as Text;
        const del = (mQuery || '').length + 1; // @ + query
        const startOffset = Math.max(0, range.startOffset - del);
        const delRange = document.createRange();
        delRange.setStart(textNode, startOffset);
        delRange.setEnd(textNode, range.startOffset);
        delRange.deleteContents();
        // Insert label
        document.execCommand('insertText', false, label);
      } else {
        document.execCommand('insertText', false, label);
      }
    } catch {
      document.execCommand('insertText', false, label);
    }
    setMOpen(false);
    setMIndex(0);
    // Update value
    handleInput();
  };

  // Format text commands
  const formatText = (command: string, value: string = '') => {
    // Special handling for list commands
    if (command === 'insertUnorderedList' || command === 'insertOrderedList') {
      // Get current selection
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      
      const range = selection.getRangeAt(0);
      let listContainer: Node | null = range.commonAncestorContainer;
      
      // Find the actual list container
      while (listContainer && listContainer !== editorRef.current) {
        if (listContainer.nodeType === Node.ELEMENT_NODE) {
          const element = listContainer as Element;
          if (element.tagName === 'UL' || element.tagName === 'OL') {
            break;
          }
        }
        listContainer = listContainer.parentNode || null;
      }
      
      // If we're in a list and trying to create the same type, remove it
      if (listContainer && listContainer !== editorRef.current && listContainer.nodeType === Node.ELEMENT_NODE) {
        const element = listContainer as Element;
        if (
          (command === 'insertUnorderedList' && element.tagName === 'UL') ||
          (command === 'insertOrderedList' && element.tagName === 'OL')
        ) {
          // Remove list formatting
          document.execCommand('removeFormat', false);
          // Convert list items to paragraphs
          const listItems = element.querySelectorAll('li');
          listItems.forEach(item => {
            const p = document.createElement('p');
            p.innerHTML = item.innerHTML;
            item.parentNode?.replaceChild(p, item);
          });
          // Remove the list container
          element.parentNode?.removeChild(element);
          fixDirection();
          handleInput();
          editorRef.current?.focus();
          return;
        }
      }
    }
    
    // Special handling for blockquote and code blocks
    if (command === 'formatBlock') {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        
        // Create the block element
        const blockElement = document.createElement(value);
        
        // If we have text selected, wrap it
        if (!range.collapsed) {
          try {
            range.surroundContents(blockElement);
          } catch (e) {
            // If surroundContents fails (e.g., selection spans multiple blocks),
            // use the execCommand as fallback
            document.execCommand(command, false, value);
          }
        } else {
          // For collapsed selection, use execCommand
          document.execCommand(command, false, value);
        }
      } else {
        // Fallback to execCommand
        document.execCommand(command, false, value);
      }
    } else {
      // For all other commands, use execCommand
      document.execCommand(command, false, value);
    }
    
    // Fix direction after formatting
    fixDirection();
    handleInput();
    
    // Keep focus on editor
    editorRef.current?.focus();
  };

  // Insert link
  const insertLink = () => {
    const url = prompt('URL eingeben:');
    if (url) {
      formatText('createLink', url);
    }
  };

  // Format buttons configuration
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
    <div className={`border rounded-lg overflow-hidden relative w-full min-w-0 ${className}`} style={{ direction: 'ltr' }}>
      {/* Toolbar */}
      <div className="border-b bg-gray-50 p-2 flex flex-wrap gap-1">
        {formatButtons.map(({ icon: Icon, command, title, value, action }) => (
          <Button
            key={`${command}-${value ?? 'default'}`}
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
          fixDirection();
        }}
        onBlur={() => setIsFocused(false)}
        className={`min-h-[150px] p-3 outline-none w-full max-w-full overflow-x-hidden ${
          isFocused ? 'bg-white' : 'bg-gray-50'
        } ${!value ? 'text-gray-400' : ''}`}
        data-placeholder={placeholder}
        style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          overflowX: 'hidden',
          wordBreak: 'break-word',
          overflowWrap: 'anywhere',
          maxWidth: '100%',
          direction: 'ltr',
          unicodeBidi: 'plaintext',
        }}
        spellCheck="true"
        lang="de"
        dir="ltr"
      />
      {mOpen && mPos && createPortal(
        <div
          style={{ position: 'absolute', top: mPos.top, left: mPos.left, width: mPos.width, zIndex: 100000 }}
          className="bg-white border rounded shadow-lg overflow-hidden"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <div className="max-h-56 overflow-auto">
            {getMentionList().map((u, idx) => (
              <button key={u.id}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${idx === (mIndex % Math.max(1, getMentionList().length)) ? 'bg-gray-100' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); applyMention(u); }}
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px]">
                    {(u.name || u.email || '?').charAt(0).toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{u.name || u.email}</div>
                    <div className="truncate text-xs text-gray-500">{u.email}</div>
                  </div>
                </div>
              </button>
            ))}
            {getMentionList().length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-500">Keine Treffer…</div>
            )}
          </div>
        </div>, document.body
      )}
      
      {/* Placeholder */}
      {!value && !isFocused && (
        <div className="absolute top-[76px] left-3 pointer-events-none text-gray-400" style={{ direction: 'ltr' }}>
          {placeholder}
        </div>
      )}
    </div>
  );
}