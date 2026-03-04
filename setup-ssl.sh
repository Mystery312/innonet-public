#!/bin/bash
# SSL Setup with Let's Encrypt

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Usage: ./setup-ssl.sh yourdomain.com"
    exit 1
fi

echo "Installing Certbot..."
sudo apt update
sudo apt install -y certbot

echo "Stopping nginx temporarily..."
cd ~/innonet
docker-compose -f docker-compose.prod.yml stop nginx

echo "Obtaining SSL certificate..."
sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

echo "Setting up SSL in nginx..."
# Copy certificates to project
sudo mkdir -p infrastructure/nginx/ssl
sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem infrastructure/nginx/ssl/
sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem infrastructure/nginx/ssl/
sudo chmod 644 infrastructure/nginx/ssl/*

echo "Restarting services..."
docker-compose -f docker-compose.prod.yml up -d

echo "✓ SSL setup complete! Your site is now available at https://$DOMAIN"
