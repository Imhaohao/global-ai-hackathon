// Browser stand-in for expo-sms: hands the message to the device's texting app through an
// sms: link, which phone browsers open in the SMS composer.
export async function isAvailableAsync(): Promise<boolean> {
  return true;
}

export async function sendSMSAsync(addresses: string | string[], message: string): Promise<{ result: 'unknown' }> {
  const recipients = (Array.isArray(addresses) ? addresses : [addresses]).join(',');
  window.open(`sms:${recipients}?&body=${encodeURIComponent(message)}`, '_self');
  return { result: 'unknown' };
}
