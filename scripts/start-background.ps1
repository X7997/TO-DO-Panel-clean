$ErrorActionPreference = 'Stop'

$appDirectory = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$electronPath = Join-Path $appDirectory 'node_modules\electron\dist\electron.exe'
$launchLog = Join-Path $PSScriptRoot 'background-launch.log'

try {
    if (-not (Test-Path -LiteralPath $electronPath -PathType Leaf)) {
        throw "Electron not found at '$electronPath'. Run npm install first."
    }

    $startupClass = Get-CimClass -Namespace 'root/cimv2' -ClassName 'Win32_ProcessStartup'
    $startupInfo = New-CimInstance -CimClass $startupClass -Property @{
        CreateFlags = [uint32]16777216
    } -ClientOnly

    $commandLine = '"{0}" "{1}"' -f $electronPath, $appDirectory
    $result = Invoke-CimMethod -Namespace 'root/cimv2' -ClassName 'Win32_Process' -MethodName 'Create' -Arguments @{
        CommandLine = $commandLine
        CurrentDirectory = $appDirectory
        ProcessStartupInformation = $startupInfo
    }

    if ($result.ReturnValue -ne 0) {
        throw "Win32_Process.Create failed with return code $($result.ReturnValue)."
    }

    $message = "Started TO-DO Panel in the current user session. PID=$($result.ProcessId)"
    Add-Content -LiteralPath $launchLog -Value "[$(Get-Date -Format o)] $message"
    Write-Output $message
} catch {
    $message = "Background launch failed: $($_.Exception.Message)"
    try { Add-Content -LiteralPath $launchLog -Value "[$(Get-Date -Format o)] $message" } catch {}
    [Console]::Error.WriteLine($message)
    exit 1
}
