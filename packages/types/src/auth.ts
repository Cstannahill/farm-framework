/**
 * Authentication and Authorization Types
 * These shared interfaces define the core auth models
 * used across the FARM framework. All modules should
 * reference these instead of duplicating structures.
 */

export interface Permission {
  /** Unique permission name */
  name: string;
  /** Optional human friendly description */
  description?: string;
}

export interface Role {
  /** Role identifier */
  name: string;
  /** Description of the role purpose */
  description?: string;
  /** Permissions associated with the role */
  permissions: string[];
}

export interface UserProfile {
  /** Optional first name */
  firstName?: string;
  /** Optional last name */
  lastName?: string;
  /** Avatar URL for UI display */
  avatarUrl?: string;
}

export interface User {
  /** Unique identifier */
  id: string;
  /** Email used for login */
  email: string;
  /** Optional username */
  username?: string;
  /** Assigned roles */
  roles: string[];
  /** Explicit permissions */
  permissions: string[];
  /** Profile details */
  profile?: UserProfile;
}

export interface TokenPayload {
  /** User ID */
  sub: string;
  /** Token issued at timestamp */
  iat: number;
  /** Expiry timestamp */
  exp: number;
  /** Token type - access or refresh */
  type: 'access' | 'refresh';
  /** Roles granted to the token */
  roles: string[];
  /** Permissions granted to the token */
  permissions: string[];
}

export interface Session {
  /** Access token string */
  accessToken: string;
  /** Refresh token string */
  refreshToken: string;
  /** Expiration epoch for the access token */
  expiresAt: number;
  /** Authenticated user information */
  user: User;
}

