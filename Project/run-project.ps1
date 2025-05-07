# Script: run-project.ps1
# Uso: Execute este script como administrador

# 1. Definir os diretórios com caminho literal para evitar problemas de encoding
$projectDir = [System.IO.Path]::GetFullPath("$env:USERPROFILE\OneDrive\Ambiente de Trabalho\Mestrado 1 ano\2 semestre\SD\Project")
$targetDir = [System.IO.Path]::GetFullPath("$projectDir\target")

# 2. Verificar se os diretórios existem
if (-not (Test-Path $projectDir)) {
    Write-Host "Diretório do projeto não encontrado: $projectDir" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $targetDir)) {
    Write-Host "Diretório target não encontrado: $targetDir" -ForegroundColor Red
    exit 1
}

# 3. Executar o build.cmd
Write-Host "Executando o build.cmd..." -ForegroundColor Cyan
try {
    Set-Location $projectDir
    .\build.cmd
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Erro durante o build. Verifique os erros e tente novamente." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "Erro ao executar build.cmd: $_" -ForegroundColor Red
    exit 1
}

# 4. Função para iniciar cada processo em uma nova janela (versão corrigida)
function Start-BackendProcess {
    param (
        [string]$windowTitle,
        [string]$command,
        [string]$workingDir
    )

    $psScript = @"
        `$host.ui.RawUI.WindowTitle = '$windowTitle'
        cd '$workingDir'
        $command
        Write-Host "Pressione Enter para fechar..." -ForegroundColor Yellow
        `$null = `$host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
"@

    $encodedCommand = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($psScript))
    Start-Process powershell.exe -ArgumentList "-NoExit", "-EncodedCommand", $encodedCommand
    Start-Sleep -Milliseconds 500
}

# 5. Iniciar cada componente em uma janela separada

# URLQueue
Start-BackendProcess -windowTitle "URLQueue" `
                     -command 'java -cp ".\lib\jsoup-1.18.3.jar;.\lib\sqlite-jdbc-3.49.1.0.jar;." search.URLQueue' `
                     -workingDir $targetDir

# IndexStorageBarrel 1 (porta 8182)
Start-BackendProcess -windowTitle "IndexStorageBarrel 8182" `
                     -command 'java -cp ".\lib\jsoup-1.18.3.jar;.\lib\sqlite-jdbc-3.49.1.0.jar;." search.IndexStorageBarrel 8182 server1' `
                     -workingDir $targetDir

# IndexStorageBarrel 2 (porta 8183)
Start-BackendProcess -windowTitle "IndexStorageBarrel 8183" `
                     -command 'java -cp ".\lib\jsoup-1.18.3.jar;.\lib\sqlite-jdbc-3.49.1.0.jar;." search.IndexStorageBarrel 8183 server2' `
                     -workingDir $targetDir

# Gateway
Start-BackendProcess -windowTitle "Gateway" `
                     -command 'java -cp ".\lib\jsoup-1.18.3.jar;." search.Gateway' `
                     -workingDir $targetDir

# GoogolClient
Start-BackendProcess -windowTitle "GoogolClient" `
                     -command 'java -cp ".\lib\jsoup-1.18.3.jar;." search.GoogolClient' `
                     -workingDir $targetDir

# Downloader
Start-BackendProcess -windowTitle "Downloader" `
                     -command 'java -cp ".\lib\jsoup-1.18.3.jar;." search.Downloader' `
                     -workingDir $targetDir

Write-Host "Todos os processos foram iniciados em janelas separadas." -ForegroundColor Green