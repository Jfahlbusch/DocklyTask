'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import FixedRichTextEditor from '@/components/ui/FixedRichTextEditor';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';

interface CommentFormProps {
  taskId: string;
  currentUser: any;
  onSubmit: (content: string) => void;
}

export default function CommentForm({ taskId, currentUser, onSubmit }: CommentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content);
      setContent('');
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={currentUser.avatar} />
          <AvatarFallback>
            {currentUser.name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-3">
          <FixedRichTextEditor
            value={content}
            onChange={setContent}
            placeholder="Schreibe einen Kommentar..."
            onKeyDown={handleKeyDown}
          />
          
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Strg+Enter zum Senden
            </p>
            <Button 
              type="button" 
              onClick={handleSubmit} 
              disabled={isSubmitting || !content.trim()}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Wird gesendet...' : 'Kommentieren'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}