# Database bootstrap

This script creates a PostgreSQL role/database and optionally applies the schema in one step.

## Usage
```bash
cd /root/cowrite/database
./init_db.sh
```

## Environment overrides
```bash
DB_NAME=cowrite \
DB_USER=cowrite \
DB_PASSWORD=your_secure_password \
APPLY_SCHEMA=1 \
SCHEMA_FILE=/root/cowrite/database/schema.sql \
./init_db.sh
```

## Notes
- If you run as root, the script uses `sudo -u postgres psql`.
- If the role/database already exist, it keeps them as-is.
- The schema file is idempotent (`CREATE ... IF NOT EXISTS`).
