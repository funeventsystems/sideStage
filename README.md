
## Introduction

Welcome to the documentation for the Team Manager. This software is designed to provide a secure and flexible user authentication system along with a calendar and feedback submission functionality. Please follow the instructions below to get started.

## Table of Contents

1.  Prerequisites
2.  Installation
3.  Usage
    -   User Authentication
    -   Dashboard
    -   Calendar
    -   Feedback
4. Admin Features
5.  Screenshots
6.  Feedback Submission
7.  Event Management
8.  Absence Tracking
9. Default Credentials

## Prerequisites

Before using the software, ensure that you have the following installed:

-   Node.js
-   npm (Node Package Manager)

## Installation

1.  Clone the repository to your local machine:
    
    
    `git clone https://github.com/gmanandmarbles/drama-team-management 
    
2.  Navigate to the project directory:
    
    
    `cd drama-team-management` 
    
3.  Install the required dependencies:
    
    
    `npm install` 
    

## Usage

### User Authentication

-   Access the login page by navigating to `http://localhost:3000/login`.
-   Enter your username and password to log in.
-   If authentication is successful, you will be redirected to the dashboard.

### Dashboard

-   The dashboard is accessible at `http://localhost:3000/dashboard`.
-   Explore and interact with the features provided on the dashboard.

### Calendar

-   Access the calendar at `http://localhost:3000/calendar`.
-   View events associated with your account.
-   Admin users can add new events through the admin panel.

### Feedback

-   Submit feedback at `http://localhost:3000/feedback`.
-   Provide your feedback through the form.

## Admin Features

-   Admins can access the admin panel at `http://localhost:3000/admin`.
-   Admins can add new events at `http://localhost:3000/addEvent`.
-   View and manage user data at `http://localhost:3000/users`.
-   Delete events at `http://localhost:3000/deleteEvent/:eventId`.
-   View absences for a specific event at `http://localhost:3000/eventAbsences/:eventId`.

## Screenshots

Please refer to the provided screenshots for a visual guide on the respective pages.

## Feedback Submission

-   Users can submit feedback at `http://localhost:3000/submitFeedback`.
-   Feedback is stored securely and can be viewed by admins.

## Event Management

-   Admins can manage events at `http://localhost:3000/admin`.
-   Add new events at `http://localhost:3000/addEvent`.
-   Delete events at `http://localhost:3000/deleteEvent/:eventId`.

## Absence Tracking

-   Users can mark their absence for a specific event at `http://localhost:3000/markAbsence/:eventId`.
-   Admins can view event absences at `http://localhost:3000/eventAbsences/:eventId`.


## Default Credentials

Admin user:
Username: `admin` 
Password: `adminpassword`

Normal user:
Username: `user`
Password: `password`

Test user:
Username: `test`
Password: `test`