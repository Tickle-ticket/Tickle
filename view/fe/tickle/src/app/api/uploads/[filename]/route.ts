import { NextResponse } from 'next/server';
import { readImageFile, UploadStorageError } from '@/src/shared/server/uploadStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  try {
    const { fileBuffer, contentType } = await readImageFile(filename);

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    if (error instanceof UploadStorageError) {
      return NextResponse.json(
        { status: error.status, message: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { status: 500, message: '이미지 파일을 불러오지 못했습니다.' },
      { status: 500 },
    );
  }
}
