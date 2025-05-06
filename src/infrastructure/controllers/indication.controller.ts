import { IndicationData } from '@application/interfaces/idailymed.client.interface';
import { IndicationExtractorService } from '@application/services/indication-extractor.service';
import { IndicationMapperService } from '@application/services/indication-mapper.service';
import { ClaudeClient } from '@infrastructure/external-services/claude/claude.client';
import { DailyMedClient } from '@infrastructure/external-services/dailymed/dailymed.client';
import {
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';

@Controller('indication')
export class IndicationController {
  private readonly logger = new Logger(IndicationController.name);

  constructor(
    private readonly dailyMedClient: DailyMedClient,
    private readonly extractorService: IndicationExtractorService,
    private readonly claudeClient: ClaudeClient,
    private readonly indicationMapperService: IndicationMapperService,
  ) {}

  @Get('/drug/:setid')
  async getSplBySetId(@Param('setid') setid: string): Promise<IndicationData> {
    this.logger.log(`Received request to find SPL with setid: ${setid}`);
    try {
      const splEntry = await this.dailyMedClient.getSplBySetId(setid);

      if (!splEntry) {
        this.logger.warn(`SPL with setid ${setid} not found.`);
        throw new NotFoundException(`SPL with setid "${setid}" not found.`);
      }

      this.logger.log(`Successfully found SPL with setid: ${setid}`);

      const existing =
        await this.indicationMapperService.getIndicationBySetId(setid);

      if (existing) {
        return { data: existing, metadata: splEntry };
      }

      const xmlData = await this.dailyMedClient.fetchLabelXMLBySetId(
        splEntry.setid,
      );

      if (!xmlData) {
        this.logger.warn(`Label data for SPL "${splEntry.setid}" not found.`);
        throw new NotFoundException(
          `Label data for SPL "${splEntry.setid}" not found.`,
        );
      }

      const possibleIndication = this.extractorService.extractPatternContexts(
        xmlData,
        'indication',
      );

      const llmGenData = await this.claudeClient.generateResponse({
        context: possibleIndication.contexts,
        prompt: `
        Given the extracted drug indications, map them to the appropriate ICD-10 codes using AI assistance.
        You should return an abstracted, user-friendly version of all the indications ranked according to confidence level.`,
        maxTokens: 1024,
      });

      await this.indicationMapperService.saveIndication(
        splEntry.setid,
        splEntry.title,
        possibleIndication.contexts,
        llmGenData.text,
      );

      return { data: llmGenData.text, metadata: splEntry };
    } catch (error) {
      this.logger.error(
        `Error fetching SPL with setid ${setid}:`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.message,
      );

      throw new InternalServerErrorException(
        `Failed to retrieve SPL data for setid "${setid}".`,
      );
    }
  }

  @Get('search')
  async searchByTitle(@Query('title') title: string): Promise<IndicationData> {
    if (!title) {
      this.logger.warn('Search by title missing title parameter.');
      throw new NotFoundException(
        'Title query parameter is required (e.g., /dailymed/search?title=DUPIXENT).',
      );
    }

    this.logger.log(`Received request to search SPL by title: "${title}"`);

    try {
      const splEntry = await this.dailyMedClient.findSplByTitle(title);

      if (!splEntry) {
        this.logger.warn(`SPL with title "${title}" not found.`);
        throw new NotFoundException(`SPL with title "${title}" not found.`);
      }

      this.logger.log(`Successfully found a SPL matching title: "${title}"`);

      const existing = await this.indicationMapperService.getIndicationBySetId(
        splEntry.setid,
      );

      if (existing) {
        return { data: existing, metadata: splEntry };
      }

      const xmlData = await this.dailyMedClient.fetchLabelXMLBySetId(
        splEntry.setid,
      );

      if (!xmlData) {
        this.logger.warn(`Label data for SPL "${splEntry.setid}" not found.`);
        throw new NotFoundException(
          `Label data for SPL "${splEntry.setid}" not found.`,
        );
      }

      const possibleIndication = this.extractorService.extractPatternContexts(
        xmlData,
        'indication', // just a lookup for `intention` string and then it grabs the next 4 dom elements to use as context
      );

      const llmGenData = await this.claudeClient.generateResponse({
        context: possibleIndication.contexts,
        prompt: `Given the extracted drug indications, map them to the appropriate ICD-10 codes using AI assistance. The system should: return an abstracted, user-friendly definition of all the indications ranked according to confidence level.`,
        maxTokens: 1024,
      });

      await this.indicationMapperService.saveIndication(
        splEntry.setid,
        title,
        possibleIndication.contexts,
        llmGenData.text,
      );

      return { data: llmGenData, metadata: splEntry };
    } catch (error) {
      this.logger.error(
        `Error searching SPL by title "${title}":`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.message,
      );
      throw new InternalServerErrorException(
        `Failed to search SPL data for title "${title}".`,
      );
    }
  }
}
