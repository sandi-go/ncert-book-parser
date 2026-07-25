export interface RelBox {
  x: number; // % from left
  y: number; // % from top
  w: number; // % width
  h: number; // % height
}

export interface Block {
  id?: string;
  type: string;
  text?: string;
  html?: string;
  level?: number;
  image?: string;
  bbox?: number[]; // [x1,y1,x2,y2]
  rel?: RelBox;
  children?: Block[];
}

export interface Page {
  page_number: number;
  blocks: Block[];
  bbox?: number[];
  aspect?: number; // width/height
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
