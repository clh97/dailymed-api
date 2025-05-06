/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { DailyMedClient } from './dailymed.client';
import { of, throwError } from 'rxjs';
import {
  DailyMedData,
  DailyMedRoot,
} from '@application/interfaces/idailymed.client.interface';

const mockHttpService = {
  get: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue('http://test-api.com'),
};

const mockRedisClient = {
  get: jest.fn(),
  setex: jest.fn().mockResolvedValue('OK'),
  on: jest.fn(),
};

describe('DailyMedClient', () => {
  let service: DailyMedClient;
  let httpService: HttpService;
  let redisClient: Redis;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailyMedClient,
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: 'REDIS_CLIENT',
          useValue: mockRedisClient,
        },
      ],
    }).compile();

    service = module.get<DailyMedClient>(DailyMedClient);
    httpService = module.get<HttpService>(HttpService);
    redisClient = module.get<Redis>('REDIS_CLIENT');

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('fetchDataPage', () => {
    const mockPageData: DailyMedData = {
      data: [
        {
          setid: 'setid1',
          title: 'Drug 1',
          published_date: '2023-01-01',
          spl_version: 1,
        },
      ],
      metadata: {
        db_published_date: '2023-01-01',
        elements_per_page: 1,
        current_url: 'http://test-api.com?page=1',
        next_page_url: null,
        total_elements: 1,
        total_pages: 1,
        current_page: 1,
        previous_page: null,
        previous_page_url: null,
        next_page: null,
      },
    };

    it('should return cached data if available', async () => {
      const page = 1;
      const cacheKey = `dailymed_spl_page_${page}`;
      mockRedisClient.get.mockResolvedValue(JSON.stringify(mockPageData));

      const result = await service['fetchDataPage'](page).toPromise();

      expect(redisClient.get).toHaveBeenCalledWith(cacheKey);
      expect(httpService.get).not.toHaveBeenCalled();
      expect(result).toEqual(mockPageData);
    });

    it('should fetch data from API if cache is empty and cache the result', async () => {
      const page = 1;
      const cacheKey = `dailymed_spl_page_${page}`;
      mockRedisClient.get.mockResolvedValue(null);
      const mockAxiosResponse = {
        data: mockPageData,
        status: 200,
        statusText: 'OK',
        headers: {},
      };
      mockHttpService.get.mockReturnValue(of(mockAxiosResponse));

      const result = await service['fetchDataPage'](page).toPromise();

      expect(redisClient.get).toHaveBeenCalledWith(cacheKey);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api.com/services/v2/spls?page=1',
      );
      expect(redisClient.setex).toHaveBeenCalledWith(
        cacheKey,
        60 * 60 * 24,
        JSON.stringify(mockPageData),
      );
      expect(result).toEqual(mockPageData);
    });

    it('should handle API errors', async () => {
      const page = 1;
      const cacheKey = `dailymed_spl_page_${page}`;
      mockRedisClient.get.mockResolvedValue(null);
      mockHttpService.get.mockReturnValue(
        throwError(() => new Error('API failed')),
      );

      await expect(service['fetchDataPage'](page).toPromise()).rejects.toThrow(
        'API failed',
      );

      expect(redisClient.get).toHaveBeenCalledWith(cacheKey);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api.com/services/v2/spls?page=1',
      );
      expect(redisClient.setex).not.toHaveBeenCalled();
    });

    it('should fetch data from API if Redis get fails and cache the result', async () => {
      const page = 1;
      const cacheKey = `dailymed_spl_page_${page}`;
      mockRedisClient.get.mockRejectedValue(new Error('Redis get error'));
      const mockAxiosResponse = {
        data: mockPageData,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      };
      mockHttpService.get.mockReturnValue(of(mockAxiosResponse));

      const result = await service['fetchDataPage'](page).toPromise();

      expect(redisClient.get).toHaveBeenCalledWith(cacheKey);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://test-api.com/services/v2/spls?page=1',
      );

      expect(redisClient.setex).toHaveBeenCalledWith(
        cacheKey,
        60 * 60 * 24,
        JSON.stringify(mockPageData),
      );
      expect(result).toEqual(mockPageData);
    });
  });

  describe('findDataBySetId', () => {
    const setidToFind = 'setid2';
    const mockFoundDatum: DailyMedRoot = {
      setid: setidToFind,
      title: 'Drug 2',
      published_date: '2023-01-02',
      spl_version: 1,
    };

    let fetchDataPageSpy: jest.SpyInstance;

    beforeEach(() => {
      fetchDataPageSpy = jest.spyOn(service as any, 'fetchDataPage');
    });

    it('should find the setid on the first page', async () => {
      const mockPage1: DailyMedData = {
        data: [
          {
            setid: 'setid1',
            title: 'Drug 1',
            published_date: '2023-01-01',
            spl_version: 1,
          },
          mockFoundDatum,
        ],
        metadata: {
          total_pages: 2,
          current_page: 1,
          elements_per_page: 2,
          db_published_date: '',
          current_url: '',
          next_page_url: '',
          total_elements: 4,
          previous_page: null,
          previous_page_url: null,
          next_page: 2,
        },
      };
      fetchDataPageSpy.mockReturnValue(of(mockPage1));

      const result = await service.getSplBySetId(setidToFind);

      expect(fetchDataPageSpy).toHaveBeenCalledTimes(1);
      expect(fetchDataPageSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockFoundDatum);
    });

    it('should find the setid on a subsequent page', async () => {
      const mockPage1: DailyMedData = {
        data: [
          {
            setid: 'setid1',
            title: 'Drug 1',
            published_date: '2023-01-01',
            spl_version: 1,
          },
        ],
        metadata: {
          total_pages: 2,
          current_page: 1,
          elements_per_page: 1,
          db_published_date: '',
          current_url: '',
          next_page_url: '',
          total_elements: 2,
          previous_page: null,
          previous_page_url: null,
          next_page: 2,
        },
      };
      const mockPage2: DailyMedData = {
        data: [mockFoundDatum],
        metadata: {
          total_pages: 2,
          current_page: 2,
          elements_per_page: 1,
          db_published_date: '',
          current_url: '',
          next_page_url: null,
          total_elements: 2,
          previous_page: 1,
          previous_page_url: '',
          next_page: null,
        },
      };
      fetchDataPageSpy
        .mockReturnValueOnce(of(mockPage1))
        .mockReturnValueOnce(of(mockPage2));

      const result = await service.getSplBySetId(setidToFind);

      expect(fetchDataPageSpy).toHaveBeenCalledTimes(2);
      expect(fetchDataPageSpy).toHaveBeenCalledWith(1);
      expect(fetchDataPageSpy).toHaveBeenCalledWith(2);
      expect(result).toEqual(mockFoundDatum);
    });

    it('should return null if setid is not found on any page', async () => {
      const mockPage1: DailyMedData = {
        data: [
          {
            setid: 'setid1',
            title: 'Drug 1',
            published_date: '2023-01-01',
            spl_version: 1,
          },
        ],
        metadata: {
          total_pages: 2,
          current_page: 1,
          elements_per_page: 1,
          db_published_date: '',
          current_url: '',
          next_page_url: '',
          total_elements: 2,
          previous_page: null,
          previous_page_url: null,
          next_page: 2,
        },
      };
      const mockPage2: DailyMedData = {
        data: [
          {
            setid: 'setid3',
            title: 'Drug 3',
            published_date: '2023-01-03',
            spl_version: 1,
          },
        ],
        metadata: {
          total_pages: 2,
          current_page: 2,
          elements_per_page: 1,
          db_published_date: '',
          current_url: '',
          next_page_url: null,
          total_elements: 2,
          previous_page: 1,
          previous_page_url: '',
          next_page: null,
        },
      };
      fetchDataPageSpy
        .mockReturnValueOnce(of(mockPage1))
        .mockReturnValueOnce(of(mockPage2));

      const result = await service.getSplBySetId('nonexistent_setid');

      expect(fetchDataPageSpy).toHaveBeenCalledTimes(2);
      expect(result).toBeNull();
    });

    it('should return null if an API error occurs during pagination', async () => {
      const mockPage1: DailyMedData = {
        data: [
          {
            setid: 'setid1',
            title: 'Drug 1',
            published_date: '2023-01-01',
            spl_version: 1,
          },
        ],
        metadata: {
          total_pages: 2,
          current_page: 1,
          elements_per_page: 1,
          db_published_date: '',
          current_url: '',
          next_page_url: '',
          total_elements: 2,
          previous_page: null,
          previous_page_url: null,
          next_page: 2,
        },
      };
      fetchDataPageSpy
        .mockReturnValueOnce(of(mockPage1))
        .mockReturnValueOnce(
          throwError(() => new Error('Pagination API failed')),
        );

      const result = await service.getSplBySetId(setidToFind);

      expect(fetchDataPageSpy).toHaveBeenCalledTimes(2);
      expect(result).toBeNull();
    });

    it('should handle initial page fetch error', async () => {
      fetchDataPageSpy.mockReturnValue(
        throwError(() => new Error('Initial fetch failed')),
      );

      const result = await service.getSplBySetId(setidToFind);

      expect(fetchDataPageSpy).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });
  });
});
