import { createContext, useContext } from 'react';
import { can, type Permission, type Role } from './permissions';

export const PermissionsContext = createContext<readonly Role[]>([]);
export function usePermissions() {
  const roles = useContext(PermissionsContext);
  return { roles, can: (permission: Permission) => can(roles, permission) };
}
