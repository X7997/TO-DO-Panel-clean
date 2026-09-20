Option Explicit

Dim fileSystem, shell, scriptPath, command
Set fileSystem = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

scriptPath = fileSystem.GetParentFolderName(WScript.ScriptFullName) & "\start-background.ps1"
command = "powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File """ & scriptPath & """"
shell.Run command, 0, False

Set shell = Nothing
Set fileSystem = Nothing
