import React from 'react';
import { Label } from '@ui';
import { useI18n } from '@contexts/i18n-context';
import type { DocumentTypeSelectorProps } from './types';
import type { DocumentNumberInputProps } from './types';
import type { DocumentUploadButtonsProps } from './types';
import { DocumentTypeSelector } from '@registration-form';
import { DocumentNumberInput } from '@registration-form';
import { DocumentUploadButtons } from '@registration-form';

interface IDVerificationProps {
  documentType: string;
  documentTypeError: string | null;
  documentNumber: string;
  documentNumberError: string | null;
  onCameraClick: () => void;
  onFileUpload: (file: File) => void;
}

const IDVerification: React.FC<IDVerificationProps> = ({
    </div>
  );
};

export const IDVerification: React.FC<IDVerificationProps> = ({
  documentType,
  documentNumber,
  errors,
  onCameraClick,
  onFileUpload,
}) => {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <DocumentTypeSection documentType={documentType} error={errors.documentType?.message} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DocumentNumberSection documentNumber={documentNumber} error={errors.documentNumber?.message} />

        <DocumentUploadSection onCameraClick={onCameraClick} onFileUpload={onFileUpload} />
      </div>
    </div>
  );
};
