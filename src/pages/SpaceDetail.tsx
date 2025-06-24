
import React from 'react';
import { useParams } from 'react-router-dom';
import { SpaceDetailContent } from '@/components/spaces/SpaceDetailContent';

const SpaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  // For now, we'll provide empty props to prevent build errors
  // This should be replaced with actual data fetching
  const mockSpace = {
    id: id || '',
    title: '',
    description: '',
    address: '',
    price_per_day: 0,
    photos: [],
    category: 'home' as const,
    work_environment: 'silent' as const,
    host_id: '',
    max_capacity: 1,
    amenities: [],
    published: false,
    created_at: '',
    updated_at: ''
  };

  const mockReviews: any[] = [];

  return (
    <div className="container mx-auto py-8">
      <SpaceDetailContent space={mockSpace} reviews={mockReviews} />
    </div>
  );
};

export default SpaceDetail;
