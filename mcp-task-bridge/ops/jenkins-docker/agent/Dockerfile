FROM jenkins/inbound-agent:alpine-jdk17

USER root
RUN apk add --no-cache docker-cli bash git curl
ENV DOCKER_HOST=tcp://dind:2375
USER jenkins

