###########################################################
# Developer's Guide
###########################################################
#
# All tasks should be explicitly marked as .PHONY at the
# top of the section.
#
# We distinguish two types of tasks: private and public.
#
# "Public" tasks should be created with the description
# using ## comment format:
#
#   public-task: task-dependency ## Task description
#
# Private tasks should start with "_". There should be no
# description E.g.:
#
#   _private-task: task-dependency
#

###########################################################
# Setup
###########################################################

# Include .env file
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

###########################################################
# Project directories
###########################################################

root_dir := $(shell dirname $(realpath $(firstword $(MAKEFILE_LIST))))
config_dir := $(root_dir)/.config
lle_config_dir := $(config_dir)/local-lambda-executor
lle_app_dir := $(root_dir)/local-lambda-executor
lle_app_config_dir := $(lle_app_dir)/config
sample_lambdas_dir := $(root_dir)/sample-lambdas
basic_lambda_dir := $(root_dir)/sample-lambdas/basic

###########################################################
# Config
###########################################################

dotenv_paths := "$(root_dir)" "$(lle_app_dir)" "$(basic_lambda_dir)"
docker_image := chimplie/local-lambda-executor
version := $(shell cat $(root_dir)/.VERSION)

###########################################################
# Help
###########################################################
.PHONY: help

help: ## Shows help
	@printf "\033[33m%s:\033[0m\n" 'Use: make <command> where <command> one of the following'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[32m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

version: ## Prints project version
	@echo Local Lambda Executor v.$(version)

###########################################################
# Initialization & Reset
###########################################################
.PHONY: init init-env reset-env init-configs reset-configs

init: init-env init-configs  ## Init repository
reset: reset-env reset-configs clean  ## Reset repository

init-env: ## Initializes .env files
	@echo "Creating .env files in $(dotenv_paths)..." && $(foreach dir, $(dotenv_paths), cp $(dir)/.env.template $(dir)/.env; )

reset-env: ## Resets .env files
	@echo "Resetting .env files in $(dotenv_paths)..." $(foreach dir, $(dotenv_paths), cp -f $(dir)/.env.template $(dir)/.env; )

init-configs: ## Init config.yml for local and Docker execution
	@echo "Creating LLE config.yml file in $(lle_config_dir)..." && cp $(lle_config_dir)/config-docker.template.yml $(lle_config_dir)/config.yml
	@echo "Creating LLE config.yml file in $(lle_app_config_dir)..." && cp $(lle_config_dir)/config-local.template.yml $(lle_app_config_dir)/config.yml

reset-configs: ## Reset config.yml for local and Docker execution
	@echo "Resetting LLE config.yml file in $(lle_config_dir)..." && cp -f $(lle_config_dir)/config-docker.template.yml $(lle_config_dir)/config.yml
	@echo "Resetting LLE config.yml file in $(lle_app_config_dir)..." && cp -f $(lle_config_dir)/config-local.template.yml $(lle_app_config_dir)/config.yml

###########################################################
# Dependency installation
###########################################################
.PHONY: install install-lle install-lambda

install: install-lle install-lambda  ## Installs project dependencies

install-lle: ## Installs local dependencies for Local Lambda Executor
	@cd $(lle_app_dir) && npm install --dev

install-lambda: ## Installs local dependencies for basic example lambda
	@cd $(basic_lambda_dir) && npm install --dev

###########################################################
# Build
###########################################################
.PHONY: build build-lle build-lambda

build: ## Builds project in Docker 
	@docker-compose build

build-lle: ## Builds LLE in Docker 
	@docker-compose build lle

build-lambda: ## Builds basic lambda function in Docker
	@docker-compose build lambda

###########################################################
# Build
###########################################################
.PHONY: deploy inspect tag docker-login push

deploy: build-lle inspect tag docker-login push

inspect: ## Inspect Docker image
	@echo Image size: $(shell docker image inspect $(docker_image):local --format='{{.Size}}')
	@echo Version: $(version)

tag: ## Tag LLE Docker image
	@docker tag $(docker_image):local $(docker_image):latest
	@docker tag $(docker_image):local $(docker_image):$(version)

push: ## Push to Docker registry
	@docker push $(docker_image):$(version)
	@docker push $(docker_image):latest

docker-login: ## Login to Docker registry
	@echo $(DOCKER_HUB_ACCESS_TOCKEN) | docker login --username chimplie --password-stdin

###########################################################
# Running
###########################################################
.PHONY: up down lle-deps lle-deps-d

up: ## Runs entire application stack in Docker
	docker-compose up

down: ## Shuts down dockerized application and removes Docker resources
	docker-compose down --remove-orphans

lle-deps: ## Starts Docker dependencies for Local Lambda Executor
	docker-compose up sqs lambda

lle-deps-d: ## Starts Docker dependencies for Local Lambda Executor in background
	docker-compose up -d sqs lambda

###########################################################
# Local Builds
###########################################################
.PHONY: local-build local-build-lle local-build-lambda

local-build: local-build-lle local-build-lambda  ## Build applications locally

local-build-lle: ## Builds Local Lambda Executor locally
	@cd $(lle_app_dir) && npm run build

local-build-lambda: ## Builds basic example lambda locally
	@cd $(basic_lambda_dir) && npm run build

###########################################################
# Local Execution
###########################################################
.PHONY: local-run local-run-lle local-run-lambda

local-run: local-run-lle local-run-lambda  ## Runs applications locally

local-run-lle: ## Runs Local Lambda Executor locally
	@cd $(lle_app_dir) && npm run dev

local-run-lambda: ## Runs basic example lambda locally
	@cd $(basic_lambda_dir) && npm run dev

###########################################################
# Clean up
###########################################################
.PHONY: clean clean-lle clean-lambda clean-docker

clean: clean-lle clean-lambda clean-docker  ## Cleans project

clean-lle: ## Runs Local Lambda Executor locally
	@cd $(lle_app_dir) && rm -rf node_modules

clean-lambda: ## Runs basic example lambda locally
	@cd $(basic_lambda_dir) && rm -rf node_modules
