import React, { useState, useCallback } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, X } from 'lucide-react';
import { GOOGLE_MAPS_API_KEY, MAPS_CONFIG } from '@/config/maps';

interface LocationData {
  address: string;
  lat: number;
  lng: number;
}

interface LocationPickerProps {
  onLocationSelect: (location: LocationData) => void;
  onChange?: (value: string) => void;
  placeholder?: string;
  value?: string;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  onLocationSelect,
  onChange,
  placeholder = "Enter protest location",
  value = ""
}) => {
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: MAPS_CONFIG.libraries,
  });

  const onLoad = useCallback((autocompleteInstance: google.maps.places.Autocomplete) => {
    setAutocomplete(autocompleteInstance);
  }, []);

  const onPlaceChanged = useCallback(() => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        // Combine place name with formatted address if both are available
        let address = '';
        if (place.name && place.formatted_address) {
          // Check if the formatted address already starts with the place name
          if (place.formatted_address.startsWith(place.name)) {
            address = place.formatted_address;
          } else {
            address = `${place.name}, ${place.formatted_address}`;
          }
        } else {
          address = place.formatted_address || place.name || '';
        }
        
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        const locationData = { address, lat, lng };
        setSelectedLocation(locationData);
        setInputValue(address);
        onLocationSelect(locationData);
        onChange?.(address);
      }
    }
  }, [autocomplete, onLocationSelect, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
    
    // Clear selected location if user manually types something different
    if (selectedLocation && selectedLocation.address !== newValue) {
      setSelectedLocation(null);
    }
  };

  const clearLocation = () => {
    setInputValue('');
    setSelectedLocation(null);
    onChange?.('');
  };

  if (!isLoaded) {
    return (
      <div className="space-y-2">
        <Input
          placeholder={GOOGLE_MAPS_API_KEY ? "Loading Google Maps..." : "Google Maps API key not configured"}
          disabled
        />
        {!GOOGLE_MAPS_API_KEY && (
          <p className="text-sm text-amber-600">
            ⚠️ Please add your Google Maps API key to the .env file to enable location picker
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Autocomplete
            onLoad={onLoad}
            onPlaceChanged={onPlaceChanged}
            options={{
              componentRestrictions: { country: 'in' },
              fields: ['formatted_address', 'geometry', 'name'],
              types: ['establishment', 'geocode'],
            }}
          >
            <Input
              value={inputValue}
              onChange={handleInputChange}
              placeholder={placeholder || "Type to search for a location..."}
              className="pl-10 pr-10"
            />
          </Autocomplete>
          {inputValue && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearLocation}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 z-10"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {!selectedLocation && inputValue && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <span>💡</span>
          <span>Start typing to see location suggestions, then click to select</span>
        </div>
      )}
      
      {selectedLocation && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2 text-green-700">
            <MapPin className="h-4 w-4" />
            <span className="text-sm font-medium">Selected: {selectedLocation.address}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
