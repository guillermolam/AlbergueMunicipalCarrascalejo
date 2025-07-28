import React, { useState, useRef } from 'react';
import { Camera, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface IDVerificationProps {
  onVerificationComplete: (data: VerificationData) => void;
  supportedTypes?: IDType[];
}

interface VerificationData {
  type: IDType;
  number: string;
  image: string;
  isValid: boolean;
}

type IDType = 'DNI' | 'NIE' | 'NIF' | 'PASSPORT' | 'EU_RESIDENCE' | 'CIF';

const ID_VALIDATION_RULES: Record<IDType, RegExp> = {
  DNI: /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$/i,
  NIE: /^[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/i,
  NIF: /^[0-9]{8}[A-Z]$/i,
  PASSPORT: /^[A-Z0-9]{6,12}$/i,
  EU_RESIDENCE: /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4,12}$/i,
  CIF: /^[A-HJNP-SW][0-9]{7}[0-9A-J]$/i,
};

const IDVerification: React.FC<IDVerificationProps> = ({
  onVerificationComplete,
  supportedTypes = ['DNI', 'NIE', 'PASSPORT', 'EU_RESIDENCE'],
}) => {
  const [selectedType, setSelectedType] = useState<IDType>(supportedTypes[0]);
  const [idNumber, setIdNumber] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateID = (type: IDType, number: string): boolean => {
    const rule = ID_VALIDATION_RULES[type];
    return rule ? rule.test(number) : false;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImage(e.target?.result as string);
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCapture = () => {
    // In a real implementation, this would open the camera
    // For now, we'll trigger file input
    fileInputRef.current?.click();
  };

  const handleVerify = () => {
    const valid = validateID(selectedType, idNumber);
    setIsValid(valid);
    
    if (valid && image) {
      onVerificationComplete({
        type: selectedType,
        number: idNumber,
        image,
        isValid: true,
      });
    } else if (!valid) {
      setError(`Invalid ${selectedType} format`);
    } else if (!image) {
      setError('Please upload or capture an image');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>ID Verification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">ID Type</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as IDType)}
            className="w-full p-2 border rounded-md"
          >
            {supportedTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">ID Number</label>
          <input
            type="text"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder={`Enter ${selectedType} number`}
            className="w-full p-2 border rounded-md"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Upload/Scan ID</label>
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleCapture}
              variant="outline"
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Capture
            </Button>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        {image && (
          <div className="mt-4">
            <img
              src={image}
              alt="ID Document"
              className="w-full h-48 object-cover rounded-md border"
            />
          </div>
        )}

        {error && (
          <div className="flex items-center text-red-600">
            <AlertCircle className="w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        {isValid === true && (
          <div className="flex items-center text-green-600">
            <CheckCircle className="w-4 h-4 mr-2" />
            ID verified successfully
          </div>
        )}

        <Button
          onClick={handleVerify}
          disabled={!idNumber || !image}
          className="w-full"
        >
          Verify ID
        </Button>
      </CardContent>
    </Card>
  );
};

export default IDVerification;