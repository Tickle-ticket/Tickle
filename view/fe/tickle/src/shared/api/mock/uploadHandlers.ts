import { delay, http, HttpResponse } from 'msw';

export const uploadHandlers = [
  // 이미지 업로드
  //
  // 실제로 파일을 저장할 곳이 없으므로 자리표시 이미지 주소를 돌려준다.
  // 응답 형태는 { imageUrl } 과 문자열 둘 다 받아들이므로(uploadApi의
  // resolveUploadedImageUrl) 서버와 같은 { imageUrl } 형태로 맞춘다.
  http.post('*/api/v1/uploads', async () => {
    await delay(400);

    return HttpResponse.json({
      status: 200,
      code: 'OK',
      message: 'success',
      data: {
        imageUrl: `https://picsum.photos/seed/upload${Math.floor(Math.random() * 1000)}/800/1200`,
      },
    });
  }),
];
