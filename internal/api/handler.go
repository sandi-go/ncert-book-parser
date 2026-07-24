package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"ncert-book-parser/internal/models"
	"ncert-book-parser/internal/parser"
)

type Handler struct {
	Parser *parser.Parser
	TmpDir string
}

func NewHandler(p *parser.Parser, tmpDir string) *Handler {
	if tmpDir == "" {
		tmpDir = os.TempDir()
	}
	return &Handler{Parser: p, TmpDir: tmpDir}
}

// ParsePDF handles POST /api/v1/parse
// Accepts multipart/form-data with field "file" (PDF)
// Optional form fields: class, subject, title, chapter_number
func (h *Handler) ParsePDF(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error":"method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	// Limit upload size ~100MB for full books
	r.Body = http.MaxBytesReader(w, r.Body, 100<<20)
	if err := r.ParseMultipartForm(100 << 20); err != nil {
		writeJSONError(w, http.StatusBadRequest, "failed to parse multipart form: "+err.Error())
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "missing or invalid 'file' field (expected PDF)")
		return
	}
	defer file.Close()

	if !strings.HasSuffix(strings.ToLower(header.Filename), ".pdf") {
		writeJSONError(w, http.StatusBadRequest, "only PDF files are supported")
		return
	}

	// Save to temp
	tmpPath := filepath.Join(h.TmpDir, fmt.Sprintf("ncert-%d-%s", time.Now().UnixNano(), header.Filename))
	out, err := os.Create(tmpPath)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to create temp file")
		return
	}
	defer os.Remove(tmpPath)
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to save uploaded file")
		return
	}
	out.Close()

	// Optional metadata
	meta := models.BookMeta{
		Title:   r.FormValue("title"),
		Subject: r.FormValue("subject"),
		Class:   r.FormValue("class"),
	}

	result, err := h.Parser.ParseFile(tmpPath, meta)
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "parse failed: "+err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	enc := json.NewEncoder(w)
	enc.SetIndent("", "  ")
	if err := enc.Encode(result); err != nil {
		// already wrote headers
		fmt.Fprintf(os.Stderr, "json encode error: %v\n", err)
	}
}

// Health check
func (h *Handler) Health(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "ok",
		"version": parser.ParserVersion,
		"time":    time.Now().UTC().Format(time.RFC3339),
	})
}

func writeJSONError(w http.ResponseWriter, code int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}
