# Copilot MCP OAuth Disk-State Probe Refresh

Captured: 2026-05-31T13:18:26-04:00

## Directory

Path: ~/.copilot/mcp-oauth-config/

## Metadata Files (non-token files only)

### 5b64146edc1804e6918ae66a0ce88dc3048f5958fa88c0b4ffcb724bbf834feb.json

```json
{
  "serverUrl": "https://mcp.figma.com/mcp",
  "authorizationServerUrl": "https://api.figma.com",
  "clientId": "<present>",
  "redirectUri": "http://127.0.0.1:54799/",
  "issuedAt": 1773778356,
  "keys": [
    "authorizationServerUrl",
    "clientId",
    "clientSecret",
    "isStatic",
    "issuedAt",
    "redirectUri",
    "resourceUrl",
    "serverUrl"
  ]
}
```

### 65b977d97b619cabee53625265c5bdc027294acfee750079a6ef1d098a38eea4.json

```json
{
  "serverUrl": "https://mcp.atlassian.com/v1/mcp/authv2",
  "authorizationServerUrl": "https://auth.atlassian.com/VCeDsk8ZHncYF1g234fKtc4lNipbBhu3",
  "clientId": "<present>",
  "redirectUri": "http://127.0.0.1:61803/",
  "issuedAt": 1780245985,
  "keys": [
    "authorizationServerUrl",
    "clientId",
    "clientSecret",
    "isStatic",
    "issuedAt",
    "redirectUri",
    "resourceUrl",
    "serverUrl"
  ]
}
```

### 7a161109bf2bbd464672e60d85151cd3281304c755fc343b8384d4bd720d32fc.json

```json
{
  "serverUrl": "https://mcp.figma.com/mcp",
  "authorizationServerUrl": "https://api.figma.com",
  "clientId": "<present>",
  "redirectUri": "http://127.0.0.1:60718/",
  "issuedAt": 1779827148,
  "keys": [
    "authorizationServerUrl",
    "clientId",
    "clientSecret",
    "isStatic",
    "issuedAt",
    "redirectUri",
    "resourceUrl",
    "serverUrl"
  ]
}
```

### 882c8c5c473158491b21cf87ba38729824da4a15afc11ebb61659bf9d948f79a.json

```json
{
  "serverUrl": "https://mcp.atlassian.com/v1/mcp",
  "authorizationServerUrl": "https://mcp.atlassian.com",
  "clientId": "<present>",
  "redirectUri": "http://127.0.0.1:52638/",
  "issuedAt": 1774424473,
  "keys": [
    "authorizationServerUrl",
    "clientId",
    "isStatic",
    "issuedAt",
    "redirectUri",
    "serverUrl"
  ]
}
```

## Token Companion Presence Only

- 5b64146edc1804e6918ae66a0ce88dc3048f5958fa88c0b4ffcb724bbf834feb.tokens.json present (contents not read)

## Detection Rule Confirmed For Run 11

Authenticated means an OAuth metadata JSON whose serverUrl exactly equals the configured Atlassian MCP URL exists, and a same-basename .tokens.json companion exists. Token file contents are never read.
