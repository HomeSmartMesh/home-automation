Promtail Service

- Unit file: `promtail/promtail.service`
- Config used: `promtail/config.yaml` (linked to `/etc/promtail/config.yaml`)
- Installer: use the common `install promtail` command from `env.sh`.

Usage
- From a shell where `env.sh` is sourced:
  - `install promtail` to install + enable the service (adds Grafana repo if needed).
  - `config promtail` to re-link `promtail/config.yaml` and restart.
  - Optional hooks: if present, `promtail/install` runs before generic install steps; `promtail/config` runs before generic config.

Verify
- `systemctl status promtail`
