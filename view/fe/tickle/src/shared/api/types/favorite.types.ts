import { Schema } from 'effect';

export const FavoriteCreateResponseDataSchema = Schema.Struct({
  favoriteId: Schema.Number,
  userId: Schema.Number,
  eventId: Schema.Number,
  createdAt: Schema.String,
});

export type FavoriteCreateResponseData = Schema.Schema.Type<typeof FavoriteCreateResponseDataSchema>;
