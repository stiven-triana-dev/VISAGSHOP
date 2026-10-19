# Abre este script con PowerShell desde Windows. No publica credenciales en el proyecto.
Set-Location -LiteralPath $PSScriptRoot
Write-Host 'VISAGSHOP / ADMINISTRACION SPRINT 5'
$env:ADMIN_USERNAME = Read-Host 'Usuario administrador'
$secret = Read-Host 'Clave administrador (minimo 10 caracteres)' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
try { $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
if ([string]::IsNullOrWhiteSpace($env:ADMIN_USERNAME) -or $env:ADMIN_PASSWORD.Length -lt 10) {
    Write-Host 'Debes indicar un usuario y una clave de minimo 10 caracteres.'
    exit 1
}
if (!(Test-Path 'package.json')) { Write-Host 'ERROR: No se encuentra package.json';exit 1 }
if (!(Test-Path 'node_modules/ejs/package.json')) {
    Write-Host 'Instalando dependencias...';npm install
    if ($LASTEXITCODE -ne 0) { Write-Host 'ERROR: No se instalaron las dependencias.';exit $LASTEXITCODE }
}
Write-Host 'Tienda: http://localhost:3000'
Write-Host 'Panel:  http://localhost:3000/admin/products'
Write-Host 'Mantén esta ventana abierta durante la sesión.'
npm start
Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
