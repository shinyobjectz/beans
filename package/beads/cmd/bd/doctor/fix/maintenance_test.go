package fix

import (
	"os"
	"path/filepath"
	"testing"
)

func TestStaleClosedIssues_NoDatabase(t *testing.T) {
	// Create temp directory with .beans but no database
	tmpDir := t.TempDir()
	beadsDir := filepath.Join(tmpDir, ".beans")
	if err := os.MkdirAll(beadsDir, 0755); err != nil {
		t.Fatalf("failed to create .beans dir: %v", err)
	}

	// Should succeed without database
	err := StaleClosedIssues(tmpDir)
	if err != nil {
		t.Errorf("expected no error, got: %v", err)
	}
}

func TestStaleClosedIssues_NoBeadsDir(t *testing.T) {
	tmpDir := t.TempDir()

	// Should fail without .beans directory
	err := StaleClosedIssues(tmpDir)
	if err == nil {
		t.Error("expected error for missing .beans directory")
	}
}

func TestExpiredTombstones_NoJSONL(t *testing.T) {
	// Create temp directory with .beans but no JSONL
	tmpDir := t.TempDir()
	beadsDir := filepath.Join(tmpDir, ".beans")
	if err := os.MkdirAll(beadsDir, 0755); err != nil {
		t.Fatalf("failed to create .beans dir: %v", err)
	}

	// Should succeed without JSONL
	err := ExpiredTombstones(tmpDir)
	if err != nil {
		t.Errorf("expected no error, got: %v", err)
	}
}

func TestExpiredTombstones_NoBeadsDir(t *testing.T) {
	tmpDir := t.TempDir()

	// Should fail without .beans directory
	err := ExpiredTombstones(tmpDir)
	if err == nil {
		t.Error("expected error for missing .beans directory")
	}
}

func TestExpiredTombstones_EmptyJSONL(t *testing.T) {
	// Create temp directory with .beans and empty JSONL
	tmpDir := t.TempDir()
	beadsDir := filepath.Join(tmpDir, ".beans")
	if err := os.MkdirAll(beadsDir, 0755); err != nil {
		t.Fatalf("failed to create .beans dir: %v", err)
	}

	jsonlPath := filepath.Join(beadsDir, "issues.jsonl")
	if err := os.WriteFile(jsonlPath, []byte{}, 0644); err != nil {
		t.Fatalf("failed to create issues.jsonl: %v", err)
	}

	// Should succeed with empty JSONL
	err := ExpiredTombstones(tmpDir)
	if err != nil {
		t.Errorf("expected no error, got: %v", err)
	}
}
