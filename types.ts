
export interface Medicine {
  id: string;
  name: string;
  price: number;
  costPrice: number; // Mapped from cost_price
  packageSize: string; // Mapped from package_size
  stock: number;
  reorderLevel: number; // Mapped from reorder_level
  manufacturer: string;
  expiryDate: string; // Mapped from expiry_date
  batchNumber: string; // Mapped from batch_number
  category: string; // Legacy frontend field
  category_name?: string; // DB field
  categoryId?: string; // category_id in DB
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  lastUpdated: string; // last_updated in DB? No, created_at/updated_at. Handled in frontend logic.
  imageUrl?: string; // image_url
  salesVolume?: number; // sales_volume
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  level: number;
  sortOrder: number;
  type: 'Medicine Type' | 'Therapeutic' | 'Storage' | 'Regulatory';
  status: 'Active' | 'Inactive' | 'Draft';
  iconUrl?: string;
  color: string;
  productCount: number;
  recursiveProductCount: number;
  revenue: number;
  margin: number;
  lastUpdated: string;
  tags: string[];
  attributes: Record<string, any>;
}

export interface CategoryPerformance {
  id: string;
  name: string;
  revenue: number;
  growth: number;
  margin: number;
  stockTurnover: number;
}

export interface UserSettings {
  profile: {
    fullName: string;
    email: string;
    phone: string;
    avatarUrl: string;
    bio: string;
    department: string;
    jobTitle: string;
    employeeId: string;
    role: 'Administrator' | 'Super Admin' | 'Manager';
    status: 'Active' | 'Inactive';
  };
  security: {
    twoFactorEnabled: boolean;
    lastPasswordChange: string;
    sessionTimeout: string;
  };
  notifications: {
    email: boolean;
    orders: 'Instant' | 'Hourly' | 'Daily' | 'Off';
    inventory: 'Instant' | 'Daily' | 'Off';
    system: boolean;
  };
  appearance: {
    theme: 'Light' | 'Dark' | 'Auto';
    accentColor: string;
    layout: 'Comfortable' | 'Compact';
    language: string;
    dateFormat: string;
  };
}

export interface UserSession {
  id: string;
  device: string;
  location: string;
  ip: string;
  loginTime: string;
  status: 'Current' | 'Active';
}

export interface Order {
  id: string;
  customerName: string;
  customerType: 'Retail' | 'Wholesale' | 'Hospital' | 'Clinic';
  date: string;
  amount: number;
  status: 'Completed' | 'Pending' | 'Cancelled' | 'Processing';
  paymentStatus: 'Paid' | 'Pending' | 'Failed';
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Credit';
  items: number;
}

export interface SupplierPerformance {
  quality: number; // 0-100
  delivery: number; // 0-100
  pricing: number; // 0-100
  communication: number; // 0-100
  fulfillment: number; // 0-100
}

export interface SupplierContact {
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface Supplier {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  medicinesSupplied: number;
  purchaseValue: number;
  avgDeliveryTime: number; // in days
  onTimeRate: number;
  rating: number;
  reviewCount: number;
  lastOrderDate: string;
  status: 'Active' | 'Pending' | 'On Hold' | 'Suspended' | 'Blacklisted';
  location: {
    city: string;
    state: string;
    country: string;
  };
  contactPerson: string;
  email: string;
  phone: string;
  paymentTerms: string;
  contractStatus: 'Active' | 'Expiring' | 'Expired' | 'None';
  contractEndDate?: string;
  tags: string[];
  performance: SupplierPerformance;
  preferred: boolean;
  categories: string[];
}

export interface Alert {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

export enum DashboardView {
  OVERVIEW = 'Dashboard',
  INVENTORY = 'Medicines Inventory',
  UPLOAD = 'Upload Data',
  ORDERS = 'Orders Management',
  ANALYTICS = 'Analytics Reports',
  SUPPLIERS = 'Suppliers Directory',
  CATEGORIES = 'Categories Management',
  SETTINGS = 'User Settings',
  LOGS = 'System Logs'
}
