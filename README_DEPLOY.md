# 🚀 Deploy Innonet to Alibaba Cloud

## Quick Start (3 Steps)

### Step 1: Create Alibaba Cloud Server

1. Go to: https://ecs.console.aliyun.com/
2. Click "Create Instance"
3. Select:
   - **Region:** Closest to you
   - **Instance:** 2 vCPU, 4GB RAM (ecs.t6-c1m2.large)
   - **Image:** Ubuntu 22.04
   - **Network:** Assign Public IP ✅
   - **Security Group:** Allow ports 22, 80, 443
   - **Login:** Set root password (remember it!)
4. Click "Create"
5. **Copy the Public IP** (Example: 47.89.123.45)

**Cost:** ~¥70-100/month (~$10-15 USD)

---

### Step 2: Test Connection

```bash
# Replace with your actual IP
ssh root@YOUR_SERVER_IP
```

- Type your password when prompted
- If it works, type `exit` to disconnect

---

### Step 3: Deploy!

```bash
cd ~/Desktop/Innonet\ Prototype

# Deploy (replace with your IP)
./deploy-alibaba.sh YOUR_SERVER_IP
```

**Example:**
```bash
./deploy-alibaba.sh 47.89.123.45
```

**Wait 10 minutes** - the script will:
- ✅ Upload your code
- ✅ Install Docker automatically
- ✅ Deploy all services
- ✅ Start your application

---

## ✅ Done!

Your website is live at: **http://YOUR_SERVER_IP**

---

## 📖 Need More Details?

Read the full guide: **[ALIBABA_CLOUD_DEPLOY.md](ALIBABA_CLOUD_DEPLOY.md)**

Includes:
- Detailed Alibaba Cloud setup
- Security group configuration
- Domain name setup
- SSL certificate (HTTPS)
- Troubleshooting guide

---

## 🔧 Common Issues

### "Connection refused" when running deploy script

**Fix:** Check Security Group in Alibaba Cloud
1. Go to ECS Console
2. Click your instance → Security Groups
3. Make sure port 22 is allowed

### "Permission denied" when connecting

**Fix:** Reset your root password
1. Go to ECS Console
2. Click your instance
3. Click "Reset Password"
4. Try connecting again

### Website not loading after deployment

**Fix:** Wait a few more minutes, then check:
```bash
ssh root@YOUR_SERVER_IP
cd /root/innonet
docker-compose -f docker-compose.prod.yml ps
```

All services should show "Up (healthy)"

---

## 📞 Get Help

If something doesn't work:

1. **Check the full guide:** ALIBABA_CLOUD_DEPLOY.md
2. **Share your error message** and I'll help!

---

## 🎉 Success?

After deployment:
- Visit: `http://YOUR_SERVER_IP`
- Create an account
- Explore your live platform!

Want to add a custom domain? Check the full guide for DNS and SSL setup.
