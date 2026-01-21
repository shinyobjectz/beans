---
name: valyu-research
description: >
  Knowledge retrieval via Valyu MCP. Academic, web, and financial 
  search to enrich development context with real-time research.
allowed-tools: "Read,MCP(valyu:*)"
version: "1.0.0"
author: "Valyu AI"
license: "MIT"
---

# Valyu - Research Integration

Real-time knowledge retrieval for development context.

## MCP Tools

### knowledge
Search proprietary and web sources:
```json
{
  "name": "knowledge",
  "arguments": {
    "query": "OAuth 2.0 security best practices",
    "search_type": "all",
    "max_price": 0.5,
    "max_num_results": 5
  }
}
```

### feedback
Submit feedback on results:
```json
{
  "name": "feedback",
  "arguments": {
    "tx_id": "12345",
    "feedback": "Very helpful",
    "sentiment": "very good"
  }
}
```

## Search Types

| Type | Sources | Best For |
|------|---------|----------|
| `academic` | arxiv, journals | Research papers, algorithms |
| `web` | General web | Documentation, tutorials |
| `financial` | Market data | Company info, pricing |
| `all` | Everything | General queries |

## BEANS Integration

Auto-research triggered by:
1. Task keywords (auth, security, performance, etc.)
2. `[RESEARCH: query]` markers in description
3. Task tags
4. Test failures (search for solutions)

## Caching

Results cached in `.beads/research/cache/`:
- Default TTL: 7 days
- Cache key: MD5(query + source)
- `--fresh` flag bypasses cache

## Cost Control

- `max_price` limits cost per query
- Cache hits are free
- Monitor in `.beans/logs/research-api-calls.log`
