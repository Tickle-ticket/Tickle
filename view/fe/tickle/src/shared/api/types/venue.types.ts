export interface VenueListItemResponse {
  venueId: number;
  venueName: string;
}

export interface VenueListResponse {
  venues: VenueListItemResponse[];
}
