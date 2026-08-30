export enum DocumentRole {
  VIEWER = "VIEWER",
  EDITOR = "EDITOR",
  ADMIN = "ADMIN",
  OWNER = "OWNER",
}

// Role hierarchy rank for comparison
const ROLE_RANK: Record<DocumentRole, number> = {
  [DocumentRole.VIEWER]: 1,
  [DocumentRole.EDITOR]: 2,
  [DocumentRole.ADMIN]: 3,
  [DocumentRole.OWNER]: 4,
};

export function hasPermission(
  userRole: DocumentRole,
  requiredRole: DocumentRole,
): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[requiredRole];
}
