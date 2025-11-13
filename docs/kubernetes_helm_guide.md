# Deploying Virtual Dev on Kubernetes with Helm

## Overview

This guide provides complete Helm charts and instructions for deploying Virtual Dev on Kubernetes, including:
- React frontend (Nginx)
- Node.js backend (Socket.io)
- Redis for session cache
- Ingress for routing
- TLS certificates
- Horizontal Pod Autoscaling (HPA)
- Monitoring and logging

**Note:** Supabase is used as a managed service (cloud), so it's not deployed in the cluster.

---

## Architecture on Kubernetes

```
┌─────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Ingress Controller                   │ │
│  │              (nginx-ingress / traefik)                  │ │
│  │                                                          │ │
│  │  ┌──────────────────┐  ┌────────────────────────────┐ │ │
│  │  │  virtual-dev.com │  │  api.virtual-dev.com       │ │ │
│  │  │  (Frontend)      │  │  (Backend API)             │ │ │
│  │  └────────┬─────────┘  └─────────┬──────────────────┘ │ │
│  └───────────┼──────────────────────┼─────────────────────┘ │
│              │                      │                       │
│  ┌───────────▼──────────┐  ┌───────▼─────────────────────┐ │
│  │   Frontend Service   │  │    Backend Service          │ │
│  │   (ClusterIP)        │  │    (ClusterIP)              │ │
│  └───────────┬──────────┘  └───────┬─────────────────────┘ │
│              │                      │                       │
│  ┌───────────▼──────────┐  ┌───────▼─────────────────────┐ │
│  │  Frontend Deployment │  │   Backend Deployment        │ │
│  │  (Nginx + React)     │  │   (Node.js + Socket.io)     │ │
│  │                      │  │                              │ │
│  │  Replicas: 2-5       │  │   Replicas: 2-10            │ │
│  │  HPA enabled         │  │   HPA enabled               │ │
│  └──────────────────────┘  └───────┬─────────────────────┘ │
│                                     │                       │
│                            ┌────────▼──────────┐           │
│                            │  Redis Service    │           │
│                            │  (ClusterIP)      │           │
│                            └────────┬──────────┘           │
│                                     │                       │
│                            ┌────────▼──────────┐           │
│                            │  Redis StatefulSet│           │
│                            │  (Session Cache)  │           │
│                            │  Replicas: 1      │           │
│                            └───────────────────┘           │
└──────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                            ┌────────────────────┐
                            │    Supabase Cloud  │
                            │    (External)      │
                            └────────────────────┘
```

---

## Prerequisites

### 1. Tools Required

```bash
# Kubernetes cluster (any of these)
# - Minikube (local development)
# - Docker Desktop Kubernetes
# - GKE (Google Kubernetes Engine)
# - EKS (Amazon Elastic Kubernetes Service)
# - AKS (Azure Kubernetes Service)
# - DigitalOcean Kubernetes

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Helm 3
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Verify installations
kubectl version --client
helm version
```

### 2. Cluster Access

```bash
# Verify cluster access
kubectl cluster-info
kubectl get nodes

# Create namespace
kubectl create namespace virtual-dev
kubectl config set-context --current --namespace=virtual-dev
```

### 3. External Services

- **Supabase account** with project created
- **Domain name** (for production)
- **TLS certificate** (optional, can use Let's Encrypt)

---

## Directory Structure

```
helm/
└── virtual-dev/
    ├── Chart.yaml
    ├── values.yaml
    ├── values-dev.yaml
    ├── values-staging.yaml
    ├── values-production.yaml
    ├── templates/
    │   ├── _helpers.tpl
    │   ├── configmap.yaml
    │   ├── secret.yaml
    │   ├── frontend-deployment.yaml
    │   ├── frontend-service.yaml
    │   ├── frontend-hpa.yaml
    │   ├── backend-deployment.yaml
    │   ├── backend-service.yaml
    │   ├── backend-hpa.yaml
    │   ├── redis-statefulset.yaml
    │   ├── redis-service.yaml
    │   ├── ingress.yaml
    │   └── NOTES.txt
    └── README.md
```

---

## Helm Chart Files

### Chart.yaml

```yaml
# helm/virtual-dev/Chart.yaml
apiVersion: v2
name: virtual-dev
description: A Helm chart for Virtual Dev - 2D virtual space for developers
type: application
version: 1.0.0
appVersion: "1.0.0"
keywords:
  - virtual-dev
  - phaser
  - socketio
  - supabase
home: https://virtual-dev.com
sources:
  - https://github.com/your-org/virtual-dev
maintainers:
  - name: Virtual Dev Team
    email: dev@virtual-dev.com
```

### values.yaml (Default Values)

```yaml
# helm/virtual-dev/values.yaml

# Global settings
global:
  nameOverride: ""
  fullnameOverride: ""

# Environment
environment: development

# Image settings
image:
  pullPolicy: IfNotPresent
  # pullSecrets: []

# Frontend (React + Nginx)
frontend:
  enabled: true
  replicaCount: 2
  
  image:
    repository: your-registry/virtual-dev-frontend
    tag: "1.0.0"
  
  service:
    type: ClusterIP
    port: 80
    targetPort: 80
  
  resources:
    limits:
      cpu: 200m
      memory: 256Mi
    requests:
      cpu: 100m
      memory: 128Mi
  
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80
  
  # Environment variables for React app
  env:
    VITE_BACKEND_URL: "https://api.virtual-dev.com"
    VITE_SUPABASE_URL: ""  # Set via secret
    VITE_SUPABASE_ANON_KEY: ""  # Set via secret

# Backend (Node.js + Socket.io)
backend:
  enabled: true
  replicaCount: 2
  
  image:
    repository: your-registry/virtual-dev-backend
    tag: "1.0.0"
  
  service:
    type: ClusterIP
    port: 3001
    targetPort: 3001
  
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 250m
      memory: 256Mi
  
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 10
    targetCPUUtilizationPercentage: 70
    targetMemoryUtilizationPercentage: 80
  
  # Environment variables
  env:
    NODE_ENV: production
    PORT: "3001"
    FRONTEND_URL: "https://virtual-dev.com"
    REDIS_URL: "redis://virtual-dev-redis:6379"
    ANTHROPIC_API_KEY: ""  # Set via secret
    SUPABASE_URL: ""  # Set via secret
    SUPABASE_SERVICE_KEY: ""  # Set via secret

# Redis (Session cache)
redis:
  enabled: true
  
  image:
    repository: redis
    tag: "7-alpine"
  
  service:
    type: ClusterIP
    port: 6379
  
  resources:
    limits:
      cpu: 200m
      memory: 256Mi
    requests:
      cpu: 100m
      memory: 128Mi
  
  persistence:
    enabled: true
    size: 1Gi
    storageClass: ""  # Use default storage class
  
  # Redis configuration
  config:
    maxmemory: "200mb"
    maxmemory-policy: "allkeys-lru"

# Ingress
ingress:
  enabled: true
  className: nginx
  
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/websocket-services: "virtual-dev-backend"
  
  hosts:
    - host: virtual-dev.com
      paths:
        - path: /
          pathType: Prefix
          service: frontend
    - host: api.virtual-dev.com
      paths:
        - path: /
          pathType: Prefix
          service: backend
  
  tls:
    - secretName: virtual-dev-tls
      hosts:
        - virtual-dev.com
        - api.virtual-dev.com

# Secrets (override in values-{env}.yaml)
secrets:
  supabaseUrl: ""
  supabaseAnonKey: ""
  supabaseServiceKey: ""
  anthropicApiKey: ""

# ConfigMaps
configmap:
  data: {}

# Pod security
podSecurityContext:
  fsGroup: 1000

securityContext:
  runAsNonRoot: true
  runAsUser: 1000
  capabilities:
    drop:
      - ALL
  readOnlyRootFilesystem: false

# Node selector
nodeSelector: {}

# Tolerations
tolerations: []

# Affinity
affinity: {}
```

### values-production.yaml

```yaml
# helm/virtual-dev/values-production.yaml

environment: production

frontend:
  replicaCount: 3
  
  autoscaling:
    minReplicas: 3
    maxReplicas: 10
  
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 200m
      memory: 256Mi

backend:
  replicaCount: 3
  
  autoscaling:
    minReplicas: 3
    maxReplicas: 20
  
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi

redis:
  persistence:
    size: 5Gi
  
  resources:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 250m
      memory: 256Mi

# Production secrets (use external secret manager)
secrets:
  supabaseUrl: "https://xxxxx.supabase.co"
  supabaseAnonKey: "eyJhbG..."
  supabaseServiceKey: "eyJhbG..."
  anthropicApiKey: "sk-ant-..."
```

---

## Template Files

### _helpers.tpl

```yaml
# helm/virtual-dev/templates/_helpers.tpl

{{/*
Expand the name of the chart.
*/}}
{{- define "virtual-dev.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "virtual-dev.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "virtual-dev.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "virtual-dev.labels" -}}
helm.sh/chart: {{ include "virtual-dev.chart" . }}
{{ include "virtual-dev.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "virtual-dev.selectorLabels" -}}
app.kubernetes.io/name: {{ include "virtual-dev.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "virtual-dev.frontend.labels" -}}
{{ include "virtual-dev.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Backend labels
*/}}
{{- define "virtual-dev.backend.labels" -}}
{{ include "virtual-dev.labels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Redis labels
*/}}
{{- define "virtual-dev.redis.labels" -}}
{{ include "virtual-dev.labels" . }}
app.kubernetes.io/component: redis
{{- end }}
```

### secret.yaml

```yaml
# helm/virtual-dev/templates/secret.yaml

apiVersion: v1
kind: Secret
metadata:
  name: {{ include "virtual-dev.fullname" . }}-secrets
  labels:
    {{- include "virtual-dev.labels" . | nindent 4 }}
type: Opaque
stringData:
  SUPABASE_URL: {{ .Values.secrets.supabaseUrl | quote }}
  SUPABASE_ANON_KEY: {{ .Values.secrets.supabaseAnonKey | quote }}
  SUPABASE_SERVICE_KEY: {{ .Values.secrets.supabaseServiceKey | quote }}
  ANTHROPIC_API_KEY: {{ .Values.secrets.anthropicApiKey | quote }}
```

### configmap.yaml

```yaml
# helm/virtual-dev/templates/configmap.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ include "virtual-dev.fullname" . }}-config
  labels:
    {{- include "virtual-dev.labels" . | nindent 4 }}
data:
  ENVIRONMENT: {{ .Values.environment | quote }}
  {{- range $key, $value := .Values.configmap.data }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}
```

### frontend-deployment.yaml

```yaml
# helm/virtual-dev/templates/frontend-deployment.yaml

{{- if .Values.frontend.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "virtual-dev.fullname" . }}-frontend
  labels:
    {{- include "virtual-dev.frontend.labels" . | nindent 4 }}
spec:
  {{- if not .Values.frontend.autoscaling.enabled }}
  replicas: {{ .Values.frontend.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "virtual-dev.selectorLabels" . | nindent 6 }}
      app.kubernetes.io/component: frontend
  template:
    metadata:
      labels:
        {{- include "virtual-dev.selectorLabels" . | nindent 8 }}
        app.kubernetes.io/component: frontend
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
        checksum/secret: {{ include (print $.Template.BasePath "/secret.yaml") . | sha256sum }}
    spec:
      {{- with .Values.image.pullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
      - name: frontend
        securityContext:
          {{- toYaml .Values.securityContext | nindent 12 }}
        image: "{{ .Values.frontend.image.repository }}:{{ .Values.frontend.image.tag }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - name: http
          containerPort: {{ .Values.frontend.service.targetPort }}
          protocol: TCP
        env:
        - name: VITE_BACKEND_URL
          value: {{ .Values.frontend.env.VITE_BACKEND_URL | quote }}
        - name: VITE_SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: {{ include "virtual-dev.fullname" . }}-secrets
              key: SUPABASE_URL
        - name: VITE_SUPABASE_ANON_KEY
          valueFrom:
            secretKeyRef:
              name: {{ include "virtual-dev.fullname" . }}-secrets
              key: SUPABASE_ANON_KEY
        livenessProbe:
          httpGet:
            path: /
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: http
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          {{- toYaml .Values.frontend.resources | nindent 12 }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
{{- end }}
```

### frontend-service.yaml

```yaml
# helm/virtual-dev/templates/frontend-service.yaml

{{- if .Values.frontend.enabled }}
apiVersion: v1
kind: Service
metadata:
  name: {{ include "virtual-dev.fullname" . }}-frontend
  labels:
    {{- include "virtual-dev.frontend.labels" . | nindent 4 }}
spec:
  type: {{ .Values.frontend.service.type }}
  ports:
  - port: {{ .Values.frontend.service.port }}
    targetPort: {{ .Values.frontend.service.targetPort }}
    protocol: TCP
    name: http
  selector:
    {{- include "virtual-dev.selectorLabels" . | nindent 4 }}
    app.kubernetes.io/component: frontend
{{- end }}
```

### frontend-hpa.yaml

```yaml
# helm/virtual-dev/templates/frontend-hpa.yaml

{{- if and .Values.frontend.enabled .Values.frontend.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "virtual-dev.fullname" . }}-frontend
  labels:
    {{- include "virtual-dev.frontend.labels" . | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "virtual-dev.fullname" . }}-frontend
  minReplicas: {{ .Values.frontend.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.frontend.autoscaling.maxReplicas }}
  metrics:
  {{- if .Values.frontend.autoscaling.targetCPUUtilizationPercentage }}
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: {{ .Values.frontend.autoscaling.targetCPUUtilizationPercentage }}
  {{- end }}
  {{- if .Values.frontend.autoscaling.targetMemoryUtilizationPercentage }}
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: {{ .Values.frontend.autoscaling.targetMemoryUtilizationPercentage }}
  {{- end }}
{{- end }}
```

### backend-deployment.yaml

```yaml
# helm/virtual-dev/templates/backend-deployment.yaml

{{- if .Values.backend.enabled }}
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "virtual-dev.fullname" . }}-backend
  labels:
    {{- include "virtual-dev.backend.labels" . | nindent 4 }}
spec:
  {{- if not .Values.backend.autoscaling.enabled }}
  replicas: {{ .Values.backend.replicaCount }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "virtual-dev.selectorLabels" . | nindent 6 }}
      app.kubernetes.io/component: backend
  template:
    metadata:
      labels:
        {{- include "virtual-dev.selectorLabels" . | nindent 8 }}
        app.kubernetes.io/component: backend
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
        checksum/secret: {{ include (print $.Template.BasePath "/secret.yaml") . | sha256sum }}
    spec:
      {{- with .Values.image.pullSecrets }}
      imagePullSecrets:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      securityContext:
        {{- toYaml .Values.podSecurityContext | nindent 8 }}
      containers:
      - name: backend
        securityContext:
          {{- toYaml .Values.securityContext | nindent 12 }}
        image: "{{ .Values.backend.image.repository }}:{{ .Values.backend.image.tag }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - name: http
          containerPort: {{ .Values.backend.service.targetPort }}
          protocol: TCP
        env:
        - name: NODE_ENV
          value: {{ .Values.backend.env.NODE_ENV | quote }}
        - name: PORT
          value: {{ .Values.backend.env.PORT | quote }}
        - name: FRONTEND_URL
          value: {{ .Values.backend.env.FRONTEND_URL | quote }}
        - name: REDIS_URL
          value: {{ .Values.backend.env.REDIS_URL | quote }}
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: {{ include "virtual-dev.fullname" . }}-secrets
              key: ANTHROPIC_API_KEY
        - name: SUPABASE_URL
          valueFrom:
            secretKeyRef:
              name: {{ include "virtual-dev.fullname" . }}-secrets
              key: SUPABASE_URL
        - name: SUPABASE_SERVICE_KEY
          valueFrom:
            secretKeyRef:
              name: {{ include "virtual-dev.fullname" . }}-secrets
              key: SUPABASE_SERVICE_KEY
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          {{- toYaml .Values.backend.resources | nindent 12 }}
      {{- with .Values.nodeSelector }}
      nodeSelector:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.affinity }}
      affinity:
        {{- toYaml . | nindent 8 }}
      {{- end }}
      {{- with .Values.tolerations }}
      tolerations:
        {{- toYaml . | nindent 8 }}
      {{- end }}
{{- end }}
```

### backend-service.yaml

```yaml
# helm/virtual-dev/templates/backend-service.yaml

{{- if .Values.backend.enabled }}
apiVersion: v1
kind: Service
metadata:
  name: {{ include "virtual-dev.fullname" . }}-backend
  labels:
    {{- include "virtual-dev.backend.labels" . | nindent 4 }}
  annotations:
    # WebSocket support
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "tcp"
spec:
  type: {{ .Values.backend.service.type }}
  ports:
  - port: {{ .Values.backend.service.port }}
    targetPort: {{ .Values.backend.service.targetPort }}
    protocol: TCP
    name: http
  selector:
    {{- include "virtual-dev.selectorLabels" . | nindent 4 }}
    app.kubernetes.io/component: backend
{{- end }}
```

### backend-hpa.yaml

```yaml
# helm/virtual-dev/templates/backend-hpa.yaml

{{- if and .Values.backend.enabled .Values.backend.autoscaling.enabled }}
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ include "virtual-dev.fullname" . }}-backend
  labels:
    {{- include "virtual-dev.backend.labels" . | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ include "virtual-dev.fullname" . }}-backend
  minReplicas: {{ .Values.backend.autoscaling.minReplicas }}
  maxReplicas: {{ .Values.backend.autoscaling.maxReplicas }}
  metrics:
  {{- if .Values.backend.autoscaling.targetCPUUtilizationPercentage }}
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: {{ .Values.backend.autoscaling.targetCPUUtilizationPercentage }}
  {{- end }}
  {{- if .Values.backend.autoscaling.targetMemoryUtilizationPercentage }}
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: {{ .Values.backend.autoscaling.targetMemoryUtilizationPercentage }}
  {{- end }}
{{- end }}
```

### redis-statefulset.yaml

```yaml
# helm/virtual-dev/templates/redis-statefulset.yaml

{{- if .Values.redis.enabled }}
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: {{ include "virtual-dev.fullname" . }}-redis
  labels:
    {{- include "virtual-dev.redis.labels" . | nindent 4 }}
spec:
  serviceName: {{ include "virtual-dev.fullname" . }}-redis
  replicas: 1
  selector:
    matchLabels:
      {{- include "virtual-dev.selectorLabels" . | nindent 6 }}
      app.kubernetes.io/component: redis
  template:
    metadata:
      labels:
        {{- include "virtual-dev.selectorLabels" . | nindent 8 }}
        app.kubernetes.io/component: redis
    spec:
      containers:
      - name: redis
        image: "{{ .Values.redis.image.repository }}:{{ .Values.redis.image.tag }}"
        imagePullPolicy: {{ .Values.image.pullPolicy }}
        ports:
        - name: redis
          containerPort: 6379
          protocol: TCP
        command:
        - redis-server
        - "--maxmemory"
        - {{ .Values.redis.config.maxmemory | quote }}
        - "--maxmemory-policy"
        - {{ .Values.redis.config["maxmemory-policy"] | quote }}
        livenessProbe:
          tcpSocket:
            port: redis
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - redis-cli
            - ping
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          {{- toYaml .Values.redis.resources | nindent 12 }}
        {{- if .Values.redis.persistence.enabled }}
        volumeMounts:
        - name: redis-data
          mountPath: /data
        {{- end }}
  {{- if .Values.redis.persistence.enabled }}
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      {{- if .Values.redis.persistence.storageClass }}
      storageClassName: {{ .Values.redis.persistence.storageClass | quote }}
      {{- end }}
      resources:
        requests:
          storage: {{ .Values.redis.persistence.size }}
  {{- end }}
{{- end }}
```

### redis-service.yaml

```yaml
# helm/virtual-dev/templates/redis-service.yaml

{{- if .Values.redis.enabled }}
apiVersion: v1
kind: Service
metadata:
  name: {{ include "virtual-dev.fullname" . }}-redis
  labels:
    {{- include "virtual-dev.redis.labels" . | nindent 4 }}
spec:
  type: {{ .Values.redis.service.type }}
  clusterIP: None  # Headless service for StatefulSet
  ports:
  - port: {{ .Values.redis.service.port }}
    targetPort: redis
    protocol: TCP
    name: redis
  selector:
    {{- include "virtual-dev.selectorLabels" . | nindent 4 }}
    app.kubernetes.io/component: redis
{{- end }}
```

### ingress.yaml

```yaml
# helm/virtual-dev/templates/ingress.yaml

{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "virtual-dev.fullname" . }}
  labels:
    {{- include "virtual-dev.labels" . | nindent 4 }}
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  {{- if .Values.ingress.className }}
  ingressClassName: {{ .Values.ingress.className }}
  {{- end }}
  {{- if .Values.ingress.tls }}
  tls:
    {{- range .Values.ingress.tls }}
    - hosts:
        {{- range .hosts }}
        - {{ . | quote }}
        {{- end }}
      secretName: {{ .secretName }}
    {{- end }}
  {{- end }}
  rules:
    {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
          {{- range .paths }}
          - path: {{ .path }}
            pathType: {{ .pathType }}
            backend:
              service:
                name: {{ include "virtual-dev.fullname" $ }}-{{ .service }}
                port:
                  {{- if eq .service "frontend" }}
                  number: {{ $.Values.frontend.service.port }}
                  {{- else if eq .service "backend" }}
                  number: {{ $.Values.backend.service.port }}
                  {{- end }}
          {{- end }}
    {{- end }}
{{- end }}
```

### NOTES.txt

```
# helm/virtual-dev/templates/NOTES.txt

🎉 Virtual Dev has been installed!

📊 Release Information:
  Name:      {{ .Release.Name }}
  Namespace: {{ .Release.Namespace }}
  Version:   {{ .Chart.Version }}

🌐 Access URLs:
{{- if .Values.ingress.enabled }}
{{- range .Values.ingress.hosts }}
  Frontend: https://{{ .host }}
{{- end }}
{{- else }}
  Get the application URL by running:
  
  kubectl port-forward -n {{ .Release.Namespace }} svc/{{ include "virtual-dev.fullname" . }}-frontend 8080:80
  echo "Visit http://localhost:8080"
{{- end }}

📦 Deployed Components:
{{- if .Values.frontend.enabled }}
  ✓ Frontend (Nginx + React): {{ .Values.frontend.replicaCount }} replicas
{{- end }}
{{- if .Values.backend.enabled }}
  ✓ Backend (Node.js + Socket.io): {{ .Values.backend.replicaCount }} replicas
{{- end }}
{{- if .Values.redis.enabled }}
  ✓ Redis (Session cache): 1 replica
{{- end }}

🔍 Check status:
  kubectl get pods -n {{ .Release.Namespace }}
  kubectl get services -n {{ .Release.Namespace }}
  kubectl get ingress -n {{ .Release.Namespace }}

📈 Monitor scaling:
  kubectl get hpa -n {{ .Release.Namespace }}

📝 View logs:
  kubectl logs -f deployment/{{ include "virtual-dev.fullname" . }}-backend -n {{ .Release.Namespace }}
  kubectl logs -f deployment/{{ include "virtual-dev.fullname" . }}-frontend -n {{ .Release.Namespace }}

Happy developing! 🚀
```

---

## Docker Images

Before deploying, you need to build and push Docker images.

### Frontend Dockerfile

```dockerfile
# frontend/Dockerfile

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build args for environment variables
ARG VITE_BACKEND_URL
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY

ENV VITE_BACKEND_URL=$VITE_BACKEND_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# Production stage
FROM nginx:alpine

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### Frontend nginx.conf

```nginx
# frontend/nginx.conf

server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### Backend Dockerfile

```dockerfile
# backend/Dockerfile

FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user
RUN addgroup -g 1000 nodejs && \
    adduser -u 1000 -G nodejs -s /bin/sh -D nodejs && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]
```

### Build and Push Images

```bash
# Build frontend
docker build -t your-registry/virtual-dev-frontend:1.0.0 \
  --build-arg VITE_BACKEND_URL=https://api.virtual-dev.com \
  --build-arg VITE_SUPABASE_URL=https://xxxxx.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=eyJhbG... \
  ./frontend

# Build backend
docker build -t your-registry/virtual-dev-backend:1.0.0 ./backend

# Push to registry
docker push your-registry/virtual-dev-frontend:1.0.0
docker push your-registry/virtual-dev-backend:1.0.0
```

---

## Deployment Instructions

### 1. Prepare Secrets

Create a `secrets.yaml` file (don't commit to git):

```bash
# secrets.yaml
supabaseUrl: "https://xxxxx.supabase.co"
supabaseAnonKey: "eyJhbGci..."
supabaseServiceKey: "eyJhbGci..."
anthropicApiKey: "sk-ant-..."
```

### 2. Install with Helm

```bash
# Add your custom values
helm install virtual-dev ./helm/virtual-dev \
  --namespace virtual-dev \
  --create-namespace \
  --values ./helm/virtual-dev/values-production.yaml \
  --set-file secrets.supabaseUrl=<(echo -n "https://xxxxx.supabase.co") \
  --set-file secrets.supabaseAnonKey=<(echo -n "your-key") \
  --set-file secrets.supabaseServiceKey=<(echo -n "your-key") \
  --set-file secrets.anthropicApiKey=<(echo -n "your-key")
```

### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -n virtual-dev

# Check services
kubectl get svc -n virtual-dev

# Check ingress
kubectl get ingress -n virtual-dev

# View logs
kubectl logs -f deployment/virtual-dev-backend -n virtual-dev
```

### 4. Access Application

```bash
# If using ingress
# Visit https://virtual-dev.com

# Or port-forward for testing
kubectl port-forward svc/virtual-dev-frontend 8080:80 -n virtual-dev
kubectl port-forward svc/virtual-dev-backend 3001:3001 -n virtual-dev
```

---

## Upgrading

```bash
# Upgrade existing installation
helm upgrade virtual-dev ./helm/virtual-dev \
  --namespace virtual-dev \
  --values ./helm/virtual-dev/values-production.yaml \
  --reuse-values

# Rollback if needed
helm rollback virtual-dev -n virtual-dev
```

---

## Uninstalling

```bash
# Uninstall release
helm uninstall virtual-dev -n virtual-dev

# Delete namespace (optional)
kubectl delete namespace virtual-dev
```

---

## Monitoring and Logging

### Install Prometheus + Grafana (Optional)

```bash
# Add Prometheus Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace

# Access Grafana
kubectl port-forward svc/prometheus-grafana 3000:80 -n monitoring
# Default credentials: admin/prom-operator
```

### View Logs with Loki (Optional)

```bash
# Install Loki stack
helm install loki grafana/loki-stack \
  --namespace monitoring

# View logs in Grafana
# Add Loki as datasource
```

---

## Cost Estimation

### GKE (Google Cloud)

```
- 3 nodes (n1-standard-2): ~$150/month
- LoadBalancer: ~$20/month
- Persistent volumes: ~$10/month
Total: ~$180/month
```

### EKS (AWS)

```
- 3 nodes (t3.medium): ~$95/month
- ALB: ~$20/month
- EBS volumes: ~$10/month
Total: ~$125/month
```

### DigitalOcean

```
- 3 nodes (4GB): ~$72/month
- LoadBalancer: ~$12/month
- Block storage: ~$10/month
Total: ~$94/month (cheapest option)
```

---

## Next Steps

1. ✅ Set up CI/CD pipeline (GitHub Actions)
2. ✅ Configure SSL certificates (cert-manager)
3. ✅ Set up monitoring (Prometheus/Grafana)
4. ✅ Configure log aggregation (Loki/ELK)
5. ✅ Set up backups for Redis
6. ✅ Configure auto-scaling policies
7. ✅ Implement blue-green deployments

---

*Helm Deployment Guide Version: 1.0*  
*Last Updated: November 12, 2025*  
*Project: Virtual Dev*
