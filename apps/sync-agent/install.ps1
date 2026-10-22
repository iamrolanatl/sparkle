# Installs/updates the Sparkle sync agent under %LOCALAPPDATA%\SparkleSync and registers the scheduled tasks.
$ErrorActionPreference = "Stop"
$home2 = Join-Path $env:LOCALAPPDATA "SparkleSync"
New-Item -ItemType Directory -Force $home2 | Out-Null
Copy-Item -Recurse -Force (Join-Path $PSScriptRoot "src"), (Join-Path $PSScriptRoot "package.json") $home2
Push-Location $home2; & "C:\Program Files\nodejs\npm.cmd" i --omit=dev --silent 2>&1 | Out-Null; Pop-Location
if (Test-Path (Join-Path $home2 "auth.json")) { icacls (Join-Path $home2 "auth.json") /inheritance:r /grant:r "$($env:USERNAME):(R,W)" | Out-Null }
$node = "C:\Program Files\nodejs\node.exe"
function Reg($name, $jobs, $trigger) {
  $a = New-ScheduledTaskAction -Execute $node -Argument "`"$home2\src\index.mjs`" --jobs $jobs" -WorkingDirectory $home2
  $a.Execute = "conhost.exe"; $a.Arguments = "--headless `"$node`" `"$home2\src\index.mjs`" --jobs $jobs"
  $s = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopIfGoingOnBatteries -AllowStartIfOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 15) -MultipleInstances IgnoreNew
  Register-ScheduledTask -TaskPath "\Sparkle\" -TaskName $name -Action $a -Trigger $trigger -Settings $s -Force | Out-Null
}
$days = "Monday","Tuesday","Wednesday","Thursday","Friday"
function Rep($start, $minutes, $hours) { $t = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $days -At $start; $t.Repetition = (New-ScheduledTaskTrigger -Once -At $start -RepetitionInterval (New-TimeSpan -Minutes $minutes) -RepetitionDuration (New-TimeSpan -Hours $hours)).Repetition; $t }
Reg "Grades+Learn hourly" "grades,learn" (Rep "07:00" 60 15)
Reg "Attendance 1030" "attendance" (New-ScheduledTaskTrigger -Weekly -DaysOfWeek $days -At "10:30")
Reg "Attendance 1600" "attendance" (New-ScheduledTaskTrigger -Weekly -DaysOfWeek $days -At "16:00")
Reg "CTLS Parent 45min" "parent" (Rep "07:10" 45 15)
Reg "Mail 20min" "mail" (Rep "07:05" 20 15)
Get-ScheduledTask -TaskPath "\Sparkle\" | Select TaskName, State | Format-Table -AutoSize
