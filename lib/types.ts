export type Category = "logistics" | "seating" | "security" | "negligence";
export type Status = "collecting" | "sent" | "ignored";

export interface Organizer {
  id: string;
  name: string;
  rating: number;
}

export interface Petition {
  id: string;
  title: string;
  event_name: string;
  organizer_id: string;
  body: string;
  body_ai_refined: string | null;
  votes_count: number;
  category: Category;
  status: Status;
  created_at: string;
  evidence_url: string | null;
  author_attended: boolean;
  attendance_verified: boolean;
  organizers: Pick<Organizer, "name" | "rating"> | null;
}

export type PetitionListItem = Pick<
  Petition,
  "id" | "title" | "event_name" | "body" | "votes_count" | "category" | "status" | "author_attended" | "created_at"
> & { organizers: Pick<Organizer, "name"> | null };
