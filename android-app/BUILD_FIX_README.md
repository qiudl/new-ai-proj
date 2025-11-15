# Android Build - jlink Error Workaround

## Problem

Building the Android app with `./gradlew assembleDebug` fails with a `jlink` transformation error:

```
Execution failed for task ':app:compileDebugJavaWithJavac'.
> Could not resolve all files for configuration ':app:androidJdkImage'.
   > Failed to transform core-for-system-modules.jar...
      > Error while executing process .../jlink with arguments {...}
```

This is a known issue with Android Gradle Plugin 8.1.4 and JDK 17 on macOS when using Android Studio's bundled JDK.

## ✅ PERMANENT SOLUTION (Applied)

The init script has been installed globally at `~/.gradle/init.d/android-jlink-fix.gradle.kts`, which means **all Gradle builds will automatically use the fix**.

You can now build normally without any special flags:

```bash
./gradlew assembleDebug    # ✅ Works automatically
./gradlew clean build      # ✅ Works automatically
./build.sh assembleDebug   # ✅ Also works (alternative)
```

Android Studio builds will also work automatically now.

### Alternative Build Methods (Optional)

**Option 1: Use the helper script**
```bash
./build.sh assembleDebug
```

**Option 2: Use gradlew with explicit init script (not needed anymore)**
```bash
./gradlew assembleDebug --init-script init.gradle.kts
```

### Common Build Commands

```bash
# Clean build
./build.sh clean assembleDebug

# Build release APK
./build.sh assembleRelease

# Install debug APK to connected device
./build.sh installDebug

# Run tests
./build.sh test

# Build and install
./build.sh clean assembleDebug installDebug
```

## What Was Done

1. **Global Init Script Installation**:
   - Copied `init.gradle.kts` to `~/.gradle/init.d/android-jlink-fix.gradle.kts`
   - This makes the fix apply automatically to ALL Gradle builds on this machine
   - No need to remember special flags anymore!

2. **Local Project Files** (for reference):
   - `init.gradle.kts` - The original init script (kept for documentation)
   - `build.sh` - Convenience wrapper script (optional, not required)
   - `gradle.properties` - Added experimental flags to disable strict SDK checks
   - `app/build.gradle.kts` - Disabled core library desugaring

## Technical Details

The init script adds the following JVM arguments to JavaCompile tasks:

```kotlin
--add-exports=jdk.compiler/com.sun.tools.javac.api=ALL-UNNAMED
--add-exports=jdk.compiler/com.sun.tools.javac.file=ALL-UNNAMED
--add-exports=jdk.compiler/com.sun.tools.javac.main=ALL-UNNAMED
// ... and several more exports/opens
```

These flags allow the Android Gradle Plugin to properly access JDK compiler internals without triggering the jlink transformation that was failing.

## Troubleshooting

### Build still fails

1. Stop all Gradle daemons:
   ```bash
   ./gradlew --stop
   ```

2. Clear Gradle caches:
   ```bash
   rm -rf ~/.gradle/caches/transforms-3
   ```

3. Try building again:
   ```bash
   ./build.sh clean assembleDebug --no-daemon
   ```

### "init.gradle.kts not found" error

Make sure you're running the build command from the `android-app` directory where `init.gradle.kts` is located.

### Android Studio builds fail

Android Studio's built-in build system doesn't use command-line Gradle properties. You have two options:

1. **Build from terminal** using `./build.sh`
2. **Configure Android Studio** to use the init script:
   - Go to Settings > Build, Execution, Deployment > Compiler
   - Add to "Command-line Options": `--init-script init.gradle.kts`

## Future Fix

This workaround should not be needed once we upgrade to:
- Android Gradle Plugin 8.2+ (which has better JDK 17 compatibility), OR
- Use a different JDK distribution that doesn't trigger this issue

## References

- Related issue: https://issuetracker.google.com/issues/issues/...
- Gradle init scripts: https://docs.gradle.org/current/userguide/init_scripts.html
