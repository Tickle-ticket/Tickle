import { delay, http, HttpResponse } from 'msw';

const mockOrganizers = [
  {
    organizerId: 1,
    organizerName: 'SSAFY 18',
  },
  {
    organizerId: 2,
    organizerName: 'Tikkle Stage',
  },
  {
    organizerId: 3,
    organizerName: 'Blue Square Partners',
  },
  {
    organizerId: 4,
    organizerName: 'Seoul Art Company',
  },
];

export const agencyHandlers = [
  http.get('*/api/v1/organizers', async () => {
    await delay(300);

    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: {
        organizers: mockOrganizers,
      },
    });
  }),
];
