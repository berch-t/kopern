/**
 * Shared icon registry for agent branding.
 * Used by BrandingEditor (picker) and AgentAvatar (display).
 */

import {
  // Core AI / Agent
  Bot,
  Brain,
  Sparkles,
  Wand2,
  Cpu,
  CircuitBoard,
  // Communication
  MessageSquare,
  MessageCircle,
  Mail,
  Phone,
  Megaphone,
  Send,
  // Search / Analysis
  Search,
  Eye,
  ScanSearch,
  Radar,
  Microscope,
  // Code / Dev
  Code,
  Terminal,
  FileCode,
  GitBranch,
  Bug,
  // Data / Database
  Database,
  HardDrive,
  BarChart3,
  PieChart,
  TrendingUp,
  // Security / Shield
  Shield,
  Lock,
  ShieldCheck,
  KeyRound,
  // Web / Network
  Globe,
  Wifi,
  Link,
  Cloud,
  // Business / Work
  Briefcase,
  Calculator,
  Receipt,
  FileText,
  ClipboardList,
  // Creative
  Palette,
  PenTool,
  Image,
  Music,
  Camera,
  // People / Social
  Users,
  UserCheck,
  HeartHandshake,
  GraduationCap,
  // Action / Speed
  Rocket,
  Zap,
  Target,
  Crosshair,
  Timer,
  // Industry / Vertical
  Building2,
  Stethoscope,
  Scale,
  UtensilsCrossed,
  Wrench,
  ShoppingCart,
  Landmark,
  Truck,
  Plane,
  Leaf,
  type LucideIcon,
} from "lucide-react";

export interface IconOption {
  name: string;
  Icon: LucideIcon;
  category: string;
}

export const ICON_OPTIONS: IconOption[] = [
  // Core AI / Agent
  { name: "Bot", Icon: Bot, category: "ai" },
  { name: "Brain", Icon: Brain, category: "ai" },
  { name: "Sparkles", Icon: Sparkles, category: "ai" },
  { name: "Wand2", Icon: Wand2, category: "ai" },
  { name: "Cpu", Icon: Cpu, category: "ai" },
  { name: "CircuitBoard", Icon: CircuitBoard, category: "ai" },
  // Communication
  { name: "MessageSquare", Icon: MessageSquare, category: "communication" },
  { name: "MessageCircle", Icon: MessageCircle, category: "communication" },
  { name: "Mail", Icon: Mail, category: "communication" },
  { name: "Phone", Icon: Phone, category: "communication" },
  { name: "Megaphone", Icon: Megaphone, category: "communication" },
  { name: "Send", Icon: Send, category: "communication" },
  // Search / Analysis
  { name: "Search", Icon: Search, category: "analysis" },
  { name: "Eye", Icon: Eye, category: "analysis" },
  { name: "ScanSearch", Icon: ScanSearch, category: "analysis" },
  { name: "Radar", Icon: Radar, category: "analysis" },
  { name: "Microscope", Icon: Microscope, category: "analysis" },
  // Code / Dev
  { name: "Code", Icon: Code, category: "dev" },
  { name: "Terminal", Icon: Terminal, category: "dev" },
  { name: "FileCode", Icon: FileCode, category: "dev" },
  { name: "GitBranch", Icon: GitBranch, category: "dev" },
  { name: "Bug", Icon: Bug, category: "dev" },
  // Data / Database
  { name: "Database", Icon: Database, category: "data" },
  { name: "HardDrive", Icon: HardDrive, category: "data" },
  { name: "BarChart3", Icon: BarChart3, category: "data" },
  { name: "PieChart", Icon: PieChart, category: "data" },
  { name: "TrendingUp", Icon: TrendingUp, category: "data" },
  // Security
  { name: "Shield", Icon: Shield, category: "security" },
  { name: "Lock", Icon: Lock, category: "security" },
  { name: "ShieldCheck", Icon: ShieldCheck, category: "security" },
  { name: "KeyRound", Icon: KeyRound, category: "security" },
  // Web / Network
  { name: "Globe", Icon: Globe, category: "web" },
  { name: "Wifi", Icon: Wifi, category: "web" },
  { name: "Link", Icon: Link, category: "web" },
  { name: "Cloud", Icon: Cloud, category: "web" },
  // Business
  { name: "Briefcase", Icon: Briefcase, category: "business" },
  { name: "Calculator", Icon: Calculator, category: "business" },
  { name: "Receipt", Icon: Receipt, category: "business" },
  { name: "FileText", Icon: FileText, category: "business" },
  { name: "ClipboardList", Icon: ClipboardList, category: "business" },
  // Creative
  { name: "Palette", Icon: Palette, category: "creative" },
  { name: "PenTool", Icon: PenTool, category: "creative" },
  { name: "Image", Icon: Image, category: "creative" },
  { name: "Music", Icon: Music, category: "creative" },
  { name: "Camera", Icon: Camera, category: "creative" },
  // People / Social
  { name: "Users", Icon: Users, category: "people" },
  { name: "UserCheck", Icon: UserCheck, category: "people" },
  { name: "HeartHandshake", Icon: HeartHandshake, category: "people" },
  { name: "GraduationCap", Icon: GraduationCap, category: "people" },
  // Action / Speed
  { name: "Rocket", Icon: Rocket, category: "action" },
  { name: "Zap", Icon: Zap, category: "action" },
  { name: "Target", Icon: Target, category: "action" },
  { name: "Crosshair", Icon: Crosshair, category: "action" },
  { name: "Timer", Icon: Timer, category: "action" },
  // Industry / Vertical
  { name: "Building2", Icon: Building2, category: "industry" },
  { name: "Stethoscope", Icon: Stethoscope, category: "industry" },
  { name: "Scale", Icon: Scale, category: "industry" },
  { name: "UtensilsCrossed", Icon: UtensilsCrossed, category: "industry" },
  { name: "Wrench", Icon: Wrench, category: "industry" },
  { name: "ShoppingCart", Icon: ShoppingCart, category: "industry" },
  { name: "Landmark", Icon: Landmark, category: "industry" },
  { name: "Truck", Icon: Truck, category: "industry" },
  { name: "Plane", Icon: Plane, category: "industry" },
  { name: "Leaf", Icon: Leaf, category: "industry" },
];

/** Map icon name → component for quick lookup */
export const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ICON_OPTIONS.map(({ name, Icon }) => [name, Icon])
);

/** Get icon component by name, fallback to Bot */
export function getIconComponent(name: string): LucideIcon {
  return ICON_MAP[name] ?? Bot;
}

/** Category labels for grouped display */
export const ICON_CATEGORIES: Record<string, string> = {
  ai: "AI / Agent",
  communication: "Communication",
  analysis: "Search / Analysis",
  dev: "Code / Dev",
  data: "Data",
  security: "Security",
  web: "Web / Network",
  business: "Business",
  creative: "Creative",
  people: "People",
  action: "Action",
  industry: "Industry",
};
