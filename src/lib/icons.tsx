import {
  Building2,
  Code2,
  Compass,
  GraduationCap,
  Image as ImageIcon,
  Layers,
  LayoutTemplate,
  MessageSquare,
  Palette,
  Rocket,
  Terminal,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Content in `lib/content.ts` names its icon as a plain string so the content
 * layer stays free of JSX and stays serialisable. This is the single place that
 * maps those names onto components.
 */
export const iconMap: Record<string, LucideIcon> = {
  layout: LayoutTemplate,
  layers: Layers,
  code: Code2,
  image: ImageIcon,
  palette: Palette,
  message: MessageSquare,
  compass: Compass,
  users: Users,
  rocket: Rocket,
  building: Building2,
  graduation: GraduationCap,
  terminal: Terminal,
};

export function getIcon(name: string): LucideIcon {
  return iconMap[name] ?? LayoutTemplate;
}
