// Original bed selection map from client/ - exact restoration
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bed, Home, Users } from 'lucide-react';
import { useI18n } from '@/contexts/i18n-context';
import { useQuery } from '@tanstack/react-query';

interface BedInfo {
  id: number;
  bedNumber: number;
  roomNumber: number;
  roomName: string;
  isAvailable: boolean;
  status: 'available' | 'occupied' | 'maintenance';
  position: 'top' | 'bottom';
  bunkNumber: number;
}

interface BedSelectionMapProps {
  checkInDate: string;
  checkOutDate: string;
  selectedBedId?: number;
  onBedSelect: (bedId: number) => void;
  onConfirm: () => void;
  onBack: () => void;
}

// Mock bed data - in real app this would come from API
const generateBedData = (): BedInfo[] => {
  const beds: BedInfo[] = [];
  const bunkhouses = ['Dormitorio A', 'Dormitorio B', 'Private Rooms'];
  
  bunkhouses.forEach((roomName, roomIndex) => {
    const roomNumber = roomIndex + 1;
    const bedsPerRoom = roomName === 'Private Rooms' ? 4 : 8; // 4 bunks = 8 beds
    
    for (let i = 0; i < bedsPerRoom; i++) {
      const bedNumber = i + 1;
      const bunkNumber = Math.floor(i / 2) + 1;
      const position = i % 2 === 0 ? 'bottom' : 'top';
      
      beds.push({
        id: roomIndex * 100 + bedNumber,
        bedNumber,
        roomNumber,
        roomName,
        isAvailable: Math.random() > 0.3, // 70% available
        status: Math.random() > 0.3 ? 'available' : 'occupied',
        position,
        bunkNumber
      });
    }
  });
  
  return beds;
};

const BunkBedIcon: React.FC<{ 
  bed: BedInfo; 
  isSelected: boolean; 
  onClick: () => void;
  disabled: boolean;
}> = ({ bed, isSelected, onClick, disabled }) => {
  const getStatusColor = () => {
    if (disabled || !bed.isAvailable) return 'bg-red-500 hover:bg-red-600';
    if (isSelected) return 'bg-blue-500 hover:bg-blue-600';
    return 'bg-green-500 hover:bg-green-600';
  };

  const getStatusText = () => {
    if (!bed.isAvailable) return 'Occupied';
    if (isSelected) return 'Selected';
    return 'Available';
  };

  return (
    <div className="flex flex-col items-center space-y-1">
      <button
        onClick={onClick}
        disabled={disabled || !bed.isAvailable}
        className={`
          relative w-12 h-6 rounded border-2 transition-all duration-200
          ${getStatusColor()}
          ${disabled || !bed.isAvailable ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
          ${isSelected ? 'ring-2 ring-blue-300' : ''}
        `}
        title={`${bed.position === 'top' ? 'Top' : 'Bottom'} bed ${bed.bedNumber} - ${getStatusText()}`}
      >
        <Bed className="w-3 h-3 text-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
      </button>
      <span className="text-xs text-gray-600">{bed.bedNumber}</span>
    </div>
  );
};

const BunkhouseView: React.FC<{
  beds: BedInfo[];
  selectedBedId?: number;
  onBedSelect: (bedId: number) => void;
}> = ({ beds, selectedBedId, onBedSelect }) => {
  // Group beds by bunk (2 beds per bunk)
  const bunks = beds.reduce((acc, bed) => {
    const bunkKey = bed.bunkNumber;
    if (!acc[bunkKey]) acc[bunkKey] = [];
    acc[bunkKey].push(bed);
    return acc;
  }, {} as Record<number, BedInfo[]>);

  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
      {Object.entries(bunks).map(([bunkNumber, bunkBeds]) => {
        const topBed = bunkBeds.find(b => b.position === 'top');
        const bottomBed = bunkBeds.find(b => b.position === 'bottom');
        
        return (
          <div key={bunkNumber} className="flex flex-col items-center space-y-1 p-2 bg-white rounded border">
            <div className="text-xs font-medium text-gray-700 mb-2">Bunk {bunkNumber}</div>
            
            {/* Top bed */}
            {topBed && (
              <BunkBedIcon
                bed={topBed}
                isSelected={selectedBedId === topBed.id}
                onClick={() => onBedSelect(topBed.id)}
                disabled={false}
              />
            )}
            
            {/* Bottom bed */}
            {bottomBed && (
              <BunkBedIcon
                bed={bottomBed}
                isSelected={selectedBedId === bottomBed.id}
                onClick={() => onBedSelect(bottomBed.id)}
                disabled={false}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export const BedSelectionMap: React.FC<BedSelectionMapProps> = ({
  checkInDate,
  checkOutDate,
  selectedBedId,
  onBedSelect,
  onConfirm,
  onBack
}) => {
  const { t } = useI18n();
  const [beds] = useState<BedInfo[]>(generateBedData);

  // Group beds by room
  const bedsByRoom = beds.reduce((acc, bed) => {
    if (!acc[bed.roomName]) acc[bed.roomName] = [];
    acc[bed.roomName].push(bed);
    return acc;
  }, {} as Record<string, BedInfo[]>);

  const selectedBed = beds.find(bed => bed.id === selectedBedId);
  const availableBedsCount = beds.filter(bed => bed.isAvailable).length;
  const totalBedsCount = beds.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            {t('bed_selection.title')}
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{t('bed_selection.dates', { checkIn: checkInDate, checkOut: checkOutDate })}</span>
            <Badge variant="outline">
              {availableBedsCount}/{totalBedsCount} {t('bed_selection.available')}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>{t('bed_selection.available')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>{t('bed_selection.occupied')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>{t('bed_selection.selected')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bunkhouse Maps */}
      <div className="space-y-6">
        {Object.entries(bedsByRoom).map(([roomName, roomBeds]) => (
          <Card key={roomName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                {roomName}
                <Badge variant="secondary">
                  {roomBeds.filter(bed => bed.isAvailable).length}/{roomBeds.length} available
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BunkhouseView 
                beds={roomBeds}
                selectedBedId={selectedBedId}
                onBedSelect={onBedSelect}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Selection Summary */}
      {selectedBed && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-medium text-blue-900 mb-2">
                {t('bed_selection.selected_bed')}
              </h3>
              <p className="text-blue-800">
                {selectedBed.roomName} - {selectedBed.position === 'top' ? 'Top' : 'Bottom'} Bed {selectedBed.bedNumber}
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Bunk {selectedBed.bunkNumber}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onBack}
          className="flex-1"
        >
          {t('bed_selection.back')}
        </Button>
        <Button 
          type="button"
          onClick={onConfirm}
          disabled={!selectedBedId}
          className="flex-1 bg-[#45c655] hover:bg-[#3bb048]"
        >
          {t('bed_selection.confirm')}
        </Button>
      </div>
    </div>
  );
};