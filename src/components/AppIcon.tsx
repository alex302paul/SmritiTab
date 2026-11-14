import {
  Bookmark,
  Calculator,
  CheckSquare,
  Clipboard,
  CloudSun,
  ExternalLink,
  FileText,
  History,
  Settings,
  Star,
  User,
} from "lucide-react";
import type { InternalAppId } from "../types/smrititab";

interface AppIconProps {
  appId: InternalAppId | "external";
  className?: string;
}

export function AppIcon({ appId, className = "h-5 w-5" }: AppIconProps) {
  switch (appId) {
    case "notes":
      return <FileText className={className} />;
    case "todo":
      return <CheckSquare className={className} />;
    case "calculator":
      return <Calculator className={className} />;
    case "bookmarks":
      return <Bookmark className={className} />;
    case "history":
      return <History className={className} />;
    case "clipboard":
      return <Clipboard className={className} />;
    case "favorites":
      return <Star className={className} />;
    case "weather":
      return <CloudSun className={className} />;
    case "settings":
      return <Settings className={className} />;
    case "profile":
      return <User className={className} />;
    default:
      return <ExternalLink className={className} />;
  }
}
