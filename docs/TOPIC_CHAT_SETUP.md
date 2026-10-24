# Connect the topic notes assistant

This setup is for the website owner once. Teachers do not enter keys.

1. Open Google AI Studio (https://aistudio.google.com), choose API keys, and create an API key for your project.
2. Open your EduPlan project in Lovable. In the project toolbar, open More, then Secrets (Cloud/backend). Add GEMINI_API_KEY as the name and your key as the value. Enter the value only in the secret field, not in Lovable chat, source code or GitHub.
3. Save the secret, publish the latest version, and refresh the website. Open a topic's notes icon, leave AI on Auto, and click Send. Review the returned points and choose Insert notes. A successful connection must be checked on the deployed server; a build alone cannot verify it.

Optional backup: create a key at https://console.groq.com/keys and add a second server secret named GROQ_API_KEY. Auto can then try another configured provider if one fails. Choosing Gemini or Groq explicitly uses that provider before the labelled textbook fallback.

The default topic models are gemini-3.1-flash-lite and openai/gpt-oss-120b. Optional server variables GEMINI_TOPIC_CHAT_MODEL and GROQ_TOPIC_CHAT_MODEL override them. Use a model available to your account and quota. Free tiers have provider, account and rate restrictions; unlimited responses are not promised. The website gateway remains another Auto option if already configured.

If Gemini cannot answer, choose Auto or Use textbook notes under Sources and other options. Notes from sources are labelled as excerpts. If there is no readable matching evidence, the assistant reports it rather than inventing textbook claims. Do not use a VITE_ variable for a private API key.

Official setup references:
- https://ai.google.dev/gemini-api/docs/api-key
- https://ai.google.dev/gemini-api/docs/billing
- https://console.groq.com/docs/quickstart
- https://console.groq.com/docs/rate-limits
- https://docs.lovable.dev/features/secrets
