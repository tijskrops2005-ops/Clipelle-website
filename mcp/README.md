# Clipelle MCP server

A small [Model Context Protocol](https://modelcontextprotocol.io) server (stdio) that lets an AI assistant translate videos and read your projects through the [Clipelle](https://www.clipelle.com) API.

## Set up

1. Create an API key in Clipelle: **Settings → API keys** (Pro plan and up).
2. Add the server to your assistant's MCP configuration (Claude Desktop, Cursor, and others):

```json
{
  "mcpServers": {
    "clipelle": {
      "command": "npx",
      "args": ["-y", "clipelle-mcp"],
      "env": { "CLIPELLE_API_KEY": "your key" }
    }
  }
}
```

`CLIPELLE_API_URL` is optional (default `https://www.clipelle.com`).

## Tools

- `translate_video`: translate a video from a public link into one or more languages.
- `get_project`: status and download links of one project.
- `list_projects`: your recent projects.
- `create_ad`: coming soon; returns `coming_soon` until ads open.

Every call spends credits exactly like the app; keep your assistant's "ask before running a tool" setting on. Full docs: https://www.clipelle.com/docs/mcp
