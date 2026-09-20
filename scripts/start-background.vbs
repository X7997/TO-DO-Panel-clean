Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "Q:\Todo"
WshShell.Run "powershell -NoProfile -Command ""Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine = 'Q:\Todo\node_modules\electron\dist\electron.exe Q:\Todo'}""", 0, False
Set WshShell = Nothing
