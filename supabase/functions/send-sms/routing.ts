// Original number allocations, NOT an MNP/current-operator lookup.
// Sources checked 2026-10-04:
// https://b2b.kcell.kz/ru/how-to-switch/
// https://tele2.kz/eshop/sim-web/ru/numbers
// https://altel.kz/eshop/sim-web/ru/numbers
// https://beeline.kz/ru/about/history-of-beeline-kazakhstan?locale=ru
// Sender names verified against this account's Kazinfoteh getSenders response.
export function smsRoute(phone: string): { sender: string } | { error: string } {
  const prefix = phone.slice(1, 4);
  if (["701", "702", "775", "778"].includes(prefix)) return { sender: "KiT_Notify" };
  if (["700", "707", "708", "747"].includes(prefix)) return { sender: "InfoSMS" };
  if (["705", "706", "771", "776", "777"].includes(prefix)) {
    return { error: "APEX_SMS_BEELINE_DISABLED" };
  }
  return { error: "APEX_SMS_PREFIX_UNSUPPORTED" };
}
