# AzureDevOps-Oauth
OAuth 2.0 Authorization Code Flow for Azure DevOps using @azure/msal-node library - authenticate users and access to Azure DevOps APIs

## Who Needs This Application?

This authentication service is ideal for developers building applications that need to:

- **AI-Powered DevOps Tools**: Create AI applications that can automatically create, update, or manage work items based on user conversations or automated workflows
- **Custom DevOps Integrations**: Build tools that interact with Azure DevOps on behalf of authenticated users
- **Team Productivity Apps**: Develop applications where users need to access only their authorized projects and create work items dynamically
- **Automated Reporting Tools**: Create services that fetch work items and project data based on user permissions
- **Chatbots & Virtual Assistants**: Build conversational interfaces that can create and manage work items through natural language

The key benefit is that all operations respect the authenticated user's permissions - they can only access and modify resources they're authorized to use in Azure DevOps.

## Features

- Microsoft Azure AD Authentication
- Displays user profile information from Azure DevOps
- Simple and responsive user interface

## Prerequisites

- Node.js (v14 or higher)
- Azure AD Application registration with appropriate permissions
- Azure DevOps account

## Setup

1. Install dependencies
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your Azure AD credentials:
   ```
   # Azure AD Configuration
   AZURE_CLIENT_ID=your_client_id_here
   AZURE_CLIENT_SECRET=your_client_secret_here
   AZURE_TENANT_ID=your_tenant_id_here
   AZURE_REDIRECT_URI=http://localhost:3000/auth/callback
   ```

3. Start the server
   ```bash
   npm start
   ```

   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

4. Navigate to `http://localhost:3000` in your browser

## Auth Flow

1. User clicks the login button
2. User is redirected to Microsoft login page
3. After successful authentication, user is redirected back to the application
4. The application displays the user's name, email, and organizations

## What This Code Does

This application implements OAuth 2.0 authentication flow with Azure Active Directory (Azure AD) to access Azure DevOps APIs. Here's what you can expect:

### Authentication Type
- **OAuth 2.0 Authorization Code Flow** with MSAL (Microsoft Authentication Library)
- Uses Azure AD as the identity provider
- Requests scope: `https://app.vssps.visualstudio.com/.default` (full Azure DevOps access)

### After Successful Authentication
Once authenticated, the application:
1. Stores the access token in an HTTP-only cookie (valid for 1 hour)
2. Fetches and displays:
   - User's display name
   - Email address
   - Azure AD user ID
   - List of Azure DevOps organizations the user has access to

### What You Can Do With The Token
The acquired access token can be used to:
- Fetch work items from Azure DevOps
- Create and update work items
- Access repositories, pipelines, and boards
- Perform any Azure DevOps API operation the user has permissions for

Example API call with the token:
```javascript
const response = await axios.get(
  `https://dev.azure.com/{organization}/{project}/_apis/wit/workitems?ids={ids}&api-version=7.0`,
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
```

### Security Notes
- Tokens expire after 1 hour (configurable in app.js:72 - maxAge property)
- No refresh token mechanism implemented yet (can be added using MSAL's refresh token flow)
- Each user authenticates with their own Azure AD credentials
- The app only accesses what the authenticated user has permissions to access

