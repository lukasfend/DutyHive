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
        │   CX23       │    │   CPX22      │    │   CPX22      │
        │   Coolify    │    │   Next.js    │    │  Postgres 17 │
        │   Beszel hub │    │   (deployed) │    │  no public   │
        │   bastion    │    │              │    │  ingress     │
        └──────┬───────┘    └──────┬───────┘    └──────┬───────┘
               │                    │                    │
               │              [Web traffic goes          │
               │               directly to app-01,       │
               │               NOT via mgmt-01]          │
               │                                         │
               └──── private network (10.0.1.0/24) ──────┘

        Storage Box BX11   ←── nightly pg_dump (GPG)   from db-01
                            ←── weekly Coolify config from mgmt-01

        External:  Resend EU (mail) · Sentry EU (errors) · Trigger.dev (jobs)
```

Public web traffic (HTTP/HTTPS) hits `app-01:443` directly — Cloudflare DNS resolves the apex and every subdomain to `<APP_PUBLIC_IP>`. The bastion (`mgmt-01`) only sees admin SSH, Coolify deploys, and migration tunnels. If `mgmt-01` is down, the app keeps serving traffic; only deploys and admin work pause.

### Server roles + scaling roadmap

The Foundation runs on three VPS. Future boxes attach to the same private network so adding a fourth or fifth server never requires re-IPing the existing fleet.

| Box     | Phase       | Role                                                | Spec        | Private IP | Public ingress (Cloud Firewall)     |
| ------- | ----------- | --------------------------------------------------- | ----------- | ---------- | ----------------------------------- |
| mgmt-01 | Foundation  | Coolify + Beszel hub + SSH bastion                  | CX23        | 10.0.1.1   | SSH from `<YOUR_IP>/32`             |
| app-01  | Foundation  | Next.js production                                  | CPX22       | 10.0.1.2   | HTTP / HTTPS public                 |
| db-01   | Foundation  | Postgres 17                                         | CPX22       | 10.0.1.3   | none (private only)                 |
| jobs-01 | post-launch | Self-hosted Trigger.dev / cron / worker services    | CPX22       | 10.0.1.4   | HTTPS public (dashboard + webhooks) |
| app-02+ | scale-out   | Additional Next.js instances behind a load balancer | CPX22       | 10.0.1.5+  | HTTP / HTTPS public                 |
| lb-01   | scale-out   | Load balancer (Hetzner-managed LB or HAProxy VPS)   | LB11 / CX23 | 10.0.1.10  | HTTP / HTTPS public                 |

Box names are intentionally generic (`mgmt-01`, `app-01`, …) — they don't bake the brand into the infrastructure layer. Network and firewall names DO carry the brand prefix where convenient; renaming them is a cosmetic Hetzner Console change with no operational impact.

### What you'll buy (Foundation only, monthly)

| Item                      | Provider    | Type       | ~Cost / month |
| ------------------------- | ----------- | ---------- | ------------- |
| `mgmt-01` CX23            | Hetzner     | VPS        | €4.79         |
| `app-01` CPX22            | Hetzner     | VPS        | €9.59         |
| `db-01` CPX22             | Hetzner     | VPS        | €9.59         |
| Storage Box BX11 (1 TB)   | Hetzner     | Backup     | €3.95         |
| Object Storage            | Hetzner     | S3 (pay)   | ~€1–2         |
| Cloud Firewalls + Network | Hetzner     | included   | €0            |
| Cloudflare DNS + WAF Free | Cloudflare  | DNS        | €0            |
| Cloudflare Email Routing  | Cloudflare  | Mail relay | €0            |
| Resend Free               | Resend      | Mail send  | €0            |
| Sentry Team Free          | Sentry      | Errors     | €0            |
| Trigger.dev Free          | Trigger.dev | Jobs       | €0            |
| **Sum**                   |             |            | **~€29–31**   |

> Hetzner reshuffled their VPS lineup — the old CX22 / CPX21 were retired and replaced by **CX23** (2 vCPU Intel/AMD, 4 GB, 40 GB, €4.79/mo, **Cost-Optimized tier with "Limited availability"** badge — older hardware, can be sold out) and **CPX22** (2 vCPU AMD, 4 GB, 80 GB, €9.59/mo, Regular Performance tier). If `CX23` is unavailable when you provision, fall back to **CAX11** (Arm64 Ampere, 2 vCPU, 4 GB, 40 GB, €5.39/mo) — same shape, ARM instead of x86. Coolify, Beszel, and the Docker images we use all run on ARM64 fine. For db-01, if you have headroom in the budget, **CPX32** (4 vCPU, 8 GB, 160 GB, €16.79/mo) gives Postgres meaningful breathing room over CPX22.

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
- Commands prefixed with `mgmt#`, `app#`, `db#` run on that VPS as **root** (via `sudo -i` after the initial root login, or via Hetzner web console for boxes that have no public SSH yet).
- Replace `<…>` placeholders with real values before pasting.

---

## Phase A — Hetzner account preparation

### A.1 Verify billing and the project

1. Open `https://console.hetzner.cloud` → **Default** project (or create a new project to keep resources isolated; name it whatever you want — the box names below don't depend on the project name).
2. Confirm billing is active under **Settings → Billing → Payment method**.
3. Note the project ID (top of the URL, looks like `1234567`) — you may need it for the `hcloud` CLI later.

### A.2 Generate the SSH key pair

Pick a passphrase **different from your laptop login password** and store it in your password manager.

```bash
local$ ssh-keygen -t ed25519 -C "infra-admin@<your-email>" -f ~/.ssh/infra_admin_ed25519
```

```powershell
local-ps> ssh-keygen -t ed25519 -C "infra-admin@<your-email>" -f $HOME\.ssh\infra_admin_ed25519
```

This produces:

- `~/.ssh/infra_admin_ed25519` (POSIX) / `$HOME\.ssh\infra_admin_ed25519` (Windows) — private key, **never share**
- the matching `.pub` file — public key, OK to upload

Add the key to your local agent so subsequent `ssh` calls use it without re-typing the passphrase:

```bash
local$ ssh-add ~/.ssh/infra_admin_ed25519
```

```powershell
local-ps> Get-Service ssh-agent | Set-Service -StartupType Automatic
local-ps> Start-Service ssh-agent
local-ps> ssh-add $HOME\.ssh\infra_admin_ed25519
```

### A.3 Upload the public key to Hetzner

1. Hetzner Console → **Security → SSH Keys → Add SSH Key**.
2. Paste the contents of `~/.ssh/infra_admin_ed25519.pub`.
3. Name: `infra-admin`.
4. Save. Hetzner shows a fingerprint — verify it matches the one from `ssh-keygen -lf ~/.ssh/infra_admin_ed25519.pub`.

> **Why this matters:** if you forget to attach this key when provisioning a VPS in Phase C, Hetzner injects nothing into `/root/.ssh/authorized_keys` and your only way in is the web console (clunky) or the root password emailed by Hetzner. Always tick the SSH-key box at order time.

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
local$ hcloud context create prod
# Paste the token when prompted.
```

---

## Phase B — Networking foundation

This phase creates the Private Network and **three** Cloud Firewalls before we order any VPS. Provisioning a box later attaches it to the right firewall in one click.

### B.1 Get your home/office IP address

We'll lock the bastion's public SSH ingress to your IP only.

```bash
local$ curl -s https://api.ipify.org
```

```powershell
local-ps> Invoke-RestMethod https://api.ipify.org
```

Note the IPv4 address (`<YOUR_IP>` from now on). If your ISP gives you a dynamic IP, you'll have to update the firewall rule when it changes — keep the IP detection command handy.

### B.2 Create the Private Network

Hetzner's **Cloud Network** lets all VPS in the project talk over a private subnet without exposing ports to the public internet. We use a **/16 outer range** so we have room for additional subnets later (e.g. staging, multi-region) and a **/24 subnet** for the production fleet.

1. Hetzner Console → **Networks → Create Network**.
2. **Name**: `internal`.
3. **IP range**: `10.0.0.0/16`.
4. **Add subnet**:
   - **Type**: Cloud
   - **Network zone**: `eu-central` (Falkenstein FSN1).
   - **IP range**: `10.0.1.0/24`.
5. Save.

> **Why the subnet is `10.0.1.0/24` and not `10.0.0.0/24`:** Hetzner reserves the **first `/24` block** of the parent network range for its own internal use (gateway, routing). Trying to create a subnet at `10.0.0.0/24` returns `IP range clash`. The first usable user subnet is `10.0.1.0/24`. Within that subnet, VPS IPs start from `10.0.1.1` — the network gateway sits in the reserved `10.0.0.0/24` block of the parent /16, **not** inside the user subnet, which is why `.1` is available for the first VPS instead of being claimed as a gateway. The `/16` umbrella also means a future second subnet (e.g. `10.0.2.0/24` for staging) shares the same network and routes between subnets without extra setup.

### B.3 Cloud-Firewall design — read this first

> **Critical Hetzner behaviour we learned the hard way:** Hetzner Cloud Firewalls filter **every** network interface attached to a VPS — public AND private. A rule `Allow TCP/22 from <YOUR_IP>/32` on a firewall attached to `app-01` blocks SSH from `mgmt-01`'s private IP `10.0.1.1`, because `10.0.1.1` is not in the allowlist. Symptom: ICMP works (firewall has a separate `0.0.0.0/0` ICMP rule), TCP/22 returns Connection refused. The fix is an explicit `Allow ANY from 10.0.0.0/16` rule on every firewall whose box needs to talk to the others over the private network.

We use **three** firewalls so each box's exposure is tailored to its role:

| Firewall        | Boxes                   | Public ingress                                     | Private ingress                |
| --------------- | ----------------------- | -------------------------------------------------- | ------------------------------ |
| `edge-mgmt`     | mgmt-01                 | SSH from `<YOUR_IP>/32`, ICMP                      | all TCP/UDP from `10.0.0.0/16` |
| `edge-app`      | app-01, app-02+ (later) | HTTP/HTTPS from anywhere, ICMP — **no public SSH** | all TCP/UDP from `10.0.0.0/16` |
| `edge-internal` | db-01, jobs-01 (later)  | ICMP only — **no public TCP/UDP**                  | all TCP/UDP from `10.0.0.0/16` |

Outbound rules: leave the defaults (allow all) on every firewall.

**Why split:** if we used one firewall with all rules merged, the HTTP/HTTPS rule needed for `app-01` would also expose those ports on `db-01`. Per-box exposure is what `edge-internal` enforces — db-01 has no business listening publicly on anything.

**Why `Allow ANY from 10.0.0.0/16`:** the private network is supposed to be the trust boundary. UFW on each box (Phase D.5) plus per-service binding (`pg_hba.conf` on db-01, etc.) does the fine-grained filtering. The Hetzner firewall's job here is "private network = trusted, public = scoped".

### B.4 Create `edge-mgmt`

1. Hetzner Console → **Firewalls → Create Firewall**.
2. **Name**: `edge-mgmt`.
3. **Inbound rules**:

   | Source            | Protocol | Port  | Notes                        |
   | ----------------- | -------- | ----- | ---------------------------- |
   | `<YOUR_IP>/32`    | TCP      | `22`  | Your SSH from your home IP   |
   | `0.0.0.0/0, ::/0` | ICMP     | —     | Ping debugging               |
   | `10.0.0.0/16`     | TCP      | `any` | All TCP from private network |
   | `10.0.0.0/16`     | UDP      | `any` | All UDP from private network |

4. **Outbound rules**: leave defaults (allow all).
5. Save.

### B.5 Create `edge-app`

1. **Firewalls → Create Firewall**.
2. **Name**: `edge-app`.
3. **Inbound rules**:

   | Source            | Protocol | Port  | Notes                                      |
   | ----------------- | -------- | ----- | ------------------------------------------ |
   | `0.0.0.0/0, ::/0` | TCP      | `80`  | HTTP (redirects to HTTPS on app)           |
   | `0.0.0.0/0, ::/0` | TCP      | `443` | HTTPS                                      |
   | `0.0.0.0/0, ::/0` | ICMP     | —     | Ping debugging                             |
   | `10.0.0.0/16`     | TCP      | `any` | All TCP from private (incl. SSH from mgmt) |
   | `10.0.0.0/16`     | UDP      | `any` | All UDP from private                       |

4. Save.

Note: **no rule for SSH from a public source.** The only way to SSH `app-01` is via `mgmt-01` over the private network (Phase E). When we add `app-02`, `app-03`, etc., they all attach to this firewall and inherit the same exposure.

### B.6 Create `edge-internal`

1. **Firewalls → Create Firewall**.
2. **Name**: `edge-internal`.
3. **Inbound rules**:

   | Source            | Protocol | Port  | Notes                                      |
   | ----------------- | -------- | ----- | ------------------------------------------ |
   | `0.0.0.0/0, ::/0` | ICMP     | —     | Ping debugging                             |
   | `10.0.0.0/16`     | TCP      | `any` | All TCP from private (SSH, Postgres, jobs) |
   | `10.0.0.0/16`     | UDP      | `any` | All UDP from private                       |

4. Save.

This box has zero public TCP/UDP ingress. Everything goes via the private network.

---

## Phase C — Provision the three VPS

Order: `mgmt-01` first, then `app-01`, then `db-01`. Hetzner assigns private IPs in the order of attachment to the network — first attaches to `10.0.1.1`, second to `10.0.1.2`, etc.

### C.1 Order `mgmt-01` (Coolify + Beszel hub + bastion)

1. Hetzner Console → **Servers → Add Server**.
2. **Location**: `Falkenstein` (FSN1).
3. **Image**: two options for `mgmt-01` —

   - **Apps → Coolify** (recommended): Hetzner ships a pre-baked image with Ubuntu 24.04 + Docker + Coolify already installed and running. Saves Phases H.1 and H.2 — you skip straight to H.3 (first-run UI).
   - Or **Standard → Ubuntu 24.04** if you want to install Coolify yourself (everything in Phase H still applies).

   For `app-01` and `db-01` (C.2, C.3): always use the standard `Ubuntu 24.04` image. The Coolify App image is only for `mgmt-01`.

4. **Type**: **Shared Resources → Cost-Optimized → x86 (Intel/AMD)** → **CX23** (2 vCPU, 4 GB RAM, 40 GB disk, €4.79/mo). If the "Limited availability" badge says it's sold out, switch the architecture toggle to **Arm64 (Ampere®)** and pick **CAX11** (2 vCPU, 4 GB, 40 GB, €5.39/mo) — same shape, ARM instead of x86.
5. **Networking**:
   - Public IPv4: ✓
   - Public IPv6: ✓
   - Private network: select `internal`. Hetzner auto-assigns an IP — note it (should be `10.0.1.1`).
6. **SSH keys**: select `infra-admin`. **Critical** — if you forget this, Hetzner injects no key and you're stuck on the web console.
7. **Volumes**: none.
8. **Firewalls**: select **`edge-mgmt`**.
9. **Backups**: enabled (€0.76/mo, 20% surcharge — recommended for Coolify config).
10. **Placement groups**: skip.
11. **Labels**: `role=mgmt`, `env=prod`.
12. **Cloud config**: leave empty (we harden manually in Phase D).
13. **Name**: `mgmt-01`.
14. **Create & Buy now**. Wait ~30 seconds for the box to boot.

Note the assigned **public IPv4** in the server details page — `<MGMT_PUBLIC_IP>` from now on. Confirm in **Server details → Network → Private networks** that the assigned private IP is `10.0.1.1`.

### C.2 Order `app-01` (Next.js)

Same as C.1 with these differences:

- **Image**: Standard → `Ubuntu 24.04` (NOT the Coolify App image — that's mgmt-only).
- **Type**: **Shared Resources → Regular Performance** → **CPX22** (2 vCPU AMD, 4 GB RAM, 80 GB disk, €9.59/mo). If you're already expecting heavier traffic, **CPX32** (4 vCPU, 8 GB, 160 GB, €16.79/mo) is the next step up.
- **Firewalls**: select **`edge-app`** (NOT `edge-mgmt`).
- **Backups**: enabled.
- **Labels**: `role=app`, `env=prod`.
- **Name**: `app-01`.

Note its public IPv4 as `<APP_PUBLIC_IP>` and confirm private IP is `10.0.1.2`.

### C.3 Order `db-01` (Postgres)

Same as C.1 with these differences:

- **Image**: Standard → `Ubuntu 24.04`.
- **Type**: **Shared Resources → Regular Performance** → **CPX22** (2 vCPU AMD, 4 GB, 80 GB, €9.59/mo) for Foundation budget. Postgres is RAM-hungry — if you can spend the extra €7, choose **CPX32** (4 vCPU, 8 GB, 160 GB, €16.79/mo) instead. For sustained load production, **CCX13** (Dedicated, 2 vCPU AMD, 8 GB, 80 GB, €19.19/mo) gives you a non-shared CPU.
- **Firewalls**: select **`edge-internal`** (NOT `edge-mgmt`).
- **Backups**: enabled (this is the box you most want backed up).
- **Labels**: `role=db`, `env=prod`.
- **Name**: `db-01`.

Note `<DB_PUBLIC_IP>` (you'll rarely use it — db-01 has no public ingress) and confirm private IP is `10.0.1.3`.

### C.4 First-login sanity check

Only `mgmt-01` is publicly SSH-able. Try it:

```bash
local$ ssh root@<MGMT_PUBLIC_IP> 'echo OK; hostname'
```

If this prompts for a password, the SSH key wasn't injected — fix in **Server Details → SSH keys**, attach `infra-admin`, then `ssh-keygen -R <MGMT_PUBLIC_IP>` locally to clear the old fingerprint, then retry.

`app-01` and `db-01` have **no public SSH ingress** by design (their firewalls don't allow it). To verify they booted, log in via Hetzner's web console (Server details → **Console**) — login is `root` and the password from Hetzner's email.

While in the web console on each box, take note of:

```bash
ip -4 addr show          # confirm both eth0 (public) and enp7s0 (private) show IPs
hostname                  # should match what you named the box
cat /root/.ssh/authorized_keys     # confirm your key is here
```

If the private interface is missing, the network attachment didn't go through — re-check the server's **Network** tab in the Hetzner Console and reattach.

If `/root/.ssh/authorized_keys` is empty, Hetzner didn't inject the key. Paste the contents of your local `~/.ssh/infra_admin_ed25519.pub` into it now (`mkdir -p /root/.ssh && chmod 700 /root/.ssh && cat >> /root/.ssh/authorized_keys` then paste, then `chmod 600 /root/.ssh/authorized_keys`).

### C.5 Verify private network connectivity

From mgmt-01:

```bash
local$ ssh root@<MGMT_PUBLIC_IP>
mgmt#  ping -c 2 10.0.1.2      # should reach app-01
mgmt#  ping -c 2 10.0.1.3      # should reach db-01
```

Ping should succeed. This only verifies ICMP — TCP services aren't running yet, that's Phase D's job. If ping fails, the private network attachment is broken — retry the Network step in Hetzner Console.

---

## Phase D — Bootstrap each VPS (SSH hardening + UFW + fail2ban)

Run all of D.1–D.9 on **`mgmt-01` first** (you'll lose root login at the end of D.3, so we do mgmt-01 first to verify the pattern works before locking ourselves out of the other boxes), then on `app-01`, then on `db-01`.

For `app-01` and `db-01`, you start each session via the web console — once their `deploy` user is set up, sshd is hardened, and the local SSH config in Phase E lands, you'll switch to `ssh app` / `ssh db` over the private network for any further work.

### D.1 System update + base tools

```bash
mgmt#  apt update && apt upgrade -y
mgmt#  apt install -y \
         curl wget git vim ufw fail2ban unattended-upgrades \
         ca-certificates gnupg lsb-release rsync htop tmux jq tcpdump
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

Sanity-check from your laptop **before** disabling root login (mgmt only — for app/db you do this from inside the web console):

```bash
local$ ssh deploy@<MGMT_PUBLIC_IP> 'whoami && sudo -n true && echo OK'
# expected: deploy ... OK   (sudo prompts for the deploy password — that's fine)
```

If that works, continue.

### D.3 Lock down sshd (`/etc/ssh/sshd_config.d/99-hardening.conf`)

```bash
mgmt#  cat > /etc/ssh/sshd_config.d/99-hardening.conf <<'EOF'
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
mgmt#  sshd -t        # syntax check — must print nothing
```

Don't reload sshd yet — that comes after D.4.

### D.4 Disable Ubuntu's socket-activated SSH

Ubuntu 24.04 ships SSH as a **socket-activated** unit (`ssh.socket`) instead of a long-running service. On Hetzner's image we've seen this manifest as private-network connections being TCP-RST'd silently — even with no UFW, no iptables, and `sshd` listening on `0.0.0.0:22`. The cause is a filter (`IPAccessAllow=`/`SocketBindAllow=` style) on the socket unit that limits which clients reach sshd. ICMP works (no TCP path), TCP/22 returns "Connection refused", and you spend hours bisecting.

The cleanest fix is to take socket activation out of the picture and run `sshd` as a normal long-lived service:

```bash
mgmt#  systemctl disable --now ssh.socket
mgmt#  systemctl mask ssh.socket
mgmt#  systemctl enable --now ssh.service
mgmt#  systemctl reload ssh.service           # picks up the 99-hardening.conf from D.3
mgmt#  systemctl status ssh.service           # active (running)
mgmt#  ss -tlnp | grep ':22'                   # owner column shows ONLY sshd, not systemd
```

If `ss -tlnp` previously showed `users:(("sshd",...),("systemd",...))` and now shows only `sshd`, the switch worked. Now test from your laptop in a **second** terminal — keep the root web-console / root SSH session open until you confirm `deploy` login works:

```bash
local$ ssh deploy@<MGMT_PUBLIC_IP>     # should land you in /home/deploy
local$ ssh root@<MGMT_PUBLIC_IP>       # should be REJECTED
```

Once verified, exit the root session.

> **Why we do this even though "ssh.socket" is the modern Ubuntu default:** socket activation hides one extra filtering layer between the network and `sshd` where opaque defaults can apply. For a small fleet (<10 boxes) the resource savings of socket activation are negligible, while the predictability of `ssh.service` directly listening on the wire is worth a lot when debugging. Re-enable socket activation later if you have a measured reason to.

### D.5 UFW (host firewall in addition to Hetzner Cloud Firewall)

Defence in depth. The Hetzner firewall (Phase B) is the outer perimeter; UFW on the box is the inner one.

```bash
mgmt$ sudo ufw default deny incoming
mgmt$ sudo ufw default allow outgoing
mgmt$ sudo ufw allow OpenSSH
mgmt$ sudo ufw allow from 10.0.0.0/16    # all private-network traffic
mgmt$ sudo ufw enable                    # type 'y' to confirm
mgmt$ sudo ufw status verbose
```

For **`app-01`**: same as above, plus:

```bash
app$  sudo ufw allow 80/tcp
app$  sudo ufw allow 443/tcp
```

For **`db-01`**: same as the mgmt-01 base (no public 80/443 needed). The `allow from 10.0.0.0/16` line is what lets `app-01` reach Postgres on `5432` and lets you SSH via mgmt-jump.

> **If `mgmt-01` was provisioned with the Coolify App image (C.1):** Coolify is already serving its UI on port 8000. Until Phase I.5 issues TLS for `coolify.dutyhive.com` and Coolify routes itself through Caddy on `:443`, you need port 8000 reachable from your laptop:
>
> ```bash
> mgmt$ sudo ufw allow from <YOUR_IP>/32 to any port 8000 proto tcp comment 'Coolify UI bootstrap'
> ```
>
> Drop this rule with `sudo ufw delete allow from <YOUR_IP>/32 to any port 8000 proto tcp` after Phase I.5 once `https://coolify.dutyhive.com` works.

### D.6 fail2ban

The default `sshd` jail ships enabled by the package — verify:

```bash
mgmt$ sudo systemctl enable --now fail2ban
mgmt$ sudo fail2ban-client status sshd
```

Public-internet bots will hammer your `mgmt-01:22` constantly. fail2ban bans IPs after 5 failed attempts (default 10 min). Once Phase D.4 is in place, brute-force attempts get `Permission denied (publickey)` immediately — they never reach PAM — and fail2ban bans them out of the way.

### D.7 Unattended security upgrades

```bash
mgmt$ sudo dpkg-reconfigure --priority=low unattended-upgrades   # answer Yes
mgmt$ cat /etc/apt/apt.conf.d/50unattended-upgrades              # confirm only -security is enabled
```

### D.8 Set timezone

```bash
mgmt$ sudo timedatectl set-timezone Europe/Vienna
```

### D.9 Repeat on the other boxes

Repeat **D.1–D.8** on `app-01` and `db-01`. For these boxes:

- You start each step via the **Hetzner web console** (no public SSH yet).
- D.4 (ssh.socket → ssh.service) is just as critical here, even though you can't currently SSH from outside — once Phase E lands, `mgmt → app/db:22` over the private network will fail in the same way without it.
- After D.5 (UFW) is enabled with `allow from 10.0.0.0/16`, leave the web console.

---

## Phase E — Local SSH config (bastion via mgmt-01)

Once all three boxes have a `deploy` user, root login is disabled, and `ssh.service` is running, set up a single SSH config block on **your laptop** so that:

- `ssh mgmt` → direct to `mgmt-01` over its public IP.
- `ssh app` → jumps through `mgmt-01` and lands on `app-01` over the private network (`10.0.1.2`).
- `ssh db` → jumps through `mgmt-01` and lands on `db-01` over the private network (`10.0.1.3`).

This is the same topology Coolify uses internally to deploy to `app-01` (Phase H.4): `mgmt-01` is the bastion, the work boxes are reachable only from the private network.

### E.1 Append to `~/.ssh/config`

POSIX (`~/.ssh/config`) or Windows (`$HOME\.ssh\config` — create the file if it doesn't exist). Replace `<MGMT_PUBLIC_IP>` with the value from C.1.

```ssh-config
# DutyHive — Hetzner production
Host mgmt
  HostName <MGMT_PUBLIC_IP>
  User deploy
  IdentityFile ~/.ssh/infra_admin_ed25519
  IdentitiesOnly yes
  ServerAliveInterval 60

Host app db jobs
  User deploy
  IdentityFile ~/.ssh/infra_admin_ed25519
  IdentitiesOnly yes
  ProxyJump mgmt
  ServerAliveInterval 60

Host app
  HostName 10.0.1.2

Host db
  HostName 10.0.1.3

Host jobs
  HostName 10.0.1.4    # populated when jobs-01 lands post-launch
```

OpenSSH on Windows expands `~` to `$env:USERPROFILE`, so the same `IdentityFile ~/.ssh/infra_admin_ed25519` line works in both shells — no backslashes needed inside the config.

Lock down the file permissions — sshd refuses to read a world-readable config:

```bash
local$ chmod 600 ~/.ssh/config
```

```powershell
local-ps> icacls $HOME\.ssh\config /inheritance:r /grant:r "$($env:USERNAME):F"
```

### E.2 Smoke test

```bash
local$ ssh mgmt 'whoami && hostname'   # → deploy / mgmt-01
local$ ssh app  'whoami && hostname'   # → deploy / app-01  (jumps via mgmt)
local$ ssh db   'whoami && hostname'   # → deploy / db-01   (jumps via mgmt)
```

```powershell
local-ps> ssh mgmt 'whoami; hostname'
local-ps> ssh app  'whoami; hostname'
local-ps> ssh db   'whoami; hostname'
```

### E.3 Verify the bastion topology

Confirm that direct public SSH to `app-01` and `db-01` is impossible:

```bash
local$ ssh -o ConnectTimeout=5 deploy@<APP_PUBLIC_IP>     # should time out (edge-app blocks)
local$ ssh -o ConnectTimeout=5 deploy@<DB_PUBLIC_IP>      # should time out (edge-internal blocks)
local$ ssh app 'echo OK'                                  # should succeed via mgmt jump
local$ ssh db  'echo OK'                                  # should succeed via mgmt jump
```

If both refusals and both successes hold: the bastion topology is enforced. mgmt-01 is the only door to the fleet.

### E.4 Troubleshooting — `ssh app` / `ssh db` refused or hangs

If something fails, the failure mode usually pinpoints the cause. Run these diagnostics:

**On mgmt:**

```bash
mgmt$ ping -c 2 10.0.1.2                                   # private network reachability
mgmt$ nc -zv 10.0.1.2 22                                   # TCP/22 reachability
mgmt$ ssh -v -o ConnectTimeout=5 deploy@10.0.1.2 2>&1 | head -20
```

**On the target box** (via web console if you can't SSH yet):

```bash
app#  ufw status
app#  iptables -L INPUT -n -v --line-numbers
app#  nft list ruleset 2>/dev/null
app#  ss -tlnp | grep ':22'
app#  systemctl status ssh.service
```

Map of likely findings → fix:

- **mgmt ping fails too** → private network not attached, or routing not converged. Re-attach in Hetzner Console, reboot the box.
- **mgmt ping ✓, mgmt nc refused, app `ss` shows sshd + systemd as owners** → ssh.socket filter is rejecting. Apply Phase D.4 on the target box.
- **mgmt ping ✓, mgmt nc refused, app firewalls all empty, ss shows only sshd** → packet capture next: `tcpdump -i enp7s0 -n -c 6 port 22` on the target while running `nc -zv` on mgmt. If SYN arrives but no SYN-ACK leaves, sshd isn't accepting on the private interface — check `ListenAddress` lines in `/etc/ssh/sshd_config*`.
- **mgmt ping ✓, mgmt nc ✓, but `ssh app` still fails** → SSH-layer issue (host-key mismatch, key not in `authorized_keys` on app, AllowUsers misspelled). Run `ssh -vvv` from mgmt and read the failure point.

The most common failure on a fresh Hetzner Ubuntu 24.04 box is the ssh.socket one (D.4). It's the one that wasted the most hours during this project's bootstrap.

---

## Phase F — Storage Box + Object Storage

### F.1 Order Storage Box BX11

1. Hetzner Robot console (separate from Cloud!): `https://robot.hetzner.com` → **Storage Boxes → Order**.
2. **Type**: BX11 (1 TB, €3.95/mo).
3. **Location**: Falkenstein (FSN1).
4. **Order**.

Once provisioned (1–5 minutes), open it:

- Note the **hostname** (e.g. `u123456.your-storagebox.de`).
- Note the **username** (e.g. `u123456`).
- Set a **password** (Storage Box → Settings → Set/Change password). Save in the password manager.
- Enable **SSH access** in the same settings page.

### F.2 Create a dedicated SSH key for Storage Box uploads

Use a separate key from the admin key so a compromised app server can't trivially read backups offline.

```bash
local$ ssh-keygen -t ed25519 -C "infra-backups@<host>" -f ~/.ssh/infra_backup_ed25519 -N ""
```

```powershell
local-ps> ssh-keygen -t ed25519 -C "infra-backups@<host>" -f $HOME\.ssh\infra_backup_ed25519 -N '""'
```

(Empty passphrase: this key lives on `db-01` and runs unattended. The Storage Box itself enforces username scope.)

Add the public key in **Storage Box → SSH Keys → Add public key**.

### F.3 Object Storage bucket (for static assets, future user uploads)

1. Hetzner Cloud Console → **Object Storage → Create Project**.
2. **Name**: `prod-storage`.
3. **Location**: `Falkenstein` (FSN1).
4. Inside the project: **Create Bucket** named `public-assets`. Visibility: `Public`. (Private buckets used later for user uploads.)
5. **Generate S3 credentials** in the project view. Save the access key + secret in your password manager — note `S3_ENDPOINT` (e.g. `https://fsn1.your-objectstorage.com`).

Object Storage is pay-per-use; expect €1–2/mo for Foundation traffic.

---

## Phase G — Postgres 17 on `db-01`

We install Postgres directly on `db-01`. No Docker on this box — keeping the database close to the metal simplifies tuning, backups, and upgrades.

### G.1 Install Postgres 17 from the PGDG repo

```bash
local$ ssh db
db$  sudo install -d /usr/share/postgresql-common/pgdg
db$  sudo curl -fsSL -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc \
       https://www.postgresql.org/media/keys/ACCC4CF8.asc
db$  sudo sh -c 'echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
       https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
       > /etc/apt/sources.list.d/pgdg.list'
db$  sudo apt update
db$  sudo apt install -y postgresql-17 postgresql-contrib-17
```

### G.2 Bind Postgres to the private network only

Get `db-01`'s private IP (should be `10.0.1.3`):

```bash
db$  ip -4 addr show enp7s0
```

Edit `/etc/postgresql/17/main/postgresql.conf`:

```bash
db$  sudo vim /etc/postgresql/17/main/postgresql.conf
```

Change:

```conf
listen_addresses = '10.0.1.3'         # private IP of db-01 — never set to '*'
port = 5432
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'      # snakeoil first; replace in G.5
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'
```

The `edge-internal` firewall rules from Phase B already block public access to port 5432 (no public TCP rules at all); the `listen_addresses` setting is defence in depth.

### G.3 Restrict `pg_hba.conf` to the app server only

Edit `/etc/postgresql/17/main/pg_hba.conf` and **replace** the default `host all all all md5` line with:

```bash
db$  sudo vim /etc/postgresql/17/main/pg_hba.conf
```

```conf
# TYPE  DATABASE          USER              ADDRESS         METHOD
local   all               postgres                          peer
local   all               all                               peer
hostssl all               all               10.0.1.2/32    scram-sha-256
hostssl replication       all               10.0.1.2/32    scram-sha-256
# Reject any other host explicitly so a misconfigured listen_addresses can't leak.
host    all               all               0.0.0.0/0       reject
host    all               all               ::/0            reject
```

When `app-02` joins later, add `hostssl all all 10.0.1.5/32 scram-sha-256` (or the broader `10.0.1.0/24`). Keep the allowlist explicit per box rather than blanket-allowing the subnet — defence in depth.

Reload Postgres:

```bash
db$  sudo systemctl restart postgresql@17-main
db$  sudo -u postgres psql -c "SHOW listen_addresses;"
db$  sudo ss -tlnp | grep 5432       # confirm only 10.0.1.3:5432 is listening
```

### G.4 Create roles + database + extensions

Generate two strong random passwords now (in your password manager):

- `<APP_DB_PASSWORD>` — for `app_user` (used by the app at runtime)
- `<MIGRATE_DB_PASSWORD>` — for `migrate_user` (used only by `prisma migrate deploy`)

```bash
db$  sudo -u postgres psql <<EOF
CREATE ROLE app_user
  WITH LOGIN PASSWORD '<APP_DB_PASSWORD>' NOBYPASSRLS;

CREATE ROLE migrate_user
  WITH LOGIN PASSWORD '<MIGRATE_DB_PASSWORD>' BYPASSRLS;

-- Production migrate role does NOT need CREATEDB — we run `prisma migrate
-- deploy`, not `migrate dev` (which is the only command that uses a shadow DB).

CREATE DATABASE app_prod OWNER migrate_user;

GRANT CONNECT ON DATABASE app_prod TO app_user;
EOF

db$  sudo -u postgres psql -d app_prod <<'EOF'
GRANT USAGE ON SCHEMA public TO app_user, migrate_user;
GRANT CREATE ON SCHEMA public TO migrate_user;

ALTER DEFAULT PRIVILEGES FOR ROLE migrate_user IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES FOR ROLE migrate_user IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
EOF
```

### G.5 Replace the snakeoil TLS cert with a real one

For Foundation we use a self-signed cert; the cert chain is shared with `app-01` out of band. For a public-CA cert, follow the same steps but plug in `certbot certonly --standalone` on the box temporarily.

```bash
db$  sudo openssl req -new -x509 -days 825 -nodes \
        -out /etc/postgresql/17/main/server.crt \
        -keyout /etc/postgresql/17/main/server.key \
        -subj "/CN=db-01.internal"
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

Copy the cert to `app-01` so the Node `pg` driver trusts it. From your laptop:

```bash
local$ ssh db 'sudo cat /etc/postgresql/17/main/server.crt' > /tmp/db-ca.crt
local$ scp /tmp/db-ca.crt app:/tmp/
local$ ssh app
app$   sudo install -d /etc/app
app$   sudo install -m 644 /tmp/db-ca.crt /etc/app/db-ca.crt
```

The connection string used by the app will set `?sslmode=verify-full&sslrootcert=/etc/app/db-ca.crt`.

### G.6 Smoke-test the connection from `app-01`

```bash
local$ ssh app
app$  sudo apt install -y postgresql-client-17
app$  PGPASSWORD='<APP_DB_PASSWORD>' psql \
        "host=10.0.1.3 dbname=app_prod user=app_user sslmode=require" \
        -c "SELECT current_user, current_database();"
# expected output:
#  current_user   | current_database
# ----------------+------------------
#  app_user   | app_prod
```

If this fails: check `pg_hba.conf` (G.3), check the firewall (`sudo ufw status` on db-01), check `listen_addresses`. Walk back the chain.

### G.7 Apply Prisma migrations against prod

`db-01` is **not** publicly reachable on 5432 — that's the point. Two ways to run migrations, in order of preference:

1. **SSH-tunnel from your laptop via `mgmt-01`** (recommended for the first deploy and ongoing routine migrations). The `mgmt` alias from E.1 makes this a one-liner:

   ```bash
   local$ ssh -L 5432:10.0.1.3:5432 -N mgmt &
   local$ MIGRATE_DATABASE_URL='postgresql://migrate_user:<MIGRATE_DB_PASSWORD>@localhost:5432/app_prod?sslmode=require' \
            pnpm --filter @dutyhive/db exec prisma migrate deploy
   local$ kill %1   # close the tunnel
   ```

   On Windows / PowerShell, run the tunnel in a second window instead of backgrounding it (PowerShell's `&` is the call operator, not "background"):

   ```powershell
   # Window 1 — leave this running:
   local-ps> ssh -L 5432:10.0.1.3:5432 -N mgmt

   # Window 2:
   local-ps> $env:MIGRATE_DATABASE_URL = 'postgresql://migrate_user:<PW>@localhost:5432/app_prod?sslmode=require'
   local-ps> pnpm --filter @dutyhive/db exec prisma migrate deploy
   ```

2. **Run from `app-01`**: clone the repo there once and use it as the migration runner. Coolify can invoke this on each deploy as a pre-start hook once the build matrix grows; for Foundation, option 1 is simpler.

After every migration run, re-check the RLS coverage gate against prod via the same tunnel:

```bash
local$ ssh -L 5432:10.0.1.3:5432 -N mgmt &
local$ MIGRATE_DATABASE_URL='postgresql://migrate_user:<MIGRATE_DB_PASSWORD>@localhost:5432/app_prod?sslmode=require' \
         pnpm check:rls
local$ kill %1
```

---

## Phase H — Coolify on `mgmt-01`

Coolify is the deploy control plane. It runs Docker, pulls the repo on `git push`, builds the Next.js standalone image, and ships it to `app-01`.

### How Coolify reaches the other boxes

Coolify on `mgmt-01` talks to the rest of the infrastructure over the **Hetzner Private Network** (the `internal` 10.0.1.0/24 subnet from B.2). Two flows matter:

- **Coolify → `app-01`** for deploys: SSH from `mgmt-01` (`10.0.1.1`) to `deploy@10.0.1.2` using the dedicated key generated in H.4. UFW on `app-01` already allows `from 10.0.0.0/16` (D.5), and `edge-app` permits `10.0.0.0/16` on all TCP ports — so this works without any public SSH path.
- **App on `app-01` → `db-01`** at runtime: TCP from `10.0.1.2` to `10.0.1.3:5432` over the private network, authenticated as `app_user` with TLS verification against the cert from G.5. `pg_hba.conf` on db-01 allows `hostssl all all 10.0.1.2/32 scram-sha-256` (G.3) and rejects everything else.

Coolify itself never touches db-01. The migration tunnel from G.7 is what bridges your laptop to db-01 _via_ mgmt-01 — same physical path Coolify uses, but for one-off Prisma runs instead of the long-lived runtime connection.

The only externally reachable SSH port in the whole stack is `mgmt-01:22`, restricted to your home IP via `edge-mgmt`. Everything else flows over the private network.

### Did you use the Coolify App image at C.1?

If you picked **Apps → Coolify** as the image when ordering `mgmt-01` (recommended in C.1), Hetzner has already done H.1 (Docker) and H.2 (Coolify install) for you. **Skip directly to H.3** — the Coolify UI is already serving on `http://<MGMT_PUBLIC_IP>:8000`.

> **First-access timing matters.** Coolify's first-run flow has no auth gate — whoever opens `<MGMT_PUBLIC_IP>:8000` first claims the admin account. With the Hetzner App image, Coolify is up the moment the box finishes booting (a few minutes after `Create & Buy`). Open the UI **before** you start Phase D.5 (UFW), or punch a temporary `allow 8000/tcp from <YOUR_IP>/32` rule in UFW so the UI stays reachable while you finish hardening. Once Phase I.5 issues TLS for `coolify.dutyhive.com`, Coolify routes itself through Caddy on `:443` and you can drop the port-8000 rule entirely.

If you used the standard `Ubuntu 24.04` image instead, run H.1 and H.2 below to install Docker and Coolify yourself.

### H.1 Install Docker (Coolify's prereq) — **skip if Coolify App image was selected**

```bash
local$ ssh mgmt
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
local$ ssh mgmt                        # re-login so the docker group takes effect
mgmt$  docker version                  # should print client + server versions
```

### H.2 Install Coolify — **skip if Coolify App image was selected**

```bash
mgmt$  sudo curl -fsSL https://cdn.coollabs.io/coolify/install.sh -o /tmp/coolify-install.sh
mgmt$  less /tmp/coolify-install.sh    # read before piping to bash
mgmt$  sudo bash /tmp/coolify-install.sh
```

Wait ~3 minutes. The script provisions ~10 containers (Postgres, Redis, the Coolify UI, …).

When done it prints the URL — by default `http://<MGMT_PUBLIC_IP>:8000`. Open it in a browser.

> **Watch out:** Coolify exposes its UI on port 8000 by default with no auth gate before you create the first admin. Anyone hitting `<MGMT_PUBLIC_IP>:8000` in the few minutes before you finish H.3 can claim the admin account. Either do H.3 immediately, or temporarily restrict port 8000 in `edge-mgmt` to `<YOUR_IP>/32` before running H.2.

### H.3 First-run Coolify setup

1. Create the **root admin** account (email + strong password — save in the password manager).
2. **Server** → click on the auto-detected `localhost` (this is `mgmt-01`).
3. **Settings → General**:
   - **Server name**: `mgmt-01`.
   - **Hostname**: `coolify.dutyhive.com` (we'll wire DNS in Phase I).
4. Save.

### H.4 Add `app-01` as a deploy target

Coolify deploys to remote servers via SSH. We add `app-01` as a "Server" in Coolify so it can ship containers there.

On `mgmt-01`, generate an SSH keypair Coolify will use to reach `app-01`:

```bash
mgmt$  sudo -u coolify ssh-keygen -t ed25519 -f /data/coolify/ssh/keys/app-01-key -N "" -C "coolify-deploy@mgmt-01"
mgmt$  sudo cat /data/coolify/ssh/keys/app-01-key.pub
```

Add the public key to `app-01`'s `deploy` user:

```bash
local$ ssh app
app$  echo '<paste-the-pubkey>' | sudo tee -a /home/deploy/.ssh/authorized_keys
```

In Coolify UI:

1. **Servers → Add Server**.
2. **Name**: `app-01`.
3. **IP**: `10.0.1.2` (private — Coolify connects over the internal network).
4. **User**: `deploy`.
5. **Port**: `22`.
6. **SSH key**: select the `app-01-key` Coolify just generated.
7. **Validate**. Coolify SSHes to `app-01` and confirms Docker is reachable.
8. Save.

### H.5 Connect the GitHub repo

1. Coolify UI → **Sources → GitHub Apps → Add**.
2. Follow the OAuth flow. Grant access to `lukasfend/DutyHive`.
3. Once connected, Coolify can pull commits and build them.

### H.6 Create the application

1. Coolify UI → **Projects → New Project** → name `production`.
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
8. **Environment variables** — paste the production env (Phase H.7 below).
9. **Domains**: `dutyhive.com,app.dutyhive.com,planner.dutyhive.com,business.dutyhive.com,checklist.dutyhive.com`.
   Coolify will provision Caddy reverse-proxy entries for each. TLS comes from Let's Encrypt automatically once DNS resolves to `app-01` (Phase I).
10. **Healthcheck path**: `/api/health`.
11. **Save**. Don't deploy yet — DNS isn't ready.

### H.7 Production environment variables (in Coolify's secrets store)

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
DATABASE_URL=postgresql://app_user:<APP_DB_PASSWORD>@10.0.1.3:5432/app_prod?sslmode=verify-full&sslrootcert=/etc/app/db-ca.crt
MIGRATE_DATABASE_URL=postgresql://migrate_user:<MIGRATE_DB_PASSWORD>@10.0.1.3:5432/app_prod?sslmode=verify-full&sslrootcert=/etc/app/db-ca.crt
BETTER_AUTH_SECRET=<paste-from-openssl-rand>
BETTER_AUTH_URL=https://app.dutyhive.com
NEXT_PUBLIC_ROOT_DOMAIN=dutyhive.com
NEXT_PUBLIC_SITE_URL=https://dutyhive.com
RESEND_API_KEY=<paste-after-Phase-J>
RESEND_FROM=noreply@dutyhive.com
AUDIT_HASH_SALT=<openssl rand -base64 32>
LOG_LEVEL=info

# Sentry / Trigger.dev keys — fill once Phase 5/6 wires them.
# SENTRY_DSN=
# NEXT_PUBLIC_SENTRY_DSN=
# TRIGGER_SECRET_KEY=

# S3 / Hetzner Object Storage (from Phase F.3)
S3_ENDPOINT=<from Hetzner Object Storage>
S3_BUCKET=public-assets
S3_ACCESS_KEY=<from Hetzner Object Storage>
S3_SECRET_KEY=<from Hetzner Object Storage>
```

Mark `*_SECRET`, `*_KEY`, `DATABASE_URL`, and `MIGRATE_DATABASE_URL` as **secret** in Coolify so they don't show in logs.

### H.8 Mount `/etc/app/db-ca.crt` into the container

Coolify → application → **Storages → New Storage** → bind-mount type:

- **Source**: `/etc/app/db-ca.crt` (on `app-01`)
- **Target**: `/etc/app/db-ca.crt` (in the container)
- **Read-only**: yes

Save.

---

## Phase I — Cloudflare DNS migration

The Vercel registrar holds the domain; we move only the **nameservers** to Cloudflare so DNS, WAF, and Email Routing are managed there. Vercel keeps doing the boring registry job.

### I.1 Add the domain to Cloudflare

1. Cloudflare Dashboard → **Add a Site → Free plan** → enter `dutyhive.com`.
2. Cloudflare scans existing DNS records (very few from Vercel; we'll replace them).
3. Cloudflare assigns two nameservers, e.g. `tasha.ns.cloudflare.com` and `ben.ns.cloudflare.com`. **Note both**.

### I.2 Switch nameservers at Vercel

1. Vercel Dashboard → **Domains → dutyhive.com → Nameservers**.
2. **Use Custom Nameservers** → paste the two from Cloudflare.
3. Save.
4. DNS propagation can take 1–24 hours. While we wait, configure records.

### I.3 Add DNS records in Cloudflare

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

### I.4 Verify DNS resolution

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

### I.5 Trigger TLS issuance

In Coolify → application → **Deploy**. Once the build finishes and Coolify's Caddy starts, it'll auto-request Let's Encrypt certs for every domain mapped in H.6. Watch the deploy log:

```
✔ Issued certificate for dutyhive.com
✔ Issued certificate for app.dutyhive.com
...
```

If issuance fails for one domain, that subdomain's DNS isn't pointing where Coolify thinks it is — re-check I.3.

Visit `https://dutyhive.com` — the marketing page should render with a green padlock.

---

## Phase J — Resend (transactional + newsletter mail)

Better Auth sends verification emails via SMTP in dev (Mailpit). Production switches to Resend's HTTP API via the Resend API key.

### J.1 Add the domain in Resend

1. Resend Dashboard → **Domains → Add Domain** → `dutyhive.com`.
2. Resend shows three DNS records to add: SPF (TXT), DKIM (TXT × 2), DMARC (TXT).

### J.2 Add the records in Cloudflare

| Type  | Name                | Content                                                      | Notes                             |
| ----- | ------------------- | ------------------------------------------------------------ | --------------------------------- |
| `TXT` | `@`                 | `v=spf1 include:amazonses.com -all`                          | Resend uses Amazon SES on backend |
| `TXT` | `resend._domainkey` | `<long DKIM value from Resend dashboard>`                    | DKIM signing                      |
| `TXT` | `_dmarc`            | `v=DMARC1; p=quarantine; rua=mailto:postmaster@dutyhive.com` | DMARC reporting                   |
| `MX`  | `send`              | `feedback-smtp.eu-west-1.amazonses.com` (priority 10)        | Resend bounce/complaint relay     |

Cloudflare → DNS → add each one. Save. Resend's verification picks up the records within a few minutes.

### J.3 Verify in Resend

Wait until each record turns green ✔ in the Resend dashboard.

### J.4 Generate the Resend API key

1. Resend → **API Keys → Create API Key**.
2. **Permission**: full sending.
3. **Domain**: `dutyhive.com`.
4. Copy the key (starts with `re_`). **Paste into Coolify's `RESEND_API_KEY` env var** (H.7).

### J.5 Validate deliverability

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

## Phase K — Cloudflare Email Routing for `support@dutyhive.com`

Resend sends; Cloudflare routes incoming mail to your personal inbox without us standing up an MX server.

1. Cloudflare → `dutyhive.com` → **Email → Email Routing → Get started**.
2. Cloudflare shows the MX + TXT records to add. The Resend `MX send` from J.2 and Cloudflare's apex MX coexist (different subdomains).

   Actual records:

   | Type  | Name | Content                                                            | Priority |
   | ----- | ---- | ------------------------------------------------------------------ | -------- |
   | `MX`  | `@`  | `route1.mx.cloudflare.net`                                         | 13       |
   | `MX`  | `@`  | `route2.mx.cloudflare.net`                                         | 38       |
   | `MX`  | `@`  | `route3.mx.cloudflare.net`                                         | 90       |
   | `TXT` | `@`  | `v=spf1 include:_spf.mx.cloudflare.net include:amazonses.com -all` | —        |

   Note we **merge** the SPF record (Cloudflare + Amazon SES). Replace the J.2 SPF with this combined version.

3. Add the records, save. Cloudflare verifies.
4. **Routing rules → Add rule**:
   - **Custom address**: `support@dutyhive.com` → forward to `<your-personal-email>`.
   - **Catch-all**: → forward to `<your-personal-email>` (gets all unrouted addresses while we add specific rules).
5. Cloudflare sends a verification email to your personal address — click the link.
6. Test by emailing `support@dutyhive.com` from another account — should land in your personal inbox within a minute.

Add additional addresses for `legal@`, `privacy@`, `press@`, `news@` mirroring the entries in `packages/config/src/brand.ts`.

---

## Phase L — Beszel monitoring (Phase 7)

Beszel is a self-hosted lightweight metrics dashboard. The Hub runs on `mgmt-01`; Agents run on `app-01` and `db-01` and push metrics over the private network.

### L.1 Install Beszel Hub on `mgmt-01`

```bash
local$ ssh mgmt
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

Open `http://<MGMT_PUBLIC_IP>:8090` (use the SSH tunnel: `ssh -L 8090:localhost:8090 mgmt`) and create the admin account.

### L.2 Install agents on `app-01` and `db-01`

In the Beszel UI: **Add System → System → copy the install command shown**, e.g.:

```bash
local$ ssh app
app$  curl -L https://github.com/henrygd/beszel/releases/latest/download/beszel-agent_linux_amd64.tar.gz | tar xz beszel-agent
app$  sudo install -o root -g root beszel-agent /usr/local/bin/
app$  sudo tee /etc/systemd/system/beszel-agent.service > /dev/null <<EOF
[Unit]
Description=Beszel agent
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/beszel-agent --hub-url http://10.0.1.1:8090 --token <TOKEN_FROM_HUB>
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOF
app$  sudo systemctl daemon-reload
app$  sudo systemctl enable --now beszel-agent
```

Repeat on `db-01`. Both should appear in the Hub UI within ~30 seconds with metrics streaming.

### L.3 Map Beszel to a public domain (optional)

Add `beszel.dutyhive.com` → `<MGMT_PUBLIC_IP>` in Cloudflare DNS. In Cloudflare WAF, lock it down to your home IP (or use Cloudflare Access for SSO). Coolify can serve as the reverse proxy by adding a service entry for the Beszel port.

---

## Phase M — Backups (Phase 7)

Nightly `pg_dump` of the production database, GPG-encrypted, shipped to the Storage Box.

### M.1 Generate the backup encryption key

On a **separate offline laptop or air-gapped USB** — _not_ on `db-01`:

```bash
offline$ gpg --quick-gen-key 'infra-backups@dutyhive.com' rsa4096 sign,encrypt 0
offline$ gpg --armor --export 'infra-backups@dutyhive.com' > infra-backups-public.asc
```

Save the **secret key** in your password manager (export with `gpg --armor --export-secret-keys` and treat it like the most valuable secret you have — losing it means losing all backups).

Copy the **public key only** to `db-01`:

```bash
local$ scp infra-backups-public.asc db:/tmp/
local$ ssh db
db$    gpg --import /tmp/infra-backups-public.asc
db$    gpg --list-keys
```

### M.2 Configure SSH to the Storage Box from `db-01`

Copy the backup key from F.2 to `db-01`:

```bash
local$ scp ~/.ssh/infra_backup_ed25519 db:/home/deploy/.ssh/
local$ ssh db
db$    chmod 600 /home/deploy/.ssh/infra_backup_ed25519
```

```powershell
local-ps> scp $HOME\.ssh\infra_backup_ed25519 db:/home/deploy/.ssh/
```

Append a host alias to `~/.ssh/config` on db-01:

```bash
db$  cat >> /home/deploy/.ssh/config <<'EOF'
Host storagebox
  HostName u123456.your-storagebox.de
  User u123456
  IdentityFile ~/.ssh/infra_backup_ed25519
  Port 23
EOF
db$  chmod 600 /home/deploy/.ssh/config
db$  ssh storagebox 'echo OK'      # accept the host key on first connect
```

### M.3 Backup script

```bash
db$  sudo tee /usr/local/bin/pg-backup.sh > /dev/null <<'EOF'
#!/bin/bash
set -euo pipefail

DB_NAME="app_prod"
TIMESTAMP="$(date -u +%Y-%m-%dT%H-%M-%SZ)"
DUMP_FILE="/tmp/${DB_NAME}-${TIMESTAMP}.sql.gz.gpg"

# 1. Dump + gzip + GPG-encrypt — the dump never lands on disk in plaintext.
sudo -u postgres pg_dump --no-owner --no-acl "$DB_NAME" \
  | gzip --best \
  | gpg --batch --yes --trust-model always \
        --recipient 'infra-backups@dutyhive.com' \
        --encrypt --output "$DUMP_FILE"

# 2. Upload to the Storage Box via SFTP.
sudo -u deploy ssh storagebox "mkdir -p backups/postgres" || true
sudo -u deploy scp "$DUMP_FILE" "storagebox:backups/postgres/"

# 3. Local cleanup.
shred -u "$DUMP_FILE"

# 4. Retention: keep the last 30 daily on the Storage Box.
sudo -u deploy ssh storagebox bash <<'REMOTE'
cd backups/postgres
ls -1 | sort | head -n -30 | grep -E '\.sql\.gz\.gpg$' | xargs -r rm --
REMOTE

echo "Backup OK: $DUMP_FILE -> storagebox:backups/postgres/"
EOF
db$  sudo chmod 750 /usr/local/bin/pg-backup.sh
db$  sudo chown root:root /usr/local/bin/pg-backup.sh
```

### M.4 Schedule via systemd timer

```bash
db$  sudo tee /etc/systemd/system/pg-backup.service > /dev/null <<'EOF'
[Unit]
Description=DutyHive nightly Postgres backup
After=postgresql.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/pg-backup.sh
EOF

db$  sudo tee /etc/systemd/system/pg-backup.timer > /dev/null <<'EOF'
[Unit]
Description=Run pg-backup nightly at 03:00 UTC

[Timer]
OnCalendar=*-*-* 03:00:00 UTC
Persistent=true

[Install]
WantedBy=timers.target
EOF

db$  sudo systemctl daemon-reload
db$  sudo systemctl enable --now pg-backup.timer
db$  sudo systemctl list-timers | grep pg-backup
```

### M.5 Manual smoke + restore drill (DO THIS BEFORE GOING LIVE)

```bash
db$  sudo systemctl start pg-backup.service     # run once now
db$  sudo journalctl -u pg-backup -n 50               # confirm "Backup OK"
db$  ssh storagebox 'ls -l backups/postgres/'         # confirm file lands
```

Restore drill — on a **scratch** box (or a temporary local Docker Postgres):

```bash
local$ scp db:/tmp/<latest>.sql.gz.gpg ./
local$ gpg --decrypt <latest>.sql.gz.gpg | gunzip | psql -h localhost -U postgres restore_test
local$ psql -h localhost -U postgres restore_test -c "SELECT count(*) FROM \"user\";"
```

```powershell
# PowerShell can't pipe binary streams cleanly between gpg and psql. Decrypt
# to a file first, then feed it into psql.
local-ps> scp db:/tmp/<latest>.sql.gz.gpg .
local-ps> gpg --decrypt --output dump.sql.gz <latest>.sql.gz.gpg
local-ps> & 'C:\Program Files\Git\usr\bin\gzip.exe' -d dump.sql.gz   # or use 7z
local-ps> psql -h localhost -U postgres restore_test -f dump.sql
local-ps> psql -h localhost -U postgres restore_test -c 'SELECT count(*) FROM "user";'
```

If row counts match production: backups are real. Document the drill date in `docs/guides/release-checklist.md`.

### M.6 Coolify config backup (weekly)

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

Schedule a weekly timer analogous to M.4 (`OnCalendar=Sun *-*-* 04:00:00 UTC`).

---

## Phase N — Final verification checklist

Mark these in `docs/guides/release-checklist.md` once each is green.

### Networking & TLS

- [ ] `dig dutyhive.com NS` returns Cloudflare nameservers.
- [ ] `https://dutyhive.com` loads the marketing page with a valid TLS cert.
- [ ] `https://app.dutyhive.com`, `planner.`, `business.`, `checklist.` each load with valid TLS.
- [ ] HTTP→HTTPS redirect is in place (`curl -I http://dutyhive.com` returns 301 to https).

### SSH topology

- [ ] `ssh mgmt 'echo OK'` succeeds.
- [ ] `ssh app 'echo OK'` succeeds (via mgmt jump).
- [ ] `ssh db 'echo OK'` succeeds (via mgmt jump).
- [ ] `ssh -o ConnectTimeout=5 deploy@<APP_PUBLIC_IP>` times out / refused.
- [ ] `ssh -o ConnectTimeout=5 deploy@<DB_PUBLIC_IP>` times out / refused.

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
- [ ] `ssh.socket` is masked on all three VPS; `ssh.service` is enabled and running.
- [ ] `fail2ban` jail `sshd` is active on all three VPS.
- [ ] UFW is enabled on all three VPS with the rules from D.5.
- [ ] Postgres `listen_addresses` is the private IP only (not `*`).
- [ ] `pg_hba.conf` allows only `10.0.1.2/32` (app-01) — no `0.0.0.0/0`.
- [ ] Hetzner Cloud Firewall split is in place (`edge-mgmt`, `edge-app`, `edge-internal` each attached to the right boxes).
- [ ] Local `~/.ssh/config` has `mgmt`, `app`, `db` aliases (E.1).

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
local$ ssh -L 5432:10.0.1.3:5432 -N mgmt &
local$ MIGRATE_DATABASE_URL='postgresql://migrate_user:<PW>@localhost:5432/app_prod?sslmode=require' \
         pnpm --filter @dutyhive/db exec prisma migrate deploy
local$ MIGRATE_DATABASE_URL='postgresql://migrate_user:<PW>@localhost:5432/app_prod?sslmode=require' \
         pnpm check:rls
local$ kill %1
```

(Windows / PowerShell: run the `ssh -L` line in its own window and close the window when done — see G.7 for the two-window pattern.)

### Incident: SSH locked out (your IP changed)

`edge-mgmt` is the only firewall with an `<YOUR_IP>/32` SSH rule. Hetzner Console → **Firewalls → edge-mgmt → Edit**, widen the SSH rule from your **new** home IP, fix, narrow again. `app-01` and `db-01` already refuse public SSH — they're unaffected.

### Incident: db-01 unreachable

```bash
local$ ssh mgmt
mgmt$  ping -c 2 10.0.1.3                 # private network up?
local$ ssh db                             # SSH via mgmt jump
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

### Routine: add a new server to the fleet

The roadmap table in the Overview reserves IPs and firewall assignments for `jobs-01`, `app-02+`, `lb-01`. To add one:

1. Provision the VPS in Hetzner Console with the matching firewall (`edge-app` for app-02, `edge-internal` for jobs-01).
2. Confirm its private IP matches the reserved slot in the roadmap (or update the roadmap if Hetzner gave a different one).
3. Run Phase D (D.1–D.8) on the new box via Hetzner web console.
4. Add an entry to your local `~/.ssh/config` matching the alias pattern in E.1.
5. If it needs to talk to db-01, add a `hostssl all all <NEW_BOX_PRIVATE_IP>/32 scram-sha-256` line to `pg_hba.conf` (G.3) and reload Postgres.
6. If Coolify deploys to it, add it as a Server in Coolify (H.4 pattern).

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
