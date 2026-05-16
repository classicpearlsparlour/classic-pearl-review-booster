import QRCode from 'qrcode';
import { getPublicAppUrl } from '../config/publicUrls.js';

export async function createBusinessQrDataUrl(businessId) {
  const appUrl = getPublicAppUrl();
  const scanUrl = `${appUrl}/r/${businessId}`;
  return QRCode.toDataURL(scanUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 360
  });
}
