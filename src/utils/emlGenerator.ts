export interface EMLPayload {
  subject: string;
  from: string;
  to: string;
  htmlBody: string;
  plainBody: string;
}

function encodeBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function chunkBase64(base64: string, chunkSize: number = 76): string {
  const chunks: string[] = [];
  for (let i = 0; i < base64.length; i += chunkSize) {
    chunks.push(base64.slice(i, i + chunkSize));
  }
  return chunks.join('\r\n');
}

function encodeHeaderValue(value: string): string {
  if (/^[\x00-\x7F]*$/.test(value)) {
    return value;
  }
  const encoded = encodeBase64(value);
  const chunks: string[] = [];
  for (let i = 0; i < encoded.length; i += 36) {
    chunks.push('=?UTF-8?B?' + encoded.slice(i, i + 36) + '?=');
  }
  return chunks.join(' ');
}

function formatRFC2822Date(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${days[date.getDay()]}, ${pad(date.getDate())} ${months[date.getMonth()]} ${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} +0000`;
}

export function generateEML(payload: EMLPayload): string {
  const boundary = `----=_Part_Boundary_${Date.now()}`;
  const date = formatRFC2822Date(new Date());
  const htmlEncoded = chunkBase64(encodeBase64(payload.htmlBody));
  const plainEncoded = chunkBase64(encodeBase64(payload.plainBody));

  return [
    `MIME-Version: 1.0`,
    `Subject: ${encodeHeaderValue(payload.subject)}`,
    `From: ${encodeHeaderValue(payload.from)}`,
    `To: ${encodeHeaderValue(payload.to)}`,
    `Date: ${date}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    plainEncoded,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: base64`,
    ``,
    htmlEncoded,
    ``,
    `--${boundary}--`,
  ].join('\r\n');
}

export function downloadEML(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'message/rfc822' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.eml') ? filename : `${filename}.eml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
