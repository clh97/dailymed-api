import { Observable } from 'rxjs';

export interface DailyMedData {
  data: DailyMedRoot[];
  metadata: DailyMedMetadata;
}

export interface DailyMedMetadata {
  db_published_date: string;
  elements_per_page: number;
  current_url: string;
  next_page_url: string | null;
  total_elements: number;
  total_pages: number;
  current_page: number;
  previous_page: number | null;
  previous_page_url: string | null;
  next_page: number | null;
}

export interface DailyMedRoot {
  spl_version: number;
  published_date: string;
  title: string;
  setid: string;
}

export interface DailyMedAggregatedData {
  metadata: DailyMedRoot;
  data: string;
}

export interface IDailyMedClient {
  fetchDataPage(page: number, key: string): Observable<DailyMedData>;
  fetchLabelXMLBySetId(setid: string): Promise<string | null>;

  getSplBySetId(setId: string): Promise<DailyMedRoot | null>;
  findSplByTitle(title: string): Promise<DailyMedRoot | null>;
}
