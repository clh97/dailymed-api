import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { Observable, firstValueFrom } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import Redis from 'ioredis';
import {
  DailyMedData,
  DailyMedRoot,
  IDailyMedClient,
} from '@application/interfaces/idailymed.client.interface';

@Injectable()
export class DailyMedClient implements IDailyMedClient {
  private readonly logger = new Logger(DailyMedClient.name);
  private readonly baseUrl: string;
  private redisClient: Redis;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT')
    redisClient: Redis,
  ) {
    this.baseUrl = this.configService.get(
      'DAILYMED_API_BASE_URL',
      'http://localhost:3001/api',
    );
    this.redisClient = redisClient;

    this.redisClient.on('error', (err) => {
      this.logger.error('Redis Client Error', err);
    });
  }

  /**
   * Fetches a single page of data from the DailyMed API.
   * Caches the response in Redis.
   * @param page The page number to fetch.
   * @returns An Observable of the RootInterface.
   */
  fetchDataPage(
    page: number,
    key: string = 'dailymed_spl_page',
  ): Observable<DailyMedData> {
    const url = `${this.baseUrl}/services/v2/spls?page=${page}`;
    const cacheKey = `${key}_${page}`;
    const cacheTTL = 60 * 60 * 24;

    return new Observable<DailyMedData>((observer) => {
      // Lets check cache first
      this.redisClient
        .get(cacheKey)
        .then((cachedData) => {
          if (cachedData) {
            this.logger.log(`Cache hit for ${cacheKey}`);
            observer.next(JSON.parse(cachedData));
            observer.complete();
          } else {
            this.logger.log(`Cache miss for ${cacheKey}. Fetching from API.`);
            this.httpService
              .get<DailyMedData>(url)
              .pipe(
                map((response: AxiosResponse<DailyMedData>) => response.data),
                catchError((error: Error) => {
                  this.logger.error(
                    `Error fetching data from ${url}`,
                    error.message,
                  );
                  throw error;
                }),
              )
              .subscribe({
                next: (data) => {
                  // Cache data
                  this.redisClient
                    .setex(cacheKey, cacheTTL, JSON.stringify(data))
                    .catch((cacheError) =>
                      this.logger.error(
                        `Error setting cache for ${cacheKey}`,
                        cacheError,
                      ),
                    );
                  observer.next(data);
                  observer.complete();
                },
                error: (err) => observer.error(err),
              });
          }
        })
        .catch((cacheError) => {
          this.logger.error(
            `Error accessing Redis cache for ${cacheKey}`,
            cacheError,
          );
          // No cache, proceed to fetch
          this.httpService
            .get<DailyMedData>(url)
            .pipe(
              map((response: AxiosResponse<DailyMedData>) => response.data),
              catchError((error: Error) => {
                this.logger.error(
                  `Error fetching data from ${url} after cache error`,
                  error.message,
                );
                throw error;
              }),
            )
            .subscribe({
              next: (data) => {
                // attempt to cache again
                this.redisClient
                  .setex(cacheKey, cacheTTL, JSON.stringify(data))
                  .catch((cacheError) =>
                    this.logger.error(
                      `Error setting cache for ${cacheKey} after cache error`,
                      cacheError,
                    ),
                  );
                observer.next(data);
                observer.complete();
              },
              error: (err) => observer.error(err),
            });
        });
    });
  }

  /**
   * Fetches XML data for a specific setid from the DailyMed FDA endpoint.
   * Caches the XML data in Redis.
   * @param setid The setid to fetch XML for.
   * @returns A Promise resolving to the XML data string or null if fetching fails.
   */
  async fetchLabelXMLBySetId(setid: string): Promise<string | null> {
    const url = `${this.baseUrl}/fda/fdaDrugXsl.cfm?setid=${setid}&type=xml`;
    const cacheKey = `${setid}:dailymed_label_xml`;
    const cacheTTL = 60 * 60 * 24;

    this.logger.log(`Attempting to fetch XML for setid: ${setid}`);

    try {
      // Check cache first
      const cachedXml = await this.redisClient.get(cacheKey);
      if (cachedXml) {
        this.logger.debug(`Cache hit for XML cacheKey: ${cacheKey}`);
        return cachedXml;
      }

      this.logger.log(
        `Cache miss for XML cacheKey: ${cacheKey}. Fetching from FDA endpoint.`,
      );

      const response = await firstValueFrom(
        this.httpService.get(url, { responseType: 'text' }).pipe(
          catchError((error) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            this.logger.error(`Error fetching XML from ${url}`, error.message);
            throw new Error(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              `Failed to fetch XML for setid ${setid}: ${error.message}`,
            );
          }),
        ),
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const xmlData = response.data;

      // Cache the XML data
      await this.redisClient
        .setex(cacheKey, cacheTTL, String(xmlData))
        .catch((cacheError) =>
          this.logger.error(
            `Error setting XML cache for ${cacheKey}`,
            cacheError,
          ),
        );

      this.logger.log(
        `Successfully fetched and cached XML for setid: ${setid}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return xmlData;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve or process XML for setid ${setid}:`,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        error.message,
      );
      return null;
    }
  }

  /**
   * Search for spl_item with specific setid across all pages, utilizing cached data.
   * @param setid The setid to search for.
   * @returns A Promise resolving to the DailyMedDatum if found, or null if not found.
   */
  async getSplBySetId(setid: string): Promise<DailyMedRoot | null> {
    let currentPage = 1;
    let totalPages = 1;

    while (currentPage <= totalPages) {
      try {
        const pageData = await firstValueFrom(this.fetchDataPage(currentPage));
        totalPages = pageData.metadata.total_pages;

        const foundItem = pageData.data.find((item) => item.setid === setid);
        if (foundItem) {
          this.logger.log(`Setid ${setid} found on page ${currentPage}`);
          return foundItem;
        }

        this.logger.log(
          `Setid ${setid} not found on page ${currentPage}. Moving to the next page.`,
        );
        currentPage++;
      } catch (error) {
        this.logger.error(
          `Failed to fetch or process page ${currentPage}:`,
          error,
        );
        return null;
      }
    }

    this.logger.log(`Setid ${setid} not found after checking all pages.`);
    return null;
  }

  /**
   * Search for a spl_item including a title, utilizing cached data.
   * @param title The title to search for
   * @returns A Promise resolving to the DailyMedDatum if found, or null if not found.
   */
  async findSplByTitle(title: string): Promise<DailyMedRoot | null> {
    let currentPage = 1;
    let totalPages = 1;
    const lowerCaseSearchTitle = title.toLowerCase();

    this.logger.log(`Searching for drug with title: "${title}"`);

    while (currentPage <= totalPages) {
      try {
        const pageData = await firstValueFrom(this.fetchDataPage(currentPage));
        totalPages = pageData.metadata.total_pages;

        // Find matching text in search term (case-insensitive)
        const foundItem = pageData.data.find(
          (item) =>
            item.title &&
            item.title.toLowerCase().includes(lowerCaseSearchTitle),
        );
        if (foundItem) {
          this.logger.log(
            `Title match found on page ${currentPage} for title: "${title}"`,
          );
          return foundItem;
        }
        this.logger.log(
          `Title "${title}" not found on page ${currentPage}. Moving to the next page.`,
        );
        currentPage++;
      } catch (error) {
        this.logger.error(
          `Failed to fetch or process page ${currentPage} while searching for title "${title}":`,
          error,
        );
        return null;
      }
    }

    this.logger.log(`Title "${title}" not found after checking all pages.`);
    return null;
  }
}
