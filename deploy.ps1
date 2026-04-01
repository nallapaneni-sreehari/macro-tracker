param(
    [switch]$SkipBuild,          # Skip Angular build (use existing www/)
    [string]$Tag = "latest"      # Docker image tag, e.g. -Tag v1.2
)

$DOCKER_IMAGE  = "r151149/macro-tracker"
$SERVER        = "sree@iamsreehari.in"
$COMPOSE_FILE  = "/root/projects/macros-tracker/macros-tracker-server/docker-compose.yml"

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
