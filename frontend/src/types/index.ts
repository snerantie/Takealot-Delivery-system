export enum UserRole {
  driver = 'driver',
  admin = 'admin',
  super_admin = 'super_admin',
}

export enum TripStatus {
  pending = 'pending',
  assigned = 'assigned',
  in_progress = 'in_progress',
  completed = 'completed',
  cancelled = 'cancelled',
}

export enum VehicleType {
  car = 'car',
  bike = 'bike',
  van = 'van',
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
}

export interface Driver {
  id: string;
  userId: string;
  driverCode: string;
  vehicleType: VehicleType;
  status: string;
  rating: number;
  totalDeliveries: number;
  user?: User;
}

export interface TripItem {
  id?: string;
  itemDescription: string;
  itemQuantity: number;
  itemValue?: number;
  trackingNumber?: string;
}

export interface TripStatusHistory {
  id: string;
  status: string;
  notes?: string;
  createdAt: string;
}

export interface Trip {
  id: string;
  tripNumber: string;
  status: TripStatus;
  pickupAddress: string;
  pickupContactName?: string;
  pickupContactPhone?: string;
  deliveryAddress: string;
  customerName?: string;
  customerPhone?: string;
  scheduledPickup?: string;
  scheduledDelivery?: string;
  actualPickup?: string;
  actualDelivery?: string;
  distanceKm?: number;
  deliveryFee?: number;
  paymentMethod?: 'prepaid' | 'cod';
  codAmount?: number;
  priority?: number;
  specialInstructions?: string;
  notes?: string;
  driverId?: string;
  driver?: Driver;
  items?: TripItem[];
  statusHistory?: TripStatusHistory[];
  codCollection?: {
    id: string;
    amountCollected: string | number;
    depositStatus: string;
    verificationStatus: string;
    atmReference?: string;
  } | null;
  _count?: { items: number };
  createdAt?: string;
}

export interface TripStats {
  pending: number;
  assigned: number;
  inProgress: number;
  completed: number;
  cancelled: number;
  total: number;
  active: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Earning {
  id: string;
  date: string;
  baseFee: number;
  distanceFee: number;
  codHandlingFee: number;
  totalEarned: number;
  trip?: Trip;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  role: UserRole;
  vehicleType?: VehicleType;
}
