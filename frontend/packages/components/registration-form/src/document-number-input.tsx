import React from 'react';
import { Input } from '@ui/components/input';
import { Label } from '@ui/components/label';
import { Alert } from '@ui/components/alert';
import { useI18n } from '@contexts/i18n-context';

interface DocumentNumberInputProps {
  documentNumber: any;
  error?: string;
}

export const DocumentNumberInput: React.FC<DocumentNumberInputProps> = ({
  documentNumber,
  error,
}) => {
  const { t } = useI18n();

  return (
    <div>
      <Label htmlFor="documentNumber">{t('document_number')}</Label>
      <Input
        id="documentNumber"
        {...documentNumber}
        placeholder="Ej: 12345678Z"
      />
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
