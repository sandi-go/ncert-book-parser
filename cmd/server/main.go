package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	"ncert-book-parser/internal/api"
	"ncert-book-parser/internal/parser"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	tmpDir := os.Getenv("TMP_DIR")
	if tmpDir == "" {
		tmpDir = filepath.Join(os.TempDir(), "ncert-parser")
	}
	os.MkdirAll(tmpDir, 0755)

	p := parser.New(tmpDir)
	h := api.NewHandler(p, tmpDir)

	mux := http.NewServeMux()
	mux.HandleFunc("/health", h.Health)
	mux.HandleFunc("/api/v1/parse", h.ParsePDF)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprint(w, `{"service":"ncert-book-parser","version":"`+parser.ParserVersion+`","endpoints":["GET /health","POST /api/v1/parse"]}`)
	})

	addr := ":" + port
	log.Printf("NCERT Book Parser microservice starting on %s ...", addr)
	log.Printf("POST a PDF to /api/v1/parse (multipart field 'file')")
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
