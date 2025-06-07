import express from 'express';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { ConfidentialClientApplication } from '@azure/msal-node';
import axios from 'axios';

// Config
dotenv.config();

// Initialize Express
const app = express();
const PORT = 3978;

// Configure MSAL
const msalConfig = {
  auth: {
    clientId: process.env.AZURE_CLIENT_ID || process.env.MicrosoftAppId,
    authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || process.env.MicrosoftAppTenantId}`,
    clientSecret: process.env.AZURE_CLIENT_SECRET || process.env.MicrosoftAppPassword,
  }
};

console.log("MSAL Config:", msalConfig);
const msalClient = new ConfidentialClientApplication(msalConfig);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Auth routes
app.get('/auth/login', (req, res) => {
  const authCodeUrlParameters = {
    scopes: ["https://app.vssps.visualstudio.com/.default"],
    redirectUri: "http://localhost:3978/auth/callback",
  };

  msalClient.getAuthCodeUrl(authCodeUrlParameters)
    .then((response) => {
      console.log("Auth URL generated:", response);
      res.redirect(response);
    })
    .catch((error) => {
      console.error("Error getting auth code URL:", error);
      res.status(500).send("Error in authentication");
    });
});

app.get('/auth/callback', async (req, res) => {
  try {
    const code = req.query.code;
    
    if (!code) {
      return res.status(400).send('Authorization code is missing');
    }

    const tokenRequest = {
      code,
      scopes: ["https://app.vssps.visualstudio.com/.default"],
      redirectUri: "http://localhost:3978/auth/callback",
    };

    const response = await msalClient.acquireTokenByCode(tokenRequest);
    console.log("Token acquired successfully");
    
    // Store token in cookie (like workitemsai does)
    res.cookie('access_token', response.accessToken, { 
      httpOnly: true, 
      secure: false, // Set to false for local development
      sameSite: 'lax',
      maxAge: 3600000 // 1 hour
    });
    
    res.redirect('/');
  } catch (error) {
    console.error('Error during auth callback:', error);
    res.status(500).send('Authentication failed during callback');
  }
});

async function getAccessToken(req) {
  if (req && req.cookies && req.cookies.access_token) {
    return req.cookies.access_token;
  }
  return null;
}

async function getUserProfile(token) {
  try {
    // Fetch user profile
    const profileResponse = await axios.get('https://app.vssps.visualstudio.com/_apis/profile/profiles/me?api-version=6.0', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Fetch user's organizations
    const accountsResponse = await axios.get(`https://app.vssps.visualstudio.com/_apis/accounts?memberId=${profileResponse.data.id}&api-version=6.0`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    return {
      displayName: profileResponse.data.displayName,
      id: profileResponse.data.id,
      emailAddress: profileResponse.data.emailAddress,
      organizations: accountsResponse.data.value.map(org => org.accountName)
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}

// Home route
app.get('/', async (req, res) => {
  const token = await getAccessToken(req);
  
  if (token) {
    try {
      const userProfile = await getUserProfile(token);
      console.log("User profile fetched successfully:", userProfile.displayName);
      
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>User Profile</title>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              line-height: 1.6;
            }
            .profile {
              background: #f5f5f5;
              border-radius: 8px;
              padding: 20px;
              margin-top: 20px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1 {
              color: #0078d4;
            }
            .logout {
              display: inline-block;
              margin-top: 20px;
              background: #d13438;
              color: white;
              padding: 8px 16px;
              text-decoration: none;
              border-radius: 4px;
            }
            .detail {
              margin-bottom: 10px;
            }
            .label {
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h1>Successfully Authenticated</h1>
          <div class="profile">
            <div class="detail"><span class="label">Name:</span> ${userProfile.displayName}</div>
            <div class="detail"><span class="label">Email:</span> ${userProfile.emailAddress}</div>
            <div class="detail"><span class="label">ID:</span> ${userProfile.id}</div>
            <div class="detail"><span class="label">Organizations:</span> ${userProfile.organizations.join(', ')}</div>
          </div>
          <a href="/auth/logout" class="logout">Logout</a>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.clearCookie('access_token');
      res.redirect('/');
    }
  } else {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
            text-align: center;
          }
          h1 {
            color: #0078d4;
            margin-top: 100px;
          }
          .login-button {
            display: inline-block;
            margin-top: 30px;
            background: #0078d4;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
          }
          .login-button:hover {
            background: #106ebe;
          }
        </style>
      </head>
      <body>
        <h1>Azure DevOps Authentication</h1>
        <p>Click the button below to sign in with your Microsoft account</p>
        <a href="/auth/login" class="login-button">Sign in with Microsoft</a>
      </body>
      </html>
    `);
  }
});

app.get('/auth/logout', (req, res) => {
  res.clearCookie('access_token');
  res.redirect('/');
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});