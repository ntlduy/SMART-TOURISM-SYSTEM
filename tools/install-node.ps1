<#
install-node.ps1
Installs Node.js LTS on Windows.
- Elevates to admin if required.
- Uses winget if available, then Chocolatey, otherwise downloads the latest LTS MSI from nodejs.org and installs it silently.
Run:
  powershell -ExecutionPolicy Bypass -File .\install-node.ps1
#>

param(
    [switch]$Force
)

function Test-IsAdmin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($id)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# Self-elevate if not admin
if (-not (Test-IsAdmin)) {
    Write-Host "Not running as administrator — requesting elevation..."
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = (Get-Command powershell).Source
    $args = "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    if ($Force) { $args += " -Force" }
    $psi.Arguments = $args
    $psi.Verb = "runas"
    try {
        [System.Diagnostics.Process]::Start($psi) | Out-Null
        exit 0
    } catch {
        Write-Error "Elevation cancelled. Please run PowerShell as Administrator and re-run the script."
        exit 1
    }
}

Write-Host "Running with administrator privileges."

# Helper to run a command and return success boolean
function Run-Command($cmd, $args) {
    $p = Start-Process -FilePath $cmd -ArgumentList $args -Wait -NoNewWindow -PassThru
    return ($p.ExitCode -eq 0)
}

# Try winget
if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "Found winget — installing Node.js LTS via winget..."
    # Use ID for OpenJS Node.js LTS package
    $args = 'install --id OpenJS.NodeJS.LTS -e --silent'
    if (Run-Command (Get-Command winget).Source $args) {
        Write-Host "winget install started/completed."
    } else {
        Write-Warning "winget install failed. Will try other methods."
    }
}
# Try Chocolatey
elseif (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Host "Found Chocolatey — installing Node.js LTS via choco..."
    if (Run-Command (Get-Command choco).Source 'install nodejs-lts -y') {
        Write-Host "choco install completed."
    } else {
        Write-Warning "choco install failed. Will try downloading MSI."
    }
}
# Fallback: download latest LTS MSI from nodejs.org
else {
    Write-Host "winget/choco not found — will download latest Node.js LTS MSI from nodejs.org."

    try {
        $indexUrl = 'https://nodejs.org/dist/index.json'
        Write-Host "Fetching Node.js release index..."
        $index = Invoke-RestMethod -Uri $indexUrl -UseBasicParsing -ErrorAction Stop

        $ltsEntry = $index | Where-Object { $_.lts -ne $false } | Select-Object -First 1
        if (-not $ltsEntry) { throw 'Could not find LTS entry in index.json' }

        $version = $ltsEntry.version  # e.g. "v18.18.0"
        $msiFileName = "node-$version-x64.msi"
        $msiUrl = "https://nodejs.org/dist/$version/$msiFileName"
        $tempPath = Join-Path $env:TEMP $msiFileName

        Write-Host "Downloading $msiUrl to $tempPath ..."
        Invoke-WebRequest -Uri $msiUrl -OutFile $tempPath -UseBasicParsing -ErrorAction Stop

        Write-Host "Installing Node.js silently via msiexec..."
        $msiexecArgs = "/i `"$tempPath`" /qn /norestart"
        $proc = Start-Process -FilePath msiexec.exe -ArgumentList $msiexecArgs -Wait -NoNewWindow -PassThru
        if ($proc.ExitCode -ne 0) {
            throw "msiexec returned exit code $($proc.ExitCode)"
        }

        Write-Host "Cleaning up installer..."
        Remove-Item -Path $tempPath -Force -ErrorAction SilentlyContinue
        Write-Host "Node.js LTS installed."
    } catch {
        Write-Error "Automatic MSI download/install failed: $_"
        Write-Host "Manual fallback: download the LTS installer from https://nodejs.org/ and run it as Administrator."
        exit 1
    }
}

# Verify installation
Write-Host "Verifying installation..."
$node = & node -v 2>$null
$npm = & npm -v 2>$null

if ($node) {
    Write-Host "node version: $node"
} else {
    Write-Warning "node not found in PATH. You may need to restart your terminal or log out/in."
}

if ($npm) {
    Write-Host "npm version: $npm"
} else {
    Write-Warning "npm not found in PATH. You may need to restart your terminal or log out/in."
}

Write-Host "Done. If versions are not shown, please restart your shell or Windows to refresh PATH."
