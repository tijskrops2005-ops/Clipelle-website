# Reelay MCP server

A small [Model Context Protocol](https://modelcontextprotocol.io) server (stdio) that lets an AI assistant create ads, translate videos and read projects through the Reelay API. Not published to npm: build it from this folder.

```bash
cd mcp
npm install
npm run build        # dist/index.js
```

Add it to your assistant's MCP configuration with your API key (Settings → API keys in Reelay):

```json
{
  "mcpServers": {
    "reelay": {
      "command": "node",
      "args": ["/absolute/path/to/reelay/mcp/dist/index.js"],
      "env": { "REELAY_API_KEY": "rl_…", "REELAY_API_URL": "https://YOUR-DOMAIN" }
    }
  }
}
```

Tools: `create_ad`, `translate_video`, `get_project`, `list_projects`. Every call spends credits exactly like the form; keep the assistant's "ask before running a tool" setting on. Full docs: `/docs/mcp` on the site.
