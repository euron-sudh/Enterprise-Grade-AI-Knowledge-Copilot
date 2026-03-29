resource "aws_db_instance" "main" {
  identifier              = var.identifier
  engine                  = var.engine
  engine_version          = var.engine_version
  instance_class          = var.instance_class
  allocated_storage       = var.allocated_storage
  db_name                 = var.db_name
  username                = var.username
  password                = var.password
  vpc_security_group_ids  = var.vpc_security_group_ids
  db_subnet_group_name    = var.db_subnet_group_name
  skip_final_snapshot     = true
  publicly_accessible     = false
  multi_az                = true
  storage_encrypted       = true
  backup_retention_period = 7
  tags = {
    Name = var.identifier
  }
}

output "endpoint" {
  value = aws_db_instance.main.endpoint
}
