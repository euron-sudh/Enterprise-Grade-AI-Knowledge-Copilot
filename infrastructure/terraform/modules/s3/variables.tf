variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "cors_allowed_origins" {
  description = "Origins allowed for CORS (e.g. frontend domain for presigned uploads)"
  type        = list(string)
  default     = ["*"]
}
