# Deploy Innonet to Alibaba Cloud (阿里云)

Complete guide to deploy your full-stack application to Alibaba Cloud ECS.

---

## 📋 What You Need

- Alibaba Cloud account (aliyun.com)
- Credit card or Alipay for payment
- 10-15 minutes

---

## 💰 Cost Estimate

**Recommended Setup:**
- ECS Instance: ¥70-100/month (~$10-15 USD)
- Or Pay-As-You-Go: ~¥0.10/hour (~$0.015/hour)

---

## 🚀 Step 1: Create Alibaba Cloud Account

1. Go to: https://www.alibabacloud.com/
2. Click "Free Account" (top right)
3. Complete registration with email/phone
4. Add payment method

---

## 🖥️ Step 2: Create ECS Instance

### 2.1 Go to ECS Console
- Visit: https://ecs.console.aliyun.com/
- Click "Create Instance"

### 2.2 Select Region
- Choose closest to your users:
  - **China Mainland:** Beijing, Shanghai, Hangzhou
  - **International:** Hong Kong, Singapore, Tokyo, US West

### 2.3 Instance Configuration

**Billing Method:**
- ✅ **Subscription** (monthly) - cheaper
- ❌ Pay-As-You-Go - more expensive but flexible

**Instance Type:**
- **Family:** General Purpose (ecs.t6)
- **Size:** 2 vCPU, 4GB RAM
- **Example:** ecs.t6-c1m2.large
- **Cost:** ~¥70-100/month

**Image:**
- **OS:** Ubuntu 22.04 64-bit
- **Version:** Latest available

**Storage:**
- **System Disk:** 40GB SSD
- **Data Disk:** Not needed for now

### 2.4 Network & Security

**Network:**
- VPC: Select default or create new
- Assign Public IP: ✅ **YES** (important!)
- Bandwidth: 5 Mbps minimum (10 Mbps recommended)

**Security Group:**
- Create new: "innonet-sg"
- **Add these rules:**

| Rule | Protocol | Port | Source | Action |
|------|----------|------|--------|--------|
| Allow SSH | TCP | 22 | 0.0.0.0/0 | Allow |
| Allow HTTP | TCP | 80 | 0.0.0.0/0 | Allow |
| Allow HTTPS | TCP | 443 | 0.0.0.0/0 | Allow |

### 2.5 System Credentials

**Login Method - Choose ONE:**

**Option A: Password (Easier)**
- Set root password: Choose a strong password
- Remember this password!

**Option B: SSH Key Pair**
- Create new key pair: "innonet-key"
- Download the .pem file
- Keep it safe!

### 2.6 Instance Name
- Name: `innonet-production`
- Click "Create Instance"

### 2.7 Wait for Creation
- Takes 2-3 minutes
- Status will change to "Running" (green)

---

## 📝 Step 3: Note Your Server Details

Once created, note these details:

```
Public IP: _____._____._____._____ (Example: 47.89.123.45)
Username: root
Password/Key: [what you set]
Region: [what you chose]
```

---

## 🔧 Step 4: Connect to Your Server

### If you used PASSWORD:

```bash
# Replace with your actual IP
ssh root@YOUR_SERVER_IP
```

When prompted, enter your password.

### If you used SSH KEY:

```bash
# First, set correct permissions on downloaded key
chmod 400 ~/Downloads/innonet-key.pem

# Then connect
ssh -i ~/Downloads/innonet-key.pem root@YOUR_SERVER_IP
```

**First time connecting:**
- You'll see: "Are you sure you want to continue connecting?"
- Type: `yes` and press Enter

---

## 🚢 Step 5: Deploy Your Application

### 5.1 Install Docker on Server

Once connected to your server, run these commands:

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 5.2 Upload Your Application

**On your local Mac, run:**

```bash
cd ~/Desktop/Innonet\ Prototype

# Upload to server (replace IP)
rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'backend/__pycache__' --exclude 'backend/venv' ./ root@YOUR_SERVER_IP:/root/innonet/
```

### 5.3 Deploy on Server

**Back in your SSH session on the server:**

```bash
cd /root/innonet

# Start application
docker-compose -f docker-compose.prod.yml up -d --build
```

**This will take 5-10 minutes on first run.**

### 5.4 Check Status

```bash
# View running containers
docker-compose -f docker-compose.prod.yml ps

# All should show "Up" and "healthy"
```

---

## ✅ Step 6: Access Your Website

Your application is now live!

**Visit:** `http://YOUR_SERVER_IP`

Example: http://47.89.123.45

---

## 🔐 Step 7: Add Domain Name (Optional)

### 7.1 Get a Domain
- Buy from Alibaba Cloud Domains or Namecheap

### 7.2 Configure DNS
1. Go to your domain registrar
2. Add an A record:
   - **Type:** A
   - **Name:** @ (or subdomain)
   - **Value:** YOUR_SERVER_IP
   - **TTL:** 600

### 7.3 Wait for DNS Propagation
- Takes 5-30 minutes
- Test: `ping yourdomain.com`

### 7.4 Add SSL Certificate (HTTPS)

**On your server:**

```bash
# Install Certbot
apt install -y certbot

# Stop nginx temporarily
cd /root/innonet
docker-compose -f docker-compose.prod.yml stop nginx

# Get SSL certificate
certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Restart nginx
docker-compose -f docker-compose.prod.yml start nginx
```

Now visit: `https://yourdomain.com`

---

## 📊 Useful Commands

### View Logs
```bash
cd /root/innonet

# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Restart Services
```bash
cd /root/innonet
docker-compose -f docker-compose.prod.yml restart
```

### Stop Everything
```bash
cd /root/innonet
docker-compose -f docker-compose.prod.yml down
```

### Update Application
```bash
# On your Mac, upload new code
cd ~/Desktop/Innonet\ Prototype
rsync -avz --exclude 'node_modules' --exclude '.git' ./ root@YOUR_SERVER_IP:/root/innonet/

# On server, rebuild and restart
cd /root/innonet
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 🛠️ Troubleshooting

### Can't Connect via SSH

**Check Security Group:**
1. Go to ECS Console
2. Click your instance
3. Click "Security Groups" tab
4. Verify port 22 is open

### Website Not Loading

**Check if containers are running:**
```bash
docker-compose -f docker-compose.prod.yml ps
```

**Check nginx logs:**
```bash
docker-compose -f docker-compose.prod.yml logs nginx
```

### Database Connection Errors

**Restart all services:**
```bash
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

---

## 💡 Tips for China Users

### If deploying in China mainland:

**1. Use China-based regions:**
- Beijing (cn-beijing)
- Shanghai (cn-shanghai)
- Hangzhou (cn-hangzhou)

**2. Docker images may be slow:**
```bash
# Use Alibaba Cloud mirror
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<EOF
{
  "registry-mirrors": ["https://registry.cn-hangzhou.aliyuncs.com"]
}
EOF
systemctl restart docker
```

**3. ICP Filing:**
- Required for domain names in China
- Can take 20-30 days
- Not required for IP-only access

---

## 📞 Need Help?

### Alibaba Cloud Support:
- International: https://www.alibabacloud.com/help
- China: https://help.aliyun.com/

### Check Server Status:
```bash
# CPU and memory usage
htop

# Disk space
df -h

# Running processes
docker ps
```

---

## 🎉 You're Done!

Your Innonet platform is now:
- ✅ Running on Alibaba Cloud
- ✅ Accessible worldwide
- ✅ Using professional infrastructure
- ✅ Scalable as you grow

**Access your site:** `http://YOUR_SERVER_IP`

---

## 📈 Next Steps

1. **Monitor your application:**
   - Set up alerts in Alibaba Cloud
   - Check logs regularly

2. **Backup your data:**
   - Create ECS snapshots weekly
   - Export database regularly

3. **Optimize costs:**
   - Use reserved instances for discounts
   - Monitor bandwidth usage

4. **Scale up:**
   - Upgrade instance size as needed
   - Add load balancer for multiple servers

---

**Questions or issues?** Share your error messages and I'll help troubleshoot!
