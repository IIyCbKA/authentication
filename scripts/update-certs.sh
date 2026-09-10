docker-compose down --remove-orphans

docker run --rm -p 80:80   -v /etc/letsencrypt:/etc/letsencrypt   -v /var/log/letsencrypt:/var/log/letsencrypt   certbot/certbot renew --standalone --http-01-address 0.0.0.0 --no-random-sleep-on-renew -v
