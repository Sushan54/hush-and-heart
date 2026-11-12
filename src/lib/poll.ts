export type AnonymousPoll = {
  id: string;
  question: string;
  options: string[];
  created_at: string;
  vote_counts: number[];
  total_votes: number;
  my_vote: number | null;
};
