package parser

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"ncert-book-parser/internal/models"
)

const ParserVersion = "0.1.0-alpha"

// Parser is the main NCERT PDF parser.
// It uses system tools (pdftotext from poppler, mutool from mupdf) for high-quality extraction.
type Parser struct {
	WorkDir string // temporary working directory for intermediate files
}

func New(workDir string) *Parser {
	if workDir == "" {
		workDir = os.TempDir()
	}
	return &Parser{WorkDir: workDir}
}

// ParseFile parses a full PDF (book or single chapter) and returns structured JSON-ready result.
func (p *Parser) ParseFile(pdfPath string, meta models.BookMeta) (*models.BookParseResult, error) {
	if _, err := os.Stat(pdfPath); err != nil {
		return nil, fmt.Errorf("pdf not found: %w", err)
	}

	totalPages, err := p.getPageCount(pdfPath)
	if err != nil {
		return nil, fmt.Errorf("failed to get page count: %w", err)
	}

	meta.SourceFile = filepath.Base(pdfPath)
	meta.TotalPages = totalPages
	meta.ParsedAt = time.Now().UTC().Format(time.RFC3339)
	meta.ParserVersion = ParserVersion

	// Extract full text with layout preservation
	fullText, err := p.extractText(pdfPath, 1, totalPages)
	if err != nil {
		return nil, fmt.Errorf("text extraction failed: %w", err)
	}

	// Detect chapters (works for both full books and single-chapter PDFs)
	chapters := p.detectChapters(fullText, totalPages)

	result := &models.BookParseResult{
		Meta:         meta,
		Chapters:     make([]models.Chapter, 0, len(chapters)),
		ContentIndex: make(map[string]models.ContentRef),
	}

	for i, ch := range chapters {
		chapterID := fmt.Sprintf("ch-%d", ch.Number)
		if ch.Number == 0 {
			chapterID = fmt.Sprintf("ch-unknown-%d", i+1)
		}

		pages := make([]models.Page, 0)
		var allChapterQuestions []models.Question

		for pageNum := ch.StartPage; pageNum <= ch.EndPage; pageNum++ {
			pageText, err := p.extractText(pdfPath, pageNum, pageNum)
			if err != nil {
				// continue on single page failure
				pageText = ""
			}

			page := p.parsePage(pageText, pageNum, chapterID)
			pages = append(pages, page)

			// Collect questions that look like exercise questions
			for _, q := range page.InPageQuestions {
				if isExerciseStyle(q) {
					allChapterQuestions = append(allChapterQuestions, q)
				}
			}

			// Index content
			result.ContentIndex[page.ID] = models.ContentRef{Type: "page", ChapterID: chapterID, PageID: page.ID, ID: page.ID}
			for _, para := range page.Paragraphs {
				result.ContentIndex[para.ID] = models.ContentRef{Type: "paragraph", ChapterID: chapterID, PageID: page.ID, ID: para.ID}
			}
			for _, q := range page.InPageQuestions {
				result.ContentIndex[q.ID] = models.ContentRef{Type: "question", ChapterID: chapterID, PageID: page.ID, ID: q.ID}
			}
			for _, h := range page.Headers {
				result.ContentIndex[h.ID] = models.ContentRef{Type: "header", ChapterID: chapterID, PageID: page.ID, ID: h.ID}
			}
		}

		// Better chapter question extraction: look for "Exercises", "Questions", "Think and Answer" blocks
		chapterQuestions := p.extractChapterQuestions(pages, chapterID)

		result.Chapters = append(result.Chapters, models.Chapter{
			ID:               chapterID,
			Number:           ch.Number,
			Title:            ch.Title,
			StartPage:        ch.StartPage,
			EndPage:          ch.EndPage,
			Pages:            pages,
			ChapterQuestions: chapterQuestions,
		})
	}

	// If no chapters detected (common for pure chapter PDFs), treat whole as one chapter
	if len(result.Chapters) == 0 {
		chapterID := "ch-1"
		pages := make([]models.Page, 0, totalPages)
		for pageNum := 1; pageNum <= totalPages; pageNum++ {
			pageText, _ := p.extractText(pdfPath, pageNum, pageNum)
			page := p.parsePage(pageText, pageNum, chapterID)
			pages = append(pages, page)
			result.ContentIndex[page.ID] = models.ContentRef{Type: "page", ChapterID: chapterID, PageID: page.ID, ID: page.ID}
			for _, para := range page.Paragraphs {
				result.ContentIndex[para.ID] = models.ContentRef{Type: "paragraph", ChapterID: chapterID, PageID: page.ID, ID: para.ID}
			}
			for _, q := range page.InPageQuestions {
				result.ContentIndex[q.ID] = models.ContentRef{Type: "question", ChapterID: chapterID, PageID: page.ID, ID: q.ID}
			}
		}
		title := meta.Title
		if title == "" {
			title = "Chapter"
		}
		result.Chapters = append(result.Chapters, models.Chapter{
			ID:               chapterID,
			Number:           1,
			Title:            title,
			StartPage:        1,
			EndPage:          totalPages,
			Pages:            pages,
			ChapterQuestions: p.extractChapterQuestions(pages, chapterID),
		})
	}

	return result, nil
}

// --- Internal helpers ---

type detectedChapter struct {
	Number    int
	Title     string
	StartPage int
	EndPage   int
}

func (p *Parser) getPageCount(pdfPath string) (int, error) {
	cmd := exec.Command("pdfinfo", pdfPath)
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		// fallback to mutool
		cmd = exec.Command("mutool", "info", pdfPath)
		out.Reset()
		cmd.Stdout = &out
		if err2 := cmd.Run(); err2 != nil {
			return 0, err
		}
	}
	re := regexp.MustCompile(`(?i)pages:\s*(\d+)`)
	m := re.FindStringSubmatch(out.String())
	if len(m) < 2 {
		return 0, fmt.Errorf("could not parse page count from pdfinfo")
	}
	return strconv.Atoi(m[1])
}

func (p *Parser) extractText(pdfPath string, from, to int) (string, error) {
	// -layout keeps visual structure, -nopgbrk removes form feeds between pages when multi
	args := []string{"-layout", "-nopgbrk", "-f", strconv.Itoa(from), "-l", strconv.Itoa(to), pdfPath, "-"}
	cmd := exec.Command("pdftotext", args...)
	var out bytes.Buffer
	var stderr bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return "", fmt.Errorf("pdftotext failed: %v, stderr: %s", err, stderr.String())
	}
	return out.String(), nil
}

func (p *Parser) detectChapters(fullText string, totalPages int) []detectedChapter {
	// Heuristic patterns common in NCERT books
	// "Chapter 1\nThe Living World" or "CHAPTER 1" etc.
	chapterRe := regexp.MustCompile(`(?im)^(?:\s*)(?:Chapter|CHAPTER|अध्याय)\s+(\d+)[\s\.\-]*(.*)$`)

	lines := strings.Split(fullText, "\n")
	var chapters []detectedChapter
	pageApprox := 1 // rough page tracking is hard without form feeds; we improve later

	for i, line := range lines {
		line = strings.TrimSpace(line)
		if m := chapterRe.FindStringSubmatch(line); len(m) >= 2 {
			num, _ := strconv.Atoi(m[1])
			title := strings.TrimSpace(m[2])
			// Look ahead a few lines for multi-line titles
			if title == "" && i+1 < len(lines) {
				next := strings.TrimSpace(lines[i+1])
				if next != "" && !chapterRe.MatchString(next) && len(next) < 80 {
					title = next
				}
			}
			chapters = append(chapters, detectedChapter{
				Number:    num,
				Title:     title,
				StartPage: pageApprox, // placeholder; refined by page extraction
				EndPage:   totalPages,
			})
		}
	}

	// Fix end pages
	for i := 0; i < len(chapters)-1; i++ {
		chapters[i].EndPage = chapters[i+1].StartPage - 1
		if chapters[i].EndPage < chapters[i].StartPage {
			chapters[i].EndPage = chapters[i].StartPage
		}
	}
	if len(chapters) > 0 {
		chapters[len(chapters)-1].EndPage = totalPages
	}

	return chapters
}

func (p *Parser) parsePage(pageText string, pageNum int, chapterID string) models.Page {
	pageID := fmt.Sprintf("page-%d", pageNum)
	page := models.Page{
		ID:         pageID,
		PageNumber: pageNum,
		ChapterID:  chapterID,
		RawText:    pageText,
	}

	lines := strings.Split(pageText, "\n")
	var currentPara strings.Builder
	paraOrder := 0
	headerOrder := 0
	qOrder := 0

	// Simple state machine for headers, paragraphs, questions
	headerRe := regexp.MustCompile(`(?i)^(Chapter\s+\d+|Unit\s+\d+|Exercises?|Questions?|Think and Discuss|What you have learnt|Summary|Activities?|Let us try|Try these)`)
	questionStartRe := regexp.MustCompile(`^(\d+[\.\)]|\([a-z]\)|[Qq]\d+[\.\)]|\d+\.\d+)\s+(.+)`)
	// More patterns later for MCQ options etc.

	for _, rawLine := range lines {
		line := strings.TrimRight(rawLine, " \t")
		trimmed := strings.TrimSpace(line)

		if trimmed == "" {
			// flush paragraph
			if currentPara.Len() > 0 {
				paraOrder++
				pid := fmt.Sprintf("p-%s-%d-%d", chapterID, pageNum, paraOrder)
				page.Paragraphs = append(page.Paragraphs, models.Paragraph{
					ID:    pid,
					Text:  strings.TrimSpace(currentPara.String()),
					Order: paraOrder,
				})
				currentPara.Reset()
			}
			continue
		}

		// Detect header
		if headerRe.MatchString(trimmed) && len(trimmed) < 100 {
			if currentPara.Len() > 0 {
				paraOrder++
				pid := fmt.Sprintf("p-%s-%d-%d", chapterID, pageNum, paraOrder)
				page.Paragraphs = append(page.Paragraphs, models.Paragraph{
					ID:    pid,
					Text:  strings.TrimSpace(currentPara.String()),
					Order: paraOrder,
				})
				currentPara.Reset()
			}
			headerOrder++
			level := 2
			if strings.HasPrefix(strings.ToLower(trimmed), "chapter") {
				level = 1
			}
			hid := fmt.Sprintf("h-%s-%d-%d", chapterID, pageNum, headerOrder)
			page.Headers = append(page.Headers, models.Header{
				ID:    hid,
				Level: level,
				Text:  trimmed,
				Order: headerOrder,
			})
			continue
		}

		// Detect question start
		if m := questionStartRe.FindStringSubmatch(trimmed); len(m) >= 3 {
			if currentPara.Len() > 0 {
				paraOrder++
				pid := fmt.Sprintf("p-%s-%d-%d", chapterID, pageNum, paraOrder)
				page.Paragraphs = append(page.Paragraphs, models.Paragraph{
					ID:    pid,
					Text:  strings.TrimSpace(currentPara.String()),
					Order: paraOrder,
				})
				currentPara.Reset()
			}
			qOrder++
			qid := fmt.Sprintf("q-%s-%d-%d", chapterID, pageNum, qOrder)
			qType := detectQuestionType(m[2])
			page.InPageQuestions = append(page.InPageQuestions, models.Question{
				ID:         qid,
				Number:     m[1],
				Text:       m[2],
				Type:       qType,
				PageNumber: pageNum,
				ChapterID:  chapterID,
				Order:      qOrder,
			})
			continue
		}

		// Normal text line -> paragraph
		if currentPara.Len() > 0 {
			currentPara.WriteString(" ")
		}
		currentPara.WriteString(trimmed)
	}

	// flush last
	if currentPara.Len() > 0 {
		paraOrder++
		pid := fmt.Sprintf("p-%s-%d-%d", chapterID, pageNum, paraOrder)
		page.Paragraphs = append(page.Paragraphs, models.Paragraph{
			ID:    pid,
			Text:  strings.TrimSpace(currentPara.String()),
			Order: paraOrder,
		})
	}

	return page
}

func detectQuestionType(text string) string {
	lower := strings.ToLower(text)
	if strings.Contains(lower, "choose the correct") || strings.Contains(lower, "mcq") || strings.Contains(lower, "multiple choice") {
		return "mcq"
	}
	if strings.Contains(lower, "true or false") || strings.Contains(lower, "true/false") {
		return "true_false"
	}
	if strings.Contains(lower, "fill in the blank") || strings.Contains(lower, "fill in the blanks") {
		return "fill_blank"
	}
	if strings.Contains(lower, "match the following") {
		return "match"
	}
	if len(text) > 200 {
		return "long"
	}
	return "short"
}

func isExerciseStyle(q models.Question) bool {
	// Simple heuristic; can be improved with context of "Exercises" header
	return true
}

func (p *Parser) extractChapterQuestions(pages []models.Page, chapterID string) []models.Question {
	var qs []models.Question
	inExercises := false
	for _, page := range pages {
		for _, h := range page.Headers {
			if strings.Contains(strings.ToLower(h.Text), "exercise") ||
				strings.Contains(strings.ToLower(h.Text), "questions") ||
				strings.Contains(strings.ToLower(h.Text), "think and answer") {
				inExercises = true
			}
		}
		if inExercises {
			for _, q := range page.InPageQuestions {
				q.ChapterID = chapterID
				qs = append(qs, q)
			}
		}
	}
	// Also include all questions if none found in exercises (fallback)
	if len(qs) == 0 {
		for _, page := range pages {
			qs = append(qs, page.InPageQuestions...)
		}
	}
	return qs
}
