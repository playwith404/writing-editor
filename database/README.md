# Database bootstrap

This script creates a PostgreSQL role/database and optionally applies the schema in one step.

## Usage
```bash
cd /root/gleey/database
./init_db.sh
```

## Environment overrides
```bash
DB_NAME=gleey \
DB_USER=gleey \
DB_PASSWORD=your_secure_password \
APPLY_SCHEMA=1 \
SCHEMA_FILE=/root/gleey/database/schema.sql \
./init_db.sh
```

## Notes
- If you run as root, the script uses `sudo -u postgres psql`.
- If the role/database already exist, it keeps them as-is.
- The schema file is idempotent (`CREATE ... IF NOT EXISTS`).
