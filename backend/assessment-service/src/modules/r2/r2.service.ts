import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

export interface R2UploadResult {
  key: string;
  url: string;
  fileName: string;
}

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly s3: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    this.bucketName =
      this.config.get<string>('R2_BUCKET_NAME') || 'originbi-assessments';
    this.publicUrl = this.config.get<string>('R2_PUBLIC_URL') || '';

    this.s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
      },
    });

    this.logger.log(`R2 Service initialized for assessment assets bucket: ${this.bucketName}`);
  }

  /**
   * Build the R2 object key for a question asset, matching the exact folders in your R2 bucket.
   */
  private buildKey(moduleType: string, fileName: string): string {
    const moduleLower = moduleType.trim().toLowerCase();
    let folder = moduleLower;
    
    if (moduleLower === 'grammar' || moduleLower === 'communication') {
      folder = 'communication';
    } else if (moduleLower === 'role' || moduleLower === 'role_based' || moduleLower === 'role-based') {
      folder = 'role-based';
    }
    
    return `${folder}/${fileName}`;
  }

  /**
   * Upload a question asset (image or audio) to Cloudflare R2.
   */
  async uploadFile(
    buffer: Buffer,
    moduleType: string,
    originalFileName: string,
    mimeType: string,
  ): Promise<R2UploadResult> {
    const timestamp = Date.now();
    const sanitizedFileName = originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${timestamp}_${sanitizedFileName}`;

    const key = this.buildKey(moduleType, uniqueFileName);

    this.logger.log(
      `Uploading to R2: ${key} (${mimeType}, ${buffer.length} bytes)`,
    );

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );

    // Compute the public URL
    const url = this.publicUrl
      ? `${this.publicUrl}/${key}`
      : `https://${this.bucketName}.r2.dev/${key}`;

    return {
      key,
      url,
      fileName: originalFileName,
    };
  }

  /**
   * Delete an asset from R2 by its key.
   */
  async deleteFile(key: string): Promise<void> {
    this.logger.log(`Deleting from R2: ${key}`);
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(`Failed to delete asset ${key} from R2`, error);
    }
  }
}
