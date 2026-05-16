import QRCode from 'qrcode';

export async function createBusinessQrDataUrl(businessId) {
  const appUrl = process.env.PUBLIC_APP_URL || 'http://localhost:5173';
  const scanUrl = `${appUrl}/r/${businessId}`;
  return QRCode.toDataURL(scanUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 360
  });
}
