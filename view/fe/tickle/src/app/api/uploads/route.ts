import { NextResponse } from 'next/server';
import { buildImageUrl, readImageFile, saveImageFile, UploadStorageError } from '@/src/shared/server/uploadStorage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const filename = searchParams.get('file');

  if (!filename) {
    return NextResponse.json(
      { status: 400, message: 'file 쿼리 파라미터가 필요합니다.' },
      { status: 400 },
    );
  }

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { status: 400, message: '업로드할 이미지 파일이 필요합니다.' },
        { status: 400 },
      );
    }

    const filename = await saveImageFile(file);

    return NextResponse.json({
      status: 200,
      message: '이미지 업로드가 완료되었습니다.',
      data: {
        imageUrl: buildImageUrl(filename),
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
      { status: 500, message: '이미지 업로드 중 오류가 발생했습니다.' },
      { status: 500 },
    );
  }
}
