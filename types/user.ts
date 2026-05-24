export interface UserProfile {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  createdAt?: Date | string;
}

export interface UserSettings {
  defaultAiModel: string;
  cognitiveLoadWarningThreshold: number;
}
