# Create AWS Access Keys - Step-by-Step Guide

## Prerequisites
- You need an AWS account (sign up at https://aws.amazon.com if you don't have one)

---

## Step 1: Log into AWS Console

1. Go to: **https://console.aws.amazon.com/**
2. Sign in with your AWS account email and password
3. Make sure you're in the **Singapore region** (top-right corner should show "Singapore ap-southeast-1")

---

## Step 2: Navigate to IAM (Identity and Access Management)

### Option A: Direct Link
- Click this link: https://console.aws.amazon.com/iam/

### Option B: Search
1. Click the search bar at the top of the AWS Console
2. Type "IAM"
3. Click "IAM" from the results

---

## Step 3: Create a New IAM User

1. In the left sidebar, click **"Users"**
2. Click the orange **"Create user"** button (top-right)

### User Details:
- **User name:** `innonet-deployer`
- ✅ **Check:** "Provide user access to the AWS Management Console" (optional, but helpful)
- Click **"Next"**

---

## Step 4: Set Permissions

1. Select: **"Attach policies directly"**
2. In the search box, type: `AdministratorAccess`
3. ✅ **Check the box** next to "AdministratorAccess"
   - (For production, you'd use more specific policies, but this is easiest for setup)
4. Click **"Next"**
5. Review and click **"Create user"**

---

## Step 5: Create Access Keys

1. Click on the username you just created (`innonet-deployer`)
2. Click the **"Security credentials"** tab
3. Scroll down to **"Access keys"** section
4. Click **"Create access key"** button

### Choose Use Case:
1. Select: **"Command Line Interface (CLI)"**
2. ✅ Check the box: "I understand the above recommendation..."
3. Click **"Next"**

### Optional Description:
- Description tag: `Innonet deployment from CLI` (optional)
- Click **"Create access key"**

---

## Step 6: SAVE YOUR CREDENTIALS ⚠️ CRITICAL

You'll now see a page with your credentials. **YOU CAN ONLY SEE THESE ONCE!**

### Option A: Download CSV (Recommended)
- Click **"Download .csv file"**
- Save the file somewhere safe (NOT in a git repository!)

### Option B: Copy Both Values
Copy and save both:
- **Access key ID:** (looks like: `AKIAIOSFODNN7EXAMPLE`)
- **Secret access key:** (looks like: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`)

⚠️ **IMPORTANT:** The Secret Access Key will NEVER be shown again after you close this page!

Click **"Done"** when you've saved the credentials.

---

## Step 7: Configure AWS CLI with Your New Credentials

Now that you have your credentials, run this in your terminal:

```bash
aws configure
```

When prompted, enter:

1. **AWS Access Key ID [None]:**
   - Paste your Access Key ID (from the CSV or what you copied)
   - Press Enter

2. **AWS Secret Access Key [None]:**
   - Paste your Secret Access Key (from the CSV or what you copied)
   - Press Enter

3. **Default region name [None]:**
   - Type: `ap-southeast-1`
   - Press Enter

4. **Default output format [None]:**
   - Type: `json`
   - Press Enter

---

## Step 8: Verify It Works

Run this command:

```bash
aws sts get-caller-identity
```

**Expected Output:**
```json
{
    "UserId": "AIDAI...",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/innonet-deployer"
}
```

If you see this, **SUCCESS!** ✅ AWS CLI is configured correctly.

---

## Troubleshooting

### "Unable to locate credentials"
- Make sure you ran `aws configure` and entered all 4 values
- Check `~/.aws/credentials` file exists: `cat ~/.aws/credentials`

### "Access Denied"
- Make sure you attached the AdministratorAccess policy to your IAM user
- Wait 1-2 minutes for AWS to propagate the permissions

### "Invalid security token"
- Your credentials might be incorrect
- Run `aws configure` again and re-enter them carefully

---

## Security Best Practices

🔒 **After deployment is complete:**
1. Create more restrictive policies (don't use AdministratorAccess in production)
2. Enable MFA (Multi-Factor Authentication) on your IAM user
3. Rotate access keys regularly
4. Never commit credentials to git
5. Use AWS Secrets Manager for application secrets

---

## Next Steps

Once `aws sts get-caller-identity` works, you're ready to deploy!

Return to the main terminal and let me know - I'll automatically deploy your infrastructure to AWS Singapore! 🚀

---

**Quick Reference Commands:**

```bash
# Check if AWS is configured
aws sts get-caller-identity

# View current configuration
aws configure list

# Change region (if needed)
aws configure set region ap-southeast-1

# View credentials file
cat ~/.aws/credentials

# View config file
cat ~/.aws/config
```
