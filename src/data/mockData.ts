export interface Pandit {
  id: string;
  name: string;
  specialization: string;
  location: string;
  rating: number;
  reviews: number;
  verified: boolean;
  image: string;
  languages: string[];
  priceRange: string;
}

export interface Temple {
  id: string;
  name: string;
  location: string;
  deity: string;
  events: string[];
  verified: boolean;
  image: string;
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: "pending" | "accepted" | "declined" | "sent";
  invitedVia: "whatsapp" | "email" | "sms";
}

export interface ChecklistItem {
  id: string;
  name: string;
  category: string;
  completed: boolean;
  quantity?: string;
}

export const mockPandits: Pandit[] = [
  { id: "1", name: "Pt. Ramesh Shastri", specialization: "Griha Pravesh, Vastu", location: "Mumbai, Maharashtra", rating: 4.9, reviews: 234, verified: true, image: "", languages: ["Hindi", "Sanskrit", "Marathi"], priceRange: "₹5,000 - ₹15,000" },
  { id: "2", name: "Pt. Suresh Dikshit", specialization: "Wedding Ceremonies, Havan", location: "Delhi NCR", rating: 4.8, reviews: 189, verified: true, image: "", languages: ["Hindi", "Sanskrit"], priceRange: "₹8,000 - ₹25,000" },
  { id: "3", name: "Pt. Venkatesh Iyer", specialization: "Vastu Shanti, Navagraha Puja", location: "Bangalore, Karnataka", rating: 4.7, reviews: 156, verified: true, image: "", languages: ["Kannada", "Sanskrit", "Hindi"], priceRange: "₹4,000 - ₹12,000" },
  { id: "4", name: "Pt. Arun Trivedi", specialization: "Mundan, Annaprashan", location: "Ahmedabad, Gujarat", rating: 4.9, reviews: 312, verified: true, image: "", languages: ["Gujarati", "Hindi", "Sanskrit"], priceRange: "₹3,000 - ₹10,000" },
  { id: "5", name: "Pt. Deepak Joshi", specialization: "Rudrabhishek, Mahamrityunjaya", location: "Pune, Maharashtra", rating: 4.6, reviews: 98, verified: false, image: "", languages: ["Hindi", "Marathi", "Sanskrit"], priceRange: "₹6,000 - ₹18,000" },
  { id: "6", name: "Pt. Harish Upadhyay", specialization: "Katha, Sunderkand Path", location: "Jaipur, Rajasthan", rating: 4.8, reviews: 201, verified: true, image: "", languages: ["Hindi", "Sanskrit", "Rajasthani"], priceRange: "₹5,000 - ₹20,000" },
];

export const mockTemples: Temple[] = [
  { id: "1", name: "Siddhivinayak Temple", location: "Mumbai, Maharashtra", deity: "Lord Ganesha", events: ["Ganesh Chaturthi", "Sankashti"], verified: true, image: "" },
  { id: "2", name: "ISKCON Temple", location: "Delhi NCR", deity: "Lord Krishna", events: ["Janmashtami", "Sunday Feast"], verified: true, image: "" },
  { id: "3", name: "Birla Mandir", location: "Jaipur, Rajasthan", deity: "Lord Vishnu", events: ["Ekadashi", "Ram Navami"], verified: true, image: "" },
];

export const mockGuests: Guest[] = [];

export const mockChecklist: ChecklistItem[] = [];

export const pricingTiers = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    features: [
      { name: "Search Pandits & Temples", included: true },
      { name: "1 Search per session", included: true },
      { name: "View basic profiles", included: true },
      { name: "Contact details", included: false },
      { name: "Guest Management", included: false },
      { name: "Invite via WhatsApp", included: false },
      { name: "AI Event Planning", included: false },
      { name: "Priority Support", included: false },
    ],
    highlighted: false,
  },
  {
    name: "Silver",
    price: "₹299",
    period: "/month",
    features: [
      { name: "Unlimited Searches", included: true },
      { name: "Contact details & WhatsApp", included: true },
      { name: "Invite via WhatsApp", included: true },
      { name: "Up to 2 Events", included: true },
      { name: "Guest Management", included: false },
      { name: "Samagri Checklist", included: false },
      { name: "AI Event Planning", included: false },
      { name: "Priority Support", included: false },
    ],
    highlighted: false,
  },
  {
    name: "Gold",
    price: "₹799",
    period: "/month",
    features: [
      { name: "Unlimited Searches", included: true },
      { name: "Contact details & WhatsApp", included: true },
      { name: "Invite via WhatsApp", included: true },
      { name: "Unlimited Events", included: true },
      { name: "Guest Management", included: true },
      { name: "Samagri Checklist", included: true },
      { name: "AI Event Planning", included: true },
      { name: "Priority Support", included: false },
    ],
    highlighted: true,
  },
  {
    name: "Platinum",
    price: "₹1,999",
    period: "/month",
    features: [
      { name: "Everything in Gold", included: true },
      { name: "Dedicated Coordinator", included: true },
      { name: "Vendor Negotiations", included: true },
      { name: "Live Event Support", included: true },
      { name: "Custom Invitations", included: true },
      { name: "Video Consultation", included: true },
      { name: "Multi-city Coordination", included: true },
      { name: "Priority Support", included: true },
    ],
    highlighted: false,
  },
];

export const discoveryLogs = [
  { id: "1", type: "pandit", name: "Pt. Krishna Das", source: "Serper", location: "Lucknow, UP", timestamp: "2 min ago" },
  { id: "2", type: "event", name: "Maha Shivratri Special Puja", source: "Firecrawl", location: "ISKCON Delhi", timestamp: "5 min ago" },
  { id: "3", type: "pandit", name: "Pt. Mohan Lal", source: "Gemini", location: "Varanasi, UP", timestamp: "12 min ago" },
  { id: "4", type: "event", name: "Ganesh Chaturthi", source: "Serper", location: "Siddhivinayak Mumbai", timestamp: "18 min ago" },
  { id: "5", type: "pandit", name: "Pt. Gopal Sharma", source: "Firecrawl", location: "Chennai, TN", timestamp: "25 min ago" },
];
