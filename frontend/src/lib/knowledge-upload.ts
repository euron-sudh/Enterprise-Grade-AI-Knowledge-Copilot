import { authFetch } from '@/lib/api/token';

type UploadUser = {
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

type UploadKnowledgeFilesArgs = {
  files: File[];
  accessToken?: string | null;
  user?: UploadUser;
  collectionId?: string;
  onFileUploaded?: (fileName: string, responseBody: any) => void;
};

type UploadKnowledgeFilesResult = {
  uploadedNames: string[];
  failedNames: string[];
};

export async function uploadKnowledgeFiles({
  files,
  accessToken,
  user,
  collectionId,
  onFileUploaded,
}: UploadKnowledgeFilesArgs): Promise<UploadKnowledgeFilesResult> {
  const uploadedNames: string[] = [];
  const failedNames: string[] = [];

  const uploadViaProxy = async (file: File): Promise<any> => {
    const fallbackForm = new FormData();
    fallbackForm.append('files', file);
    if (collectionId) {
      fallbackForm.append('collectionId', collectionId);
    }

    const res = await authFetch(
      '/api/backend/knowledge/documents/upload',
      { method: 'POST', body: fallbackForm },
      accessToken ?? undefined,
      user,
    );
    if (!res.ok) {
      throw new Error(`Upload failed (${res.status})`);
    }
    return res.json();
  };

  for (const file of files) {
    try {
      const contentType = file.type || 'application/octet-stream';
      const presignRes = await authFetch(
        `/api/backend/knowledge/documents/presigned-upload?filename=${encodeURIComponent(file.name)}&content_type=${encodeURIComponent(contentType)}`,
        {},
        accessToken ?? undefined,
        user,
      );

      if (presignRes.ok) {
        const { uploadUrl, s3Key } = await presignRes.json();
        const s3Res = await fetch(uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': contentType },
        });
        if (!s3Res.ok) {
          throw new Error(`S3 upload failed: ${s3Res.status}`);
        }

        const formData = new FormData();
        formData.append('s3_key', s3Key);
        formData.append('filename', file.name);
        formData.append('file_size', String(file.size));
        formData.append('content_type', contentType);
        if (collectionId) {
          formData.append('collectionId', collectionId);
        }

        const regRes = await authFetch(
          '/api/backend/knowledge/documents/register-s3',
          { method: 'POST', body: formData },
          accessToken ?? undefined,
          user,
        );
        if (!regRes.ok) {
          // If S3 registration fails, fall back to direct upload.
          const fallbackBody = await uploadViaProxy(file);
          uploadedNames.push(file.name);
          onFileUploaded?.(file.name, fallbackBody);
          continue;
        }

        const body = await regRes.json();
        uploadedNames.push(file.name);
        onFileUploaded?.(file.name, body);
        continue;
      }

      const body = await uploadViaProxy(file);
      uploadedNames.push(file.name);
      onFileUploaded?.(file.name, body);
    } catch {
      // If presigned path fails (CORS/signature/network), retry once via proxy.
      try {
        const fallbackBody = await uploadViaProxy(file);
        uploadedNames.push(file.name);
        onFileUploaded?.(file.name, fallbackBody);
      } catch {
        failedNames.push(file.name);
      }
    }
  }

  return { uploadedNames, failedNames };
}