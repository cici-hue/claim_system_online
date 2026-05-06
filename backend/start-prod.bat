@echo off
chcp 65001 >nul

:: ============================================================
:: Claim Management System - Production Startup Script
:: ============================================================

echo ========================================
echo   Claim Management System - Production
echo ========================================
echo.

:: 检查 Java
java -version >nul 2>&1
if errorlevel 1 (
    echo ❌ Java 未安装或未添加到 PATH
    echo    请安装 Java 17: https://adoptium.net/
    pause
    exit /b 1
)

:: 检查 Maven
mvn -version >nul 2>&1
if errorlevel 1 (
    echo ❌ Maven 未安装或未添加到 PATH
    echo    请安装 Maven: https://maven.apache.org/download.cgi
    pause
    exit /b 1
)

echo 启动配置:
echo   - Profile: prod (Supabase PostgreSQL)
echo   - Database: db.yyreffouxegrddvuevvp.supabase.co
echo   - Port: 8080
echo.

:: 设置环境变量并启动
set SPRING_PROFILES_ACTIVE=prod
echo 正在编译并启动服务...
echo.

mvn spring-boot:run -Dspring-boot.run.profiles=prod

if errorlevel 1 (
    echo.
    echo ❌ 启动失败
    pause
)
