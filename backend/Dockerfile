# ============================================================
# Claim Management System - Backend Dockerfile
# ============================================================
# 多阶段构建: Maven 编译 → JRE 运行
# 部署到 Railway / Render / 任何支持 Docker 的平台
# ============================================================

# --- Stage 1: Build ---
FROM maven:3.9-eclipse-temurin-17-alpine AS builder

WORKDIR /app
COPY pom.xml .
# 先下载依赖（利用 Docker 缓存层）
RUN mvn dependency:go-offline -B -q

COPY src ./src
RUN mvn package -DskipTests -B -q

# --- Stage 2: Run ---
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# 创建非 root 用户
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 创建上传目录
RUN mkdir -p /app/uploads && chown -R appuser:appgroup /app

COPY --from=builder /app/target/*.jar app.jar

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar", "--spring.profiles.active=prod"]
