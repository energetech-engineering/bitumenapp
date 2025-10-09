# Deployment Guide: Google Cloud Run & Static Site Hosting

This guide walks you through hosting the FastAPI backend on **Google Cloud Run** and serving the React frontend from a **Cloud Storage bucket fronted by Cloud CDN**. It also covers the GitHub Actions workflows that automate both deployments.

## 1. Prerequisites

- A Google Cloud project with billing enabled.
- `gcloud` CLI installed locally (version ≥ 420).
- Owner or editor permissions on the project to create resources and grant IAM roles.
- Admin access to this GitHub repository.

> Replace placeholder strings in the workflows and commands below with values that match your setup.
> All shell snippets below assume **Git Bash** on Windows; adjust quoting if you use a different shell.

## 2. Enable Required Google Cloud APIs

```bash
# Once per project
project_id="bitumenapp"
gcloud config set project "${project_id}"
gcloud services enable \
    run.googleapis.com \
    artifactregistry.googleapis.com \
    cloudbuild.googleapis.com \
    iam.googleapis.com \
    iamcredentials.googleapis.com \
    storage.googleapis.com
```

## 3. Prepare Artifact Registry & Cloud Run (Backend)

1. **Create an Artifact Registry Docker repository**:
   ```bash
   region="us-central1"  # Change to your preferred region: us-east1, europe-west1, asia-southeast1, etc.
   gcloud artifacts repositories create bitumenapp \
     --repository-format=docker \
     --location="${region}" \
     --description="Container images for bitumenapp"
   ```

2. **Create a Cloud Run service (first-time seed)**. Deploy a placeholder image so the service exists before CI runs:
   ```bash
   gcloud run deploy bitumenapp-api \
     --image="us-docker.pkg.dev/cloudrun/container/hello" \
     --region="${region}" \
     --allow-unauthenticated \
     --port=8000 \
     --platform=managed
   ```

   The GitHub Actions workflow will redeploy the service with the app image on every push to `main`.

## 4. Prepare Static Hosting (Frontend)

1. **Create a regional Cloud Storage bucket** (name must be globally unique and compliant with DNS rules):
   ```bash
   bucket="bitumenapp-static-site-bucket"
   gcloud storage buckets create "gs://${bucket}" \
     --location="${region}" \
     --uniform-bucket-level-access
   ```

2. **Configure website settings**:
   ```bash
   gsutil web set -m index.html -e index.html "gs://${bucket}"
   ```

3. **(Optional) Enable Cloud CDN** for better latency:
   ```bash
   gcloud compute backend-buckets create bitumenapp-frontend \
     --gcs-bucket-name="${bucket}" \
     --enable-cdn
   ```
   Then create a load balancer with the backend bucket if you need a custom domain.

## 5. Create the Deployment Service Account

```bash
project_number="$(gcloud projects describe "${project_id}" --format='value(projectNumber)')"
deploy_sa="github-deployer@${project_id}.iam.gserviceaccount.com"

gcloud iam service-accounts create github-deployer \
  --description="CI deployer for Cloud Run + static site" \
  --display-name="GitHub Actions Deployer"
```

Grant the minimum roles:

```bash
gcloud projects add-iam-policy-binding "${project_id}" \
  --member="serviceAccount:${deploy_sa}" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding "${project_id}" \
  --member="serviceAccount:${deploy_sa}" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding "${project_id}" \
  --member="serviceAccount:${deploy_sa}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "${project_id}" \
  --member="serviceAccount:${deploy_sa}" \
  --role="roles/cloudbuild.builds.editor"

gcloud projects add-iam-policy-binding "${project_id}" \
  --member="serviceAccount:${deploy_sa}" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding "${project_id}" \
  --member="serviceAccount:${deploy_sa}" \
  --role="roles/viewer"
```

> **Note**: The `roles/viewer` permission allows GitHub Actions to stream Cloud Build logs during deployment.

If you enabled Cloud CDN with a backend bucket, also grant `roles/compute.loadBalancerAdmin` as needed.

## 6. Configure Workload Identity Federation (Recommended)

1. **Create a Workload Identity Pool and Provider** (replace `POOL_ID` and `PROVIDER_ID` with names you prefer):
   ```bash
   gcloud iam workload-identity-pools create github-pool \
     --location="global" \
     --display-name="GitHub Actions"

   gcloud iam workload-identity-pools providers create-oidc github-provider \
     --location="global" \
     --workload-identity-pool="github-pool" \
     --display-name="GitHub OIDC" \
     --issuer-uri="https://token.actions.githubusercontent.com" \
     --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
     --attribute-condition="assertion.repository_owner == 'energetech-engineering'"
   ```

2. **Allow the GitHub repository to impersonate the service account**:
   ```bash
   pool_id="github-pool"
   provider_id="github-provider"
   gcloud iam service-accounts add-iam-policy-binding "${deploy_sa}" \
     --role="roles/iam.workloadIdentityUser" \
     --member="principalSet://iam.googleapis.com/projects/${project_number}/locations/global/workloadIdentityPools/${pool_id}/attribute.repository/energetech-engineering/bitumenapp"
   ```

Record these values for GitHub Actions:

- Workload Identity Provider resource ID: `projects/${project_number}/locations/global/workloadIdentityPools/${pool_id}/providers/${provider_id}`
- Service account email: `${deploy_sa}`

## 7. Update GitHub Actions Configuration

Two workflows were added under `.github/workflows/`:

- `deploy-backend.yml`: Builds `server/` with Cloud Build and deploys to Cloud Run.
- `deploy-frontend.yml`: Builds the Vite frontend and syncs the `client/dist` folder to the website bucket.

### 7.1. Replace placeholders or use repository variables

Each workflow contains placeholder values such as `your-gcp-project-id`, `your-gcp-region`, and the dummy Workload Identity Provider string. Replace them with the real values or define repository variables and secrets, then reference them in the workflow.

Example edits:

```yaml
# .github/workflows/deploy-backend.yml
env:
  PROJECT_ID: my-prod-project
  REGION: us-central1
  SERVICE: bitumenapp-api
...
      with:
        workload_identity_provider: projects/1234567890/locations/global/workloadIdentityPools/github-pool/providers/github-provider
        service_account: github-deployer@my-prod-project.iam.gserviceaccount.com
```

### 7.2. (Optional) Use repository variables

Instead of hard-coding values, you can create repository variables such as `GCP_PROJECT_ID`, `GCP_REGION`, `CLOUD_RUN_SERVICE`, `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT_EMAIL`, and `GCP_STATIC_BUCKET`. After adding them, update the workflows to reference `vars.<NAME>`.

### 7.3. GitHub Environment Protections (optional)

If you prefer manual approvals or different credentials per branch, create environments like `staging` and `production`, then scope secrets/variables accordingly.

## 8. First Deploy From GitHub Actions

1. Commit your workflow edits and push to `main`.
2. In GitHub, navigate to **Actions → Deploy Backend to Cloud Run** and **Deploy Frontend to Cloud Storage**.
3. Use **Run workflow** (workflow dispatch) to trigger the first run. Verify both jobs complete successfully.

## 9. Post-Deployment Checklist

- Confirm the Cloud Run service URL responds (e.g., `https://bitumenapp-api-<hash>-uc.a.run.app/docs`).
- Verify the Cloud Storage bucket serves `index.html`. If using a custom domain, complete DNS validation and SSL provisioning through Google-managed certificates.
- For private data, configure CORS on the bucket if the site consumes the API from a different origin: `gsutil cors set cors.json "gs://${bucket}"`.
- Monitor logs via **Cloud Logging** and set up alerts if needed.

## 10. Cleaning Up (Optional)

To remove everything created by this guide:

```bash
# reuse region, bucket, project_id, project_number, and deploy_sa from earlier steps
gcloud run services delete bitumenapp-api --region="${region}"

gcloud artifacts repositories delete bitumenapp --location="${region}" --quiet

gcloud storage rm -r "gs://${bucket}"

gcloud iam service-accounts delete "${deploy_sa}"

gcloud iam workload-identity-pools delete github-pool --location=global --quiet
```

> Always double-check resource names before deleting in production environments.
