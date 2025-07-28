import React from 'react';
import { Select } from '@ui/components/select';
import { Alert } from '@ui/components/alert';
import { useI18n } from '@contexts/i18n-context';

interface DocumentTypeSelectorProps {
  documentType: any;
  error?: string;
}

const documentTypes = [
  { value: 'DNI', label: 'DNI' },
  { value: 'NIE', label: 'NIE' },
  { value: 'PASSPORT', label: 'Passport' },
];

export const DocumentTypeSelector: React.FC<DocumentTypeSelectorProps> = ({
  documentType,
  error,
}) => {
  const { t } = useI18n();

  return (
    <div>
      <Select {...documentType}>
        <SelectTrigger>
          <SelectValue placeholder={t('select_document_type')} />
        </SelectTrigger>
        <SelectContent>
          {documentTypes.map((type) => (
            <SelectItem key={type.value} value={type.value}>
              {type.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};
