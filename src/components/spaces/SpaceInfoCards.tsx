
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Coffee, 
  Wifi, 
  Car, 
  Utensils, 
  Wind, 
  Printer,
  Shield,
  Clock,
  CheckCircle
} from "lucide-react";

interface SpaceInfoCardsProps {
  space: {
    max_capacity: number;
    amenities: string[];
    work_environment?: string;
    description: string;
    policies?: {
      checkIn: string;
      checkOut: string;
      cancellation: string;
      rules: string[];
    };
  };
}

export const SpaceInfoCards: React.FC<SpaceInfoCardsProps> = ({ space }) => {
  const getAmenityIcon = (amenity: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      'High-speed WiFi': <Wifi className="w-5 h-5" />,
      'Coffee & Tea': <Coffee className="w-5 h-5" />,
      'Parking': <Car className="w-5 h-5" />,
      'Kitchen': <Utensils className="w-5 h-5" />,
      'Air conditioning': <Wind className="w-5 h-5" />,
      'Printer': <Printer className="w-5 h-5" />,
    };
    return iconMap[amenity] || <CheckCircle className="w-5 h-5" />;
  };

  const getAmenityTranslation = (amenity: string) => {
    const translationMap: { [key: string]: string } = {
      'High-speed WiFi': 'WiFi Veloce',
      'Coffee & Tea': 'Caffè e Tè',
      'Parking': 'Parcheggio',
      'Kitchen': 'Cucina',
      'Air conditioning': 'Aria Condizionata',
      'Printer': 'Stampante',
      'Meeting Room': 'Sala Riunioni',
      'Phone Booth': 'Cabina Telefonica',
      'Pet Friendly': 'Animali ammessi',
      'Wheelchair accessible': 'Accessibile disabili',
      '24/7 Access': 'Accesso 24/7',
      'Events': 'Eventi',
      'Podcast Studio': 'Studio Podcast',
      'Gym': 'Palestra',
      'Shower': 'Doccia',
      'Lounge': 'Area Relax',
      'Bike Storage': 'Deposito Bici',
      'Monitors': 'Monitor Esterni',
      'Standing Desks': 'Scrivanie Elevabili',
      'Ergonomic Chairs': 'Sedie Ergonomiche'
    };
    return translationMap[amenity] || amenity;
  };

  const getEnvironmentLabel = (env: string) => {
    const labels: { [key: string]: { label: string; description: string; color: string } } = {
      'silent': { 
        label: 'Ambiente Silenzioso', 
        description: 'Perfetto per concentrazione e lavoro profondo',
        color: 'bg-blue-100 text-blue-800'
      },
      'controlled': { 
        label: 'Ambiente Controllato', 
        description: 'Conversazioni sussurrate permesse',
        color: 'bg-green-100 text-green-800'
      },
      'dynamic': { 
        label: 'Ambiente Dinamico', 
        description: 'Discussioni e chiamate benvenute',
        color: 'bg-orange-100 text-orange-800'
      }
    };
    return labels[env] || { label: env, description: '', color: 'bg-gray-100 text-gray-800' };
  };

  const environment = space.work_environment ? getEnvironmentLabel(space.work_environment) : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Descrizione */}
      <Card className="md:col-span-2 lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Informazioni sullo Spazio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 mb-4">{space.description}</p>
          
          {environment && (
            <div className="mb-4">
              <Badge className={environment.color}>
                {environment.label}
              </Badge>
              <p className="text-sm text-gray-600 mt-1">{environment.description}</p>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              <span>Fino a {space.max_capacity} persone</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Servizi */}
      <Card>
        <CardHeader>
          <CardTitle>Servizi Inclusi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {space.amenities?.slice(0, 6).map((amenity, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="text-green-600">
                  {getAmenityIcon(amenity)}
                </div>
                <span className="text-sm text-gray-700">{getAmenityTranslation(amenity)}</span>
              </div>
            ))}
            {space.amenities?.length > 6 && (
              <div className="text-sm text-gray-500 mt-2">
                +{space.amenities.length - 6} altri servizi
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Politiche */}
      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Politiche e Regole
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Check-in</h4>
              <p className="text-sm text-gray-600">Dalle 09:00 alle 18:00</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Check-out</h4>
              <p className="text-sm text-gray-600">Entro le 18:00</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Cancellazione</h4>
              <p className="text-sm text-gray-600">Gratuita fino a 24h prima</p>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t">
            <h4 className="font-semibold mb-2">Regole dello Spazio</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Rispettare gli orari concordati</li>
              <li>• Mantenere lo spazio pulito e ordinato</li>
              <li>• Non fumare all'interno</li>
              <li>• Utilizzare gli spazi comuni con rispetto</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
