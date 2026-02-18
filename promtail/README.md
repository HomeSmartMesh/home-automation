Promtail Service

- Unit file: `promtail/promtail.service`
- Config used: `promtail/config.yaml` (linked to `/etc/promtail/config.yaml`)
- Installer: `promtail/install.sh` (sets up repo if needed, installs promtail, links config, enables+starts service)

Usage
- `sudo ./promtail/install.sh`

Verify
- `systemctl status promtail`
