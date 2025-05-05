import { DailyMedDatum } from "@application/interfaces/idailymed.client.interface";
import { DailyMedClient } from "@infrastructure/external-services/dailymed/dailymed.client";
import {
  Controller,
  Get,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
} from "@nestjs/common";

@Controller("indication")
export class IndicationController {
  private readonly logger = new Logger(IndicationController.name);

  constructor(private readonly dailyMedClient: DailyMedClient) {}

  @Get(":setid")
  async getDrugBySetId(@Param("setid") setid: string): Promise<DailyMedDatum> {
    this.logger.log(`Received request to find drug with setid: ${setid}`);
    try {
      const drugData = await this.dailyMedClient.findDataBySetId(setid);

      if (!drugData) {
        this.logger.warn(`Drug with setid ${setid} not found.`);
        throw new NotFoundException(`Drug with setid "${setid}" not found.`);
      }

      this.logger.log(`Successfully found drug with setid: ${setid}`);
      return drugData;
    } catch (error) {
      this.logger.error(
        `Error fetching drug with setid ${setid}:`,
        error.message,
      );

      throw new InternalServerErrorException(
        `Failed to retrieve drug data for setid "${setid}".`,
      );
    }
  }
}
