# CI/CD and Kubernetes Deployment Guide

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [GitHub Actions CI/CD](#github-actions-cicd)
4. [Docker Setup](#docker-setup)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Configuration Management](#configuration-management)
7. [Monitoring and Scaling](#monitoring-and-scaling)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers the complete CI/CD pipeline and Kubernetes deployment setup for Virtual Dev. The infrastructure includes:

- **GitHub Actions** for automated CI/CD
- **Docker** for containerization
- **Kubernetes** for orchestration
- **GitHub Container Registry** for image storage
- **Horizontal Pod Autoscaling** for automatic scaling
- **Ingress with TLS** for secure external access

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Actions                           │
│  ┌────────┐  ┌────────────┐  ┌─────────────────────┐       │
│  │  CI    │→ │ Build/Push │→ │  Deploy to K8s      │       │
│  └────────┘  └────────────┘  └─────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                  GitHub Container Registry                   │
│          ghcr.io/username/virtual-dev/backend:tag           │
│          ghcr.io/username/virtual-dev/frontend:tag          │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Ingress    │→ │   Frontend   │  │   Backend    │       │
│  │  (nginx)    │  │  (2 pods)    │  │  (3 pods)    │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
│                                       │                      │
│                                       ↓                      │
│                    ┌──────────────────────────┐             │
│                    │  Redis + Supabase        │             │
│                    └──────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

### Required Tools

1. **Docker** (v20+)
   ```bash
   docker --version
   ```

2. **kubectl** (Kubernetes CLI)
   ```bash
   kubectl version --client
   ```

3. **Git**
   ```bash
   git --version
   ```

4. **pnpm**
   ```bash
   pnpm --version
   ```

### Required Accounts/Services

1. **GitHub Account** with repository access
2. **Kubernetes Cluster** (one of):
   - DigitalOcean Kubernetes
   - Google Kubernetes Engine (GKE)
   - Amazon EKS
   - Azure AKS
   - Local Minikube (for testing)
3. **Supabase Project** (see [supabase_setup_guide.md](./supabase_setup_guide.md))
4. **Anthropic API Key** for Claude AI

### Required Secrets

You'll need to configure these secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `SUPABASE_ANON_KEY`
- `ANTHROPIC_API_KEY`
- `REDIS_PASSWORD` (optional)
- `JWT_SECRET`

---

## GitHub Actions CI/CD

### Workflows Overview

We have three main workflows:

#### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:** Push to main/develop/claude/** branches, Pull Requests

**What it does:**
- Installs dependencies with pnpm
- Lints all packages (shared, backend, frontend)
- Builds all packages in correct order
- Runs tests (when available)
- Uploads build artifacts

**Usage:**
```bash
# Automatically runs on push/PR
git push origin your-branch
```

#### 2. Build and Push Workflow (`.github/workflows/build-and-push.yml`)

**Triggers:** Push to main/develop, tags, or manual dispatch

**What it does:**
- Builds Docker images for backend and frontend
- Pushes images to GitHub Container Registry (ghcr.io)
- Creates multi-platform images (amd64, arm64)
- Tags images appropriately (latest, version, sha)
- Uses GitHub Actions cache for faster builds

**Usage:**
```bash
# Push to main/develop to trigger
git push origin main

# Or create a version tag
git tag v1.0.0
git push origin v1.0.0

# Or trigger manually from GitHub Actions UI
```

#### 3. Deploy Workflow (`.github/workflows/deploy.yml`)

**Triggers:** Manual dispatch only (for safety)

**What it does:**
- Connects to Kubernetes cluster
- Updates image tags in deployment files
- Applies all Kubernetes manifests
- Waits for rollout to complete
- Verifies deployment

**Usage:**
```bash
# Use GitHub Actions UI:
# 1. Go to Actions tab
# 2. Select "Deploy to Kubernetes"
# 3. Click "Run workflow"
# 4. Choose environment (development/staging/production)
# 5. Enter image version/tag
```

### Setting Up GitHub Actions

#### Step 1: Enable GitHub Packages

1. Go to your repository settings
2. Navigate to "Actions" → "General"
3. Under "Workflow permissions", select "Read and write permissions"

#### Step 2: Configure Repository Secrets

Go to Settings → Secrets and variables → Actions, add:

```
# Kubernetes Configuration
KUBE_CONFIG=<base64-encoded-kubeconfig>

# Optional: If using private Docker registry
DOCKER_USERNAME=<your-github-username>
DOCKER_PASSWORD=<github-personal-access-token>
```

To get base64-encoded kubeconfig:
```bash
cat ~/.kube/config | base64 -w 0
```

#### Step 3: Update Image References

In the Kubernetes manifests, replace `your-username` with your GitHub username:

```bash
# Update backend-deployment.yaml
sed -i 's/your-username/YOUR_GITHUB_USERNAME/g' k8s/backend-deployment.yaml

# Update frontend-deployment.yaml
sed -i 's/your-username/YOUR_GITHUB_USERNAME/g' k8s/frontend-deployment.yaml
```

---

## Docker Setup

### Building Images Locally

#### Backend
```bash
# From project root
docker build -f apps/backend/Dockerfile -t virtual-dev-backend:local .

# Test the image
docker run -p 3001:3001 \
  -e SUPABASE_URL=your-url \
  -e SUPABASE_SERVICE_KEY=your-key \
  -e ANTHROPIC_API_KEY=your-key \
  virtual-dev-backend:local
```

#### Frontend
```bash
# From project root
docker build -f apps/frontend/Dockerfile -t virtual-dev-frontend:local .

# Test the image
docker run -p 8080:80 virtual-dev-frontend:local
```

### Multi-Stage Builds

Both Dockerfiles use multi-stage builds:
1. **Builder stage**: Compiles TypeScript and builds assets
2. **Production stage**: Creates minimal runtime image

Benefits:
- Smaller image size
- Faster deployments
- Better security (no build tools in production)

### Docker Compose (Local Development)

Create `docker-compose.yml` for local testing:

```yaml
version: '3.8'

services:
  backend:
    build:
      context: .
      dockerfile: apps/backend/Dockerfile
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - REDIS_HOST=redis
    depends_on:
      - redis

  frontend:
    build:
      context: .
      dockerfile: apps/frontend/Dockerfile
    ports:
      - "8080:80"
    depends_on:
      - backend

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

Run with:
```bash
docker-compose up
```

---

## Kubernetes Deployment

### Quick Start

#### 1. Create Kubernetes Namespace
```bash
kubectl apply -f k8s/namespace.yaml
```

#### 2. Create Secrets

First, create secrets from template:
```bash
cp k8s/secrets.yaml.template k8s/secrets.yaml
```

Encode your secrets:
```bash
# Example: Encode Supabase service key
echo -n "your-supabase-service-key" | base64
```

Edit `k8s/secrets.yaml` and apply:
```bash
kubectl apply -f k8s/secrets.yaml
```

#### 3. Create Docker Registry Secret
```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_TOKEN \
  --namespace=virtual-dev
```

#### 4. Update ConfigMap

Edit `k8s/configmap.yaml` with your actual values:
- Replace `virtual-dev.example.com` with your domain
- Update Supabase URL

Then apply:
```bash
kubectl apply -f k8s/configmap.yaml
```

#### 5. Deploy Redis
```bash
kubectl apply -f k8s/redis-deployment.yaml
```

#### 6. Deploy Backend
```bash
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
```

#### 7. Deploy Frontend
```bash
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
```

#### 8. Setup Ingress

First, install nginx ingress controller:
```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/cloud/deploy.yaml
```

Install cert-manager for TLS:
```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

Create ClusterIssuer for Let's Encrypt:
```bash
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: your-email@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

Update domains in `k8s/ingress.yaml` and apply:
```bash
kubectl apply -f k8s/ingress.yaml
```

#### 9. Enable Auto-Scaling
```bash
kubectl apply -f k8s/hpa.yaml
```

### Verification

Check all resources:
```bash
# Check pods
kubectl get pods -n virtual-dev

# Check services
kubectl get services -n virtual-dev

# Check ingress
kubectl get ingress -n virtual-dev

# Check HPA
kubectl get hpa -n virtual-dev

# View logs
kubectl logs -n virtual-dev -l component=backend --tail=100
kubectl logs -n virtual-dev -l component=frontend --tail=100
```

### Getting External IP

```bash
kubectl get ingress -n virtual-dev -o wide
```

Update your DNS to point to the ingress IP address.

---

## Configuration Management

### Environment Variables

Configuration is managed through:
1. **ConfigMap** (`k8s/configmap.yaml`) - Non-sensitive config
2. **Secrets** (`k8s/secrets.yaml`) - Sensitive data

### Updating Configuration

#### ConfigMap Changes
```bash
# Edit configmap
kubectl edit configmap virtual-dev-config -n virtual-dev

# Or update from file
kubectl apply -f k8s/configmap.yaml

# Restart deployments to pick up changes
kubectl rollout restart deployment/virtual-dev-backend -n virtual-dev
kubectl rollout restart deployment/virtual-dev-frontend -n virtual-dev
```

#### Secrets Changes
```bash
# Update secrets
kubectl apply -f k8s/secrets.yaml

# Restart deployments
kubectl rollout restart deployment/virtual-dev-backend -n virtual-dev
```

### Environment-Specific Configurations

Use Kustomize for different environments:

```bash
# Create overlays
mkdir -p k8s/overlays/{development,staging,production}

# Example: k8s/overlays/production/kustomization.yaml
cat <<EOF > k8s/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

namespace: virtual-dev

resources:
  - ../../base

replicas:
  - name: virtual-dev-backend
    count: 5
  - name: virtual-dev-frontend
    count: 3
EOF

# Apply with kustomize
kubectl apply -k k8s/overlays/production
```

---

## Monitoring and Scaling

### Manual Scaling

Scale deployments manually:
```bash
# Scale backend
kubectl scale deployment virtual-dev-backend --replicas=5 -n virtual-dev

# Scale frontend
kubectl scale deployment virtual-dev-frontend --replicas=3 -n virtual-dev
```

### Horizontal Pod Autoscaling (HPA)

HPA automatically scales based on CPU/memory:

```bash
# Check HPA status
kubectl get hpa -n virtual-dev

# Describe HPA
kubectl describe hpa virtual-dev-backend-hpa -n virtual-dev

# Watch HPA in real-time
kubectl get hpa -n virtual-dev --watch
```

HPA Configuration:
- **Backend**: 3-10 pods, scales at 70% CPU
- **Frontend**: 2-5 pods, scales at 70% CPU

### Monitoring Logs

```bash
# Backend logs
kubectl logs -f deployment/virtual-dev-backend -n virtual-dev

# Frontend logs
kubectl logs -f deployment/virtual-dev-frontend -n virtual-dev

# Logs from specific pod
kubectl logs -f POD_NAME -n virtual-dev

# Logs from all backend pods
kubectl logs -n virtual-dev -l component=backend --tail=100 -f
```

### Resource Usage

```bash
# Node resources
kubectl top nodes

# Pod resources
kubectl top pods -n virtual-dev

# Check resource quotas
kubectl describe resourcequota -n virtual-dev
```

### Health Checks

All services have health endpoints:
- Backend: `http://backend:3001/health`
- Frontend: `http://frontend:80/health`

Test health endpoints:
```bash
# Port forward to test
kubectl port-forward -n virtual-dev svc/virtual-dev-backend 3001:3001

# Test in another terminal
curl http://localhost:3001/health
```

---

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl get pods -n virtual-dev

# Describe pod for events
kubectl describe pod POD_NAME -n virtual-dev

# Check logs
kubectl logs POD_NAME -n virtual-dev
```

Common causes:
- Missing secrets
- Wrong image tag
- Resource limits too low
- Image pull errors

#### 2. ImagePullBackOff

```bash
# Check image pull secret
kubectl get secret ghcr-secret -n virtual-dev

# Verify image exists
docker pull ghcr.io/your-username/virtual-dev/backend:latest

# Recreate secret
kubectl delete secret ghcr-secret -n virtual-dev
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_TOKEN \
  --namespace=virtual-dev
```

#### 3. Service Not Accessible

```bash
# Check service endpoints
kubectl get endpoints -n virtual-dev

# Test service internally
kubectl run -it --rm debug --image=busybox --restart=Never -n virtual-dev -- sh
# Inside pod: wget -O- http://virtual-dev-backend:3001/health

# Check ingress
kubectl describe ingress virtual-dev-ingress -n virtual-dev
```

#### 4. Backend Can't Connect to Redis

```bash
# Check Redis is running
kubectl get pods -n virtual-dev -l component=redis

# Test Redis connection
kubectl run -it --rm redis-test --image=redis:7-alpine --restart=Never -n virtual-dev -- redis-cli -h redis-service ping

# Check Redis service
kubectl get svc redis-service -n virtual-dev
```

#### 5. WebSocket Connections Failing

Check ingress annotations for WebSocket support:
```bash
kubectl get ingress virtual-dev-ingress -n virtual-dev -o yaml | grep websocket
```

Should see:
```yaml
nginx.ingress.kubernetes.io/websocket-services: "virtual-dev-backend"
nginx.ingress.kubernetes.io/proxy-connect-timeout: "3600"
```

#### 6. TLS Certificate Not Issuing

```bash
# Check cert-manager
kubectl get pods -n cert-manager

# Check certificate
kubectl get certificate -n virtual-dev

# Check certificate request
kubectl describe certificaterequest -n virtual-dev

# Check ingress events
kubectl describe ingress virtual-dev-ingress -n virtual-dev
```

### Debugging Commands

```bash
# Execute command in pod
kubectl exec -it POD_NAME -n virtual-dev -- /bin/sh

# Port forward for local testing
kubectl port-forward -n virtual-dev svc/virtual-dev-backend 3001:3001

# Copy files from pod
kubectl cp virtual-dev/POD_NAME:/app/logs ./logs

# View events
kubectl get events -n virtual-dev --sort-by='.lastTimestamp'

# Check resource limits
kubectl describe pod POD_NAME -n virtual-dev | grep -A 5 "Limits"
```

### Rollback Deployment

```bash
# View rollout history
kubectl rollout history deployment/virtual-dev-backend -n virtual-dev

# Rollback to previous version
kubectl rollout undo deployment/virtual-dev-backend -n virtual-dev

# Rollback to specific revision
kubectl rollout undo deployment/virtual-dev-backend -n virtual-dev --to-revision=2

# Check rollout status
kubectl rollout status deployment/virtual-dev-backend -n virtual-dev
```

---

## Best Practices

### 1. Use Namespaces
- Isolate resources by environment
- Apply resource quotas per namespace

### 2. Resource Limits
- Always set resource requests and limits
- Prevents one pod from consuming all resources

### 3. Health Checks
- Implement liveness and readiness probes
- Ensures automatic recovery from failures

### 4. Secrets Management
- Never commit secrets to Git
- Use external secrets managers (AWS Secrets Manager, Vault)
- Rotate secrets regularly

### 5. Image Tags
- Use specific version tags in production
- Avoid `latest` tag in production
- Tag images with git commit SHA

### 6. Rolling Updates
- Use rolling update strategy for zero-downtime deployments
- Set appropriate `maxSurge` and `maxUnavailable`

### 7. Monitoring
- Set up monitoring (Prometheus + Grafana)
- Configure alerting for critical issues
- Monitor costs and resource usage

### 8. Backups
- Backup Redis data regularly
- Export Supabase data
- Backup Kubernetes manifests

---

## Production Checklist

Before going to production:

- [ ] All secrets properly configured
- [ ] TLS certificates working (HTTPS)
- [ ] Resource limits set appropriately
- [ ] HPA configured and tested
- [ ] Health checks passing
- [ ] Monitoring and logging set up
- [ ] Backup strategy in place
- [ ] DNS configured correctly
- [ ] Load testing completed
- [ ] Rollback procedure tested
- [ ] Documentation updated
- [ ] Team trained on deployment process

---

## Additional Resources

### Official Documentation
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [cert-manager Documentation](https://cert-manager.io/docs/)
- [nginx Ingress Controller](https://kubernetes.github.io/ingress-nginx/)

### Related Guides
- [MONOREPO_SETUP.md](./MONOREPO_SETUP.md) - Project structure
- [supabase_setup_guide.md](./supabase_setup_guide.md) - Supabase configuration
- [virtual_dev_architecture.md](./virtual_dev_architecture.md) - System architecture

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review pod logs: `kubectl logs -n virtual-dev POD_NAME`
3. Check GitHub Actions workflow runs
4. Verify all secrets and config are correct

---

*Last Updated: November 13, 2025*
*Version: 1.0*
*Project: Virtual Dev - CI/CD & Kubernetes Guide*
