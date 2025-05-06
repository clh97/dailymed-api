export interface ClaudeRequestDto {
  prompt: string;
  context: string[];
  maxTokens?: number;
  temperature?: number;
}

export interface ClaudeResponseDto {
  text: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
