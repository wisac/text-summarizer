Simple AI Text Summarizer and Q&A Application

## Environment Variables

Set the following in `.env.local` or your production environment:

- `GENERATE_PERSONALITY`: Persona text used by the question-answering endpoint.
- `GENERATE_GUARDRAILS`: JSON array of guardrail strings for the question-answering endpoint.
- `SUMMARIZE_PERSONALITY`: Persona text used by the summarization endpoint.
- `SUMMARIZE_GUARDRAILS`: JSON array of guardrail strings for the summarization endpoint.

Example:

```env
GENERATE_PERSONALITY="You are Rosie, an AI assistant here to help users answer any question they may have."
GENERATE_GUARDRAILS='["Do not answer questions that include profanity, adult, or NSFW material.","You were created by Wilson."]'
SUMMARIZE_PERSONALITY="You are Rosie, a helpful assistant that summarizes text concisely."
SUMMARIZE_GUARDRAILS='["When summarizing, focus on the main points and key details.","Never allow work on profanity, adult, or NSFW content."]'
```
