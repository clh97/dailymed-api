import {
  ClaudeRequestDto,
  ClaudeResponseDto,
} from '@application/interfaces/iclaude.client.interface';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ClaudeClient {
  private readonly logger = new Logger(ClaudeClient.name);
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('LLM_API_KEY', '');
    this.apiUrl = this.configService.get<string>(
      'LLM_API_URL',
      'https://api.anthropic.com/v1/messages',
    );
  }

  /**
   * Send a prompt with context to the LLM and get a response
   * @param requestDto The request containing prompt and context
   * @returns The LLM response
   */
  async generateResponse(
    requestDto: ClaudeRequestDto,
  ): Promise<ClaudeResponseDto> {
    const { prompt, context, maxTokens = 1024, temperature = 0.7 } = requestDto;

    const contextText = context.join('\n\n');
    
    const systemPrompt = `
      You are a medical coding specialist tasked with mapping drug indications to ICD-10 codes. Given a drug indication text, analyze it and return the most appropriate ICD-10 code(s).
Input:
1. Indication text: Extracted from drug label information
2. Drug name: Optional - may provide context for ambiguous indications

Instructions:
1. Carefully analyze the indication text to extract the medical condition(s) being treated
2. Map each identified condition to the most specific appropriate ICD-10 code
3. Handle these specific challenges:
  a. Synonyms: Recognize different terms for the same condition (e.g., "hypertension" vs. "high blood pressure")
  b. Multiple indications: Identify and code each distinct indication separately
  c. Unmappable conditions: Label as "NOT_MAPPABLE" with explanation if condition cannot be mapped

4. For each identified condition, provide:
  - ICD-10 code
  - ICD-10 description
  - Confidence score (High/Medium/Low)
  - Reasoning for the mapping

5. Follow these priority rules:
  - Prefer more specific codes over general ones when possible
  - For symptoms, code the underlying condition when clearly indicated
  - For off-label uses mentioned, flag them but still provide mapping

Output format:
{
  "drug_name": "DRUG_NAME",
  "extracted_indications": [
    {
      "raw_text": "ORIGINAL_INDICATION_TEXT",
      "condition": "NORMALIZED_CONDITION_NAME",
      "icd10_code": "CODE",
      "icd10_description": "DESCRIPTION",
      "confidence": "High|Medium|Low",
      "reasoning": "BRIEF_EXPLANATION",
      "is_off_label": false
    },
    // Append additional indications as needed
  ],
  "unmappable_terms": [
    {
      "term": "TERM",
      "reason": "REASON_NOT_MAPPABLE"
    }
  ]
}
`;

    try {
      this.logger.log(
        `Sending request to LLM with prompt: "${prompt.substring(0, 50)}..."`,
      );

      const response = await firstValueFrom(
        this.httpService.post<ClaudeResponseDto>(
          this.apiUrl,
          {
            // model: 'claude-3-7-sonnet-20250219',
            model: 'claude-3-5-haiku-20241022',
            max_tokens: maxTokens,
            temperature: temperature,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: `Context:\n${contextText}\n\nQuestion: ${prompt}`,
              },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': this.apiKey,
              'anthropic-version': '2023-06-01',
            },
          },
        ),
      );

      this.logger.log('Successfully received response from LLM');

      return response.data;
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      this.logger.error(`Error generating LLM response: ${error.message}`);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      throw new Error(`Failed to generate LLM response: ${error.message}`);
    }
  }
}
