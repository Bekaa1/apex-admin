/** No evidence of complete administrative profile access or a client-selection rule.
 * Local 20261006000000_secure_signup_profile.sql only allows auth.uid() = id.
 * Enable only with a reviewed backend contract and matching adapter, never env/URL/storage.
 */
export const CLIENTS_ACCESS: Readonly<{ administrativeReadConfirmed: boolean; clientScopeConfirmed: boolean }> = Object.freeze({
  administrativeReadConfirmed: false,
  clientScopeConfirmed: false,
});
export function clientsAccessConfigured(): boolean {
  return CLIENTS_ACCESS.administrativeReadConfirmed && CLIENTS_ACCESS.clientScopeConfirmed;
}
