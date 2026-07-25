export interface Block {
  id?: string;
  type: string;
  text?: string;
  html?: string;
  level?: number;
  image?: string;
  bbox?: number[][];
  children?: Block[];
}

export interface Page {
  page_number: number;
  blocks: Block[];
}

export interface Book {
  title: string;
  source_file: string;
  total_pages: number;
  pages: Page[];
  images_base_path?: string;
}

export interface ChapterMeta {
  filename: string;
  title: string;
  total_pages: number;
  source_file?: string;
}
