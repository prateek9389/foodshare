export interface FoodListing {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageUrls?: string[];
  price: number | null;
  isDonation: boolean;
  expiryDate: Date;
  createdAt: Date;
  location: {
    address: string;
    city: string;
    state: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    }
  };
  userId: string;
  userName: string;
  userPhotoUrl?: string;
  userContact: string;
  category: string;
  quantity: string;
  isAvailable: boolean;
}

export interface FoodListingFormData {
  title: string;
  description: string;
  images: File[];
  price: number | null;
  isDonation: boolean;
  expiryDate: Date | string;
  category: string;
  quantity: string;
}
