const LOCAL_UPLOAD_ROUTE = '/api/uploads';

export const buildLocalUploadImageUrl = (filename: string) =>
  `${LOCAL_UPLOAD_ROUTE}/${encodeURIComponent(filename)}`;

export const normalizeImageUrl = (value: string) => {
  if (!value) {
    return value;
  }

  try {
    const parsedUrl = new URL(value, 'http://localhost');

    if (parsedUrl.pathname !== LOCAL_UPLOAD_ROUTE) {
      return value;
    }

    const filename = parsedUrl.searchParams.get('file');

    if (!filename) {
      return value;
    }

    return buildLocalUploadImageUrl(filename);
  } catch {
    return value;
  }
};
