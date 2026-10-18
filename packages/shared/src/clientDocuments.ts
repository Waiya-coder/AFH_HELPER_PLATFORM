/** Max client document upload size (50 MB). Override via API env if needed. */
export const CLIENT_DOCUMENT_MAX_BYTES = 50 * 1024 * 1024;

export const CLIENT_DOCUMENT_MAX_MB = 50;

const EXTENSION_MIME_HINTS: Record<string, string[]> = {
  pdf: ['application/pdf'],
  ppt: ['application/vnd.ms-powerpoint', 'application/powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  txt: ['text/plain'],
  rtf: ['application/rtf', 'text/rtf'],
  csv: ['text/csv', 'application/csv'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  webp: ['image/webp'],
  odt: ['application/vnd.oasis.opendocument.text'],
  ods: ['application/vnd.oasis.opendocument.spreadsheet'],
  odp: ['application/vnd.oasis.opendocument.presentation'],
};

export const CLIENT_DOCUMENT_ALLOWED_EXTENSIONS = Object.keys(EXTENSION_MIME_HINTS);

export function clientDocumentExtension(fileName: string): string | null {
  const dot = fileName.lastIndexOf('.');
  if (dot < 1) {
    return null;
  }
  return fileName.slice(dot + 1).toLowerCase();
}

export function isAllowedClientDocument(
  fileName: string,
  mimeType: string,
  sizeBytes: number,
  maxBytes: number = CLIENT_DOCUMENT_MAX_BYTES,
): {
  ok: boolean;
  message?: string;
} {
  const maxMb = Math.round(maxBytes / (1024 * 1024));
  if (sizeBytes > maxBytes) {
    return {
      ok: false,
      message: `File is too large (max ${maxMb} MB)`,
    };
  }

  const ext = clientDocumentExtension(fileName);
  if (!ext || !EXTENSION_MIME_HINTS[ext]) {
    return {
      ok: false,
      message: `File type not allowed. Use: ${CLIENT_DOCUMENT_ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  const normalizedMime = mimeType.split(';')[0].trim().toLowerCase();
  if (!normalizedMime || normalizedMime === 'application/octet-stream') {
    return { ok: true };
  }

  const hints = EXTENSION_MIME_HINTS[ext];
  if (hints.includes(normalizedMime)) {
    return { ok: true };
  }

  // Some browsers mislabel Office files; trust extension if it is on the allowlist.
  return { ok: true };
}

export const CLIENT_DOCUMENT_ACCEPT = CLIENT_DOCUMENT_ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(
  ',',
);
