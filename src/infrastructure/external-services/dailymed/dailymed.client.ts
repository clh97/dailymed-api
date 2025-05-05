import { Injectable, Logger, Inject } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { ConfigService } from "@nestjs/config";
import { AxiosResponse } from "axios";
import { Observable, firstValueFrom } from "rxjs";
import { map, catchError } from "rxjs/operators";
import Redis from "ioredis"; // Using ioredis as an example
import {
  DailyMedData,
  DailyMedDatum,
} from "@application/interfaces/idailymed.client.interface";

@Injectable()
export class DailyMedClient {
  private readonly logger = new Logger(DailyMedClient.name);
  private readonly baseUrl: string;
  private redisClient: Redis;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject("REDIS_CLIENT")
    redisClient: Redis,
  ) {
    this.baseUrl = this.configService.get(
      "DAILYMED_API_BASE_URL",
      "http://localhost:3001/api",
    );
    this.redisClient = redisClient;

    // Basic error handling
    this.redisClient.on("error", (err) => {
      this.logger.error("Redis Client Error", err);
    });
  }

  /**
   * Fetches a single page of data from the DailyMed API.
   * Caches the response in Redis.
   * @param page The page number to fetch.
   * @returns An Observable of the RootInterface.
   */
  private fetchDataPage(page: number): Observable<DailyMedData> {
    const url = `${this.baseUrl}?page=${page}`;
    const cacheKey = `dailymed_page_${page}`;
    const cacheTTL = 60 * 60 * 24; // 24h

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
                  throw error; // caught by the subscriber
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
   * Search for specific setid across all pages, utilizing cached data.
   * @param setid The setid to search for.
   * @returns A Promise resolving to the Datum if found, or null if not found.
   */
  async findDataBySetId(setid: string): Promise<DailyMedDatum | null> {
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
}
