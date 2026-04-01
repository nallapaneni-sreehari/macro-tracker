param(
    [switch]$SkipBuild,          # Skip Angular build (use existing www/)
    [string]$Tag = "latest"      # Docker image tag, e.g. -Tag v1.2
)

$DOCKER_IMAGE  = if ($env:DEPLOY_DOCKER_IMAGE) { $env:DEPLOY_DOCKER_IMAGE } else { Write-Host "Error: Set DEPLOY_DOCKER_IMAGE env variable (e.g. r151149/macro-tracker)" -ForegroundColor Red; exit 1 }
$SERVER        = if ($env:DEPLOY_SERVER)       { $env:DEPLOY_SERVER }       else { Write-Host "Error: Set DEPLOY_SERVER env variable (e.g. sree@iamsreehari.in)" -ForegroundColor Red; exit 1 }
$COMPOSE_FILE  = if ($env:DEPLOY_COMPOSE_FILE) { $env:DEPLOY_COMPOSE_FILE } else { Write-Host "Error: Set DEPLOY_COMPOSE_FILE env variable (e.g. /root/projects/macros-tracker/macros-tracker-server/docker-compose.yml)" -ForegroundColor Red; exit 1 }

# ── 1. Build Angular app ────────────────────────────────────────────────────
if (-not $SkipBuild) {
    Write-Host "`n[1/4] Building Angular app..." -ForegroundColor Cyan
    npm run build
    if ($LASTEXITCODE -ne 0) { Write-Host "Angular build failed." -ForegroundColor Red; exit 1 }
} else {
    Write-Host "`n[1/4] Skipping Angular build (using existing www/)." -ForegroundColor Yellow
}

# ── 2. Build Docker image ────────────────────────────────────────────────────
Write-Host "`n[2/4] Building Docker image ${DOCKER_IMAGE}:${Tag}..." -ForegroundColor Cyan
docker build -t "${DOCKER_IMAGE}:${Tag}" -f macros-tracker-server/Dockerfile .
if ($LASTEXITCODE -ne 0) { Write-Host "Docker build failed." -ForegroundColor Red; exit 1 }

# ── 3. Push to Docker Hub ────────────────────────────────────────────────────
Write-Host "`n[3/4] Pushing to Docker Hub..." -ForegroundColor Cyan
docker push "${DOCKER_IMAGE}:${Tag}"
if ($LASTEXITCODE -ne 0) { Write-Host "Docker push failed. Are you logged in? Run: docker login" -ForegroundColor Red; exit 1 }

# ── 4. Pull & restart on VM ──────────────────────────────────────────────────
Write-Host "`n[4/4] Deploying on server..." -ForegroundColor Cyan
ssh $SERVER "sudo docker compose -f $COMPOSE_FILE pull api && sudo docker compose -f $COMPOSE_FILE up -d"
if ($LASTEXITCODE -ne 0) { Write-Host "Remote deploy failed." -ForegroundColor Red; exit 1 }

Write-Host "`nDeployed successfully! Image: ${DOCKER_IMAGE}:${Tag}" -ForegroundColor Green
