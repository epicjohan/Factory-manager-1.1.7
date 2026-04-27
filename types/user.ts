
import { Permission, AppModule, AssetTab } from './common';

export interface UserRoleDefinition {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem?: boolean; 
  color?: string; 
  created?: string;
  updated?: string;
}

export interface User {
  id: string;
  name: string;
  pinCode: string;
  role: string; 
  permissions: Permission[];
  restrictedAccess: boolean;
  allowedAssetIds?: string[];
  allowedModules?: AppModule[];
  allowedTabs?: AssetTab[];
  defaultPath?: string;
  theme?: 'light' | 'dark';
  preferredDarkStyle?: 'OLED' | 'CLASSIC' | 'MIDNIGHT';
  preferredLightStyle?: 'SOFT' | 'COOL' | 'STANDARD';
  favoriteModules?: string[];  // Array van nav-item paths, bijv. ['/machines', '/articles']
  email?: string;              // Persoonlijk e-mailadres voor notificaties
  notificationSubscriptions?: string[];  // Ingeschreven notificatie-feeds (NotificationTrigger values)
}
