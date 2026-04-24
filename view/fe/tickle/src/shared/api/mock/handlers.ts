import { eventHandlers } from './eventHandlers';
import { userHandlers } from './userHandlers';
import { seatHandlers } from './seatHandlers';
import { queueHandlers } from './queueHandlers';

export const handlers = [
  ...eventHandlers,
  ...userHandlers,
  ...seatHandlers,
  ...queueHandlers,
];
