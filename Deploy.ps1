# deploy.ps1

# Percorso del file che contiene la versione
$versionFile = "public\version.txt"

# Se il file non esiste, crealo con la versione iniziale 1.00.01
if (-Not (Test-Path $versionFile)) {
    Set-Content -Path $versionFile -Value "1.00.01"
}

# Leggi la versione corrente dal file
$currentVersion = Get-Content $versionFile

# Incrementa la versione nel formato "major.minor.patch"
$parts = $currentVersion -split "\."
if ($parts.Length -eq 3) {
    $major = [int]$parts[0]
    $minor = [int]$parts[1]
    $patch = [int]$parts[2] + 1
    # Ricostruisce la versione formattando minor e patch a due cifre
    $newVersion = "$major." + ("{0:D2}" -f $minor) + "." + ("{0:D2}" -f $patch)
} else {
    # Se il formato non è corretto, imposta la versione iniziale
    $newVersion = "1.00.01"
}

# Aggiorna il file della versione con il nuovo valore
Set-Content -Path $versionFile -Value $newVersion

# Funzione per eseguire i comandi Git e gestire gli errori
function Run-GitCommand {
    param (
        [Parameter(ValueFromRemainingArguments=$true)]
        [string[]]$Args
    )
    Write-Host "Eseguendo: git $($Args -join ' ')" -ForegroundColor Cyan

    # Esegue git con gli argomenti passati
    & git @Args

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Errore durante l'esecuzione di: git $($Args -join ' ')" -ForegroundColor Red
        exit $LASTEXITCODE
    }
}

# Esegui i comandi Git in sequenza
Run-GitCommand status
Run-GitCommand add, "."

# Prepara il messaggio di commit includendo la versione aggiornata
$commitMessage = "Aggiornamento per deploy su GitHub Pages - Versione $newVersion"
Run-GitCommand commit, "-m", $commitMessage

Run-GitCommand push, "origin", "main"
Run-GitCommand log, "-1"

# Apre la pagina GitHub Actions nel browser predefinito
Write-Host "Aprendo GitHub Actions..." -ForegroundColor Cyan
Start-Process "https://github.com/niko2011p/Tracker_Tartufi-FunghiRepository002/actions"

Write-Host "Deploy completato con successo!" -ForegroundColor Green
