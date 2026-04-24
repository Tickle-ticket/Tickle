import { eventHandlers } from './eventHandlers';
import { userHandlers } from './userHandlers';
import { seatHandlers } from './seatHandlers';
import { queueHandlers } from './queueHandlers';
import { ticketTypeHandlers } from './ticketTypeHandlers';

export const handlers = [
  ...eventHandlers,
  ...userHandlers,
  ...seatHandlers,
  ...queueHandlers,
  ...ticketTypeHandlers,
];
