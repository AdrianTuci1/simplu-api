import { S3Client, ListObjectsV2Command, CopyObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({});

export const handler = async (event) => {
  console.log('CopyBusinessFiles received event:', JSON.stringify(event, null, 2));

  const businessType = event.businessType;
  const domainLabel = event.domainLabel;
  const baseDomain = process.env.BASE_DOMAIN || 'simplu.io';
  const bucketName = event.bucketName || `${domainLabel}.${baseDomain}`;

  if (!businessType || !bucketName) {
    throw new Error(`Missing required parameters: businessType=${businessType}, bucketName=${bucketName}`);
  }

  try {
    // Map business types to their source bucket names
    const bucketNameMap = {
      'dental': 'dental-form-simplu',
      'gym': 'gym-form-simplu',
      'hotel': 'hotel-form-simplu'
    };

    const sourceBucketName = bucketNameMap[businessType] || `business-forms-${businessType}`;

    console.log(`Copying files from ${sourceBucketName} to ${bucketName}`);

    // List all objects in the source bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: sourceBucketName,
    });

    const listResponse = await s3Client.send(listCommand);

    if (!listResponse.Contents || listResponse.Contents.length === 0) {
      console.log(`No files found in source bucket ${sourceBucketName}`);
      return { 
        success: true,
        message: 'No files to copy',
        filesCopied: 0
      };
    }

    // Copy each file from source to target bucket
    const copyPromises = listResponse.Contents.map(async (object) => {
      if (!object.Key) return;

      const copyCommand = new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${sourceBucketName}/${encodeURIComponent(object.Key)}`,
        Key: object.Key,
      });

      try {
        await s3Client.send(copyCommand);
        console.log(`Copied file: ${object.Key}`);
      } catch (error) {
        console.error(`Failed to copy file ${object.Key}: ${error.message}`);
        throw error;
      }
    });

    await Promise.all(copyPromises);

    const message = `Successfully copied ${listResponse.Contents.length} files from ${sourceBucketName} to ${bucketName}`;
    console.log(message);

    return {
      success: true,
      message,
      filesCopied: listResponse.Contents.length
    };

  } catch (error) {
    console.error('Error in CopyBusinessFiles:', error);
    throw error;
  }
};
