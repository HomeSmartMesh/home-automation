Loki Service

- Unit file: `loki/loki.service`
- Config used: `loki/config.yaml` (linked to `/etc/loki/config.yaml`)
- Installer: use the common `install loki` command from `env.sh`.

Usage
- Source `env.sh` in your shell, then:
- `install loki` to install + enable the service.
- `config loki` to re-link `loki/config.yaml` and restart.
- Optional hooks: if present, `loki/install` runs before generic install steps; `loki/config` runs before generic config.

Verify
- `systemctl status loki`
- `curl -f http://127.0.0.1:3100/ready` should return `ready`

Retention Policy

- Config: `loki/config.yaml` → `/etc/loki/config.yaml`
- Set time-based retention via `limits_config.retention_period` (e.g., `168h`=7 days, `720h`=30 days).
- Ensure compaction is enabled under `compactor` and storage paths point to persistent storage (default here: `/var/lib/loki`).
 - Apply changes: `config loki` or `sudo systemctl restart loki`.
- Verify:
  - `journalctl -u loki -e` and look for compactor activity.
  - Optional: `curl -s http://127.0.0.1:3100/config` to inspect effective limits (if the endpoint is enabled).
- Size caps: Loki doesn’t enforce a strict byte quota; to cap disk usage, put `/var/lib/loki` on a dedicated partition or use filesystem quotas.
