
export interface FormData {
  role: string;
  issuingAuthority: string;
  eventName: string;
  organizer: string;
  context: string;
  message: string;
  recipients: string;
  keyPoints: string;
}

export interface SpeechItem {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}