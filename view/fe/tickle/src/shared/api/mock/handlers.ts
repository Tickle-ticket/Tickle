import { eventHandlers } from './eventHandlers';
import { userHandlers } from './userHandlers';
import { seatHandlers } from './seatHandlers';

export const handlers = [
  ...eventHandlers,
  ...userHandlers,
  ...seatHandlers,
];
