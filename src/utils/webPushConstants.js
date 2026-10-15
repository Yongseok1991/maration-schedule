// Web Push VAPID Public Key and Helpers

export const VAPID_PUBLIC_KEY =
  "BIQ5OZIg57Mx1C_OiXqVm0PwRS_xTTiJHPPHJrnsP0RzzvdBecxjE87XbgyDup3K6oCwuj0mPs5lnq_LFRzOiKI";

export function urlB64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
