
export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  ANALYZING = 'ANALYZING',
  READY = 'READY',
  CHATTING = 'CHATTING'
}

export interface LectureImage {
  id: string;
  data: string; // base64
  name: string;
}

export interface AnalysisResult {
  summary: string;
  keyVocabulary: string[];
  suggestedPhrases: string[];
}
