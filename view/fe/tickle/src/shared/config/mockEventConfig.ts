const normalizeEventId = (value?: string | number | null) => {
  if (value === undefined || value === null) return '';
  return value.toString().trim();
};

const commonMockEventId = normalizeEventId(process.env.NEXT_PUBLIC_MOCK_EVENT_ID);

export const MOCK_LOGIN_EVENT_ID =
  normalizeEventId(process.env.NEXT_PUBLIC_MOCK_LOGIN_EVENT_ID) || commonMockEventId || '6023';

export const MOCK_BOOKING_COMPLETE_EVENT_ID =
  normalizeEventId(process.env.NEXT_PUBLIC_MOCK_BOOKING_COMPLETE_EVENT_ID) || commonMockEventId || '6025';

export const isMockLoginEvent = (eventId?: string | number | null) =>
  normalizeEventId(eventId) === MOCK_LOGIN_EVENT_ID;

export const isMockBookingCompleteEvent = (eventId?: string | number | null) =>
  normalizeEventId(eventId) === MOCK_BOOKING_COMPLETE_EVENT_ID;
