'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  X, 
  Download,
  Paperclip,
  FileVideo,
  FileArchive,
  Music
} from 'lucide-react';

interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  createdAt: string;
}

interface AttachmentFormProps {
  taskId: string;
  attachments: Attachment[];
  onAttachmentAdd: (file: File) => Promise<void>;
  onAttachmentDelete: (attachmentId: string) => Promise<void>;
  maxFileSize?: number; // in MB
  allowedTypes?: string[];
}

export default function AttachmentForm({
  taskId,
  attachments,
  onAttachmentAdd,
  onAttachmentDelete,
  maxFileSize = 10,
  allowedTypes = ['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.*']
}: AttachmentFormProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (fileName: string, fileType: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (fileType.startsWith('image/')) {
      // eslint-disable-next-line jsx-a11y/alt-text
      return <Image className="h-8 w-8 text-blue-500" />;
    } else if (fileType.startsWith('video/')) {
      return <FileVideo className="h-8 w-8 text-purple-500" />;
    } else if (fileType.startsWith('audio/')) {
      return <Music className="h-8 w-8 text-green-500" />;
    } else if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z')) {
      return <FileArchive className="h-8 w-8 text-orange-500" />;
    } else if (extension === 'pdf') {
      return <FileText className="h-8 w-8 text-red-500" />;
    } else if (['doc', 'docx', 'txt', 'rtf'].includes(extension || '')) {
      return <FileText className="h-8 w-8 text-blue-600" />;
    } else {
      return <File className="h-8 w-8 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File) => {
    if (file.size > maxFileSize * 1024 * 1024) {
      alert(`Datei ist zu groß. Maximale Größe: ${maxFileSize}MB`);
      return false;
    }
    
    if (allowedTypes.length > 0 && !allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.split('/*')[0]);
      }
      return file.type === type || file.name.endsWith(type.split('.').pop() || '');
    })) {
      alert('Dateityp nicht erlaubt');
      return false;
    }
    
    return true;
  };

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    if (!validateFile(file)) return;
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);
      
      await onAttachmentAdd(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 500);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploading(false);
      setUploadProgress(0);
      alert('Fehler beim Hochladen der Datei');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Möchten Sie diesen Anhang wirklich löschen?')) return;
    
    try {
      await onAttachmentDelete(attachmentId);
    } catch (error) {
      console.error('Error deleting attachment:', error);
      alert('Fehler beim Löschen des Anhangs');
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card>
        <CardContent className="p-6">
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver 
                ? 'border-blue-500 bg-blue-50' 
                : uploading 
                  ? 'border-gray-300 bg-gray-50' 
                  : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div className="space-y-3">
                <div className="animate-pulse">
                  <Upload className="h-12 w-12 text-blue-500 mx-auto" />
                </div>
                <div>
                  <p className="text-sm font-medium">Hochladen...</p>
                  <Progress value={uploadProgress} className="mt-2" />
                  <p className="text-xs text-gray-500 mt-1">{uploadProgress}%</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-sm font-medium">Dateien hochladen</p>
                  <p className="text-xs text-gray-500">
                    Ziehen Sie Dateien hierher oder klicken Sie zur Auswahl
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Max. {maxFileSize}MB, erlaubte Typen: {allowedTypes.join(', ')}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  Datei auswählen
                </Button>
              </div>
            )}
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            multiple={false}
            onChange={handleFileInputChange}
            accept={allowedTypes.join(',')}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Anhänge ({attachments.length})</h4>
          <div className="space-y-2">
            {attachments.map((attachment) => (
              <Card key={attachment.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {getFileIcon(attachment.fileName, attachment.fileType)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={attachment.fileName}>
                          {attachment.fileName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(attachment.fileSize)} • {new Date(attachment.createdAt).toLocaleDateString('de-DE')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(attachment.fileUrl, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(attachment.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}