import { DailyMedAggregatedData } from "@application/interfaces/idailymed.client.interface";
import { DailyMedClient } from "@infrastructure/external-services/dailymed/dailymed.client";
import {
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Query,
} from "@nestjs/common";

@Controller("indication")
export class IndicationController {
  private readonly logger = new Logger(IndicationController.name);

  constructor(private readonly dailyMedClient: DailyMedClient) {}

  @Get("/drug/:setid")
  async getSplBySetId(
    @Param("setid") setid: string,
  ): Promise<DailyMedAggregatedData> {
    this.logger.log(`Received request to find SPL with setid: ${setid}`);
    try {
      const splEntry = await this.dailyMedClient.getSplBySetId(setid);

      if (!splEntry) {
        this.logger.warn(`SPL with setid ${setid} not found.`);
        throw new NotFoundException(`SPL with setid "${setid}" not found.`);
      }

      this.logger.log(`Successfully found SPL with setid: ${setid}`);

      const xmlData = await this.dailyMedClient.fetchLabelXMLBySetId(
        splEntry.setid,
      );

      if (!xmlData) {
        this.logger.warn(`Label data for SPL "${splEntry.setid}" not found.`);
        throw new NotFoundException(
          `Label data for SPL "${splEntry.setid}" not found.`,
        );
      }

      return { data: "", metadata: splEntry };
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

  @Get("search")
  async searchByTitle(
    @Query("title") title: string,
  ): Promise<DailyMedAggregatedData> {
    if (!title) {
      this.logger.warn("Search by title missing title parameter.");
      throw new NotFoundException(
        "Title query parameter is required (e.g., /dailymed/search?title=DUPIXENT).",
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

      const xmlData = await this.dailyMedClient.fetchLabelXMLBySetId(
        splEntry.setid,
      );

      if (!xmlData) {
        this.logger.warn(`Label data for SPL "${splEntry.setid}" not found.`);
        throw new NotFoundException(
          `Label data for SPL "${splEntry.setid}" not found.`,
        );
      }

      return { data: "", metadata: splEntry };
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
