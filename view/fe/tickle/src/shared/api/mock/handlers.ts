import { categoryHandlers } from './categoryHandlers';
import { eventHandlers } from './eventHandlers';
import { userHandlers } from './userHandlers';
import { seatHandlers } from './seatHandlers';
import { queueHandlers } from './queueHandlers';
import { ticketTypeHandlers } from './ticketTypeHandlers';
import { homeHandlers } from './homeHandlers';
import { searchHandlers } from './searchHandlers';
import { favoriteHandlers } from './favoriteHandlers';
import { trialHandlers } from './trialHandlers';
import { agencyHandlers } from './agencyHandlers';
import { authHandlers } from './authHandlers';
import { reservationHandlers } from './reservationHandlers';
import { bookingHandlers } from './bookingHandlers';
import { paymentHandlers } from './paymentHandlers';
import { botDetectionHandlers } from './botDetectionHandlers';
export const handlers = [
  ...categoryHandlers,
  ...trialHandlers,
  ...homeHandlers,
  ...searchHandlers,
  ...favoriteHandlers,
  ...agencyHandlers,
  ...eventHandlers,
  ...userHandlers,
  ...seatHandlers,
  ...queueHandlers,
  ...ticketTypeHandlers,
  ...authHandlers,
  ...reservationHandlers,
  ...bookingHandlers,
  ...paymentHandlers,
  ...botDetectionHandlers,
];
