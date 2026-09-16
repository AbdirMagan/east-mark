#!/usr/bin/env bash
# One command to get the iOS app open in Xcode on a Mac.
#
#   cd ios && ./setup.sh                      # simulator build
#   API_BASE_URL=http://192.168.1.50:4000/api/v1 ./setup.sh   # a real iPhone
#
# It installs XcodeGen if it is missing, writes the API address and the
# Supabase anon key into the generated project, and opens Xcode.
set -euo pipefail

cd "$(dirname "$0")"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This needs macOS with Xcode: the iOS SDK and Simulator do not exist elsewhere." >&2
  exit 1
fi

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "Xcode is not installed. Get it from the App Store, then run: sudo xcode-select --switch /Applications/Xcode.app" >&2
  exit 1
fi

if ! command -v xcodegen >/dev/null 2>&1; then
  echo "Installing XcodeGen..."
  if command -v brew >/dev/null 2>&1; then
    brew install xcodegen
  else
    echo "Homebrew is not installed. Install it from https://brew.sh, or create the project manually (see README.md)." >&2
    exit 1
  fi
fi

# Where the backend is, as seen from the device running the app. A simulator
# shares the Mac's localhost; a real iPhone needs the Mac's Wi-Fi address.
API_BASE_URL="${API_BASE_URL:-http://localhost:4000/api/v1}"
LAN_IP="$(ipconfig getifaddr en0 2>/dev/null || true)"

echo "API_BASE_URL: $API_BASE_URL"
if [[ "$API_BASE_URL" == *localhost* && -n "$LAN_IP" ]]; then
  echo "For a real iPhone, run: API_BASE_URL=http://$LAN_IP:4000/api/v1 ./setup.sh"
fi

if [[ -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo
  echo "SUPABASE_ANON_KEY is not set, so sign-in will not work."
  echo "Find it in Supabase > Project Settings > API Keys (the anon / publishable key), then:"
  echo "  SUPABASE_ANON_KEY=your-anon-key ./setup.sh"
  echo "Browsing listings works without it."
  echo
fi

API_BASE_URL="$API_BASE_URL" SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-}" xcodegen generate

echo "Opening EastMarket.xcodeproj — set your signing team, then press Run."
open EastMarket.xcodeproj
