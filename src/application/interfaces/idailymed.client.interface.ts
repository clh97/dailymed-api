export interface DailyMedData {
  data: DailyMedDatum[];
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

export interface DailyMedDatum {
  spl_version: number;
  published_date: string;
  title: string;
  setid: string;
}

export interface IDailyMedClient {
  findBySetId(setId: string): Promise<DailyMedDatum | null>;
  getAllPages(): Promise<DailyMedDatum[]>;
}
