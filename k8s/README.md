# Kubernetes Manifests

This directory contains all Kubernetes manifests for deploying Virtual Dev.

## 📁 Files Overview

| File | Description |
|------|-------------|
| `namespace.yaml` | Creates the `virtual-dev` namespace |
| `configmap.yaml` | Non-sensitive configuration (URLs, ports, etc.) |
| `secrets.yaml.template` | Template for sensitive data (copy to secrets.yaml) |
| `backend-deployment.yaml` | Backend deployment with 3 replicas |
| `backend-service.yaml` | Backend ClusterIP service |
| `frontend-deployment.yaml` | Frontend deployment with 2 replicas |
| `frontend-service.yaml` | Frontend ClusterIP service |
| `redis-deployment.yaml` | Redis cache deployment with PVC |
| `ingress.yaml` | Nginx ingress with TLS support |
| `hpa.yaml` | Horizontal Pod Autoscaler configs |

## 🚀 Quick Start

### 1. Prerequisites
```bash
# Verify kubectl is configured
kubectl cluster-info

# Create namespace
kubectl apply -f namespace.yaml
```

### 2. Configure Secrets
```bash
# Copy template
cp secrets.yaml.template secrets.yaml

# Edit with your secrets (base64 encoded)
# Encode: echo -n "your-secret" | base64

# Apply secrets
kubectl apply -f secrets.yaml

# Create Docker registry secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_TOKEN \
  --namespace=virtual-dev
```

### 3. Deploy
```bash
# Apply all manifests in order
kubectl apply -f configmap.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f backend-deployment.yaml
kubectl apply -f backend-service.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f frontend-service.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml
```

### 4. Verify
```bash
# Check all resources
kubectl get all -n virtual-dev

# Check pods are running
kubectl get pods -n virtual-dev

# Check ingress
kubectl get ingress -n virtual-dev
```

## 📝 Configuration

### Update Image Tags

Before deploying, update image references in:
- `backend-deployment.yaml` - Line with `image: ghcr.io/...`
- `frontend-deployment.yaml` - Line with `image: ghcr.io/...`

Replace `your-username` with your GitHub username:
```bash
sed -i 's/your-username/YOUR_GITHUB_USERNAME/g' backend-deployment.yaml
sed -i 's/your-username/YOUR_GITHUB_USERNAME/g' frontend-deployment.yaml
```

### Update Domains

Edit `ingress.yaml` and replace:
- `virtual-dev.example.com` → Your frontend domain
- `api.virtual-dev.example.com` → Your backend domain

Edit `configmap.yaml` and update:
- `VITE_API_URL` → Your backend URL
- `VITE_WS_URL` → Your WebSocket URL
- `CORS_ORIGIN` → Your frontend URL

## 🔧 Common Operations

### Scaling
```bash
# Scale backend
kubectl scale deployment virtual-dev-backend --replicas=5 -n virtual-dev

# Scale frontend
kubectl scale deployment virtual-dev-frontend --replicas=3 -n virtual-dev
```

### View Logs
```bash
# Backend logs
kubectl logs -f deployment/virtual-dev-backend -n virtual-dev

# Frontend logs
kubectl logs -f deployment/virtual-dev-frontend -n virtual-dev
```

### Update Deployment
```bash
# Edit deployment
kubectl edit deployment virtual-dev-backend -n virtual-dev

# Or apply changes from file
kubectl apply -f backend-deployment.yaml
```

### Rollback
```bash
# View history
kubectl rollout history deployment/virtual-dev-backend -n virtual-dev

# Rollback
kubectl rollout undo deployment/virtual-dev-backend -n virtual-dev
```

### Debug
```bash
# Describe pod
kubectl describe pod POD_NAME -n virtual-dev

# Execute shell in pod
kubectl exec -it POD_NAME -n virtual-dev -- /bin/sh

# Port forward
kubectl port-forward -n virtual-dev svc/virtual-dev-backend 3001:3001
```

## 🔒 Security Notes

- **Never commit** `secrets.yaml` to version control
- Always use **base64 encoding** for secrets
- Rotate secrets regularly
- Use **RBAC** to limit access
- Enable **network policies** for pod isolation

## 📚 Full Documentation

See [docs/CI_CD_KUBERNETES_GUIDE.md](../docs/CI_CD_KUBERNETES_GUIDE.md) for:
- Detailed setup instructions
- CI/CD pipeline configuration
- Troubleshooting guide
- Best practices
- Production checklist

## 🆘 Troubleshooting

### Pods Not Starting
```bash
kubectl describe pod POD_NAME -n virtual-dev
kubectl logs POD_NAME -n virtual-dev
```

### ImagePullBackOff
```bash
# Recreate Docker secret
kubectl delete secret ghcr-secret -n virtual-dev
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_TOKEN \
  --namespace=virtual-dev
```

### Service Not Accessible
```bash
# Check endpoints
kubectl get endpoints -n virtual-dev

# Check ingress
kubectl describe ingress virtual-dev-ingress -n virtual-dev
```

---

*For detailed documentation, see [CI_CD_KUBERNETES_GUIDE.md](../docs/CI_CD_KUBERNETES_GUIDE.md)*
