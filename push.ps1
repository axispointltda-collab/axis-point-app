$env:GIT_TERMINAL_PROMPT = '0'
Set-Location 'f:\AxisPoint'
git add src/App.tsx
git commit -m "feat: estilo amarelo extras admin e funcionario"
git push -f origin main
Write-Host "=== PUSH COMPLETO ==="
