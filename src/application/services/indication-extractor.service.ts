import { Injectable, Logger } from '@nestjs/common';
import { parse } from 'node-html-parser';

export interface TextContext {
  pattern: string;
  contexts: string[];
}

@Injectable()
export class IndicationExtractorService {
  private readonly logger = new Logger(IndicationExtractorService.name);

  /**
   * Extract text contexts surrounding pattern matches in HTML content
   * @param xml The XML DOM string to parse
   * @param pattern The pattern to search for
   * @returns Object containing matched pattern and surrounding contexts
   */
  extractPatternContexts(xml: string, pattern: string): TextContext {
    this.logger.log(`Extracting contexts for pattern: "${pattern}"`);

    try {
      const root = parse(xml.toLowerCase());
      const allElements = root.querySelectorAll('*');
      const contexts: string[] = [];

      for (let i = 0; i < allElements.length; i++) {
        const element = allElements[i];
        if (element.textContent.includes(pattern.toLowerCase())) {
          // surrounding elements
          const startIdx = Math.max(0, i - 2);
          const endIdx = Math.min(allElements.length - 1, i + 2);

          const surroundingText: Array<string> = [];
          for (let j = startIdx; j <= endIdx; j++) {
            const text = allElements[j].textContent.trim();
            if (text) {
              surroundingText.push(text);
            }
          }

          if (surroundingText.length > 0) {
            contexts.push(surroundingText.join(' '));
          }
        }
      }

      return {
        pattern,
        contexts: contexts.slice(0, 1), //max 1 context
      };
    } catch (error) {
      this.logger.error(
        `Error parsing HTML for pattern "${pattern}":`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.message,
      );
      return {
        pattern,
        contexts: [],
      };
    }
  }
}
