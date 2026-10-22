#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_REPO="${1:-$SCRIPT_DIR/../../mktg_bivariate_tools}"
TARGET_DIR="${2:-$SCRIPT_DIR/../PraxisPlay/Resources/WebEngine}"

if [ ! -d "$SOURCE_REPO" ]; then
    echo "ℹ️ Source repo not found at $SOURCE_REPO — using already-bundled WebEngine assets."
    exit 0
fi

echo "🔄 Syncing Praxis Play WebEngine from $SOURCE_REPO..."

mkdir -p "$TARGET_DIR/admin_pages/games/js"
mkdir -p "$TARGET_DIR/admin_pages/games/dev_data/snapshots"
mkdir -p "$TARGET_DIR/shared/css"
mkdir -p "$TARGET_DIR/shared/js"
mkdir -p "$TARGET_DIR/art_assets/svg_logos"

cp "$SOURCE_REPO/admin_pages/games/game-play.html" "$TARGET_DIR/admin_pages/games/"
cp "$SOURCE_REPO/admin_pages/games/game-join.html" "$TARGET_DIR/admin_pages/games/"
cp "$SOURCE_REPO/admin_pages/games/js/"*.js "$TARGET_DIR/admin_pages/games/js/"
rm -f "$TARGET_DIR/admin_pages/games/js/game-question-config.js"
cp "$SOURCE_REPO/admin_pages/games/dev_data/snapshots/"*.json "$TARGET_DIR/admin_pages/games/dev_data/snapshots/"
cp "$SOURCE_REPO/shared/css/main.css" "$TARGET_DIR/shared/css/"
cp "$SOURCE_REPO/shared/css/badge-notification.css" "$TARGET_DIR/shared/css/"
[ -f "$SOURCE_REPO/shared/js/error_utils.js" ] && cp "$SOURCE_REPO/shared/js/error_utils.js" "$TARGET_DIR/shared/js/"
[ -f "$SOURCE_REPO/shared/js/badge-notifications.js" ] && cp "$SOURCE_REPO/shared/js/badge-notifications.js" "$TARGET_DIR/shared/js/"
cp "$SOURCE_REPO/art_assets/svg_logos/"*.svg "$TARGET_DIR/art_assets/svg_logos/"

echo "✅ WebEngine sync complete!"
