export type DocumentType = 'DNI' | 'NIE' | 'PASSPORT';

export interface DocumentTypeSelectorProps {
  value: DocumentType;
  error: string | null;
  onChange: (value: DocumentType) => void;
}

export interface DocumentNumberInputProps {
  value: string;
  error: string | null;
  onChange: (value: string) => void;
}

export interface DocumentUploadButtonsProps {
  onCameraClick: () => void;
  onFileUpload: (file: File) => void;
}
