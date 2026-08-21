$content = [System.IO.File]::ReadAllText('d:\ZIST\zist\zist-backend\app\core\deps.py')
$lines = $content -split "`r`n"
Write-Host "Total lines: $($lines.Length)"
foreach ($i in 140..247) {
  if ($i -lt $lines.Length) {
    Write-Host "$($i+1): $($lines[$i])"
  }
}