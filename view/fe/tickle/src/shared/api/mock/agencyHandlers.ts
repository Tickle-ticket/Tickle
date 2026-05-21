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

const mockVenueTemplate = {
  venueId: 4001,
  venueName: '티클 아레나',
  sections: [
    {
      venueSectionId: 4101,
      sectionName: 'A구역',
      displayOrder: 1,
      seats: [
        { venueSeatId: 5001, rowLabel: 'A', seatNumber: '1', seatLabel: 'A-1', seatGrade: 'VIP' },
        { venueSeatId: 5002, rowLabel: 'A', seatNumber: '2', seatLabel: 'A-2', seatGrade: 'VIP' },
        { venueSeatId: 5003, rowLabel: 'A', seatNumber: '3', seatLabel: 'A-3', seatGrade: 'VIP' },
        { venueSeatId: 5004, rowLabel: 'A', seatNumber: '4', seatLabel: 'A-4', seatGrade: 'VIP' },
        { venueSeatId: 5005, rowLabel: 'A', seatNumber: '5', seatLabel: 'A-5', seatGrade: 'VIP' },
        { venueSeatId: 5006, rowLabel: 'A', seatNumber: '6', seatLabel: 'A-6', seatGrade: 'R' },
        { venueSeatId: 5007, rowLabel: 'A', seatNumber: '7', seatLabel: 'A-7', seatGrade: 'R' },
        { venueSeatId: 5008, rowLabel: 'A', seatNumber: '8', seatLabel: 'A-8', seatGrade: 'R' },
      ],
    },
  ],
};

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
  http.get('*/api/v1/agency/venues/:venueId/template', async () => {
    await delay(200);

    return HttpResponse.json({
      status: 200,
      message: 'success',
      data: mockVenueTemplate,
    });
  }),
];
