# ============================================================
# Claim Management System - Production Startup Script
# ============================================================
# 使用生产环境配置 (Supabase PostgreSQL) 启动后端服务
# ============================================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Claim Management System - Production  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Maven
$mvn = Get-Command mvn -ErrorAction SilentlyContinue
if (-not $mvn) {
    Write-Host "❌ Maven 未安装或未添加到 PATH" -ForegroundColor Red
    Write-Host "   请安装 Maven: https://maven.apache.org/download.cgi" -ForegroundColor Yellow
    exit 1
}

# 检查 Java
$java = Get-Command java -ErrorAction SilentlyContinue
if (-not $java) {
    Write-Host "❌ Java 未安装或未添加到 PATH" -ForegroundColor Red
    Write-Host "   请安装 Java 17: https://adoptium.net/" -ForegroundColor Yellow
    exit 1
}

# 显示 Java 版本
$javaVersion = java -version 2>&1 | Select-String -Pattern '"(\d+\.\d+).*"' | ForEach-Object { $_.Matches.Groups[1].Value }
Write-Host "✓ Java 版本: $javaVersion" -ForegroundColor Green

# 设置生产环境变量
$env:SPRING_PROFILES_ACTIVE = "prod"

Write-Host ""
Write-Host "启动配置:" -ForegroundColor Yellow
Write-Host "  - Profile: prod (Supabase PostgreSQL)" -ForegroundColor Gray
Write-Host "  - Database: db.yyreffouxegrddvuevvp.supabase.co" -ForegroundColor Gray
Write-Host "  - Port: 8080" -ForegroundColor Gray
Write-Host ""

# 编译并启动
Write-Host "正在编译并启动服务..." -ForegroundColor Cyan
Write-Host ""

try {
    mvn spring-boot:run -Dspring-boot.run.profiles=prod
} catch {
    Write-Host ""
    Write-Host "❌ 启动失败: $_" -ForegroundColor Red
    exit 1
}
