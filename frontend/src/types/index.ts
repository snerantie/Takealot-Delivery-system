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

export interface Trip {
  id: string;
  tripNumber: string;
  status: TripStatus;
  pickupAddress: string;
  deliveryAddress: string;
  customerName?: string;
  scheduledPickup?: string;
  scheduledDelivery?: string;
  actualPickup?: string;
  actualDelivery?: string;
  distanceKm?: number;
  deliveryFee?: number;
  codAmount?: number;
  driver?: Driver;
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
}
