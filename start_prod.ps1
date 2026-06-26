# Script para iniciar la aplicacion en modo produccion
# Puerto: 3004
# Accesible desde cualquier PC en la red

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Iniciando Pedidos PDA en modo PRODUCCION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configurar variables de entorno
$env:PORT = "3004"
$env:NODE_ENV = "production"
$env:HOST = "0.0.0.0"

Write-Host "Configuracion:" -ForegroundColor Yellow
Write-Host "  - Puerto: $($env:PORT)" -ForegroundColor White
Write-Host "  - Modo: $($env:NODE_ENV)" -ForegroundColor White
Write-Host "  - Host: $($env:HOST) (accesible desde la red)" -ForegroundColor White
Write-Host ""

# Verificar si se ejecuta como administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

# Configurar firewall de Windows para permitir acceso desde la red
Write-Host "Configurando firewall de Windows..." -ForegroundColor Yellow
$firewallRuleName = "Planilla PDA - Puerto 3004"
$firewallConfigured = $false

# Verificar si la regla ya existe
$existingRule = Get-NetFirewallRule -DisplayName $firewallRuleName -ErrorAction SilentlyContinue

if (-not $existingRule) {
    if ($isAdmin) {
        try {
            New-NetFirewallRule -DisplayName $firewallRuleName `
                -Direction Inbound `
                -LocalPort $env:PORT `
                -Protocol TCP `
                -Action Allow `
                -Profile Any | Out-Null
            Write-Host "  [OK] Regla de firewall creada (Planilla Pagos - Puerto $($env:PORT))" -ForegroundColor Green
            $firewallConfigured = $true
        } catch {
            Write-Host "  [ADVERTENCIA] Error al crear regla de firewall: $_" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [ADVERTENCIA] Se requieren permisos de Administrador para configurar el firewall" -ForegroundColor Yellow
        Write-Host "  Ejecuta este script como Administrador o configura el firewall manualmente:" -ForegroundColor Yellow
        Write-Host "  netsh advfirewall firewall add rule name=`"$firewallRuleName`" dir=in action=allow protocol=TCP localport=$($env:PORT)" -ForegroundColor Gray
    }
} else {
    # Verificar si la regla esta habilitada
    if ($existingRule.Enabled -eq $false) {
        if ($isAdmin) {
            try {
                Enable-NetFirewallRule -DisplayName $firewallRuleName
                Write-Host "  [OK] Regla de firewall habilitada" -ForegroundColor Green
                $firewallConfigured = $true
            } catch {
                Write-Host "  [ADVERTENCIA] Error al habilitar regla de firewall" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  [ADVERTENCIA] La regla existe pero esta deshabilitada. Ejecuta como Administrador para habilitarla." -ForegroundColor Yellow
        }
    } else {
        Write-Host "  [OK] Regla de firewall ya existe y esta activa" -ForegroundColor Green
        $firewallConfigured = $true
    }
}

if (-not $firewallConfigured -and -not $isAdmin) {
    Write-Host ""
    Write-Host "IMPORTANTE: Para que la aplicacion sea accesible desde la red," -ForegroundColor Red
    Write-Host "debes ejecutar este script como Administrador o configurar el firewall manualmente." -ForegroundColor Red
}
Write-Host ""

# Obtener todas las IPs locales para mostrar en el mensaje
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" -and
    $_.IPAddress -notlike "::*"
} | Select-Object -ExpandProperty IPAddress

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "URLs de acceso:" -ForegroundColor Green
Write-Host "  Local: http://localhost:$($env:PORT)" -ForegroundColor White
if ($ipAddresses) {
    foreach ($ip in $ipAddresses) {
        $url = "http://${ip}:$($env:PORT)"
        Write-Host "  Red:   $url" -ForegroundColor White
    }
} else {
    Write-Host "  Red:   (No se pudo detectar la IP local)" -ForegroundColor Yellow
}
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Iniciando servidor..." -ForegroundColor Yellow
Write-Host "Presiona Ctrl+C para detener el servidor" -ForegroundColor Gray
Write-Host ""

# Ejecutar la aplicacion
node server.js
