import api from "./api";

export interface SnakeScore {
  id: number;
  name: string;
  score: number;
  date: string | null;
}

export async function getSnakeScores(): Promise<SnakeScore[]> {
  const response = await api.get<SnakeScore[]>("/snake/scores");
  return response.data;
}

export async function saveSnakeScore(score: number): Promise<SnakeScore[]> {
  const response = await api.post<SnakeScore[]>("/snake/scores", { score });
  return response.data;
}
