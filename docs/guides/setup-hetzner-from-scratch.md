# Setup Hetzner from scratch

> Step-by-step runbook to bring DutyHive live on Hetzner. Starts from an empty Hetzner Cloud account and ends with `https://dutyhive.com` serving the app, mail flowing through Resend, the database backed up, and Beszel watching the boxes. Every command and every UI click is explicit — follow top to bottom.

This guide is the canonical reference for **Phase 6 (Provisioning & First Deploy)** and **Phase 7 (Observability & Doc-Polish)** of the Foundation roadmap.

---

## Overview

### What we're building

```
                        ┌─────────────────────────┐
                        │ Cloudflare (DNS + Free  │
                        │ Email Routing + WAF)    │
                        └────────────┬────────────┘
                                     │
                ┌────────────────────┼────────────────────┐
                ▼                    ▼                    ▼
        ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
        │   mgmt-01    │    │   app-01     │    │    db-01     │
        │   CX22       │    │   CPX21      │    │   CPX21      │
        │   Coolify    │◄──►│   Next.js    │───►│  Postgres 17 │
        │   Beszel hub │    │   (deployed) │    │ internal-only │
        └──────┬───────┘    └──────────────┘    └──────────────┘
               │ weekly Coolify config backup    daily pg_dump
               ▼                                  GPG-encrypted
                          ┌────────────────────┐
                          │  Storage Box BX11  │
                          │  (Hetzner)         │
                          └────────────────────┘

        External:  Resend EU (mail) · Sentry EU (errors) · Trigger.dev (jobs)
```

### What you'll buy (one-off + monthly)

| Item                      | Provider    | Type       | ~Cost / month |
| ------------------------- | ----------- | ---------- | ------------- |
| `mgmt-01` CX22            | Hetzner     | VPS        | €3.79         |
| `app-01` CPX21            | Hetzner     | VPS        | €7.55         |
| `db-01` CPX21             | Hetzner     | VPS        | €7.55         |
| Storage Box BX11 (1 TB)   | Hetzner     | Backup     | €3.95         |
| Object Storage            | Hetzner     | S3 (pay)   | ~€1–2         |
| Cloud Firewall + vSwitch  | Hetzner     | included   | €0            |
| Cloudflare DNS + WAF Free | Cloudflare  | DNS        | €0            |
| Cloudflare Email Routing  | Cloudflare  | Mail relay | €0            |
| Resend Free               | Resend      | Mail send  | €0            |
| Sentry Team Free          | Sentry      | Errors     | €0            |
| Trigger.dev Free          | Trigger.dev | Jobs       | €0            |
| **Sum**                   |             |            | **~€24–25**   |

Domain registration (`dutyhive.com`) is already paid through Vercel Registrar — no monthly Hetzner cost for it.

### Time estimate

If you've never done this before: **6–10 hours** spread over 1–2 days. Most of the wait is DNS propagation and TLS issuance.

### Prerequisites

- An active **Hetzner Cloud** account with billing set up (`https://console.hetzner.cloud`).
- An active **Cloudflare** account (free tier — `https://dash.cloudflare.com`).
- Login access to the **Vercel Registrar** dashboard for `dutyhive.com`.
- An active **Resend** account (free tier — `https://resend.com`).
- The DutyHive repo cloned locally.
- A password manager (1Password, Bitwarden, KeePass) — every secret you generate goes in here, never in plain files.

#### Local toolchain

| Tool                       | Why                                  | Linux / macOS                        | Windows                                                                 |
| -------------------------- | ------------------------------------ | ------------------------------------ | ----------------------------------------------------------------------- |
| `ssh`, `ssh-keygen`, `scp` | Connect to and copy files to the VPS | OpenSSH preinstalled                 | OpenSSH client preinstalled on Windows 10/11 (verify: `ssh -V`)         |
| `curl`                     | API calls, downloads                 | preinstalled                         | preinstalled as `curl.exe` since Windows 10 1803                        |
| DNS lookup                 | Verify nameservers + records         | `dig` (`brew install bind` on macOS) | `Resolve-DnsName` (built-in PowerShell) or `nslookup`                   |
| `gpg`                      | Encrypt backups                      | `brew install gnupg` / `apt install` | `winget install GnuPG.Gpg4win` or `choco install gpg4win`               |
| `openssl`                  | Random secret generation             | preinstalled                         | Comes with Git for Windows; or `winget install ShiningLight.OpenSSL`    |
| `tar`                      | Extract archives                     | preinstalled                         | preinstalled as `tar.exe` since Windows 10 1803                         |
| `psql`                     | Restore-drill on the local box       | PostgreSQL client package            | `winget install PostgreSQL.PostgreSQL` (client only OK)                 |
| Hetzner CLI (optional)     | Re-runnable provisioning             | `brew install hcloud`                | `winget install Hetzner.hcloud` or download binary from GitHub releases |
| `pnpm` 10                  | Run repo scripts                     | `corepack enable pnpm`               | `corepack enable pnpm` (Node 22 required)                               |

On Windows we recommend doing this work from one of these terminals:

- **PowerShell 7** (`pwsh`) — the conventions table below shows PowerShell variants on `local-ps>` lines whenever syntax differs from POSIX shells.
- **Git Bash** that ships with Git for Windows — accepts every `local$` line verbatim.
- **WSL2 (Ubuntu)** — the most painless option; treat it as Linux throughout.

If you pick PowerShell, run `Start-Service ssh-agent` once before the first `ssh-add` and re-run it on each new shell session (or set the service to `Automatic`).

### Conventions used in this guide

- Commands prefixed with `local$` run on **your laptop** in a POSIX shell (Linux, macOS, WSL, Git Bash).
- Commands prefixed with `local-ps>` are the **Windows PowerShell** equivalent and only appear when the POSIX line doesn't work as-is.
- Commands prefixed with `mgmt$`, `app$`, `db$` run on **that specific VPS** as a non-root user.
- Commands prefixed with `mgmt#`, `app#`, `db#` run on that VPS as **root** (via `sudo -i` after the initial root login).
- Replace `<…>` placeholders with real values before pasting.

---

## Phase A — Hetzner account preparation

### A.1 Verify billing and the project

1. Open `https://console.hetzner.cloud` → **Default** project (or create a new project named `DutyHive` to keep resources isolated).
2. Confirm billing is active under **Settings → Billing → Payment method**.
3. Note the project ID (top of the URL, looks like `1234567`) — you may need it for the `hcloud` CLI later.

### A.2 Generate the SSH key pair

Pick a passphrase **different from your laptop login password** and store it in your password manager.

```bash
local$ ssh-keygen -t ed25519 -C "dutyhive-admin@<your-email>" -f ~/.ssh/dutyhive_admin_ed25519
```

```powershell
local-ps> ssh-keygen -t ed25519 -C "dutyhive-admin@<your-email>" -f $HOME\.ssh\dutyhive_admin_ed25519
```

This produces:

- `~/.ssh/dutyhive_admin_ed25519` (POSIX) / `$HOME\.ssh\dutyhive_admin_ed25519` (Windows) — private key, **never share**
- the matching `.pub` file — public key, OK to upload

Add the key to your local agent so subsequent `ssh` calls use it without re-typing the passphrase:

```bash
local$ ssh-add ~/.ssh/dutyhive_admin_ed25519
```

```powershell
local-ps> Get-Service ssh-agent | Set-Service -StartupType Automatic
local-ps> Start-Service ssh-agent
local-ps> ssh-add $HOME\.ssh\dutyhive_admin_ed25519
```

### A.3 Upload the public key to Hetzner

1. Hetzner Console → **Security → SSH Keys → Add SSH Key**.
2. Paste the contents of `~/.ssh/dutyhive_admin_ed25519.pub`.
3. Name: `dutyhive-admin`.
4. Save. Hetzner shows a fingerprint — verify it matches the one from `ssh-keygen -lf ~/.ssh/dutyhive_admin_ed25519.pub`.

### A.4 (Optional) Install the `hcloud` CLI

The CLI lets you script provisioning. Not required for this guide, but useful for re-runs.

```bash
# macOS
local$ brew install hcloud

# Linux (download binary from https://github.com/hetznercloud/cli/releases)
local$ curl -L https://github.com/hetznercloud/cli/releases/latest/download/hcloud-linux-amd64.tar.gz | tar xz
local$ sudo mv hcloud /usr/local/bin/
```

```powershell
# Windows
local-ps> winget install Hetzner.hcloud
# Or manually: download hcloud-windows-amd64.zip from the Releases page,
# extract, and place hcloud.exe somewhere on $env:Path.
```

Generate an API token in **Security → API Tokens → Generate API Token** (read+write), then:

```bash
local$ hcloud context create dutyhive
# Paste the token when prompted.
```

---

## Phase B — Network infrastructure (Cloud Firewall + Private Network)

We create the firewall rules and the private network **before** ordering VPS so we can attach them at provisioning time.

### B.1 Get your home/office IP address

We'll lock SSH ingress to your IP only.

```bash
local$ curl -s https://api.ipify.org
```

```powershell
local-ps> Invoke-RestMethod https://api.ipify.org
```

Note the IPv4 address. If your ISP gives you a dynamic IP, you'll have to update the firewall rule when it changes — keep the IP detection command handy.

### B.2 Create the Private Network

Hetzner's **Cloud Network** lets the three VPS talk over a 10.x.x.x subnet without exposing ports to the public internet.

1. Hetzner Console → **Networks → Create Network**.
2. **Name**: `dutyhive-internal`.
3. **IP range**: `10.0.0.0/16`.
4. **Add subnet**:
   - **Type**: Cloud
   - **Network zone**: `eu-central` (Falkenstein FSN1).
   - **IP range**: `10.0.1.0/24`.
5. Save.

You'll attach each VPS to this network in Phase C.

### B.3 Create the Cloud Firewall

The firewall is a stateful packet filter at the Hetzner edge.

1. Hetzner Console → **Firewalls → Create Firewall**.
2. **Name**: `dutyhive-edge`.
3. **Inbound rules** — replace `<YOUR_IP>` with the address from B.1:

   | Source            | Protocol | Port  | Notes                               |
   | ----------------- | -------- | ----- | ----------------------------------- |
   | `<YOUR_IP>/32`    | TCP      | `22`  | SSH from you                        |
   | `0.0.0.0/0, ::/0` | TCP      | `80`  | HTTP (redirects to HTTPS on app-01) |
   | `0.0.0.0/0, ::/0` | TCP      | `443` | HTTPS                               |
   | `0.0.0.0/0, ::/0` | ICMP     | —     | Ping (debugging)                    |

4. **Outbound rules**: leave the defaults (allow all).
5. Save.

We'll apply this firewall to the public network interfaces of `mgmt-01`, `app-01`, and `db-01` at order time. The Private Network does **not** flow through this firewall — VPS-to-VPS traffic stays internal and unfiltered.

---

## Phase C — Provision the three VPS

Order in this sequence: `mgmt-01` first (we'll bootstrap from it), then `app-01`, then `db-01`.

### C.1 Order `mgmt-01` (Coolify + Beszel hub)

1. Hetzner Console → **Servers → Add Server**.
2. **Location**: `Falkenstein` (FSN1).
3. **Image**: `Ubuntu 24.04`.
4. **Type**: shared vCPU **AMD** → **CX22** (2 vCPU, 4 GB RAM, 40 GB disk).
5. **Networking**:
   - Public IPv4: ✓
   - Public IPv6: ✓
   - Private network: select `dutyhive-internal`. Hetzner auto-assigns an IP — note it (likely `10.0.1.2`).
6. **SSH keys**: select `dutyhive-admin`.
7. **Volumes**: none.
8. **Firewalls**: select `dutyhive-edge`.
9. **Backups**: enabled (€0.76/mo, 20% surcharge — recommended for Coolify config).
10. **Placement groups**: skip.
11. **Labels**: `role=mgmt`, `env=prod`.
12. **Cloud config**: leave empty (we harden manually in Phase D).
13. **Name**: `mgmt-01`.
14. **Create & Buy now**. Wait ~30 seconds for the box to boot.

Note the assigned **public IPv4** in the server details page. You'll use it as `<MGMT_PUBLIC_IP>` from now on.

### C.2 Order `app-01` (Next.js)

Same as C.1 with these differences:

- **Type**: shared vCPU **AMD** → **CPX21** (3 vCPU, 4 GB RAM, 80 GB disk).
- Note the private IP (likely `10.0.1.3`).
- **Backups**: enabled.
- **Labels**: `role=app`, `env=prod`.
- **Name**: `app-01`.

Note its public IPv4 as `<APP_PUBLIC_IP>`.

### C.3 Order `db-01` (Postgres)

Same as C.1 with these differences:

- **Type**: shared vCPU **AMD** → **CPX21**.
- Private IP (likely `10.0.1.4`).
- **Backups**: enabled (this is the box you most want backed up).
- **Labels**: `role=db`, `env=prod`.
- **Name**: `db-01`.

Note the public IPv4 as `<DB_PUBLIC_IP>`.

### C.4 First-login sanity check

```bash
local$ ssh root@<MGMT_PUBLIC_IP>
local$ ssh root@<APP_PUBLIC_IP>
local$ ssh root@<DB_PUBLIC_IP>
```

If any one prompts for a password, the SSH key wasn't applied — recheck **Server Details → SSH keys**, attach `dutyhive-admin`, then `ssh-keygen -R <IP>` locally to clear the old fingerprint.

While logged in to each box, verify the private network is up:

```bash
mgmt#  ip -4 addr show enp7s0     # or `ip addr show` to see all interfaces
mgmt#  ping -c 2 10.0.1.3        # should reach app-01
mgmt#  ping -c 2 10.0.1.4        # should reach db-01
```

If `ping` fails, the Private Network attachment didn't go through — re-check the server's Network tab in Hetzner Console.

---

## Phase D — SSH hardening (run on each of the three VPS)

Do this on `mgmt-01`, then `app-01`, then `db-01`. Each box gets the same treatment.

### D.1 System update + base tools

```bash
mgmt#  apt update && apt upgrade -y
mgmt#  apt install -y \
         curl wget git vim ufw fail2ban unattended-upgrades \
         ca-certificates gnupg lsb-release rsync htop tmux jq
```

### D.2 Create a non-root user

```bash
mgmt#  adduser --gecos '' deploy        # set a strong passphrase from your password manager
mgmt#  usermod -aG sudo deploy
mgmt#  mkdir -p /home/deploy/.ssh
mgmt#  cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
mgmt#  chown -R deploy:deploy /home/deploy/.ssh
mgmt#  chmod 700 /home/deploy/.ssh
mgmt#  chmod 600 /home/deploy/.ssh/authorized_keys
```

Sanity-check from your laptop **before** disabling root login:

```bash
local$ ssh deploy@<MGMT_PUBLIC_IP> 'whoami && sudo -n true && echo OK'
# expected: deploy ... OK   (sudo prompts for the deploy password — that's fine)
```

If that works, continue.

### D.3 Lock down SSH (`/etc/ssh/sshd_config.d/99-dutyhive.conf`)

```bash
mgmt#  cat > /etc/ssh/sshd_config.d/99-dutyhive.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
ChallengeResponseAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
PermitEmptyPasswords no
X11Forwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
AllowUsers deploy
EOF
mgmt#  sshd -t        # syntax check
mgmt#  systemctl reload ssh
```

Test from your laptop in a **second** terminal — keep the root session open until you confirm `deploy` login works:

```bash
local$ ssh deploy@<MGMT_PUBLIC_IP>     # should land you in /home/deploy
local$ ssh root@<MGMT_PUBLIC_IP>       # should be REJECTED
```

Once verified, exit the root session.

### D.4 UFW (host firewall in addition to Hetzner Cloud Firewall)

```bash
mgmt$ sudo ufw default deny incoming
mgmt$ sudo ufw default allow outgoing
mgmt$ sudo ufw allow OpenSSH
mgmt$ sudo ufw allow 80/tcp
mgmt$ sudo ufw allow 443/tcp
# Allow private-network traffic so mgmt-01 can SSH to app-01/db-01:
mgmt$ sudo ufw allow from 10.0.1.0/24
mgmt$ sudo ufw enable                  # type 'y' to confirm
mgmt$ sudo ufw status verbose
```

On `app-01` and `db-01`, identical, plus on `db-01` allow Postgres only on the private network:

```bash
db$  sudo ufw allow from 10.0.1.0/24 to any port 5432 proto tcp
```

### D.5 Fail2ban (default `sshd` jail is enabled by package)

```bash
mgmt$ sudo systemctl enable --now fail2ban
mgmt$ sudo fail2ban-client status sshd
```

### D.6 Unattended security upgrades

```bash
mgmt$ sudo dpkg-reconfigure --priority=low unattended-upgrades   # answer Yes
mgmt$ cat /etc/apt/apt.conf.d/50unattended-upgrades              # confirm only -security is enabled
```

### D.7 Set timezone (optional but useful for log correlation)

```bash
mgmt$ sudo timedatectl set-timezone Europe/Vienna
```

Repeat **all of Phase D** on `app-01` and `db-01` before continuing.

---

## Phase E — Storage Box + Object Storage

### E.1 Order Storage Box BX11

1. Hetzner Robot console (separate from Cloud!): `https://robot.hetzner.com` → **Storage Boxes → Order**.
2. **Type**: BX11 (1 TB, €3.95/mo).
3. **Location**: Falkenstein (FSN1).
4. **Order**.

Once provisioned (1–5 minutes), open it:

- Note the **hostname** (e.g. `u123456.your-storagebox.de`).
- Note the **username** (e.g. `u123456`).
- Set a **password** (Storage Box → Settings → Set/Change password). Save in the password manager.
- Enable **SSH access** in the same settings page.

### E.2 Create a dedicated SSH key for Storage Box uploads

Use a separate key from the admin key so a compromised app server can't trivially read backups offline.

```bash
local$ ssh-keygen -t ed25519 -C "dutyhive-backups@<host>" -f ~/.ssh/dutyhive_backup_ed25519 -N ""
```

```powershell
local-ps> ssh-keygen -t ed25519 -C "dutyhive-backups@<host>" -f $HOME\.ssh\dutyhive_backup_ed25519 -N '""'
```

(Empty passphrase: this key lives on `db-01` and runs unattended. The Storage Box itself enforces username scope.)

Add the public key in **Storage Box → SSH Keys → Add public key**.

### E.3 Object Storage bucket (for static assets, future user uploads)

1. Hetzner Cloud Console → **Object Storage → Create Project**.
2. **Name**: `dutyhive-prod`.
3. **Location**: `Falkenstein` (FSN1).
4. Inside the project: **Create Bucket** named `dutyhive-public`. Visibility: `Public`. (Private buckets used later for user uploads.)
5. **Generate S3 credentials** in the project view. Save the access key + secret in your password manager — note `S3_ENDPOINT` (e.g. `https://fsn1.your-objectstorage.com`).

Object Storage is pay-per-use; expect €1–2/mo for Foundation traffic.

---

## Phase F — Postgres 17 on `db-01`

We install Postgres directly on `db-01`. No Docker on this box — keeping the database close to the metal simplifies tuning, backups, and upgrades.

### F.1 Install Postgres 17 from the PGDG repo

```bash
db$  sudo install -d /usr/share/postgresql-common/pgdg
db$  sudo curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
       https://www.postgresql.org/media/keys/ACCC4CF8.asc
db$  sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
       https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
       > /etc/apt/sources.list.d/pgdg.list'
db$  sudo apt update
db$  sudo apt install -y postgresql-17 postgresql-contrib-17
```

### F.2 Bind Postgres to the private network only

Get `db-01`'s private IP (should be `10.0.1.4`):

```bash
db$  ip -4 addr show | grep '10.0.'
```

Edit `/etc/postgresql/17/main/postgresql.conf`:

```bash
db$  sudo vim /etc/postgresql/17/main/postgresql.conf
```

Change:

```conf
listen_addresses = '10.0.1.4'         # private IP of db-01 — never set to '*'
port = 5432
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'      # snakeoil first; replace in F.5
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'
```

The Hetzner Cloud Firewall rules from Phase B already block public access to port 5432; the `listen_addresses` setting is defence in depth.

### F.3 Restrict `pg_hba.conf` to the app server only

Edit `/etc/postgresql/17/main/pg_hba.conf` and **replace** the default `host all all all md5` line with:

```bash
db$  sudo vim /etc/postgresql/17/main/pg_hba.conf
```

```conf
# TYPE  DATABASE          USER              ADDRESS         METHOD
local   all               postgres                          peer
local   all               all                               peer
hostssl all               all               10.0.1.3/32    scram-sha-256
hostssl replication       all               10.0.1.3/32    scram-sha-256
# Reject any other host explicitly so a misconfigured listen_addresses can't leak.
host    all               all               0.0.0.0/0       reject
host    all               all               ::/0            reject
```

Reload Postgres:

```bash
db$  sudo systemctl restart postgresql@17-main
db$  sudo -u postgres psql -c "SHOW listen_addresses;"
db$  sudo ss -tlnp | grep 5432       # confirm only 10.0.1.4:5432 is listening
```

### F.4 Create roles + database + extensions

Generate two strong random passwords now (in your password manager):

- `<APP_DB_PASSWORD>` — for `dutyhive_app` (used by the app at runtime)
- `<MIGRATE_DB_PASSWORD>` — for `dutyhive_migrate` (used only by `prisma migrate deploy`)

```bash
db$  sudo -u postgres psql <<EOF
CREATE ROLE dutyhive_app
  WITH LOGIN PASSWORD '<APP_DB_PASSWORD>' NOBYPASSRLS;

CREATE ROLE dutyhive_migrate
  WITH LOGIN PASSWORD '<MIGRATE_DB_PASSWORD>' BYPASSRLS;

-- Production migrate role does NOT need CREATEDB — we run `prisma migrate
-- deploy`, not `migrate dev` (which is the only command that uses a shadow DB).

CREATE DATABASE dutyhive_prod OWNER dutyhive_migrate;

GRANT CONNECT ON DATABASE dutyhive_prod TO dutyhive_app;
EOF

db$  sudo -u postgres psql -d dutyhive_prod <<'EOF'
GRANT USAGE ON SCHEMA public TO dutyhive_app, dutyhive_migrate;
GRANT CREATE ON SCHEMA public TO dutyhive_migrate;

ALTER DEFAULT PRIVILEGES FOR ROLE dutyhive_migrate IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dutyhive_app;
ALTER DEFAULT PRIVILEGES FOR ROLE dutyhive_migrate IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO dutyhive_app;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
EOF
```

### F.5 Replace the snakeoil TLS cert with a real one (Let's Encrypt or self-signed CA)

For Foundation we use a self-signed cert; the cert chain is shared with `app-01` out of band. For a public-CA cert, follow the same steps but plug in `certbot certonly --standalone` on the box temporarily.

```bash
db$  sudo openssl req -new -x509 -days 825 -nodes \
        -out /etc/postgresql/17/main/server.crt \
        -keyout /etc/postgresql/17/main/server.key \
        -subj "/CN=db-01.dutyhive.internal"
db$  sudo chown postgres:postgres /etc/postgresql/17/main/server.{crt,key}
db$  sudo chmod 600 /etc/postgresql/17/main/server.key
db$  sudo chmod 644 /etc/postgresql/17/main/server.crt

# Point Postgres at it:
db$  sudo sed -i \
        -e "s|^ssl_cert_file = .*|ssl_cert_file = '/etc/postgresql/17/main/server.crt'|" \
        -e "s|^ssl_key_file = .*|ssl_key_file = '/etc/postgresql/17/main/server.key'|" \
        /etc/postgresql/17/main/postgresql.conf
db$  sudo systemctl restart postgresql@17-main
```

Copy the cert to `app-01` so the Node `pg` driver trusts it:

```bash
db$   sudo cat /etc/postgresql/17/main/server.crt
# copy the PEM block, then on app-01:
app$  sudo install -d /etc/dutyhive
app$  sudo tee /etc/dutyhive/db-ca.crt > /dev/null <<'EOF'
-----BEGIN CERTIFICATE-----
... paste here ...
-----END CERTIFICATE-----
EOF
app$  sudo chmod 644 /etc/dutyhive/db-ca.crt
```

The connection string used by the app will set `?sslmode=verify-full&sslrootcert=/etc/dutyhive/db-ca.crt`.

### F.6 Smoke-test the connection from `app-01`

```bash
app$  sudo apt install -y postgresql-client-17
app$  PGPASSWORD='<APP_DB_PASSWORD>' psql \
        "host=10.0.1.4 dbname=dutyhive_prod user=dutyhive_app sslmode=require" \
        -c "SELECT current_user, current_database();"
# expected output:
#  current_user   | current_database
# ----------------+------------------
#  dutyhive_app   | dutyhive_prod
```

If this fails: check `pg_hba.conf` (F.3), check the firewall (`sudo ufw status` on db-01), check `listen_addresses`. Walk back the chain.

### F.7 Apply Prisma migrations against prod

From your laptop (or a CI runner once Phase 6+ adds GitHub Actions), with the `MIGRATE_DATABASE_URL` pointing at db-01:

```bash
local$ MIGRATE_DATABASE_URL="postgresql://dutyhive_migrate:<MIGRATE_DB_PASSWORD>@<DB_PUBLIC_IP_OR_TUNNEL>:5432/dutyhive_prod?sslmode=require" \
  pnpm --filter @dutyhive/db exec prisma migrate deploy
```

But `db-01` is **not** publicly reachable on 5432 — that's the point. Two ways to run migrations:

1. **SSH-tunnel from your laptop via mgmt-01** (recommended for the first deploy):
   ```bash
   local$ ssh -L 5432:10.0.1.4:5432 deploy@<MGMT_PUBLIC_IP>
   # in another terminal:
   local$ MIGRATE_DATABASE_URL="postgresql://dutyhive_migrate:<MIGRATE_DB_PASSWORD>@localhost:5432/dutyhive_prod?sslmode=require" \
            pnpm --filter @dutyhive/db exec prisma migrate deploy
   ```
2. **Run from `app-01`**: clone the repo there once and use it as the migration runner. Coolify will invoke this for you in production (Phase G.6).

For the Foundation first-deploy, option 1 is fine.

---

## Phase G — Coolify on `mgmt-01`

Coolify is the deploy control plane. It runs Docker, pulls the repo on `git push`, builds the Next.js standalone image, and ships it to `app-01`.

### G.1 Install Docker (Coolify's prereq)

```bash
mgmt$  sudo install -m 0755 -d /etc/apt/keyrings
mgmt$  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
         -o /etc/apt/keyrings/docker.asc
mgmt$  sudo chmod a+r /etc/apt/keyrings/docker.asc
mgmt$  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
         https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" \
         | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
mgmt$  sudo apt update
mgmt$  sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
mgmt$  sudo usermod -aG docker deploy
mgmt$  exit
local$ ssh deploy@<MGMT_PUBLIC_IP>     # re-login so the docker group takes effect
mgmt$  docker version                  # should print client + server versions
```

### G.2 Install Coolify

```bash
mgmt$  sudo curl -fsSL https://cdn.coollabs.io/coolify/install.sh -o /tmp/coolify-install.sh
mgmt$  less /tmp/coolify-install.sh    # read before piping to bash
mgmt$  sudo bash /tmp/coolify-install.sh
```

Wait ~3 minutes. The script provisions ~10 containers (Postgres, Redis, the Coolify UI, …).

When done it prints the URL — by default `http://<MGMT_PUBLIC_IP>:8000`. Open it in a browser.

### G.3 First-run Coolify setup

1. Create the **root admin** account (email + strong password — save in the password manager).
2. **Server** → click on the auto-detected `localhost` (this is `mgmt-01`).
3. **Settings → General**:
   - **Server name**: `mgmt-01`.
   - **Hostname**: `coolify.dutyhive.com` (we'll wire DNS in Phase H).
4. Save.

### G.4 Add `app-01` as a deploy target

Coolify deploys to remote servers via SSH. We add `app-01` as a "Server" in Coolify so it can ship containers there.

On `mgmt-01`, generate an SSH keypair Coolify will use to reach `app-01`:

```bash
mgmt$  sudo -u coolify ssh-keygen -t ed25519 -f /data/coolify/ssh/keys/app-01-key -N "" -C "coolify-deploy@mgmt-01"
mgmt$  sudo cat /data/coolify/ssh/keys/app-01-key.pub
```

Add the public key to `app-01`'s `deploy` user:

```bash
app$  echo '<paste-the-pubkey>' | sudo tee -a /home/deploy/.ssh/authorized_keys
```

Allow Coolify-generated network from `mgmt-01` to reach `app-01` for SSH (already covered by the private-network UFW rule in D.4).

In Coolify UI:

1. **Servers → Add Server**.
2. **Name**: `app-01`.
3. **IP**: `10.0.1.3` (private — Coolify connects over the internal network).
4. **User**: `deploy`.
5. **Port**: `22`.
6. **SSH key**: select the `app-01-key` Coolify just generated.
7. **Validate**. Coolify SSHes to `app-01` and confirms Docker is reachable.
8. Save.

### G.5 Connect the GitHub repo

1. Coolify UI → **Sources → GitHub Apps → Add**.
2. Follow the OAuth flow. Grant access to `lukasfend/DutyHive`.
3. Once connected, Coolify can pull commits and build them.

### G.6 Create the application

1. Coolify UI → **Projects → New Project** → name `dutyhive`.
2. Inside the project: **+ New → Application → Public Repository** (or **Private** with the GitHub source).
3. **Repository**: `lukasfend/DutyHive`.
4. **Branch**: `main`.
5. **Build pack**: `Dockerfile` (we'll add one) **OR** `Nixpacks` (auto-detect Next.js standalone).

   For Foundation, use `Nixpacks` — it detects Next 16 standalone output and produces a working image without us writing a Dockerfile. Switch to a hand-rolled Dockerfile once the build matrix grows.

6. **Build settings**:
   - **Build command**: `pnpm install --frozen-lockfile && pnpm build`
   - **Start command**: `node apps/web/.next/standalone/apps/web/server.js`
   - **Port**: `3000`
7. **Server**: `app-01`.
8. **Environment variables** — paste the production env (Phase G.7 below).
9. **Domains**: `dutyhive.com,app.dutyhive.com,planner.dutyhive.com,business.dutyhive.com,checklist.dutyhive.com`.
   Coolify will provision Caddy reverse-proxy entries for each. TLS comes from Let's Encrypt automatically once DNS resolves to `app-01` (Phase H).
10. **Healthcheck path**: `/api/health`.
11. **Save**. Don't deploy yet — DNS isn't ready.

### G.7 Production environment variables (in Coolify's secrets store)

Generate a fresh `BETTER_AUTH_SECRET`:

```bash
local$ openssl rand -base64 48
```

```powershell
# If openssl.exe is on $env:Path (ships with Git for Windows), the line above works.
# Otherwise use Node, which the dev toolchain already requires:
local-ps> node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```

Paste these into Coolify's environment-variable form (each as a separate row):

```env
NODE_ENV=production
DATABASE_URL=postgresql://dutyhive_app:<APP_DB_PASSWORD>@10.0.1.4:5432/dutyhive_prod?sslmode=verify-full&sslrootcert=/etc/dutyhive/db-ca.crt
MIGRATE_DATABASE_URL=postgresql://dutyhive_migrate:<MIGRATE_DB_PASSWORD>@10.0.1.4:5432/dutyhive_prod?sslmode=verify-full&sslrootcert=/etc/dutyhive/db-ca.crt
BETTER_AUTH_SECRET=<paste-from-openssl-rand>
BETTER_AUTH_URL=https://app.dutyhive.com
NEXT_PUBLIC_ROOT_DOMAIN=dutyhive.com
NEXT_PUBLIC_SITE_URL=https://dutyhive.com
RESEND_API_KEY=<paste-after-Phase-I>
RESEND_FROM=noreply@dutyhive.com
AUDIT_HASH_SALT=<openssl rand -base64 32>
LOG_LEVEL=info

# Sentry / Trigger.dev keys — fill once Phase 5/6 wires them.
# SENTRY_DSN=
# NEXT_PUBLIC_SENTRY_DSN=
# TRIGGER_SECRET_KEY=

# S3 / Hetzner Object Storage (from Phase E.3)
S3_ENDPOINT=<from Hetzner Object Storage>
S3_BUCKET=dutyhive-public
S3_ACCESS_KEY=<from Hetzner Object Storage>
S3_SECRET_KEY=<from Hetzner Object Storage>
```

Mark `*_SECRET`, `*_KEY`, `DATABASE_URL`, and `MIGRATE_DATABASE_URL` as **secret** in Coolify so they don't show in logs.

### G.8 Mount `/etc/dutyhive/db-ca.crt` into the container

Coolify → application → **Storages → New Storage** → bind-mount type:

- **Source**: `/etc/dutyhive/db-ca.crt` (on `app-01`)
- **Target**: `/etc/dutyhive/db-ca.crt` (in the container)
- **Read-only**: yes

Save.

### G.9 Configure Coolify itself to be reachable on a domain (Phase H prerequisite)

Coolify ships its UI on `<MGMT_PUBLIC_IP>:8000`. We'll DNS-map it to `coolify.dutyhive.com` in Phase H.5 and let Coolify auto-issue a TLS cert for itself.

---

## Phase H — Cloudflare DNS migration

The Vercel registrar holds the domain; we move only the **nameservers** to Cloudflare so DNS, WAF, and Email Routing are managed there. Vercel keeps doing the boring registry job.

### H.1 Add the domain to Cloudflare

1. Cloudflare Dashboard → **Add a Site → Free plan** → enter `dutyhive.com`.
2. Cloudflare scans existing DNS records (very few from Vercel; we'll replace them).
3. Cloudflare assigns two nameservers, e.g. `tasha.ns.cloudflare.com` and `ben.ns.cloudflare.com`. **Note both**.

### H.2 Switch nameservers at Vercel

1. Vercel Dashboard → **Domains → dutyhive.com → Nameservers**.
2. **Use Custom Nameservers** → paste the two from Cloudflare.
3. Save.
4. DNS propagation can take 1–24 hours. While we wait, configure records.

### H.3 Add DNS records in Cloudflare

In Cloudflare → `dutyhive.com` → **DNS → Records**:

| Type    | Name        | Content            | Proxy    | Notes                                           |
| ------- | ----------- | ------------------ | -------- | ----------------------------------------------- |
| `A`     | `@`         | `<APP_PUBLIC_IP>`  | DNS only | Apex — marketing site                           |
| `A`     | `app`       | `<APP_PUBLIC_IP>`  | DNS only | Account hub                                     |
| `A`     | `planner`   | `<APP_PUBLIC_IP>`  | DNS only | Planner shell                                   |
| `A`     | `business`  | `<APP_PUBLIC_IP>`  | DNS only | Business shell                                  |
| `A`     | `checklist` | `<APP_PUBLIC_IP>`  | DNS only | Checklist shell                                 |
| `A`     | `coolify`   | `<MGMT_PUBLIC_IP>` | DNS only | Coolify admin UI (lock with IP allowlist + 2FA) |
| `CNAME` | `www`       | `dutyhive.com`     | DNS only | Redirect www → apex (Coolify handles)           |

Why **DNS only** (orange cloud off) initially: Coolify's Caddy issues Let's Encrypt certs via HTTP-01 challenge — the challenge needs to reach `app-01` directly, which Cloudflare's proxy would intercept. After certs issue, optionally toggle the proxy on for marketing/app subdomains.

### H.4 Verify DNS resolution

Once propagation completes (15 min – a few hours):

```bash
local$ dig +short dutyhive.com         # expect <APP_PUBLIC_IP>
local$ dig +short app.dutyhive.com     # same
local$ dig NS dutyhive.com +short      # expect the Cloudflare nameservers
```

```powershell
local-ps> Resolve-DnsName dutyhive.com -Type A      | Select-Object -ExpandProperty IPAddress
local-ps> Resolve-DnsName app.dutyhive.com -Type A  | Select-Object -ExpandProperty IPAddress
local-ps> Resolve-DnsName dutyhive.com -Type NS     | Select-Object -ExpandProperty NameHost
```

### H.5 Trigger TLS issuance

In Coolify → application → **Deploy**. Once the build finishes and Coolify's Caddy starts, it'll auto-request Let's Encrypt certs for every domain mapped in G.6. Watch the deploy log:

```
✔ Issued certificate for dutyhive.com
✔ Issued certificate for app.dutyhive.com
...
```

If issuance fails for one domain, that subdomain's DNS isn't pointing where Coolify thinks it is — re-check H.3.

Visit `https://dutyhive.com` — the marketing page should render with a green padlock.

---

## Phase I — Resend (transactional + newsletter mail)

Better Auth sends verification emails via SMTP in dev (Mailpit). Production switches to Resend's HTTP API via the Resend API key.

### I.1 Add the domain in Resend

1. Resend Dashboard → **Domains → Add Domain** → `dutyhive.com`.
2. Resend shows three DNS records to add: SPF (TXT), DKIM (TXT × 2), DMARC (TXT).

### I.2 Add the records in Cloudflare

| Type  | Name                | Content                                                      | Notes                             |
| ----- | ------------------- | ------------------------------------------------------------ | --------------------------------- |
| `TXT` | `@`                 | `v=spf1 include:amazonses.com -all`                          | Resend uses Amazon SES on backend |
| `TXT` | `resend._domainkey` | `<long DKIM value from Resend dashboard>`                    | DKIM signing                      |
| `TXT` | `_dmarc`            | `v=DMARC1; p=quarantine; rua=mailto:postmaster@dutyhive.com` | DMARC reporting                   |
| `MX`  | `send`              | `feedback-smtp.eu-west-1.amazonses.com` (priority 10)        | Resend bounce/complaint relay     |

Cloudflare → DNS → add each one. Save. Resend's verification picks up the records within a few minutes.

### I.3 Verify in Resend

Wait until each record turns green ✔ in the Resend dashboard.

### I.4 Generate the Resend API key

1. Resend → **API Keys → Create API Key**.
2. **Permission**: full sending.
3. **Domain**: `dutyhive.com`.
4. Copy the key (starts with `re_`). **Paste into Coolify's `RESEND_API_KEY` env var** (G.7).

### I.5 Switch the auth mailer to Resend in production

Foundation Phase 2 hard-codes nodemailer + SMTP for dev. To use Resend in prod we'll wire the email backend in Phase 4 (`@dutyhive/email` package). Until then, leave SMTP env vars empty in production — Better Auth will skip email verification temporarily.

> **TODO before commercial launch**: complete `@dutyhive/email` so production sign-up requires email verification. Track in `docs/quality/risk-register.md` R-0010.

### I.6 Validate deliverability

After the domain is verified, send a test:

```bash
local$ curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer <RESEND_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"from":"noreply@dutyhive.com","to":"<your personal mail>","subject":"DutyHive — domain verification test","html":"It works."}'
```

```powershell
local-ps> Invoke-RestMethod -Method POST `
  -Uri "https://api.resend.com/emails" `
  -Headers @{ Authorization = "Bearer <RESEND_API_KEY>"; "Content-Type" = "application/json" } `
  -Body '{"from":"noreply@dutyhive.com","to":"<your personal mail>","subject":"DutyHive — domain verification test","html":"It works."}'
```

Check the recipient inbox. Then run the message through `https://www.mail-tester.com` — score should be **9/10 or 10/10** with SPF + DKIM + DMARC all green.

---

## Phase J — Cloudflare Email Routing for `support@dutyhive.com`

Resend sends; Cloudflare routes incoming mail to your personal inbox without us standing up an MX server.

1. Cloudflare → `dutyhive.com` → **Email → Email Routing → Get started**.
2. Cloudflare shows the MX + TXT records to add. **Stop** — these conflict with Resend's `MX send` from I.2. Cloudflare's MX is for your **incoming** apex; Resend's `send` subdomain MX is separate, so both can coexist.

   Actual records:

   | Type  | Name | Content                                                            | Priority |
   | ----- | ---- | ------------------------------------------------------------------ | -------- |
   | `MX`  | `@`  | `route1.mx.cloudflare.net`                                         | 13       |
   | `MX`  | `@`  | `route2.mx.cloudflare.net`                                         | 38       |
   | `MX`  | `@`  | `route3.mx.cloudflare.net`                                         | 90       |
   | `TXT` | `@`  | `v=spf1 include:_spf.mx.cloudflare.net include:amazonses.com -all` | —        |

   Note we **merge** the SPF record (Cloudflare + Amazon SES). Replace the I.2 SPF with this combined version.

3. Add the records, save. Cloudflare verifies.
4. **Routing rules → Add rule**:
   - **Custom address**: `support@dutyhive.com` → forward to `<your-personal-email>`.
   - **Catch-all**: → forward to `<your-personal-email>` (gets all unrouted addresses while we add specific rules).
5. Cloudflare sends a verification email to your personal address — click the link.
6. Test by emailing `support@dutyhive.com` from another account — should land in your personal inbox within a minute.

Add additional addresses for `legal@`, `privacy@`, `press@`, `news@` mirroring the entries in `packages/config/src/brand.ts`.

---

## Phase K — Beszel monitoring (Phase 7)

Beszel is a self-hosted lightweight metrics dashboard. The Hub runs on `mgmt-01`; Agents run on `app-01` and `db-01` and push metrics over the private network.

### K.1 Install Beszel Hub on `mgmt-01`

```bash
mgmt$  curl -L https://github.com/henrygd/beszel/releases/latest/download/beszel_linux_amd64.tar.gz \
         | tar xz beszel
mgmt$  sudo install -o beszel -g beszel beszel /usr/local/bin/beszel || (sudo useradd -r beszel && sudo install -o beszel -g beszel beszel /usr/local/bin/beszel)
mgmt$  sudo install -d -o beszel -g beszel /opt/beszel
```

Create a systemd unit:

```bash
mgmt$  sudo tee /etc/systemd/system/beszel.service > /dev/null <<'EOF'
[Unit]
Description=Beszel monitoring hub
After=network.target

[Service]
Type=simple
User=beszel
WorkingDirectory=/opt/beszel
ExecStart=/usr/local/bin/beszel serve --http "0.0.0.0:8090"
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF

mgmt$  sudo systemctl daemon-reload
mgmt$  sudo systemctl enable --now beszel
```

Open `http://<MGMT_PUBLIC_IP>:8090` (use the SSH tunnel: `ssh -L 8090:localhost:8090 deploy@<MGMT_PUBLIC_IP>`) and create the admin account.

### K.2 Install agents on `app-01` and `db-01`

In the Beszel UI: **Add System → System → copy the install command shown**, e.g.:

```bash
app$  curl -L https://github.com/henrygd/beszel/releases/latest/download/beszel-agent_linux_amd64.tar.gz | tar xz beszel-agent
app$  sudo install -o root -g root beszel-agent /usr/local/bin/
app$  sudo tee /etc/systemd/system/beszel-agent.service > /dev/null <<EOF
[Unit]
Description=Beszel agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/beszel-agent --hub-url http://10.0.1.2:8090 --token <TOKEN_FROM_HUB>
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
app$  sudo systemctl daemon-reload
app$  sudo systemctl enable --now beszel-agent
```

Repeat on `db-01`. Both should appear in the Hub UI within ~30 seconds with metrics streaming.

### K.3 Map Beszel to a public domain (optional)

Add `beszel.dutyhive.com` → `<MGMT_PUBLIC_IP>` in Cloudflare DNS. In Cloudflare WAF, lock it down to your home IP (or use Cloudflare Access for SSO). Coolify can serve as the reverse proxy by adding a service entry for the Beszel port.

---

## Phase L — Backups (Phase 7)

Nightly `pg_dump` of the production database, GPG-encrypted, shipped to the Storage Box.

### L.1 Generate the backup encryption key

On a **separate offline laptop or air-gapped USB** — _not_ on `db-01`:

```bash
offline$ gpg --quick-gen-key 'dutyhive-backups@dutyhive.com' rsa4096 sign,encrypt 0
offline$ gpg --armor --export 'dutyhive-backups@dutyhive.com' > dutyhive-backups-public.asc
```

Save the **secret key** in your password manager (export with `gpg --armor --export-secret-keys` and treat it like the most valuable secret you have — losing it means losing all backups).

Copy the **public key only** to `db-01`:

```bash
local$ scp dutyhive-backups-public.asc deploy@<DB_PUBLIC_IP>:/tmp/
db$    gpg --import /tmp/dutyhive-backups-public.asc
db$    gpg --list-keys
```

```powershell
local-ps> scp .\dutyhive-backups-public.asc deploy@<DB_PUBLIC_IP>:/tmp/
```

### L.2 Configure SSH to the Storage Box from `db-01`

Copy the backup key from E.2 to `db-01`:

```bash
local$ scp ~/.ssh/dutyhive_backup_ed25519 deploy@<DB_PUBLIC_IP>:/home/deploy/.ssh/
db$    chmod 600 /home/deploy/.ssh/dutyhive_backup_ed25519
```

```powershell
local-ps> scp $HOME\.ssh\dutyhive_backup_ed25519 deploy@<DB_PUBLIC_IP>:/home/deploy/.ssh/
```

Append a host alias to `~/.ssh/config`:

```bash
db$  cat >> /home/deploy/.ssh/config <<'EOF'
Host storagebox
  HostName u123456.your-storagebox.de
  User u123456
  IdentityFile ~/.ssh/dutyhive_backup_ed25519
  Port 23
EOF
db$  chmod 600 /home/deploy/.ssh/config
db$  ssh storagebox 'echo OK'      # accept the host key on first connect
```

### L.3 Backup script

```bash
db$  sudo tee /usr/local/bin/dutyhive-backup.sh > /dev/null <<'EOF'
#!/bin/bash
set -euo pipefail

DB_NAME="dutyhive_prod"
TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
DUMP_FILE="/tmp/${DB_NAME}-${TIMESTAMP}.sql.gz.gpg"

# 1. Dump + gzip + GPG-encrypt — the dump never lands on disk in plaintext.
sudo -u postgres pg_dump --no-owner --no-acl "$DB_NAME" \
  | gzip --best \
  | gpg --batch --yes --trust-model always \
        --recipient 'dutyhive-backups@dutyhive.com' \
        --encrypt --output "$DUMP_FILE"

# 2. Upload to the Storage Box via SFTP.
sudo -u deploy ssh storagebox "mkdir -p backups/postgres" || true
sudo -u deploy scp "$DUMP_FILE" "storagebox:backups/postgres/"

# 3. Local cleanup.
shred -u "$DUMP_FILE"

# 4. Retention: keep the last 30 daily + 12 monthly on the Storage Box.
sudo -u deploy ssh storagebox bash <<'REMOTE'
cd backups/postgres
ls -1 | sort | head -n -30 | grep -E '\.sql\.gz\.gpg$' | xargs -r rm --
REMOTE

echo "Backup OK: $DUMP_FILE -> storagebox:backups/postgres/"
EOF
db$  sudo chmod 750 /usr/local/bin/dutyhive-backup.sh
db$  sudo chown root:root /usr/local/bin/dutyhive-backup.sh
```

### L.4 Schedule via systemd timer

```bash
db$  sudo tee /etc/systemd/system/dutyhive-backup.service > /dev/null <<'EOF'
[Unit]
Description=DutyHive nightly Postgres backup
After=postgresql.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/dutyhive-backup.sh
EOF

db$  sudo tee /etc/systemd/system/dutyhive-backup.timer > /dev/null <<'EOF'
[Unit]
Description=Run dutyhive-backup nightly at 03:00 UTC

[Timer]
OnCalendar=*-*-* 03:00:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
EOF

db$  sudo systemctl daemon-reload
db$  sudo systemctl enable --now dutyhive-backup.timer
db$  sudo systemctl list-timers | grep dutyhive
```

### L.5 Manual smoke + restore drill (DO THIS BEFORE GOING LIVE)

```bash
db$  sudo systemctl start dutyhive-backup.service     # run once now
db$  sudo journalctl -u dutyhive-backup -n 50         # confirm "Backup OK"
db$  ssh storagebox 'ls -l backups/postgres/'         # confirm file lands
```

Restore drill — on a **scratch** box (or a temporary local Docker Postgres):

```bash
local$ scp deploy@<DB_PUBLIC_IP>:/tmp/<latest>.sql.gz.gpg ./
local$ gpg --decrypt <latest>.sql.gz.gpg | gunzip | psql -h localhost -U postgres dutyhive_restore_test
local$ psql -h localhost -U postgres dutyhive_restore_test -c "SELECT count(*) FROM \"user\";"
```

```powershell
# PowerShell can't pipe binary streams cleanly between gpg and psql. Decrypt
# to a file first, then feed it into psql.
local-ps> scp deploy@<DB_PUBLIC_IP>:/tmp/<latest>.sql.gz.gpg .
local-ps> gpg --decrypt --output dump.sql.gz <latest>.sql.gz.gpg
local-ps> & 'C:\Program Files\Git\usr\bin\gzip.exe' -d dump.sql.gz   # or use 7z
local-ps> psql -h localhost -U postgres dutyhive_restore_test -f dump.sql
local-ps> psql -h localhost -U postgres dutyhive_restore_test -c 'SELECT count(*) FROM "user";'
```

If row counts match production: backups are real. Document the drill date in `docs/guides/release-checklist.md`.

### L.6 Coolify config backup (weekly)

Coolify stores its state in `/data/coolify`. Back it up to the Storage Box:

```bash
mgmt$  sudo tee /usr/local/bin/coolify-backup.sh > /dev/null <<'EOF'
#!/bin/bash
set -euo pipefail
TS=$(date -u +%Y-%m-%dT%H-%M-%SZ)
ARCHIVE="/tmp/coolify-${TS}.tar.gz"
sudo tar -czf "$ARCHIVE" /data/coolify
sudo -u deploy ssh storagebox "mkdir -p backups/coolify" || true
sudo -u deploy scp "$ARCHIVE" storagebox:backups/coolify/
shred -u "$ARCHIVE"
EOF
mgmt$  sudo chmod 750 /usr/local/bin/coolify-backup.sh
```

Schedule a weekly timer analogous to L.4 (`OnCalendar=Sun *-*-* 04:00:00 UTC`).

---

## Phase M — Final verification checklist

Mark these in `docs/guides/release-checklist.md` once each is green.

### Networking & TLS

- [ ] `dig dutyhive.com NS` returns Cloudflare nameservers.
- [ ] `https://dutyhive.com` loads the marketing page with a valid TLS cert.
- [ ] `https://app.dutyhive.com`, `planner.`, `business.`, `checklist.` each load with valid TLS.
- [ ] HTTP→HTTPS redirect is in place (`curl -I http://dutyhive.com` returns 301 to https).

### Auth + database

- [ ] Sign-up via `https://app.dutyhive.com/sign-up` lands a verification email in your real inbox.
- [ ] Email verification link works; session cookie is scoped to `.dutyhive.com`.
- [ ] Logged-in session on `app.` is also valid on `planner.` (cross-sub cookies).
- [ ] `audit_entry` table on `db-01` has rows for `auth.signup` and `auth.login`.
- [ ] `pnpm check:rls` (run via SSH tunnel from your laptop against prod) passes.

### Mail

- [ ] `support@dutyhive.com` test email arrives in your personal inbox.
- [ ] Resend domain shows green for SPF, DKIM, DMARC.
- [ ] `mail-tester.com` score ≥ 9/10 for transactional from `noreply@dutyhive.com`.

### Observability

- [ ] Beszel hub shows live metrics for `mgmt-01`, `app-01`, `db-01`.
- [ ] Coolify `https://coolify.dutyhive.com` is reachable behind your IP allowlist + 2FA.

### Backups

- [ ] Nightly `pg_dump` ran at least once and the file is on the Storage Box.
- [ ] Restore drill successfully reconstructed a scratch DB from the latest backup.
- [ ] Weekly Coolify config backup ran at least once.
- [ ] GPG private key for backups is in the password manager **and** an offline copy.

### Hardening

- [ ] Root login over SSH is disabled on all three VPS.
- [ ] Password authentication over SSH is disabled on all three VPS.
- [ ] `fail2ban` jail `sshd` is active on all three VPS.
- [ ] UFW is enabled on all three VPS with the rules from D.4.
- [ ] Postgres `listen_addresses` is the private IP only (not `*`).
- [ ] `pg_hba.conf` allows only `10.0.1.3/32` (app-01) — no `0.0.0.0/0`.
- [ ] Hetzner Cloud Firewall has SSH locked to your home IP.

### Compliance

- [ ] DPA accepted/signed for Hetzner, Cloudflare, Resend (see `docs/legal/dpa-checklist.md`).
- [ ] `docs/legal/datenschutz.de.md` lists every subprocessor in use.
- [ ] Anwalts-Sign-off-Gate (ADR-0010) is open as a tracked issue before commercial launch.

When every checkbox is green: **Foundation is live.** Tag `v0.1.0-foundation` in git, write the release note, and breathe.

---

## Operational runbooks

### Routine: deploy a code change

```bash
local$ git push origin main
# Coolify auto-triggers, builds, ships to app-01. Watch in Coolify UI.
```

### Routine: apply a Prisma migration to production

```bash
local$ ssh -L 5432:10.0.1.4:5432 deploy@<MGMT_PUBLIC_IP>
# in another terminal:
local$ MIGRATE_DATABASE_URL='postgresql://dutyhive_migrate:<PW>@localhost:5432/dutyhive_prod?sslmode=require' \
         pnpm --filter @dutyhive/db exec prisma migrate deploy
local$ MIGRATE_DATABASE_URL='postgresql://dutyhive_migrate:<PW>@localhost:5432/dutyhive_prod?sslmode=require' \
         pnpm check:rls
```

### Incident: SSH locked out (your IP changed)

Hetzner Cloud Firewall has a "Servers with this firewall" view — temporarily widen the rule from your **new** home IP, fix, narrow again.

### Incident: db-01 unreachable

```bash
local$ ssh deploy@<MGMT_PUBLIC_IP>
mgmt$  ping 10.0.1.4                      # private network up?
mgmt$  ssh deploy@10.0.1.4                # SSH via private net
db$    sudo systemctl status postgresql@17-main
db$    sudo journalctl -u postgresql@17-main -n 100
```

### Incident: TLS cert renewal failed

Coolify renews via Caddy. If a domain stops resolving the cert won't renew.

```bash
mgmt$  sudo docker logs $(sudo docker ps --filter name=coolify-proxy --format '{{.ID}}') | tail -100
```

Common cause: Cloudflare proxy turned ON without ALPN-compatible cert mode. Set the affected record back to **DNS only** (orange cloud off).

### Incident: backup file growing huge

`pg_dump` includes every row including `audit_entry`, which grows linearly with traffic. After 6 months consider switching to incremental WAL archiving (`pg_basebackup` + `archive_command`). Documented as a follow-up in `docs/quality/risk-register.md` R-0006.

---

## Migration paths (off Hetzner, off Coolify)

These are pre-documented exit strategies — **not** Foundation work.

- **Hetzner → another Falkenstein-equivalent EU host** (Scaleway, OVH): rebuild the box, restore from backup, swap the Cloudflare A records. ~2 hours of downtime if rehearsed.
- **Coolify → bare `docker compose` + GitHub Actions**: Coolify's compose files live in `/data/coolify/applications/<id>/`. Copy them, set up a GitHub Action that SSHes and runs `docker compose up -d` on `git push`. Trade convenience for portability.
- **Self-hosted Postgres → Hetzner Cloud Database**: when traffic justifies HA. Hetzner's managed DB lands `pg_dump`-restorable in Falkenstein with the same RLS support.

---

## Where this guide stops

This guide ends at "Foundation is live." Further hardening and ops topics live in their own files:

- `docs/guides/update-deploy-guide.md` — routine code + migration deploy procedure.
- `docs/guides/release-checklist.md` — pre-tag verification matrix.
- `docs/guides/keycloak-migration-path.md` — auth migration target.
- `docs/guides/dns-migration.md` — moving the domain registrar from Vercel to Cloudflare Registrar (post-Foundation).
- `docs/quality/release-procedure.md` — when and how releases happen, sign-off chain, Anwalts-Review-Gate.
