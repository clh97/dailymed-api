# Milestone 1: Core Infrastructure & Domain Model

**Goal: Set up the project foundation, define the domain models, and establish the basic infrastructure.**

**Note: this document was generated with Claude 3.7, probably contains some issues that I'll check during the development**

## 1.1 Project Setup and Architecture

   - [x] Initialize the NestJS project with proper structure
   - [x] Set up the development environment (linting, formatting, git hooks)
   - [x] Configure SQLite database with TypeORM
   - [x] Establish folder structure following Clean Architecture principles
   - [x] Set up unit testing framework with Jest
   - [x] Create Docker development setup

## 1.2 Domain Model Implementation

   - [x] Define and implement the Drug entity
   - [x] Define and implement the Indication entity
   - [x] Define and implement the ICD-10 code value object
   - [ ] Implement domain validation rules
   - [ ] Write unit tests for domain entities
   - [ ] Define repository interfaces in the application layer
   - [ ] Establish domain events and error types

## 1.3 Basic API Structure

   - [ ] Set up NestJS modules structure
   - [ ] Implement basic exception filters
   - [ ] Configure validation pipes
   - [ ] Create health check endpoint
   - [ ] Set up logging infrastructure
   - [ ] Configure environment-based settings
   - [ ] Implement basic request/response DTOs
   - [ ] Write initial API tests

## 1.4 Docker Configuration

   - [ ] Create Dockerfile for the application
   - [ ] Configure docker-compose for local development
   - [ ] Set up SQLite volume persistence
   - [ ] Configure health checks for containers
   - [ ] Document Docker setup process
   - [ ] Test containerized application
