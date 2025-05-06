/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger, Inject } from '@nestjs/common';
import Redis from 'ioredis';

interface IndicationData {
  setid: string;
  title: string;
  contexts: string[];
  llmData?: object;
  timestamp: number;
}

@Injectable()
export class IndicationMapperService {
  private readonly logger = new Logger(IndicationMapperService.name);
  private readonly INDICATION_KEY_PREFIX = 'indication:mapping:';
  private readonly INDICATION_INDEX_SET = 'indication:index';
  private readonly INDICATION_TTL = 60 * 60 * 24 * 3;

  constructor(
    @Inject('REDIS_CLIENT')
    private readonly redisClient: Redis,
  ) {}

  /**
   * Save indication data mapped to a setid
   * @param setid The DailyMed setid
   * @param title The drug title
   * @param contexts The extracted indication contexts
   * @param llmSummary Optional LLM-generated summary
   * @returns Boolean indicating success
   */
  async saveIndication(
    setid: string,
    title: string,
    contexts: string[],
    llmData?: object,
  ): Promise<boolean> {
    this.logger.log(`Saving indication data for setid: ${setid}`);

    try {
      const indicationData: IndicationData = {
        setid,
        title,
        contexts,
        llmData,
        timestamp: Date.now(),
      };

      const key = `${this.INDICATION_KEY_PREFIX}${setid}`;

      const pipeline = this.redisClient.pipeline();

      pipeline.setex(key, this.INDICATION_TTL, JSON.stringify(indicationData));

      pipeline.sadd(this.INDICATION_INDEX_SET, setid);

      const searchKey = `${this.INDICATION_KEY_PREFIX}search:${title.toLowerCase()}`;
      pipeline.setex(searchKey, this.INDICATION_TTL, setid);

      await pipeline.exec();

      this.logger.log(`Successfully saved indication data for setid: ${setid}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Error saving indication data for setid ${setid}:`,
        error.message,
      );
      return false;
    }
  }

  /**
   * Get indication data by setid
   * @param setid The DailyMed setid
   * @returns The indication data or null if not found
   */
  async getIndicationBySetId(setid: string): Promise<IndicationData | null> {
    this.logger.log(`Getting indication data for setid: ${setid}`);

    try {
      const key = `${this.INDICATION_KEY_PREFIX}${setid}`;
      const data = await this.redisClient.get(key);

      if (!data) {
        this.logger.log(`No indication data found for setid: ${setid}`);
        return null;
      }

      return JSON.parse(data) as IndicationData;
    } catch (error) {
      this.logger.error(
        `Error getting indication data for setid ${setid}:`,
        error.message,
      );
      return null;
    }
  }

  /**
   * Find setid by drug title (exact or partial match)
   * @param title The drug title to search for
   * @returns The setid if found, null otherwise
   */
  async findSetIdByTitle(title: string): Promise<string | null> {
    const searchTitle = title.toLowerCase();
    this.logger.log(`Searching for setid by title: ${searchTitle}`);

    try {
      const searchKey = `${this.INDICATION_KEY_PREFIX}search:${searchTitle}`;
      const setid = await this.redisClient.get(searchKey);

      if (setid) {
        return setid;
      }

      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redisClient.scan(
          cursor,
          'MATCH',
          `${this.INDICATION_KEY_PREFIX}search:*${searchTitle}*`,
          'COUNT',
          100,
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          const matchKey = keys[0];
          return await this.redisClient.get(matchKey);
        }
      } while (cursor !== '0');

      this.logger.log(`No setid found for title: ${title}`);
      return null;
    } catch (error) {
      this.logger.error(
        `Error finding setid for title ${title}:`,
        error.message,
      );
      return null;
    }
  }

  /**
   * Get all saved indication setids
   * @returns Array of setids
   */
  async getAllIndicationSetIds(): Promise<string[]> {
    try {
      return await this.redisClient.smembers(this.INDICATION_INDEX_SET);
    } catch (error) {
      this.logger.error('Error getting all indication setids:', error.message);
      return [];
    }
  }

  /**
   * Delete indication data by setid
   * @param setid The DailyMed setid
   * @returns Boolean indicating success
   */
  async deleteIndication(setid: string): Promise<boolean> {
    this.logger.log(`Deleting indication data for setid: ${setid}`);

    try {
      const key = `${this.INDICATION_KEY_PREFIX}${setid}`;

      const data = await this.redisClient.get(key);
      if (!data) {
        return false;
      }

      const indicationData: IndicationData = JSON.parse(data) as IndicationData;
      const searchKey = `${this.INDICATION_KEY_PREFIX}search:${indicationData.title.toLowerCase()}`;

      const pipeline = this.redisClient.pipeline();
      pipeline.del(key);
      pipeline.del(searchKey);
      pipeline.srem(this.INDICATION_INDEX_SET, setid);

      await pipeline.exec();

      this.logger.log(
        `Successfully deleted indication data for setid: ${setid}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error deleting indication data for setid ${setid}:`,
        error.message,
      );
      return false;
    }
  }
}
