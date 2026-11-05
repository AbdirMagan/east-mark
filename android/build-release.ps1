<#
.SYNOPSIS
    Builds the signed release APK.

.DESCRIPTION
    The release signing config reads its passwords from STORE_PASSWORD and
    KEY_PASSWORD rather than from any file, so nothing in the repository can
    leak them and nobody can build a signed APK without the person who holds
    the keystore. This asks for them, sets them for this process only, and
    runs the build.

    The passwords are never written to disk, never echoed, and are gone when
    the window closes. They are not in your shell history either: PowerShell
    records the line you typed to start the script, not what you typed into
    Read-Host.

    Afterwards it prints the signing certificate's SHA-256 fingerprint, which
    is what web/public/.well-known/assetlinks.json needs before listing links
    will open a release build instead of the browser.

.EXAMPLE
    .\build-release.ps1
#>

$ErrorActionPreference = 'Stop'

$projectDir = $PSScriptRoot
$keystore = Join-Path $projectDir 'my-upload-key.jks'

if (-not (Test-Path $keystore)) {
    Write-Error "No keystore at $keystore. Set KEYSTORE_PATH, or put the upload key there."
}

# --- Gradle -----------------------------------------------------------------
# There is no gradlew in this repo, so find the distribution the wrapper has
# already downloaded -- the exact version gradle-wrapper.properties names.
#
# Not "the newest one on disk": a different version configures the project
# from scratch, wants its own daemon, and queues behind the lock the current
# daemon holds on the build directory. The first attempt at this picked 9.5.0
# over the pinned 9.3.1 and sat at "Calculating task graph" doing nothing.
$wrapperProperties = Join-Path $projectDir 'gradle\wrapper\gradle-wrapper.properties'
$version = (Select-String -Path $wrapperProperties -Pattern 'gradle-([0-9.]+)-bin\.zip').Matches[0].Groups[1].Value
Write-Host "Gradle version from the wrapper: $version" -ForegroundColor DarkGray

$dist = Get-ChildItem "$env:USERPROFILE\.gradle\wrapper\dists\gradle-$version-bin" -Filter 'gradle.bat' -Recurse -ErrorAction SilentlyContinue |
    Select-Object -First 1
if (-not $dist) {
    Write-Error "Gradle $version is not in the wrapper cache. Run a debug build once so it is fetched."
}
$gradle = $dist.FullName
Write-Host "Gradle: $gradle" -ForegroundColor DarkGray

# --- Passwords --------------------------------------------------------------
$storeSecure = Read-Host 'Keystore password' -AsSecureString
$store = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($storeSecure))

$keySecure = Read-Host "Key password for alias 'upload' (press Enter if it is the same)" -AsSecureString
$key = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($keySecure))
if ([string]::IsNullOrEmpty($key)) { $key = $store }

if ([string]::IsNullOrEmpty($store)) {
    Write-Error 'No keystore password given; nothing to sign with.'
}

$env:STORE_PASSWORD = $store
$env:KEY_PASSWORD = $key

try {
    Write-Host ''
    Write-Host 'Building the signed release APK...' -ForegroundColor Cyan
    & $gradle -p $projectDir :app:assembleRelease --console=plain
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Gradle failed with exit code $LASTEXITCODE."
    }
}
finally {
    # Out of the environment as soon as the build is over, whether it worked
    # or not, so nothing later in this session inherits them.
    Remove-Item Env:\STORE_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:\KEY_PASSWORD -ErrorAction SilentlyContinue
    $store = $null
    $key = $null
}

# --- What came out ----------------------------------------------------------
$apk = Join-Path $projectDir 'app\build\outputs\apk\release\app-release.apk'
if (-not (Test-Path $apk)) {
    Write-Error "The build reported success but there is no APK at $apk."
}

$size = [math]::Round((Get-Item $apk).Length / 1MB, 1)
Write-Host ''
Write-Host "APK: $apk ($size MB)" -ForegroundColor Green

# The signing certificate, for assetlinks.json. Read from the APK itself, so
# it needs no password.
$apksigner = Get-ChildItem "$env:LOCALAPPDATA\Android\Sdk\build-tools" -Filter 'apksigner.bat' -Recurse -ErrorAction SilentlyContinue |
    Sort-Object FullName -Descending |
    Select-Object -First 1
if ($apksigner) {
    Write-Host ''
    Write-Host 'Signing certificate (add this to web/public/.well-known/assetlinks.json):' -ForegroundColor Cyan
    & $apksigner.FullName verify --print-certs $apk | Select-String -Pattern 'SHA-256 digest'
} else {
    Write-Host 'apksigner not found; skipping the certificate fingerprint.' -ForegroundColor DarkGray
}
