import { http, HttpResponse, delay } from 'msw';

const mockAgencies = [
  {
    agencyId: 1,
    agencyName: 'SSAFY 18기',
  },
  {
    agencyId: 2,
    agencyName: 'Tikkle Stage',
  },
  {
    agencyId: 3,
    agencyName: 'Blue Square Partners',
  },
  {
    agencyId: 4,
    agencyName: 'Seoul Art Company',
  },
];

export const agencyHandlers = [
  http.get('*/api/v1/agencies', async () => {
    await delay(300);

    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: {
        agencies: mockAgencies,
      },
    });
  }),
];
