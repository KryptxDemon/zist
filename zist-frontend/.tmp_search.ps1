$path = 'd:\ZIST\zist\zist-frontend\node_modules\@neondatabase\auth\dist\better-auth-react-adapter-DMizSZtB.mjs'
Write-Host '=== signIn.social / return shape ==='
Get-Content $path | Select-String -Pattern 'signIn|sign-in|window\.location' | Select-Object -First 20 | ForEach-Object { Write-Host ($_.LineNumber.ToString() + ': ' + $_.Line) }
