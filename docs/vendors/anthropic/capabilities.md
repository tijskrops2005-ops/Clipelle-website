# Claude API (Anthropic): wat we gebruiken voor de scriptstap

Peildatum: 19 oktober 2026. Bronnen: de officiële Claude-documentatie (https://platform.claude.com/docs) en de TypeScript SDK `@anthropic-ai/sdk` (0.135). Haal vóór codewijzigingen altijd de actuele pagina op; modellen, prijzen en parameters veranderen.

## Wat de dienst voor ons doet
Stap 2 van het proces: productinformatie plus foto → hook, presentatorscript, scènes, drie voordelen en een aanbod met CTA, als gegarandeerd geldige JSON. Eén aanroep per invalshoek.

## Kern
- **Endpoint:** `POST https://api.anthropic.com/v1/messages`, via de SDK `client.messages.create` / `client.messages.parse`. Auth: header `x-api-key`. Sleutels maak je in de Anthropic Console; tegoed vooraf opladen (pay-as-you-go). Bron: https://platform.claude.com/docs/en/api/getting-started
- **Model:** `claude-opus-5-5` (standaard in dit project). Prijs: $4 per miljoen invoertokens, $20 per miljoen uitvoertokens, cache-reads $0,20. 1M context. Bron: https://platform.claude.com/docs/en/about-claude/models/overview en https://platform.claude.com/docs/en/about-claude/pricing
- **Thinking:** staat op Opus 5.5 altijd aan (adaptief); diepte via `output_config.effort` (`low | medium | high | xhigh | max`, standaard `medium`). `budget_tokens` en `thinking: disabled` geven een 400. Bron: https://platform.claude.com/docs/en/build-with-claude/extended-thinking
- **Gestructureerde output:** `output_config.format` met een JSON-schema; in TypeScript `zodOutputFormat(schema)` plus `client.messages.parse(...)`, resultaat in `parsed_output`. Dit vervangt "prefill" en "vraag om JSON". Bron: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- **Beeld-invoer:** content-block `{type: "image", source: {type: "base64", media_type, data}}` of een URL. Tokens ≈ (breedte × hoogte) / 750; afbeeldingen worden tot ~1568 px verkleind, dus maximaal ~1.600 tokens per foto. Bron: https://platform.claude.com/docs/en/build-with-claude/vision
- **Weigeringen:** `stop_reason: "refusal"` met `stop_details`; altijd controleren vóór het lezen van de inhoud. Server-side fallbacks (beta `server-side-fallback-2026-07-01`, `fallbacks: "default"`) bestaan voor `client.beta.messages`; niet gecombineerd met `parse`, daarom in onze scriptstap een duidelijke foutmelding in plaats van een fallback. Bron: https://platform.claude.com/docs/en/build-with-claude/refusals-and-fallback
- **Fouten:** SDK-klassen `AuthenticationError` (401), `RateLimitError` (429), `APIError` (overig). Standaard 2 retries op 429/5xx. Bron: https://platform.claude.com/docs/en/api/errors
- **Prompt caching:** `cache_control: {type: "ephemeral"}` op het systeemprompt scheelt ~90% op herhaalde aanroepen; pas nuttig bij batches (U1/U3). Bron: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- **Batches API:** 50% korting, asynchroon, voor niet-tijdkritische varianten. Bron: https://platform.claude.com/docs/en/build-with-claude/batch-processing

## Kosten voor onze stap
Eén script van 30 s: ~2.000 invoertokens (prompt) + ~1.600 (foto) + ~900 uitvoertokens ≈ $0,03. Het testscherm toont de werkelijke kosten uit `usage` in het antwoord.

## Grenzen die we bewust hanteren
- Alleen feiten uit de productinformatie; het systeemprompt verbiedt verzonnen prijzen, claims en reviews.
- Eén invalshoek per aanroep (MVP); meerdere invalshoeken komen in U1 als aparte aanroepen of als één aanroep met een array-schema.
- Taal en lengte zijn parameters; het schema dwingt drie voordelen en vaste scènesoorten af.
