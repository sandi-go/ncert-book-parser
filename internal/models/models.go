package models

// BookParseResult is the top-level response for a parsed NCERT PDF.
// Designed so any sub-object (paragraph, question, image, page) can be
// referenced independently for downstream question generation pipelines.
type BookParseResult struct {
	Meta     BookMeta  `json:"meta"`
	Chapters []Chapter `json:"chapters"`
	// Flat index for quick lookup of any content unit by ID
	ContentIndex map[string]ContentRef `json:"content_index,omitempty"`
}

type BookMeta struct {
	Title       string `json:"title,omitempty"`
	Subject     string `json:"subject,omitempty"`
	Class       string `json:"class,omitempty"`
	SourceFile  string `json:"source_file"`
	TotalPages  int    `json:"total_pages"`
	ParsedAt    string `json:"parsed_at"`
	ParserVersion string `json:"parser_version"`
}

type Chapter struct {
	ID               string     `json:"id"` // e.g. "ch-1"
	Number           int        `json:"number"`
	Title            string     `json:"title"`
	StartPage        int        `json:"start_page"`
	EndPage          int        `json:"end_page"`
	Pages            []Page     `json:"pages"`
	// All exercise / end-of-chapter questions aggregated
	ChapterQuestions []Question `json:"chapter_questions"`
}

type Page struct {
	ID               string       `json:"id"` // e.g. "page-12"
	PageNumber       int          `json:"page_number"`
	ChapterID        string       `json:"chapter_id,omitempty"`
	Headers          []Header     `json:"headers"`
	Paragraphs       []Paragraph  `json:"paragraphs"`
	Images           []Image      `json:"images"`
	// Questions that appear inline on this page (not in exercises section)
	InPageQuestions  []Question   `json:"in_page_questions"`
	RawText          string       `json:"raw_text,omitempty"` // full page text for debugging / fallback
}

type Header struct {
	ID    string `json:"id"`
	Level int    `json:"level"` // 1 = chapter title, 2 = section, 3 = subsection
	Text  string `json:"text"`
	Order int    `json:"order"`
}

type Paragraph struct {
	ID    string `json:"id"` // unique, e.g. "p-ch1-12-3"
	Text  string `json:"text"`
	Order int    `json:"order"`
	// Optional position hints if available
	BBox  *BBox  `json:"bbox,omitempty"`
}

type Image struct {
	ID          string `json:"id"`
	Filename    string `json:"filename,omitempty"`
	Caption     string `json:"caption,omitempty"`
	PageNumber  int    `json:"page_number"`
	// Base64 encoded if small, or omitted for large; prefer external storage in prod
	Base64Data  string `json:"base64_data,omitempty"`
	ContentType string `json:"content_type,omitempty"`
	Width       int    `json:"width,omitempty"`
	Height      int    `json:"height,omitempty"`
	Order       int    `json:"order"`
}

type Question struct {
	ID         string   `json:"id"` // unique for referencing in Q-gen
	Number     string   `json:"number"` // "1", "1.1", "Q2" etc
	Text       string   `json:"text"`
	Type       string   `json:"type"` // "short", "long", "mcq", "fill_blank", "true_false", "match", "numerical", "unknown"
	Options    []string `json:"options,omitempty"`
	PageNumber int      `json:"page_number"`
	ChapterID  string   `json:"chapter_id,omitempty"`
	// Marks if detectable
	Marks      *int     `json:"marks,omitempty"`
	Order      int      `json:"order"`
}

// ContentRef allows flat lookup of any unit by its ID for question generation
type ContentRef struct {
	Type      string `json:"type"` // "paragraph", "question", "header", "image", "page"
	ChapterID string `json:"chapter_id,omitempty"`
	PageID    string `json:"page_id,omitempty"`
	ID        string `json:"id"`
}

type BBox struct {
	X0 float64 `json:"x0"`
	Y0 float64 `json:"y0"`
	X1 float64 `json:"x1"`
	Y1 float64 `json:"y1"`
}
