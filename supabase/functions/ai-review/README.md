# ai-review (AI form pre-check)

The app (`lib/ai-review.ts`) extracts ~10 JPEG frames from the recorded clip and POSTs them to
`NEXT_PUBLIC_AI_REVIEW_URL`. Deploy a Supabase Edge Function here that calls a vision model.

Request:  `{ "lift": "squat"|"bench"|"deadlift", "weightKg": 180, "frames": ["data:image/jpeg;base64,…"] }`

Response: 
```json
{
  "checks": [{ "id": "depth", "result": "pass"|"fail"|"unclear", "note": "optional" }],
  "summary": "one sentence",
  "confidence": 0.82,
  "model": "name"
}
```

Check ids: squat `depth`, `lockout` · bench `pause`, `lockout` · deadlift `lockout`, `shoulders`.
Prompt the model per lift: squat = hip crease below the top of the knee at the bottom, then knees and hips locked;
bench = bar motionless on chest, then even elbow lockout; deadlift = hips and knees locked, shoulders back.
Return "unclear" when the frames don't show it. The verdict is advisory; moderators decide.
