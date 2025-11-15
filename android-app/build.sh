#!/bin/bash
# Helper script to build Android app with jlink workaround

set -e

echo "🔨 Building Android APK with jlink workaround..."
echo ""

./gradlew "$@" --init-script init.gradle.kts

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📦 APK location: app/build/outputs/apk/debug/app-debug.apk"
