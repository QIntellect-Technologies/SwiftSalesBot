
import { Medicine, Order, Supplier, Alert, Category, UserSettings, UserSession } from './types';

export const MOCK_MEDICINES: Medicine[] = [
  { id: '1', name: 'Amoxicillin 500mg', price: 12.50, costPrice: 8.20, packageSize: '30 Caps', stock: 450, reorderLevel: 100, manufacturer: 'GSK Pharma', expiryDate: '2025-12-01', batchNumber: 'BCH-8821', category: 'Antibiotics', categoryId: 'cat-2', status: 'In Stock', lastUpdated: '2023-10-15', imageUrl: 'https://picsum.photos/seed/med1/200/200', salesVolume: 1200 },
  { id: '2', name: 'Paracetamol 500mg', price: 5.25, costPrice: 2.10, packageSize: '100 Tabs', stock: 1200, reorderLevel: 300, manufacturer: 'Pfizer', expiryDate: '2026-05-20', batchNumber: 'BCH-9912', category: 'Analgesics', categoryId: 'cat-3', status: 'In Stock', lastUpdated: '2023-10-18', imageUrl: 'https://picsum.photos/seed/med2/200/200', salesVolume: 3500 },
  { id: '3', name: 'Lisinopril 10mg', price: 18.00, costPrice: 12.00, packageSize: '28 Tabs', stock: 45, reorderLevel: 50, manufacturer: 'Novartis', expiryDate: '2024-02-15', batchNumber: 'BCH-1102', category: 'Hypertension', categoryId: 'cat-4', status: 'Low Stock', lastUpdated: '2023-10-20', imageUrl: 'https://picsum.photos/seed/med3/200/200', salesVolume: 800 },
  { id: '4', name: 'Atorvastatin 20mg', price: 24.50, costPrice: 15.00, packageSize: '30 Tabs', stock: 0, reorderLevel: 20, manufacturer: 'Sanofi', expiryDate: '2025-08-10', batchNumber: 'BCH-3345', category: 'Cholesterol', categoryId: 'cat-5', status: 'Out of Stock', lastUpdated: '2023-10-22', imageUrl: 'https://picsum.photos/seed/med4/200/200', salesVolume: 600 },
  { id: '5', name: 'Vitamin C 1000mg', price: 15.00, costPrice: 7.50, packageSize: '60 Tabs', stock: 25, reorderLevel: 50, manufacturer: 'Nature Made', expiryDate: '2024-03-05', batchNumber: 'BCH-7788', category: 'Vitamins', categoryId: 'cat-6', status: 'Low Stock', lastUpdated: '2023-10-23', imageUrl: 'https://picsum.photos/seed/med5/200/200', salesVolume: 1500 }
];

export const MOCK_USER_SETTINGS: UserSettings = {
  profile: {
    fullName: 'Commander Thompson',
    email: 'thompson.admin@swiftsales.pharma',
    phone: '+1 (555) 012-3456',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
    bio: 'Lead Operations Administrator at Swift Sales Panel. Focused on optimizing pharmaceutical distribution networks through high-fidelity data analysis.',
    department: 'Operations',
    jobTitle: 'Senior distribution Lead',
    employeeId: 'EMP-2024-001',
    role: 'Super Admin',
    status: 'Active'
  },
  security: {
    twoFactorEnabled: true,
    lastPasswordChange: '2024-01-15',
    sessionTimeout: '1 hour'
  },
  notifications: {
    email: true,
    orders: 'Instant',
    inventory: 'Daily',
    system: true
  },
  appearance: {
    theme: 'Auto',
    accentColor: '#3B82F6',
    layout: 'Comfortable',
    language: 'English',
    dateFormat: 'MM/DD/YYYY'
  }
};

export const MOCK_SESSIONS: UserSession[] = [
  { id: '1', device: 'Chrome on macOS Sonoma', location: 'San Francisco, USA', ip: '192.168.1.1', loginTime: '2024-02-15 10:30 AM', status: 'Current' },
  { id: '2', device: 'SwiftSales Mobile (iOS)', location: 'New York, USA', ip: '172.16.254.1', loginTime: '2024-02-14 08:15 PM', status: 'Active' },
  { id: '3', device: 'Safari on iPad Air', location: 'London, UK', ip: '10.0.0.15', loginTime: '2024-02-12 11:00 AM', status: 'Active' }
];

export const MOCK_CATEGORIES: Category[] = [
  { 
    id: 'cat-1', name: 'Pharmaceuticals', slug: 'pharmaceuticals', description: 'Core medicinal products and drug formulations.', 
    parentId: null, level: 1, sortOrder: 1, type: 'Medicine Type', status: 'Active', color: '#3B82F6', 
    productCount: 0, recursiveProductCount: 450, revenue: 125000, margin: 32, lastUpdated: '2024-02-10', tags: ['Core', 'High Volume'], attributes: {} 
  },
  { 
    id: 'cat-2', name: 'Antibiotics', slug: 'antibiotics', description: 'Medications that inhibit the growth of or destroy microorganisms.', 
    parentId: 'cat-1', level: 2, sortOrder: 1, type: 'Therapeutic', status: 'Active', color: '#6366F1', 
    productCount: 156, recursiveProductCount: 156, revenue: 45000, margin: 28, lastUpdated: '2024-02-12', tags: ['Prescription Only'], attributes: { regulatory: 'Schedule H' } 
  },
  { 
    id: 'cat-3', name: 'Analgesics', slug: 'analgesics', description: 'Pain relief medications including NSAIDs and Opioids.', 
    parentId: 'cat-1', level: 2, sortOrder: 2, type: 'Therapeutic', status: 'Active', color: '#10B981', 
    productCount: 89, recursiveProductCount: 89, revenue: 22000, margin: 35, lastUpdated: '2024-02-14', tags: ['Fast Moving'], attributes: {} 
  },
  { 
    id: 'cat-4', name: 'Cardiovascular', slug: 'cardiovascular', description: 'Drugs used to treat conditions of the heart or the circulatory system.', 
    parentId: 'cat-1', level: 2, sortOrder: 3, type: 'Therapeutic', status: 'Active', color: '#F43F5E', 
    productCount: 64, recursiveProductCount: 64, revenue: 38000, margin: 42, lastUpdated: '2024-02-15', tags: ['Critical Care'], attributes: {} 
  },
  { 
    id: 'cat-5', name: 'Wellness & OTC', slug: 'wellness-otc', description: 'Over-the-counter health supplements and wellness products.', 
    parentId: null, level: 1, sortOrder: 2, type: 'Medicine Type', status: 'Active', color: '#F59E0B', 
    productCount: 120, recursiveProductCount: 240, revenue: 56000, margin: 48, lastUpdated: '2024-02-15', tags: ['Consumer Goods', 'High Margin'], attributes: {} 
  }
];

export const MOCK_ORDERS: Order[] = [
  { id: 'ORD-1001', customerName: 'Apex Pharmacy', customerType: 'Retail', date: '2024-02-15T10:30:00', amount: 1250.00, status: 'Completed', paymentStatus: 'Paid', paymentMethod: 'Card', items: 12 },
  { id: 'ORD-1002', customerName: 'City Health Center', customerType: 'Hospital', date: '2024-02-15T11:45:00', amount: 450.75, status: 'Processing', paymentStatus: 'Pending', paymentMethod: 'UPI', items: 5 },
  { id: 'ORD-1003', customerName: 'Global Meds', customerType: 'Wholesale', date: '2024-02-14T14:20:00', amount: 3200.00, status: 'Pending', paymentStatus: 'Pending', paymentMethod: 'Credit', items: 45 },
  { id: 'ORD-1004', customerName: 'Dr. Smith Clinic', customerType: 'Clinic', date: '2024-02-14T16:10:00', amount: 120.00, status: 'Cancelled', paymentStatus: 'Failed', paymentMethod: 'Cash', items: 2 },
  { id: 'ORD-1005', customerName: 'Sunshine Apothecary', customerType: 'Retail', date: '2024-02-13T09:00:00', amount: 2100.00, status: 'Completed', paymentStatus: 'Paid', paymentMethod: 'Card', items: 18 }
];

export const MOCK_SUPPLIERS: Supplier[] = [
  { 
    id: 'SUP-01', 
    name: 'PharmaLink Dist', 
    logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=PL',
    description: 'Premier national distributor of antibiotics and critical care medicines.',
    medicinesSupplied: 156, 
    purchaseValue: 45000, 
    avgDeliveryTime: 2.5, 
    onTimeRate: 98, 
    rating: 4.8, 
    reviewCount: 24,
    lastOrderDate: '2024-02-10',
    status: 'Active',
    location: { city: 'New Jersey', state: 'NJ', country: 'USA' },
    contactPerson: 'James Wilson',
    email: 'j.wilson@pharmalink.com',
    phone: '+1 555-0102',
    paymentTerms: '30 Days Credit',
    contractStatus: 'Active',
    contractEndDate: '2025-06-30',
    tags: ['Trusted', 'Bulk Discounts'],
    preferred: true,
    categories: ['Antibiotics', 'Critical Care'],
    performance: { quality: 95, delivery: 98, pricing: 85, communication: 90, fulfillment: 96 }
  },
  { 
    id: 'SUP-02', 
    name: 'Global Health Co', 
    logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=GH',
    description: 'Leading manufacturer of generics and over-the-counter pharmaceuticals.',
    medicinesSupplied: 89, 
    purchaseValue: 28000, 
    avgDeliveryTime: 4.2, 
    onTimeRate: 85, 
    rating: 4.2, 
    reviewCount: 15,
    lastOrderDate: '2024-02-12',
    status: 'Active',
    location: { city: 'Mumbai', state: 'MH', country: 'India' },
    contactPerson: 'Anita Rao',
    email: 'contact@globalhealth.in',
    phone: '+91 22 5555 0199',
    paymentTerms: 'Advance Payment',
    contractStatus: 'Expiring',
    contractEndDate: '2024-03-15',
    tags: ['Generic King', 'Low MOQ'],
    preferred: false,
    categories: ['OTC', 'Generics'],
    performance: { quality: 88, delivery: 82, pricing: 95, communication: 75, fulfillment: 80 }
  },
  { 
    id: 'SUP-03', 
    name: 'BioMed Supply', 
    logoUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=BM',
    description: 'Specialized biotech products and vaccine logistical support.',
    medicinesSupplied: 45, 
    purchaseValue: 12000, 
    avgDeliveryTime: 3.0, 
    onTimeRate: 92, 
    rating: 3.9, 
    reviewCount: 8,
    lastOrderDate: '2024-02-14',
    status: 'On Hold',
    location: { city: 'Berlin', state: 'BE', country: 'Germany' },
    contactPerson: 'Klaus Schmidt',
    email: 'schmidt@biomed.de',
    phone: '+49 30 555 0101',
    paymentTerms: '15 Days Credit',
    contractStatus: 'None',
    tags: ['Cold Chain', 'Biotech'],
    preferred: false,
    categories: ['Vaccines', 'Biotech'],
    performance: { quality: 92, delivery: 90, pricing: 60, communication: 85, fulfillment: 88 }
  }
];

export const MOCK_ALERTS: Alert[] = [
  { id: 'ALT-01', type: 'danger', title: 'Out of Stock', description: 'Atorvastatin 20mg is completely out of stock in Warehouse A.', timestamp: '10 mins ago', read: false },
  { id: 'ALT-02', type: 'warning', title: 'Low Stock Alert', description: 'Lisinopril 10mg is below reorder level (45/50).', timestamp: '1 hour ago', read: false },
  { id: 'ALT-03', type: 'info', title: 'New Order Received', description: 'Order #ORD-1005 was successfully placed by Sunshine Apothecary.', timestamp: '3 hours ago', read: true }
];

export const REVENUE_DATA = [
  { name: '01 Feb', revenue: 4500, orders: 12, cost: 3200 },
  { name: '03 Feb', revenue: 5200, orders: 15, cost: 3500 },
  { name: '05 Feb', revenue: 3800, orders: 10, cost: 2800 },
  { name: '07 Feb', revenue: 6100, orders: 18, cost: 4100 },
  { name: '09 Feb', revenue: 4900, orders: 14, cost: 3300 },
  { name: '11 Feb', revenue: 7200, orders: 22, cost: 4800 },
  { name: '13 Feb', revenue: 5800, orders: 16, cost: 3900 },
  { name: '15 Feb', revenue: 8400, orders: 25, cost: 5600 }
];

export const CATEGORY_SALES = [
  { name: 'Antibiotics', value: 35, color: '#3B82F6' },
  { name: 'Analgesics', value: 25, color: '#10B981' },
  { name: 'Hypertension', value: 15, color: '#F59E0B' },
  { name: 'Vitamins', value: 20, color: '#8B5CF6' },
  { name: 'Others', value: 5, color: '#64748B' }
];

export const MONTHLY_COMPARISON = [
  { day: '01', thisMonth: 400, lastMonth: 320 },
  { day: '05', thisMonth: 550, lastMonth: 410 },
  { day: '10', thisMonth: 420, lastMonth: 480 },
  { day: '15', thisMonth: 840, lastMonth: 600 }
];
