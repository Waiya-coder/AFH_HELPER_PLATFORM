import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

export type StoredObjectBody = Buffer | Readable;

export interface ObjectStorage {
  mode: 'local' | 's3';
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  getObjectStream(key: string): Promise<{ stream: Readable; contentType?: string }>;
}

function useS3(): boolean {
  return Boolean(process.env.S3_BUCKET?.trim());
}

function localUploadRoot(): string {
  return process.env.UPLOAD_ROOT?.trim() || path.join(process.cwd(), 'uploads', 'clients');
}

class LocalObjectStorage implements ObjectStorage {
  mode = 'local' as const;

  async putObject(key: string, body: Buffer, _contentType: string): Promise<void> {
    const absolutePath = path.join(localUploadRoot(), key);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, body);
  }

  async getObjectStream(key: string): Promise<{ stream: Readable; contentType?: string }> {
    const absolutePath = path.join(localUploadRoot(), key);
    return { stream: createReadStream(absolutePath) };
  }
}

class S3ObjectStorage implements ObjectStorage {
  mode = 's3' as const;
  private client: S3Client;
  private bucket: string;

  constructor() {
    const bucket = process.env.S3_BUCKET?.trim();
    if (!bucket) {
      throw new Error('S3_BUCKET is required for object storage');
    }
    this.bucket = bucket;

    const endpoint = process.env.S3_ENDPOINT?.trim();
    const region = process.env.S3_REGION?.trim() || 'auto';

    this.client = new S3Client({
      region,
      endpoint: endpoint || undefined,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID?.trim() ?? '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY?.trim() ?? '',
      },
      forcePathStyle: Boolean(endpoint),
    });
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    const sse = process.env.S3_SSE?.trim();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ...(sse === 'AES256' || sse === 'aws:kms' ? { ServerSideEncryption: sse } : {}),
      }),
    );
  }

  async getObjectStream(key: string): Promise<{ stream: Readable; contentType?: string }> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new Error('Object not found in storage');
    }

    const stream = response.Body as Readable;
    return { stream, contentType: response.ContentType };
  }
}

let storageSingleton: ObjectStorage | null = null;

export function getObjectStorage(): ObjectStorage {
  if (!storageSingleton) {
    storageSingleton = useS3() ? new S3ObjectStorage() : new LocalObjectStorage();
  }
  return storageSingleton;
}

/** Object key stored in DB `file_path` (works for local disk and S3/R2). */
export function buildClientDocumentKey(facilityId: string, storedFileName: string): string {
  return path.posix.join(facilityId, storedFileName);
}
