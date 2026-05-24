import { OrgRole } from '../models/Membership';

/**
 * Permission definitions for the multi-tenant system.
 * Maps each permission to the roles that are allowed to perform it.
 */
export const PERMISSIONS = {
  // Project permissions
  'project:create':  ['owner', 'admin', 'editor'] as OrgRole[],
  'project:read':    ['owner', 'admin', 'editor', 'viewer'] as OrgRole[],
  'project:update':  ['owner', 'admin', 'editor'] as OrgRole[],
  'project:delete':  ['owner', 'admin'] as OrgRole[],
  'project:publish': ['owner', 'admin', 'editor'] as OrgRole[],

  // Asset permissions
  'asset:upload':    ['owner', 'admin', 'editor'] as OrgRole[],
  'asset:read':      ['owner', 'admin', 'editor', 'viewer'] as OrgRole[],
  'asset:delete':    ['owner', 'admin'] as OrgRole[],

  // Member management
  'member:invite':   ['owner', 'admin'] as OrgRole[],
  'member:remove':   ['owner', 'admin'] as OrgRole[],
  'member:role':     ['owner', 'admin'] as OrgRole[],
  'member:list':     ['owner', 'admin', 'editor', 'viewer'] as OrgRole[],

  // Organization settings
  'org:settings':    ['owner', 'admin'] as OrgRole[],
  'org:billing':     ['owner'] as OrgRole[],
  'org:delete':      ['owner'] as OrgRole[],

  // AI assistant
  'ai:chat':         ['owner', 'admin', 'editor'] as OrgRole[],

  // CMS permissions
  'cms:read':        ['owner', 'admin', 'editor', 'viewer'] as OrgRole[],
  'cms:create':      ['owner', 'admin', 'editor'] as OrgRole[],
  'cms:update':      ['owner', 'admin', 'editor'] as OrgRole[],
  'cms:delete':      ['owner', 'admin'] as OrgRole[],
  'cms:publish':     ['owner', 'admin', 'editor'] as OrgRole[],

  // Hosting / Sites permissions
  'site:read':       ['owner', 'admin', 'editor', 'viewer'] as OrgRole[],
  'site:create':     ['owner', 'admin', 'editor'] as OrgRole[],
  'site:update':     ['owner', 'admin'] as OrgRole[],
  'site:delete':     ['owner', 'admin'] as OrgRole[],
  'site:deploy':     ['owner', 'admin', 'editor'] as OrgRole[],
  'site:rollback':   ['owner', 'admin'] as OrgRole[],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: OrgRole, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  return (allowedRoles as readonly OrgRole[]).includes(role);
}

/**
 * Get all permissions for a given role.
 */
export function getPermissionsForRole(role: OrgRole): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter(
    (perm) => (PERMISSIONS[perm] as readonly OrgRole[]).includes(role)
  );
}