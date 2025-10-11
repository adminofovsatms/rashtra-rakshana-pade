import React from 'react';
import { MapPin, ExternalLink } from 'lucide-react';

interface GoogleMapsLinkProps {
  address: string;
  lat?: number;
  lng?: number;
  className?: string;
}

const GoogleMapsLink: React.FC<GoogleMapsLinkProps> = ({
  address,
  lat,
  lng,
  className = ""
}) => {
  // Create Google Maps URL
  const createMapsUrl = () => {
    if (lat && lng) {
      // Use coordinates if available for more precise location
      return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else {
      // Fallback to address search
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }
  };

  const mapsUrl = createMapsUrl();

  return (
    <a
      href={mapsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline transition-colors ${className}`}
    >
      <MapPin className="h-4 w-4" />
      <span>{address}</span>
      <ExternalLink className="h-3 w-3" />
    </a>
  );
};

export default GoogleMapsLink;
