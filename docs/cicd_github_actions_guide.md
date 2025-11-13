# CI/CD Pipeline for Virtual Dev with GitHub Actions

## Overview

This guide provides a complete CI/CD pipeline using GitHub Actions to build, test, and deploy Virtual Dev to Kubernetes using Helm charts.

---

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────┐
│               GitHub Repository                         │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Push to branch                                  │   │
│  │  or                                              │   │
│  │  Create PR                                       │   │
│  └─────────┬───────────────────────────────────────┘   │
└────────────┼─────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────┐
│            GitHub Actions Workflows                       │
│                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────┐ │
│  │   Lint & Test  │  │  Build Docker  │  │  Deploy   │ │
│  │                │→ │     Images     │→ │    Helm   │ │
│  │  - ESLint      │  │                │  │           │ │
│  │  - Unit tests  │  │  - Frontend    │  │  - Dev    │ │
│  │  - Integration │  │  - Backend     │  │  - Staging│ │
│  └────────────────┘  └────────┬───────┘  │  - Prod   │ │
│                               │          └───────────┘ │
│                               ▼                         │
│                      ┌────────────────┐                 │
│                      │  Push to       │                 │
│                      │  Registry      │                 │
│                      │  (Docker Hub/  │                 │
│                      │   GCR/ECR)     │                 │
│                      └────────────────┘                 │
└──────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────┐
│            Kubernetes Cluster                            │
│                                                          │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────┐ │
│  │    Dev     │  │   Staging    │  │   Production    │ │
│  │ Namespace  │  │  Namespace   │  │   Namespace     │ │
│  └────────────┘  └──────────────┘  └─────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## Repository Structure

```
.github/
└── workflows/
    ├── lint-test.yml           # Run on all PRs
    ├── build-frontend.yml      # Build frontend image
    ├── build-backend.yml       # Build backend image
    ├── deploy-dev.yml          # Deploy to dev on push to develop
    ├── deploy-staging.yml      # Deploy to staging on push to main
    └── deploy-production.yml   # Deploy to prod on release tag

.dockerignore
Dockerfile (frontend & backend)
helm/ (Helm charts)
```

---

## GitHub Secrets Configuration

Set up these secrets in your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

```bash
# Docker Registry
DOCKER_USERNAME           # Docker Hub username
DOCKER_PASSWORD           # Docker Hub password (or token)

# Kubernetes
KUBE_CONFIG_DEV          # Base64 encoded kubeconfig for dev
KUBE_CONFIG_STAGING      # Base64 encoded kubeconfig for staging
KUBE_CONFIG_PROD         # Base64 encoded kubeconfig for prod

# Application Secrets
SUPABASE_URL             # Supabase project URL
SUPABASE_ANON_KEY        # Supabase anonymous key
SUPABASE_SERVICE_KEY     # Supabase service role key
ANTHROPIC_API_KEY        # Claude API key
```

### Generate base64 kubeconfig

```bash
# Get your kubeconfig
kubectl config view --flatten --minify > kubeconfig.yaml

# Base64 encode it
cat kubeconfig.yaml | base64 -w 0

# Add the output to GitHub Secrets
```

---

## Workflow Files

### 1. Lint and Test

```yaml
# .github/workflows/lint-test.yml

name: Lint and Test

on:
  pull_request:
    branches: [develop, main]
  push:
    branches: [develop, main]

jobs:
  lint-frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./frontend
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run tests
        run: npm test

  lint-backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./backend
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run ESLint
        run: npm run lint
      
      - name: Run type check
        run: npm run type-check
      
      - name: Run tests
        run: npm test
```

### 2. Build Frontend Image

```yaml
# .github/workflows/build-frontend.yml

name: Build Frontend Image

on:
  push:
    branches: [develop, main]
    paths:
      - 'frontend/**'
      - '.github/workflows/build-frontend.yml'
  workflow_dispatch:

env:
  IMAGE_NAME: virtual-dev-frontend

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ secrets.DOCKER_USERNAME }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
          build-args: |
            VITE_BACKEND_URL=${{ secrets.BACKEND_URL || 'https://api.virtual-dev.com' }}
            VITE_SUPABASE_URL=${{ secrets.SUPABASE_URL }}
            VITE_SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }}
      
      - name: Image digest
        run: echo ${{ steps.meta.outputs.digest }}
```

### 3. Build Backend Image

```yaml
# .github/workflows/build-backend.yml

name: Build Backend Image

on:
  push:
    branches: [develop, main]
    paths:
      - 'backend/**'
      - '.github/workflows/build-backend.yml'
  workflow_dispatch:

env:
  IMAGE_NAME: virtual-dev-backend

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
      
      - name: Log in to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ secrets.DOCKER_USERNAME }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
      
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      
      - name: Image digest
        run: echo ${{ steps.meta.outputs.digest }}
```

### 4. Deploy to Development

```yaml
# .github/workflows/deploy-dev.yml

name: Deploy to Development

on:
  push:
    branches: [develop]
  workflow_dispatch:

env:
  NAMESPACE: virtual-dev-dev
  RELEASE_NAME: virtual-dev-dev

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: development
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Helm
        uses: azure/setup-helm@v3
        with:
          version: '3.13.0'
      
      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
      
      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBE_CONFIG_DEV }}" | base64 -d > $HOME/.kube/config
          chmod 600 $HOME/.kube/config
      
      - name: Create namespace if not exists
        run: |
          kubectl create namespace ${{ env.NAMESPACE }} --dry-run=client -o yaml | kubectl apply -f -
      
      - name: Deploy with Helm
        run: |
          helm upgrade --install ${{ env.RELEASE_NAME }} ./helm/virtual-dev \
            --namespace ${{ env.NAMESPACE }} \
            --values ./helm/virtual-dev/values-dev.yaml \
            --set frontend.image.tag=develop-${{ github.sha }} \
            --set backend.image.tag=develop-${{ github.sha }} \
            --set secrets.supabaseUrl="${{ secrets.SUPABASE_URL }}" \
            --set secrets.supabaseAnonKey="${{ secrets.SUPABASE_ANON_KEY }}" \
            --set secrets.supabaseServiceKey="${{ secrets.SUPABASE_SERVICE_KEY }}" \
            --set secrets.anthropicApiKey="${{ secrets.ANTHROPIC_API_KEY }}" \
            --wait \
            --timeout 10m
      
      - name: Verify deployment
        run: |
          kubectl rollout status deployment/${{ env.RELEASE_NAME }}-frontend -n ${{ env.NAMESPACE }}
          kubectl rollout status deployment/${{ env.RELEASE_NAME }}-backend -n ${{ env.NAMESPACE }}
      
      - name: Get deployment info
        run: |
          echo "=== Pods ==="
          kubectl get pods -n ${{ env.NAMESPACE }}
          echo ""
          echo "=== Services ==="
          kubectl get svc -n ${{ env.NAMESPACE }}
          echo ""
          echo "=== Ingress ==="
          kubectl get ingress -n ${{ env.NAMESPACE }}
```

### 5. Deploy to Staging

```yaml
# .github/workflows/deploy-staging.yml

name: Deploy to Staging

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  NAMESPACE: virtual-dev-staging
  RELEASE_NAME: virtual-dev-staging

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: staging
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Helm
        uses: azure/setup-helm@v3
        with:
          version: '3.13.0'
      
      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
      
      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBE_CONFIG_STAGING }}" | base64 -d > $HOME/.kube/config
          chmod 600 $HOME/.kube/config
      
      - name: Create namespace if not exists
        run: |
          kubectl create namespace ${{ env.NAMESPACE }} --dry-run=client -o yaml | kubectl apply -f -
      
      - name: Deploy with Helm
        run: |
          helm upgrade --install ${{ env.RELEASE_NAME }} ./helm/virtual-dev \
            --namespace ${{ env.NAMESPACE }} \
            --values ./helm/virtual-dev/values-staging.yaml \
            --set frontend.image.tag=main-${{ github.sha }} \
            --set backend.image.tag=main-${{ github.sha }} \
            --set secrets.supabaseUrl="${{ secrets.SUPABASE_URL }}" \
            --set secrets.supabaseAnonKey="${{ secrets.SUPABASE_ANON_KEY }}" \
            --set secrets.supabaseServiceKey="${{ secrets.SUPABASE_SERVICE_KEY }}" \
            --set secrets.anthropicApiKey="${{ secrets.ANTHROPIC_API_KEY }}" \
            --wait \
            --timeout 10m
      
      - name: Verify deployment
        run: |
          kubectl rollout status deployment/${{ env.RELEASE_NAME }}-frontend -n ${{ env.NAMESPACE }}
          kubectl rollout status deployment/${{ env.RELEASE_NAME }}-backend -n ${{ env.NAMESPACE }}
      
      - name: Run smoke tests
        run: |
          # Add your smoke tests here
          curl -f https://staging.virtual-dev.com/health || exit 1
      
      - name: Notify deployment
        if: success()
        run: |
          echo "✅ Staging deployment successful!"
          echo "URL: https://staging.virtual-dev.com"
```

### 6. Deploy to Production

```yaml
# .github/workflows/deploy-production.yml

name: Deploy to Production

on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to deploy (e.g., v1.0.0)'
        required: true

env:
  NAMESPACE: virtual-dev-prod
  RELEASE_NAME: virtual-dev

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: 
      name: production
      url: https://virtual-dev.com
    
    steps:
      - uses: actions/checkout@v4
        with:
          ref: ${{ github.event.inputs.version || github.event.release.tag_name }}
      
      - name: Install Helm
        uses: azure/setup-helm@v3
        with:
          version: '3.13.0'
      
      - name: Setup kubectl
        uses: azure/setup-kubectl@v3
      
      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBE_CONFIG_PROD }}" | base64 -d > $HOME/.kube/config
          chmod 600 $HOME/.kube/config
      
      - name: Backup current deployment
        run: |
          helm get values ${{ env.RELEASE_NAME }} -n ${{ env.NAMESPACE }} > backup-values.yaml || true
      
      - name: Deploy with Helm
        run: |
          VERSION="${{ github.event.inputs.version || github.event.release.tag_name }}"
          VERSION="${VERSION#v}"  # Remove 'v' prefix
          
          helm upgrade --install ${{ env.RELEASE_NAME }} ./helm/virtual-dev \
            --namespace ${{ env.NAMESPACE }} \
            --values ./helm/virtual-dev/values-production.yaml \
            --set frontend.image.tag="${VERSION}" \
            --set backend.image.tag="${VERSION}" \
            --set secrets.supabaseUrl="${{ secrets.SUPABASE_URL }}" \
            --set secrets.supabaseAnonKey="${{ secrets.SUPABASE_ANON_KEY }}" \
            --set secrets.supabaseServiceKey="${{ secrets.SUPABASE_SERVICE_KEY }}" \
            --set secrets.anthropicApiKey="${{ secrets.ANTHROPIC_API_KEY }}" \
            --wait \
            --timeout 15m
      
      - name: Verify deployment
        run: |
          kubectl rollout status deployment/${{ env.RELEASE_NAME }}-frontend -n ${{ env.NAMESPACE }}
          kubectl rollout status deployment/${{ env.RELEASE_NAME }}-backend -n ${{ env.NAMESPACE }}
      
      - name: Run smoke tests
        run: |
          sleep 30  # Wait for services to stabilize
          curl -f https://virtual-dev.com/health || exit 1
          curl -f https://api.virtual-dev.com/health || exit 1
      
      - name: Rollback on failure
        if: failure()
        run: |
          echo "❌ Deployment failed! Rolling back..."
          helm rollback ${{ env.RELEASE_NAME }} -n ${{ env.NAMESPACE }}
      
      - name: Notify success
        if: success()
        run: |
          echo "🚀 Production deployment successful!"
          echo "Version: ${{ github.event.inputs.version || github.event.release.tag_name }}"
          echo "URL: https://virtual-dev.com"
      
      - name: Create deployment record
        if: success()
        run: |
          kubectl annotate deployment/${{ env.RELEASE_NAME }}-frontend \
            "deployment/timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
            "deployment/version=${{ github.event.inputs.version || github.event.release.tag_name }}" \
            "deployment/sha=${{ github.sha }}" \
            -n ${{ env.NAMESPACE }}
```

---

## Branch Strategy

### Recommended GitFlow

```
main (production)
  ↑
  └── Pull Requests from develop
  
develop (staging)
  ↑
  └── Feature branches

feature/*, fix/*, hotfix/*
  ↓
  └── Merged into develop via PR
```

### Deployment Triggers

```
feature/xyz → Push → Lint & Test (no deploy)
develop     → Push → Build Images → Deploy to Dev
main        → Push → Build Images → Deploy to Staging
v1.0.0 tag  → Release → Deploy to Production
```

---

## Environment Configuration Files

### values-dev.yaml

```yaml
# helm/virtual-dev/values-dev.yaml

environment: development

frontend:
  replicaCount: 1
  autoscaling:
    enabled: false
  resources:
    limits:
      cpu: 100m
      memory: 128Mi
    requests:
      cpu: 50m
      memory: 64Mi

backend:
  replicaCount: 1
  autoscaling:
    enabled: false
  resources:
    limits:
      cpu: 200m
      memory: 256Mi
    requests:
      cpu: 100m
      memory: 128Mi
  env:
    NODE_ENV: development

redis:
  persistence:
    enabled: false  # No persistence in dev
  resources:
    limits:
      cpu: 100m
      memory: 128Mi
    requests:
      cpu: 50m
      memory: 64Mi

ingress:
  enabled: false  # Use port-forward in dev
```

### values-staging.yaml

```yaml
# helm/virtual-dev/values-staging.yaml

environment: staging

frontend:
  replicaCount: 2
  autoscaling:
    minReplicas: 2
    maxReplicas: 4

backend:
  replicaCount: 2
  autoscaling:
    minReplicas: 2
    maxReplicas: 5

redis:
  persistence:
    size: 2Gi

ingress:
  hosts:
    - host: staging.virtual-dev.com
      paths:
        - path: /
          pathType: Prefix
          service: frontend
    - host: api-staging.virtual-dev.com
      paths:
        - path: /
          pathType: Prefix
          service: backend
```

---

## Monitoring Deployment

### Check Pipeline Status

```bash
# View workflow runs
gh run list

# Watch specific run
gh run watch <run-id>

# View logs
gh run view <run-id> --log
```

### Check Kubernetes Status

```bash
# Watch pods
kubectl get pods -n virtual-dev-prod -w

# Check events
kubectl get events -n virtual-dev-prod --sort-by='.lastTimestamp'

# View logs
kubectl logs -f deployment/virtual-dev-frontend -n virtual-dev-prod

# Check HPA status
kubectl get hpa -n virtual-dev-prod
```

---

## Rollback Strategy

### Automatic Rollback

The production workflow includes automatic rollback on failure:

```yaml
- name: Rollback on failure
  if: failure()
  run: |
    helm rollback ${{ env.RELEASE_NAME }} -n ${{ env.NAMESPACE }}
```

### Manual Rollback

```bash
# List releases
helm history virtual-dev -n virtual-dev-prod

# Rollback to previous version
helm rollback virtual-dev -n virtual-dev-prod

# Rollback to specific revision
helm rollback virtual-dev 5 -n virtual-dev-prod
```

---

## Security Best Practices

### 1. Use GitHub Environments

Configure environment protection rules:
- **Development**: Auto-deploy
- **Staging**: Auto-deploy with required reviewers (optional)
- **Production**: Required reviewers + wait timer

### 2. Scan Images for Vulnerabilities

Add to workflow:

```yaml
- name: Scan image with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ secrets.DOCKER_USERNAME }}/virtual-dev-frontend:${{ github.sha }}
    format: 'sarif'
    output: 'trivy-results.sarif'

- name: Upload scan results
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: 'trivy-results.sarif'
```

### 3. Use Sealed Secrets (Production)

Instead of storing secrets in GitHub:

```bash
# Install sealed-secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Create sealed secret
echo -n "my-secret" | kubectl create secret generic my-secret --dry-run=client --from-file=secret=/dev/stdin -o yaml | \
  kubeseal -o yaml > sealed-secret.yaml

# Commit sealed-secret.yaml to git
```

---

## Performance Optimization

### 1. Docker Build Cache

Already configured in workflows:

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

### 2. Parallel Builds

Build frontend and backend in parallel:

```yaml
jobs:
  build-frontend:
    # ...
  build-backend:
    # ...
  # Both run in parallel
```

### 3. Conditional Deployments

Only deploy changed services:

```yaml
on:
  push:
    paths:
      - 'frontend/**'  # Only trigger on frontend changes
```

---

## Cost Optimization

### 1. Use Spot Instances

For dev/staging environments:

```yaml
# Add to deployment
nodeSelector:
  cloud.google.com/gke-preemptible: "true"  # GKE
  # OR
  eks.amazonaws.com/capacityType: SPOT       # EKS
```

### 2. Auto-shutdown Dev Environment

```yaml
# .github/workflows/shutdown-dev.yml
name: Shutdown Dev Environment

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM daily

jobs:
  shutdown:
    runs-on: ubuntu-latest
    steps:
      - name: Scale down dev
        run: |
          kubectl scale deployment --all --replicas=0 -n virtual-dev-dev
```

---

## Troubleshooting

### Pipeline Failures

**Issue**: Build fails with "disk space"
```bash
# Add cleanup step
- name: Clean up Docker
  run: docker system prune -af
```

**Issue**: Kubectl connection timeout
```bash
# Verify kubeconfig is valid
echo "${{ secrets.KUBE_CONFIG }}" | base64 -d | kubectl cluster-info --kubeconfig -
```

**Issue**: Helm upgrade stuck
```bash
# Add timeout and force flag
helm upgrade --install --timeout 10m --force ...
```

---

## Next Steps

1. ✅ Set up GitHub secrets
2. ✅ Create Docker Hub account (or use GCR/ECR)
3. ✅ Configure Kubernetes cluster
4. ✅ Test deployment to dev
5. ✅ Set up monitoring
6. ✅ Configure alerts
7. ✅ Document runbook

---

*CI/CD Guide Version: 1.0*  
*Last Updated: November 12, 2025*  
*Project: Virtual Dev*
