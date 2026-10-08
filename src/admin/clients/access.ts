/** roles_tariffs_limits contract (2026-10-08): staff_read_users allows moderator/accountant;
 * admin/owner use existing admin access. my_roles defines client as Пользователь without a partner.
 * Routes enforce these staff permissions; production installation still requires integration verification.
 */
export const CLIENTS_ACCESS: Readonly<{ administrativeReadConfirmed: boolean; clientScopeConfirmed: boolean }> = Object.freeze({
  administrativeReadConfirmed: true,
  clientScopeConfirmed: true,
});
export function clientsAccessConfigured(): boolean {
  return CLIENTS_ACCESS.administrativeReadConfirmed && CLIENTS_ACCESS.clientScopeConfirmed;
}
