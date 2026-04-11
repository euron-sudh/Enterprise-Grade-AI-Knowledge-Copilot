#!/bin/bash
# Fix S3 CORS for presigned browser uploads
# Run: bash scripts/fix-s3-cors.sh

BUCKET="${1:-knowledgeforge-documents-prod}"
REGION="${2:-ap-south-1}"

echo "Setting CORS on s3://$BUCKET in $REGION ..."

aws s3api put-bucket-cors --bucket "$BUCKET" --region "$REGION" --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["PUT", "POST", "GET", "HEAD"],
      "AllowedOrigins": ["https://dev.d2dg07mc33522q.amplifyapp.com", "http://localhost:3000", "http://localhost:3001"],
      "ExposeHeaders": ["ETag", "x-amz-request-id"],
      "MaxAgeSeconds": 3600
    }
  ]
}'

echo "CORS set. Verifying..."
aws s3api get-bucket-cors --bucket "$BUCKET" --region "$REGION"
echo "Done."
