This is a GitLab webhook relay service to Synology Chat.


# How to use

1. `git submodule init`
2. `git submodule update`
3. `npm install`
4. `GITLAB_SECRET=<secret> CHAT_WEBHOOK=<url> nodejs index.js`

# How to run docker container
1. `docker build -t <username>/gitlab-webhooks-for-chat .`
2. `docker run -p <host port>:3000 --rm -it -d -e GITLAB_SECRET=<secret> -e CHAT_WEBHOOK=<webhook_url> <username>/gitlab-webhooks-for-chat`

# Supported events
- Push
- Tag push
- Pipeline

