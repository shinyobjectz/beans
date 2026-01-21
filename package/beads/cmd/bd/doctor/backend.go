package doctor

import (
	"path/filepath"

	"github.com/steveyegge/beads/internal/configfile"
)

// getBackendAndBeadsDir resolves the effective .beans directory (following redirects)
// and returns the configured storage backend ("sqlite" by default, or "dolt").
func getBackendAndBeadsDir(repoPath string) (backend string, beadsDir string) {
	beadsDir = resolveBeadsDir(filepath.Join(repoPath, ".beans"))

	cfg, err := configfile.Load(beadsDir)
	if err != nil || cfg == nil {
		return configfile.BackendSQLite, beadsDir
	}
	return cfg.GetBackend(), beadsDir
}
