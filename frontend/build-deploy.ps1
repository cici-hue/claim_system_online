# ============================================================
# Frontend Build & Deploy Script
# ============================================================
# 用法:
#   .\build-deploy.ps1                    # 仅构建
#   .\build-deploy.ps1 -Deploy            # 构建 + 部署到 Vercel
#   .\build-deploy.ps1 -ApiUrl "https://xxx.railway.app/api"  # 指定后端地址
# ============================================================

param(
    [switch]$Deploy,
    [string]$ApiUrl = ""
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Claim Management System - Frontend   " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Host "❌ Node.js 未安装" -ForegroundColor Red
    exit 1
}

# 设置 API 地址
if ($ApiUrl) {
    $env:VITE_API_URL = $ApiUrl
    Write-Host "✓ API URL: $ApiUrl" -ForegroundColor Green
} elseif ($env:VITE_API_URL) {
    Write-Host "✓ API URL: $env:VITE_API_URL" -ForegroundColor Green
} else {
    Write-Host "⚠️  未设置 API URL，将使用默认代理 /api" -ForegroundColor Yellow
}

# 安装依赖
Write-Host ""
Write-Host "正在安装依赖..." -ForegroundColor Cyan
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 依赖安装失败" -ForegroundColor Red
    exit 1
}

# 构建
Write-Host ""
Write-Host "正在构建生产版本..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ 构建完成！输出目录: dist/" -ForegroundColor Green

# 部署到 Vercel
if ($Deploy) {
    Write-Host ""
    Write-Host "正在部署到 Vercel..." -ForegroundColor Cyan
    
    $vercel = Get-Command vercel -ErrorAction SilentlyContinue
    if (-not $vercel) {
        Write-Host "⚠️  Vercel CLI 未安装，正在安装..." -ForegroundColor Yellow
        npm install -g vercel
    }
    
    if ($ApiUrl) {
        vercel --prod --env VITE_API_URL=$ApiUrl
    } else {
        vercel --prod
    }
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ 部署成功！" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  构建完成                              " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
