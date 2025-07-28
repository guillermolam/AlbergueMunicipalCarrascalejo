import React from 'react';
import { Button } from '@ui/components/button';
import { Camera, FileText } from 'lucide-react';

interface DocumentUploadButtonsProps {
  onCameraClick: () => void;
  onFileUpload: () => void;
}

export const DocumentUploadButtons: React.FC<DocumentUploadButtonsProps> = ({
  onCameraClick,
  onFileUpload,
}) => {
  return (
    <div className="flex gap-2">
      <Button variant="outline" className="w-full" onClick={onCameraClick}>
        <Camera className="mr-2 h-4 w-4" />
        Tomar foto
      </Button>
      <Button variant="outline" className="w-full" onClick={onFileUpload}>
        <FileText className="mr-2 h-4 w-4" />
        Subir archivo
      </Button>
    </div>
  );
};
