'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { authFetch } from '@/lib/api/token';
import {
  Upload, FileText, Database, Link2, Plus, CheckCircle2, AlertCircle,
  Loader2, RefreshCw, Trash2, ChevronRight, FileCode2,
  FileImage, File, Clock, HardDrive, Layers, Zap, Cloud, X,
  ExternalLink, Copy, Check, ChevronDown, ChevronUp, Plug,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────── */
type ConnectorStatus = 'synced' | 'syncing' | 'error' | 'disconnected' | 'connecting';

interface Connector {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  docs: number;
  status: ConnectorStatus;
  lastSync: string;
  description: string;
  category: string;
}

interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'xlsx' | 'md' | 'code' | 'image' | 'other';
  size: string;
  uploadedAt: string;
  status: 'indexed' | 'processing' | 'failed';
  source: string;
}

interface Step {
  title: string;
  description: string;
  code?: string;
  link?: { label: string; url: string };
}

interface ConnectorConfig {
  steps: Step[];
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  docsUrl: string;
  authType: string;
}

/* ─── Connector SVG Icons ────────────────────────────────── */
const GoogleDriveIcon = () => (
  <svg viewBox="0 0 87.3 78" className="h-5 w-5">
    <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3L27.5 53H0c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
    <path d="M43.65 25L29.9 1.2C28.55.4 27 0 25.45 0c-1.55 0-3.1.4-4.45 1.2L7.2 19.5 21 43.75z" fill="#00ac47"/>
    <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75L86.1 57.5c.8-1.4 1.2-2.95 1.2-4.5H59.8L73.55 76.8z" fill="#ea4335"/>
    <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.95 0H34.35c-1.55 0-3.1.4-4.45 1.2z" fill="#00832d"/>
    <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.45 1.2h49.9c1.55 0 3.1-.4 4.45-1.2z" fill="#2684fc"/>
    <path d="M73.4 26.5L60.1 3.5c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h26.25c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
  </svg>
);

const SlackIcon = () => (
  <svg viewBox="0 0 54 54" className="h-5 w-5">
    <path d="M19.712.133a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386h5.376V5.52A5.381 5.381 0 0 0 19.712.133m0 14.365H5.376A5.381 5.381 0 0 0 0 19.884a5.381 5.381 0 0 0 5.376 5.387h14.336a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386" fill="#36c5f0"/>
    <path d="M53.76 19.884a5.381 5.381 0 0 0-5.376-5.386 5.381 5.381 0 0 0-5.376 5.386v5.387h5.376a5.381 5.381 0 0 0 5.376-5.387m-14.336 0V5.52A5.381 5.381 0 0 0 34.048.133a5.381 5.381 0 0 0-5.376 5.387v14.364a5.381 5.381 0 0 0 5.376 5.387 5.381 5.381 0 0 0 5.376-5.387" fill="#2eb67d"/>
    <path d="M34.048 54a5.381 5.381 0 0 0 5.376-5.387 5.381 5.381 0 0 0-5.376-5.386h-5.376v5.386A5.381 5.381 0 0 0 34.048 54m0-14.365h14.336a5.381 5.381 0 0 0 5.376-5.386 5.381 5.381 0 0 0-5.376-5.387H34.048a5.381 5.381 0 0 0-5.376 5.387 5.381 5.381 0 0 0 5.376 5.386" fill="#ecb22e"/>
    <path d="M0 34.249a5.381 5.381 0 0 0 5.376 5.386 5.381 5.381 0 0 0 5.376-5.386v-5.387H5.376A5.381 5.381 0 0 0 0 34.249m14.336 0v14.364A5.381 5.381 0 0 0 19.712 54a5.381 5.381 0 0 0 5.376-5.387V34.249a5.381 5.381 0 0 0-5.376-5.387 5.381 5.381 0 0 0-5.376 5.387" fill="#e01e5a"/>
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5 text-white fill-current">
    <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
  </svg>
);

const ConfluenceIcon = () => (
  <svg viewBox="0 0 32 32" className="h-5 w-5">
    <path d="M1.226 22.424c-.312.499-.662 1.073-.949 1.521a.905.905 0 0 0 .3 1.27l5.045 3.079a.905.905 0 0 0 1.27-.3c.262-.424.587-.949.937-1.498 2.497-3.93 5.007-3.443 9.549-1.235l4.983 2.372a.909.909 0 0 0 1.198-.449l2.135-4.82a.909.909 0 0 0-.449-1.198c-1.648-.737-4.92-2.21-7.93-3.605-7.13-3.28-13.173-2.984-16.089 2.863z" fill="#2684ff"/>
    <path d="M30.774 9.576c.312-.499.662-1.073.949-1.521a.905.905 0 0 0-.3-1.27L26.378 3.706a.905.905 0 0 0-1.27.3c-.262.424-.587.949-.937 1.498-2.497 3.93-5.007 3.443-9.549 1.235L9.639 4.367a.909.909 0 0 0-1.198.449L6.306 9.636a.909.909 0 0 0 .449 1.198c1.648.737 4.92 2.21 7.93 3.605 7.105 3.267 13.148 2.971 16.089-2.863z" fill="#2684ff"/>
  </svg>
);

const NotionIcon = () => (
  <svg viewBox="0 0 100 100" className="h-5 w-5">
    <path d="M6 7.5C6 4.46 8.46 2 11.5 2h77C91.54 2 94 4.46 94 7.5v85c0 3.04-2.46 5.5-5.5 5.5h-77C8.46 98 6 95.54 6 92.5V7.5z" fill="white"/>
    <path d="M55.2 24.7L27.6 26.7c-2.5.2-3.1.3-4.7 1.5L17.5 32c-.8.6-.6.7.4.6 1.8-.2 4.1-.4 5.4-.5l29.1-2c2.4-.2 4.4 1.4 4.7 3.8l.2 2.9-26 1.9C18.6 39.1 15 43.1 15 55.9v18.2c0 8.5 4.9 13.4 13.4 13.4H73c8.5 0 13.4-4.9 13.4-13.4V39.1c0-8.5-4.9-14.4-13.4-14.4H55.2zm17.6 28.6v18.2c0 3.2-2.6 5.8-5.8 5.8H29c-3.2 0-5.8-2.6-5.8-5.8V53.3c0-3.2 2.6-5.8 5.8-5.8h38c3.2 0 5.8 2.6 5.8 5.8z" fill="black"/>
    <rect x="30" y="57" width="10" height="10" rx="2" fill="black"/>
  </svg>
);

const JiraIcon = () => (
  <svg viewBox="0 0 32 32" className="h-5 w-5">
    <path d="M15.998 0C7.163 0 0 7.163 0 16s7.163 16 15.998 16c8.836 0 16.002-7.163 16.002-16S24.834 0 15.998 0zm7.627 19.77a.594.594 0 0 1-.84 0l-6.787-6.787-6.787 6.787a.594.594 0 0 1-.84-.84l7.207-7.207a.594.594 0 0 1 .84 0l7.207 7.207a.594.594 0 0 1 0 .84z" fill="#2684ff"/>
  </svg>
);

const SalesforceIcon = () => (
  <svg viewBox="0 0 48 32" className="h-5 w-5">
    <path d="M20 2a9 9 0 0 1 6.5 2.8A7 7 0 0 1 32 4a7 7 0 0 1 7 6.5A6 6 0 0 1 41 22H10a8 8 0 0 1-1.2-15.9A9 9 0 0 1 20 2z" fill="white"/>
  </svg>
);

const GmailIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5">
    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="white"/>
  </svg>
);

/* ─── Connector Instructions ─────────────────────────────── */
const CONNECTOR_CONFIGS: Record<string, ConnectorConfig> = {
  'Google Drive': {
    authType: 'OAuth 2.0',
    docsUrl: 'https://developers.google.com/drive/api/guides/about-sdk',
    fields: [
      { key: 'client_id', label: 'OAuth Client ID', placeholder: 'xxxx.apps.googleusercontent.com' },
      { key: 'client_secret', label: 'OAuth Client Secret', placeholder: 'GOCSPX-...' },
      { key: 'folder_id', label: 'Root Folder ID (optional)', placeholder: 'Leave empty to sync all files' },
    ],
    steps: [
      {
        title: 'Create a Google Cloud Project',
        description: 'Go to Google Cloud Console and create a new project (or select an existing one).',
        link: { label: 'Open Google Cloud Console', url: 'https://console.cloud.google.com' },
      },
      {
        title: 'Enable the Google Drive API',
        description: 'In your project, navigate to APIs & Services → Library, search for "Google Drive API" and click Enable.',
      },
      {
        title: 'Create OAuth 2.0 Credentials',
        description: 'Go to APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID. Select "Web application" as the type.',
      },
      {
        title: 'Add Authorized Redirect URI',
        description: 'In the OAuth client settings, add the following redirect URI:',
        code: 'http://localhost:8010/auth/oauth/google-drive/callback',
      },
      {
        title: 'Copy credentials and connect',
        description: 'Copy your Client ID and Client Secret from the credentials page and paste them in the fields below, then click Connect.',
      },
    ],
  },
  'Confluence': {
    authType: 'API Token',
    docsUrl: 'https://developer.atlassian.com/cloud/confluence/rest/v1/intro/',
    fields: [
      { key: 'base_url', label: 'Confluence Base URL', placeholder: 'https://yourcompany.atlassian.net' },
      { key: 'email', label: 'Atlassian Account Email', placeholder: 'you@company.com' },
      { key: 'api_token', label: 'API Token', placeholder: 'ATATT3xFfGF0...', type: 'password' },
      { key: 'space_keys', label: 'Space Keys (comma-separated, optional)', placeholder: 'ENG, PROD, HR' },
    ],
    steps: [
      {
        title: 'Log in to your Atlassian account',
        description: 'Navigate to your Atlassian account settings to generate an API token.',
        link: { label: 'Open Atlassian Account Settings', url: 'https://id.atlassian.com/manage-profile/security/api-tokens' },
      },
      {
        title: 'Create an API Token',
        description: 'Click "Create API token", give it a name like "KnowledgeForge", and copy the generated token.',
      },
      {
        title: 'Find your Confluence base URL',
        description: 'Your Confluence URL follows the pattern: https://yourcompany.atlassian.net. You can find it in your Confluence settings.',
      },
      {
        title: 'Identify Space Keys (optional)',
        description: 'To sync specific spaces, find the space key in Confluence under Space Settings → Space Details. Leave blank to sync all spaces.',
      },
      {
        title: 'Enter credentials and connect',
        description: 'Fill in your base URL, email, and API token below. Click Connect to start syncing your Confluence pages.',
      },
    ],
  },
  'Slack': {
    authType: 'OAuth 2.0 / Bot Token',
    docsUrl: 'https://api.slack.com/start/building',
    fields: [
      { key: 'bot_token', label: 'Bot OAuth Token', placeholder: 'xoxb-...', type: 'password' },
      { key: 'channels', label: 'Channel Names (comma-separated, optional)', placeholder: '#general, #engineering' },
    ],
    steps: [
      {
        title: 'Create a Slack App',
        description: 'Go to api.slack.com and create a new Slack app for your workspace.',
        link: { label: 'Create Slack App', url: 'https://api.slack.com/apps/new' },
      },
      {
        title: 'Add Bot Token Scopes',
        description: 'Under OAuth & Permissions → Scopes → Bot Token Scopes, add the following scopes:',
        code: 'channels:read\nchannels:history\ngroups:read\ngroups:history\nusers:read\nfiles:read',
      },
      {
        title: 'Install App to Workspace',
        description: 'Go to OAuth & Permissions → Install to Workspace. Authorize the app for your workspace.',
      },
      {
        title: 'Copy the Bot Token',
        description: 'After installation, copy the "Bot User OAuth Token" (starts with xoxb-) from the OAuth & Permissions page.',
      },
      {
        title: 'Enter token and connect',
        description: 'Paste your bot token below. Optionally specify channel names to limit syncing to specific channels.',
      },
    ],
  },
  'GitHub': {
    authType: 'Personal Access Token',
    docsUrl: 'https://docs.github.com/en/rest',
    fields: [
      { key: 'access_token', label: 'Personal Access Token', placeholder: 'ghp_...', type: 'password' },
      { key: 'org_or_user', label: 'Organization or Username', placeholder: 'your-org' },
      { key: 'repos', label: 'Repositories (comma-separated, optional)', placeholder: 'repo1, repo2' },
    ],
    steps: [
      {
        title: 'Go to GitHub Developer Settings',
        description: 'Navigate to your GitHub account → Settings → Developer settings → Personal access tokens → Tokens (classic).',
        link: { label: 'Open GitHub Token Settings', url: 'https://github.com/settings/tokens' },
      },
      {
        title: 'Generate a new token',
        description: 'Click "Generate new token (classic)". Give it a name like "KnowledgeForge" and set an expiration.',
      },
      {
        title: 'Select required scopes',
        description: 'Select the following scopes for the token:',
        code: 'repo (full access to repositories)\nread:org (read org membership)\nread:user',
      },
      {
        title: 'Copy the token',
        description: 'Copy the generated token immediately — GitHub will not show it again.',
      },
      {
        title: 'Enter credentials and connect',
        description: 'Paste your token and enter your GitHub organization/username below. Optionally specify repo names to limit syncing.',
      },
    ],
  },
  'Notion': {
    authType: 'Integration Token',
    docsUrl: 'https://developers.notion.com',
    fields: [
      { key: 'integration_token', label: 'Notion Integration Token', placeholder: 'secret_...', type: 'password' },
      { key: 'database_ids', label: 'Database IDs (comma-separated, optional)', placeholder: 'Leave blank to sync all' },
    ],
    steps: [
      {
        title: 'Create a Notion Integration',
        description: 'Go to notion.so/my-integrations and click "+ New integration".',
        link: { label: 'Open Notion Integrations', url: 'https://www.notion.so/my-integrations' },
      },
      {
        title: 'Configure the integration',
        description: 'Give it a name (e.g. "KnowledgeForge"), associate it with your workspace, and set capabilities to Read content.',
      },
      {
        title: 'Copy the Integration Token',
        description: 'After saving, copy the "Internal Integration Secret" token that starts with secret_.',
      },
      {
        title: 'Share pages/databases with the integration',
        description: 'In each Notion page or database you want to sync, click the "..." menu → Connections → select your integration.',
      },
      {
        title: 'Enter token and connect',
        description: 'Paste your integration token below. Optionally add specific database IDs to limit syncing.',
      },
    ],
  },
  'Jira': {
    authType: 'API Token',
    docsUrl: 'https://developer.atlassian.com/cloud/jira/platform/rest/v3/',
    fields: [
      { key: 'base_url', label: 'Jira Base URL', placeholder: 'https://yourcompany.atlassian.net' },
      { key: 'email', label: 'Atlassian Account Email', placeholder: 'you@company.com' },
      { key: 'api_token', label: 'API Token', placeholder: 'ATATT3xFfGF0...', type: 'password' },
      { key: 'project_keys', label: 'Project Keys (comma-separated, optional)', placeholder: 'ENG, SUPPORT' },
    ],
    steps: [
      {
        title: 'Generate an Atlassian API Token',
        description: 'Visit your Atlassian account security page to create an API token for Jira access.',
        link: { label: 'Open Atlassian Token Settings', url: 'https://id.atlassian.com/manage-profile/security/api-tokens' },
      },
      {
        title: 'Create API Token',
        description: 'Click "Create API token", label it "KnowledgeForge", and copy the token shown.',
      },
      {
        title: 'Find your Jira URL',
        description: 'Your Jira URL is in the format https://yourcompany.atlassian.net. Check your browser address bar when on Jira.',
      },
      {
        title: 'Find project keys (optional)',
        description: 'Project keys appear in issue IDs (e.g. "ENG-123" → project key is "ENG"). Found in Project Settings → Details.',
      },
      {
        title: 'Enter credentials and connect',
        description: 'Fill in your Jira URL, email, and API token. KnowledgeForge will sync issues, comments, and attachments.',
      },
    ],
  },
  'Salesforce': {
    authType: 'Connected App OAuth',
    docsUrl: 'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/',
    fields: [
      { key: 'instance_url', label: 'Salesforce Instance URL', placeholder: 'https://yourorg.my.salesforce.com' },
      { key: 'client_id', label: 'Connected App Consumer Key', placeholder: '3MVG9...' },
      { key: 'client_secret', label: 'Connected App Consumer Secret', placeholder: '...', type: 'password' },
      { key: 'objects', label: 'Objects to Sync (comma-separated)', placeholder: 'Account, Contact, Case, Opportunity' },
    ],
    steps: [
      {
        title: 'Create a Connected App in Salesforce',
        description: 'In Salesforce, go to Setup → App Manager → New Connected App.',
        link: { label: 'Open Salesforce Setup', url: 'https://login.salesforce.com' },
      },
      {
        title: 'Configure OAuth Settings',
        description: 'Enable OAuth Settings, add the callback URL, and select these OAuth Scopes:',
        code: 'Access and manage your data (api)\nPerform requests on your behalf at any time (refresh_token)',
      },
      {
        title: 'Add Callback URL',
        description: 'In the Connected App OAuth settings, add this callback URL:',
        code: 'http://localhost:8010/auth/oauth/salesforce/callback',
      },
      {
        title: 'Get Consumer Key and Secret',
        description: 'After saving, click "Manage Consumer Details" to view your Consumer Key and Consumer Secret.',
      },
      {
        title: 'Enter credentials and connect',
        description: 'Enter your Salesforce instance URL, Consumer Key, and Consumer Secret. Specify which Salesforce objects to index.',
      },
    ],
  },
  'Gmail': {
    authType: 'OAuth 2.0',
    docsUrl: 'https://developers.google.com/gmail/api/guides',
    fields: [
      { key: 'client_id', label: 'OAuth Client ID', placeholder: 'xxxx.apps.googleusercontent.com' },
      { key: 'client_secret', label: 'OAuth Client Secret', placeholder: 'GOCSPX-...', type: 'password' },
      { key: 'labels', label: 'Gmail Labels to Sync (comma-separated, optional)', placeholder: 'INBOX, Important' },
    ],
    steps: [
      {
        title: 'Create a Google Cloud Project',
        description: 'Go to Google Cloud Console and create a new project (or reuse the one from Google Drive).',
        link: { label: 'Open Google Cloud Console', url: 'https://console.cloud.google.com' },
      },
      {
        title: 'Enable the Gmail API',
        description: 'In your project, go to APIs & Services → Library, search for "Gmail API" and click Enable.',
      },
      {
        title: 'Create OAuth 2.0 Credentials',
        description: 'Go to APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID. Set type to "Web application".',
      },
      {
        title: 'Add Authorized Redirect URI',
        description: 'Add the following redirect URI to your OAuth client:',
        code: 'http://localhost:8010/auth/oauth/gmail/callback',
      },
      {
        title: 'Enter credentials and connect',
        description: 'Copy your Client ID and Client Secret, paste them below, and optionally specify Gmail labels to sync.',
      },
    ],
  },
};

/* ─── Static data ────────────────────────────────────────── */
const CONNECTORS: Connector[] = [
  { id: '1', name: 'Google Drive', icon: <GoogleDriveIcon />, color: 'text-white', bgColor: 'bg-blue-600', docs: 0, status: 'disconnected', lastSync: 'Not connected', description: 'Sync files & folders', category: 'Storage' },
  { id: '2', name: 'Confluence', icon: <ConfluenceIcon />, color: 'text-white', bgColor: 'bg-blue-500', docs: 0, status: 'disconnected', lastSync: 'Not connected', description: 'Sync pages & spaces', category: 'Wiki' },
  { id: '3', name: 'Slack', icon: <SlackIcon />, color: 'text-white', bgColor: 'bg-purple-600', docs: 0, status: 'disconnected', lastSync: 'Not connected', description: 'Sync channels & messages', category: 'Communication' },
  { id: '4', name: 'GitHub', icon: <GitHubIcon />, color: 'text-white', bgColor: 'bg-gray-900', docs: 0, status: 'disconnected', lastSync: 'Not connected', description: 'Sync repos & wikis', category: 'Development' },
  { id: '5', name: 'Notion', icon: <NotionIcon />, color: 'text-black', bgColor: 'bg-white border border-gray-200', docs: 0, status: 'disconnected', lastSync: 'Not connected', description: 'Sync pages & databases', category: 'Wiki' },
  { id: '6', name: 'Jira', icon: <JiraIcon />, color: 'text-white', bgColor: 'bg-blue-700', docs: 0, status: 'disconnected', lastSync: 'Not connected', description: 'Sync issues & projects', category: 'Project Management' },
  { id: '7', name: 'Salesforce', icon: <SalesforceIcon />, color: 'text-white', bgColor: 'bg-sky-500', docs: 0, status: 'disconnected', lastSync: 'Not connected', description: 'Sync CRM records', category: 'CRM' },
  { id: '8', name: 'Gmail', icon: <GmailIcon />, color: 'text-white', bgColor: 'bg-red-600', docs: 0, status: 'disconnected', lastSync: 'Not connected', description: 'Sync emails & threads', category: 'Communication' },
];

const FILE_ICONS: Record<Document['type'], React.ElementType> = {
  pdf: FileText, docx: FileText, xlsx: Database, md: FileCode2,
  code: FileCode2, image: FileImage, other: File,
};
const FILE_COLORS: Record<Document['type'], string> = {
  pdf: 'text-red-400', docx: 'text-blue-400', xlsx: 'text-green-400',
  md: 'text-surface-500 dark:text-gray-400', code: 'text-purple-400',
  image: 'text-orange-400', other: 'text-surface-400 dark:text-gray-500',
};
const STATUS_CONFIG = {
  indexed: { label: 'Indexed', color: 'text-emerald-400 bg-emerald-900/40', icon: CheckCircle2 },
  processing: { label: 'Processing', color: 'text-amber-400 bg-amber-900/40', icon: Loader2 },
  failed: { label: 'Failed', color: 'text-red-400 bg-red-900/40', icon: AlertCircle },
};
const CONNECTOR_STATUS: Record<ConnectorStatus, { dot: string; label: string }> = {
  synced: { dot: 'bg-emerald-500', label: 'Synced' },
  syncing: { dot: 'bg-amber-500 animate-pulse', label: 'Syncing' },
  error: { dot: 'bg-red-500', label: 'Error' },
  disconnected: { dot: 'bg-gray-500', label: 'Connect' },
  connecting: { dot: 'bg-blue-500 animate-pulse', label: 'Connecting' },
};

/* ─── CopyButton ─────────────────────────────────────────── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="absolute top-2 right-2 p-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/* ─── Connector Modal ────────────────────────────────────── */
function ConnectorModal({
  connector,
  onClose,
  onConnect,
}: {
  connector: Connector;
  onClose: () => void;
  onConnect: (id: string, fields: Record<string, string>) => void;
}) {
  const config = CONNECTOR_CONFIGS[connector.name] ?? { steps: [], fields: [], docsUrl: '#', authType: 'API Token' };
  const [fields, setFields] = useState<Record<string, string>>({});
  const [expandedStep, setExpandedStep] = useState<number>(0);
  const [connecting, setConnecting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isConnected = connector.status === 'synced' || connector.status === 'syncing';

  const validate = () => {
    const errs: Record<string, string> = {};
    config.fields.forEach(f => {
      if (f.key !== fields[f.key] && !f.placeholder.startsWith('Leave') && !f.label.includes('optional') && !fields[f.key]) {
        errs[f.key] = 'This field is required';
      }
    });
    return errs;
  };

  const handleConnect = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setConnecting(true);
    await new Promise(r => setTimeout(r, 1800));
    setConnecting(false);
    onConnect(connector.id, fields);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-gray-800 bg-gray-900 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${connector.bgColor}`}>
              {connector.icon}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Connect {connector.name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400">{config.authType}</span>
                <span className="text-gray-600">·</span>
                <span className="text-xs text-gray-500">{connector.category}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Steps */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {config.steps.length}
              </span>
              Setup Steps
            </h3>
            <div className="space-y-2">
              {config.steps.map((step, i) => (
                <div key={i} className={`rounded-xl border transition-all ${expandedStep === i ? 'border-indigo-500/50 bg-indigo-950/30' : 'border-gray-800 bg-gray-800/40 hover:border-gray-700'}`}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => setExpandedStep(expandedStep === i ? -1 : i)}
                  >
                    <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${expandedStep === i ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-300'}`}>
                      {i + 1}
                    </span>
                    <span className={`flex-1 text-sm font-medium ${expandedStep === i ? 'text-white' : 'text-gray-300'}`}>{step.title}</span>
                    {expandedStep === i
                      ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />}
                  </button>
                  {expandedStep === i && (
                    <div className="px-4 pb-4 space-y-3">
                      <p className="text-sm text-gray-400 leading-relaxed">{step.description}</p>
                      {step.code && (
                        <div className="relative rounded-lg bg-gray-950 border border-gray-700 p-3 pr-10">
                          <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap">{step.code}</pre>
                          <CopyButton text={step.code} />
                        </div>
                      )}
                      {step.link && (
                        <a
                          href={step.link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {step.link.label}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Fields */}
          {!isConnected && (
            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Connection Details</h3>
              <div className="space-y-3">
                {config.fields.map(field => (
                  <div key={field.key}>
                    <label className="block text-xs font-medium text-gray-400 mb-1">{field.label}</label>
                    <input
                      type={field.type ?? 'text'}
                      placeholder={field.placeholder}
                      value={fields[field.key] ?? ''}
                      onChange={e => {
                        setFields(prev => ({ ...prev, [field.key]: e.target.value }));
                        setErrors(prev => ({ ...prev, [field.key]: '' }));
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-sm bg-gray-800 text-white placeholder-gray-500 outline-none transition-colors focus:ring-1 ${
                        errors[field.key]
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-gray-700 focus:border-indigo-500 focus:ring-indigo-500'
                      }`}
                    />
                    {errors[field.key] && (
                      <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />{errors[field.key]}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {isConnected && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-4">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-400">Connected successfully</p>
                <p className="text-xs text-gray-400 mt-0.5">This connector is active and syncing in real-time.</p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-800">
            <a
              href={config.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View API Docs
            </a>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              {!isConnected && (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 transition-colors"
                >
                  {connecting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Connecting...</>
                  ) : (
                    <><Plug className="h-4 w-4" />Connect</>
                  )}
                </button>
              )}
              {isConnected && (
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />Done
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Connectors Panel (slide-in) ───────────────────────── */
function ConnectorsPanel({
  connectors,
  onClose,
  onCardClick,
}: {
  connectors: Connector[];
  onClose: () => void;
  onCardClick: (c: Connector) => void;
}) {
  const categories = Array.from(new Set(connectors.map(c => c.category)));
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm h-full bg-gray-900 border-l border-gray-800 shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-gray-900">
          <div>
            <h2 className="text-sm font-bold text-white">All Connectors</h2>
            <p className="text-xs text-gray-400 mt-0.5">{connectors.length} available</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-5">
          {categories.map(cat => (
            <div key={cat}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2 px-1">{cat}</p>
              <div className="space-y-2">
                {connectors.filter(c => c.category === cat).map(c => (
                  <button
                    key={c.id}
                    onClick={() => { onClose(); onCardClick(c); }}
                    className="w-full flex items-center gap-3 rounded-xl border border-gray-800 bg-gray-800/40 px-4 py-3 hover:border-indigo-500/50 hover:bg-indigo-950/20 transition-all text-left"
                  >
                    <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${c.bgColor}`}>
                      {c.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{c.name}</p>
                      <p className="text-xs text-gray-400 truncate">{c.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`h-2 w-2 rounded-full ${CONNECTOR_STATUS[c.status].dot}`} />
                      <span className="text-[10px] text-gray-500">{CONNECTOR_STATUS[c.status].label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */
export default function KnowledgeBasePage() {
  const { data: session } = useSession();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [, setUploadStatus] = useState<Record<string, 'uploading' | 'done' | 'error'>>({});
  const [realDocs, setRealDocs] = useState<Document[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [connectors, setConnectors] = useState<Connector[]>(CONNECTORS);
  const [selectedConnector, setSelectedConnector] = useState<Connector | null>(null);
  const [showConnectorsPanel, setShowConnectorsPanel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeConnectors = connectors.filter(c => c.status !== 'disconnected').length;
  const totalDocs = connectors.reduce((a, c) => a + c.docs, 0) + realDocs.length;
  const getUser = () => ({ email: session?.user?.email, name: session?.user?.name, image: session?.user?.image });

  useEffect(() => {
    if (status !== 'authenticated') return;
    setLoadingDocs(true);
    authFetch('/api/backend/knowledge/documents?pageSize=20', {}, (session as any)?.accessToken, getUser())
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.items) {
          setRealDocs(data.items.map((d: any) => ({
            id: d.id, name: d.name,
            type: d.type ?? 'other',
            size: d.size ? `${Math.round(d.size / 1024)} KB` : '—',
            uploadedAt: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—',
            status: d.status ?? 'indexed',
            source: 'Upload',
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingDocs(false));
  }, [status, session?.user?.email]);

  // Real-time sync simulation: syncing connectors poll every 8s
  useEffect(() => {
    const interval = setInterval(() => {
      setConnectors(prev => prev.map(c => {
        if (c.status === 'syncing') {
          return { ...c, status: 'synced', lastSync: 'Just now', docs: c.docs + Math.floor(Math.random() * 5) + 1 };
        }
        if (c.status === 'synced' && Math.random() < 0.1) {
          return { ...c, lastSync: `${Math.floor(Math.random() * 5) + 1} min ago` };
        }
        return c;
      }));
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = useCallback((id: string, _fields: Record<string, string>) => {
    setConnectors(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'syncing', lastSync: 'Syncing...' } : c
    ));
  }, []);

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;
    const names = files.map(f => f.name);
    setUploadingFiles(names);
    const statusMap: Record<string, 'uploading' | 'done' | 'error'> = {};
    names.forEach(n => { statusMap[n] = 'uploading'; });
    setUploadStatus({ ...statusMap });

    await Promise.all(files.map(async (file) => {
      try {
        const formData = new FormData();
        formData.append('files', file);
        const res = await authFetch('/api/backend/knowledge/documents/upload',
          { method: 'POST', body: formData },
          (session as any)?.accessToken, getUser(),
        );
        statusMap[file.name] = res.ok ? 'done' : 'error';
        setUploadStatus({ ...statusMap });
        if (res.ok) {
          const docs = await res.json();
          const doc = Array.isArray(docs) ? docs[0] : docs;
          if (doc) {
            setRealDocs(prev => [{
              id: doc.id, name: doc.name, type: doc.type ?? 'other',
              size: doc.size ? `${Math.round(doc.size / 1024)} KB` : '—',
              uploadedAt: new Date().toLocaleDateString(),
              status: 'processing', source: 'Upload',
            }, ...prev]);
          }
        }
      } catch {
        statusMap[file.name] = 'error';
        setUploadStatus({ ...statusMap });
      }
    }));
    setTimeout(() => { setUploadingFiles([]); setUploadStatus({}); }, 3000);
  };

  return (
    <div className="min-h-full bg-surface-50 dark:bg-gray-950 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Knowledge Base</h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-gray-400">
            Manage your organization's indexed documents and connected data sources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConnectorsPanel(true)}
            className="flex items-center gap-2 rounded-lg border border-surface-300 dark:border-gray-700 bg-surface-100 dark:bg-gray-800 px-4 py-2 text-sm font-medium text-surface-600 dark:text-gray-300 hover:bg-surface-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Plug className="h-4 w-4" />
            Connectors
            {activeConnectors > 0 && (
              <span className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                {activeConnectors}
              </span>
            )}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => { const files = Array.from(e.target.files ?? []); void uploadFiles(files); e.target.value = ''; }} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Documents', value: totalDocs.toLocaleString(), icon: FileText, color: 'text-indigo-400', bg: 'bg-indigo-900/30' },
          { label: 'Storage Used', value: '47.2 GB', icon: HardDrive, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
          { label: 'Last Synced', value: '5 min ago', icon: Clock, color: 'text-amber-400', bg: 'bg-amber-900/30' },
          { label: 'Active Connectors', value: `${activeConnectors} / ${connectors.length}`, icon: Zap, color: 'text-violet-400', bg: 'bg-violet-900/30' },
        ].map(stat => (
          <div key={stat.label} className="rounded-2xl border border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5">
            <div className="flex items-center gap-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-surface-400 dark:text-gray-500">{stat.label}</p>
                <p className="text-lg font-bold text-surface-900 dark:text-white">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Upload zone */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); void uploadFiles(Array.from(e.dataTransfer.files)); }}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
          isDragging ? 'border-indigo-500 bg-indigo-950/30' : 'border-surface-300 dark:border-gray-700 bg-white dark:bg-gray-900/50 hover:border-surface-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${isDragging ? 'bg-indigo-600' : 'bg-surface-100 dark:bg-gray-800'}`}>
            <Upload className={`h-6 w-6 ${isDragging ? 'text-white' : 'text-surface-500 dark:text-gray-400'}`} />
          </div>
          {uploadingFiles.length > 0 ? (
            <p className="text-sm font-semibold text-indigo-400 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading {uploadingFiles.length} file(s)...
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">{isDragging ? 'Drop files here' : 'Drag & drop files here'}</p>
              <p className="text-xs text-surface-400 dark:text-gray-500">Supports PDF, DOCX, XLSX, PPTX, Markdown, CSV, images and more · Up to 50 files at once</p>
            </>
          )}
        </div>
      </div>

      {/* Connected Sources */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <Cloud className="h-4.5 w-4.5 text-surface-500 dark:text-gray-400" />
            Connected Sources
          </h2>
          <button
            onClick={() => setShowConnectorsPanel(true)}
            className="flex items-center gap-1.5 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Source
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {connectors.map(connector => (
            <button
              key={connector.id}
              onClick={() => setSelectedConnector(connector)}
              className={`rounded-2xl border bg-white dark:bg-gray-900 p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg ${
                connector.status === 'disconnected'
                  ? 'border-surface-200 dark:border-gray-800 opacity-70 hover:opacity-100 hover:border-indigo-500/50'
                  : connector.status === 'synced'
                  ? 'border-emerald-500/30 hover:border-emerald-500/60'
                  : connector.status === 'syncing'
                  ? 'border-amber-500/30 hover:border-amber-500/60'
                  : 'border-surface-200 dark:border-gray-800 hover:border-indigo-500/50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${connector.bgColor}`}>
                  {connector.icon}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${CONNECTOR_STATUS[connector.status].dot}`} />
                  <span className="text-[10px] text-surface-400 dark:text-gray-500">{CONNECTOR_STATUS[connector.status].label}</span>
                </div>
              </div>
              <p className="text-sm font-semibold text-surface-900 dark:text-white">{connector.name}</p>
              {connector.status !== 'disconnected' ? (
                <p className="text-[11px] text-surface-400 dark:text-gray-500 mt-0.5">{connector.docs.toLocaleString()} docs</p>
              ) : (
                <p className="text-[11px] text-indigo-400 mt-0.5 flex items-center gap-1">
                  <Link2 className="h-3 w-3" />Click to connect
                </p>
              )}
              <p className="text-[10px] text-surface-600 dark:text-gray-600 mt-1">{connector.lastSync}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Documents */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-surface-900 dark:text-white flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-surface-500 dark:text-gray-400" />
            Recent Documents
          </h2>
          <button className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            View all <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="rounded-2xl border border-surface-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 dark:border-gray-800">
                <th className="text-left px-5 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider hidden sm:table-cell">Size</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider hidden md:table-cell">Source</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider hidden lg:table-cell">Uploaded</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-surface-400 dark:text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-gray-800">
              {loadingDocs ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-surface-400 dark:text-gray-500 text-sm">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-indigo-400" />Loading documents...
                </td></tr>
              ) : realDocs.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-surface-400 dark:text-gray-500 text-sm">
                  No documents yet. Upload a file above to get started.
                </td></tr>
              ) : realDocs.map(doc => {
                const docType = (doc.type in FILE_ICONS ? doc.type : 'other') as Document['type'];
                const docStatus = (doc.status in STATUS_CONFIG ? doc.status : 'indexed') as Document['status'];
                const Icon = FILE_ICONS[docType];
                const statusCfg = STATUS_CONFIG[docStatus];
                const StatusIcon = statusCfg.icon;
                return (
                  <tr key={doc.id} className="hover:bg-surface-100 dark:hover:bg-gray-800/50 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Icon className={`h-4 w-4 flex-shrink-0 ${FILE_COLORS[docType]}`} />
                        <span className="text-surface-700 dark:text-gray-200 font-medium truncate max-w-[200px]">{doc.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-surface-400 dark:text-gray-500 text-xs hidden sm:table-cell">{doc.size}</td>
                    <td className="px-4 py-3.5 text-surface-400 dark:text-gray-500 text-xs hidden md:table-cell">{doc.source}</td>
                    <td className="px-4 py-3.5 text-surface-400 dark:text-gray-500 text-xs hidden lg:table-cell">{doc.uploadedAt}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                        <StatusIcon className={`h-3 w-3 ${docStatus === 'processing' ? 'animate-spin' : ''}`} />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="rounded p-1 text-surface-400 dark:text-gray-500 hover:text-surface-600 dark:hover:text-gray-300 hover:bg-surface-200 dark:hover:bg-gray-700 transition-colors">
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button className="rounded p-1 text-surface-400 dark:text-gray-500 hover:text-red-400 hover:bg-surface-200 dark:hover:bg-gray-700 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connectors slide panel */}
      {showConnectorsPanel && (
        <ConnectorsPanel
          connectors={connectors}
          onClose={() => setShowConnectorsPanel(false)}
          onCardClick={setSelectedConnector}
        />
      )}

      {/* Connector instruction modal */}
      {selectedConnector && (
        <ConnectorModal
          connector={selectedConnector}
          onClose={() => setSelectedConnector(null)}
          onConnect={handleConnect}
        />
      )}
    </div>
  );
}
