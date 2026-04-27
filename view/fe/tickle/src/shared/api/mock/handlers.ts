import { eventHandlers } from './eventHandlers';
import { userHandlers } from './userHandlers';
import { seatHandlers } from './seatHandlers';
import { queueHandlers } from './queueHandlers';
import { ticketTypeHandlers } from './ticketTypeHandlers';
import { homeHandlers } from './homeHandlers';
import { searchHandlers } from './searchHandlers';
import { favoriteHandlers } from './favoriteHandlers';

export const handlers = [
  ...eventHandlers,
  ...userHandlers,
  ...seatHandlers,
  ...queueHandlers,
  ...ticketTypeHandlers,
  ...homeHandlers,
  ...searchHandlers,
  ...favoriteHandlers,
];
