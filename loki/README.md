Loki Service

- Unit file: `loki/loki.service`
- Config used: `loki/config.yaml` (linked to `/etc/loki/config.yaml`)
- Installer: `loki/install.sh` (sets up repo if needed, installs loki, links config, enables+starts service)

Usage
- `sudo ./loki/install.sh`

Verify
- `systemctl status loki`
- `curl -f http://127.0.0.1:3100/ready` should return `ready`
