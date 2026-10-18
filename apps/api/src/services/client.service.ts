import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { buildClientDocumentKey, getObjectStorage } from '../lib/objectStorage';
import type { AuthUser } from '@afh/shared';
import {
  CLIENT_DOCUMENT_MAX_BYTES,
  clientDocumentExtension,
  isAllowedClientDocument,
} from '@afh/shared';
import { auditContext, createAuditLog } from '../repositories/audit.repository';
import { findStaffById } from '../repositories/staff.repository';
import {
  createClient,
  createClientDocument,
  findClientById,
  findClientDocument,
  findClientsByFacility,
  staffAssignedToClient,
  updateClient,
} from '../repositories/client.repository';
import { isEmployerRole } from '../lib/roles';

export class ClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClientError';
  }
}

function defaultMimeForExtension(ext: string): string {
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    txt: 'text/plain',
    rtf: 'application/rtf',
    csv: 'text/csv',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    odt: 'application/vnd.oasis.opendocument.text',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    odp: 'application/vnd.oasis.opendocument.presentation',
  };
  return map[ext] ?? 'application/octet-stream';
}
function maxUploadBytes(): number {
  const raw = process.env.MAX_CLIENT_DOCUMENT_BYTES;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return CLIENT_DOCUMENT_MAX_BYTES;
}

function computeAge(dateOfBirth: Date): number {
  const today = new Date();
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = today.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}

function serializeClient(client: {
  id: string;
  facilityId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  healthProblems: string | null;
  needs: string | null;
  dailyCarePlan: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  assignments: Array<{ staff: { id: string; firstName: string; lastName: string } }>;
  documents: Array<{
    id: string;
    category: string;
    fileName: string;
    fileType: string;
    uploadDate: Date;
  }>;
}) {
  return {
    id: client.id,
    facilityId: client.facilityId,
    firstName: client.firstName,
    lastName: client.lastName,
    dateOfBirth: client.dateOfBirth.toISOString().split('T')[0],
    age: computeAge(client.dateOfBirth),
    healthProblems: client.healthProblems,
    needs: client.needs,
    dailyCarePlan: client.dailyCarePlan,
    status: client.status,
    assignedStaff: client.assignments.map((row) => row.staff),
    documents: client.documents.map((doc) => ({
      id: doc.id,
      category: doc.category,
      fileName: doc.fileName,
      fileType: doc.fileType,
      uploadDate: doc.uploadDate.toISOString(),
    })),
    createdAt: client.createdAt.toISOString(),
    updatedAt: client.updatedAt.toISOString(),
  };
}

async function assertCanAccessClient(user: AuthUser, clientId: string) {
  const client = await findClientById(clientId, user.facilityId);
  if (!client) {
    throw new ClientError('Client not found');
  }

  if (isEmployerRole(user.role) || user.role === 'auditor') {
    return client;
  }

  if (user.role === 'staff') {
    if (!user.staffId) {
      throw new ClientError('You do not have access to this client');
    }
    const assigned = await staffAssignedToClient(clientId, user.staffId);
    if (!assigned) {
      throw new ClientError('You do not have access to this client');
    }
    return client;
  }

  throw new ClientError('You do not have access to this client');
}

async function validateStaffIds(facilityId: string, staffIds: string[]) {
  for (const staffId of staffIds) {
    const staff = await findStaffById(staffId, facilityId);
    if (!staff || staff.status === 'archived') {
      throw new ClientError('One or more assigned staff members were not found');
    }
  }
}

export async function listClients(user: AuthUser, search?: string) {
  const staffId = user.role === 'staff' ? user.staffId ?? undefined : undefined;
  if (user.role === 'staff' && !staffId) {
    return [];
  }

  const clients = await findClientsByFacility(user.facilityId, {
    staffId,
    search,
    status: 'active',
  });

  return clients.map((client) => serializeClient(client));
}

export async function getClient(user: AuthUser, id: string) {
  const client = await assertCanAccessClient(user, id);
  return serializeClient(client);
}

export async function addClient(
  user: AuthUser,
  input: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    healthProblems?: string;
    needs?: string;
    dailyCarePlan?: string;
    assignedStaffIds?: string[];
  },
) {
  if (!isEmployerRole(user.role)) {
    throw new ClientError('Only supervisors can create client profiles');
  }

  const assignedStaffIds = input.assignedStaffIds ?? [];
  if (assignedStaffIds.length > 0) {
    await validateStaffIds(user.facilityId, assignedStaffIds);
  }

  const client = await createClient({
    facilityId: user.facilityId,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    dateOfBirth: new Date(input.dateOfBirth),
    healthProblems: input.healthProblems?.trim() || undefined,
    needs: input.needs?.trim() || undefined,
    dailyCarePlan: input.dailyCarePlan?.trim() || undefined,
    assignedStaffIds,
  });

  await createAuditLog({
    ...auditContext(user),
    action: 'CREATE',
    tableName: 'clients',
    recordId: client.id,
    changes: { after: { firstName: client.firstName, lastName: client.lastName } },
  });

  return serializeClient(client);
}

export async function editClient(
  user: AuthUser,
  id: string,
  input: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    healthProblems?: string | null;
    needs?: string | null;
    dailyCarePlan?: string | null;
    assignedStaffIds?: string[];
  },
) {
  if (!isEmployerRole(user.role)) {
    throw new ClientError('Only supervisors can update client profiles');
  }

  const existing = await findClientById(id, user.facilityId);
  if (!existing) {
    throw new ClientError('Client not found');
  }

  if (input.assignedStaffIds) {
    await validateStaffIds(user.facilityId, input.assignedStaffIds);
  }

  const client = await updateClient(id, user.facilityId, {
    firstName: input.firstName?.trim(),
    lastName: input.lastName?.trim(),
    dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
    healthProblems: input.healthProblems,
    needs: input.needs,
    dailyCarePlan: input.dailyCarePlan,
    assignedStaffIds: input.assignedStaffIds,
  });

  await createAuditLog({
    ...auditContext(user),
    action: 'UPDATE',
    tableName: 'clients',
    recordId: id,
    changes: { fields: Object.keys(input) },
  });

  return serializeClient(client);
}

export async function uploadClientDocument(
  user: AuthUser,
  clientId: string,
  file: { buffer: Buffer; filename: string; mimetype: string },
  category: string,
) {
  if (!isEmployerRole(user.role)) {
    throw new ClientError('Only supervisors can upload client documents');
  }

  await assertCanAccessClient(user, clientId);

  const maxBytes = maxUploadBytes();
  const allowed = isAllowedClientDocument(
    file.filename,
    file.mimetype,
    file.buffer.length,
    maxBytes,
  );
  if (!allowed.ok) {
    throw new ClientError(allowed.message ?? 'File not allowed');
  }

  const ext = clientDocumentExtension(file.filename);
  let storedMime = file.mimetype.split(';')[0].trim().toLowerCase();
  if (!storedMime || storedMime === 'application/octet-stream') {
    storedMime = ext ? defaultMimeForExtension(ext) : 'application/octet-stream';
  }

  const storage = getObjectStorage();
  const safeName = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storedName = `${randomUUID()}-${safeName}`;
  const objectKey = buildClientDocumentKey(user.facilityId, storedName);

  await storage.putObject(objectKey, file.buffer, storedMime);

  const doc = await createClientDocument({
    clientId,
    facilityId: user.facilityId,
    category,
    filePath: objectKey,
    fileName: file.filename,
    fileType: storedMime,
    uploadedByUserId: user.id,
  });

  await createAuditLog({
    ...auditContext(user),
    action: 'CREATE',
    tableName: 'client_documents',
    recordId: doc.id,
    changes: { clientId, category, fileName: file.filename },
  });

  return {
    id: doc.id,
    category: doc.category,
    fileName: doc.fileName,
    fileType: doc.fileType,
    uploadDate: doc.uploadDate.toISOString(),
  };
}

export async function openClientDocumentStream(user: AuthUser, documentId: string) {
  const doc = await findClientDocument(documentId, user.facilityId);
  if (!doc) {
    throw new ClientError('Document not found');
  }

  await assertCanAccessClient(user, doc.clientId);

  const storage = getObjectStorage();
  const { stream } = await storage.getObjectStream(doc.filePath);

  await createAuditLog({
    ...auditContext(user),
    action: 'READ',
    tableName: 'client_documents',
    recordId: doc.id,
    changes: { clientId: doc.clientId, fileName: doc.fileName },
  });

  return {
    stream,
    fileName: doc.fileName,
    fileType: doc.fileType,
  };
}
