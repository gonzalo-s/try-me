# try-me — AI Try-On Proof of Concept

This repository is a desktop-focused proof-of-concept (POC) demonstrating how AI can be used to let a user "try on" a product (for example a hat, sunglasses, or clothing) on a photo they provide.

The app shows a complete minimal flow: collect a user photo, send image+metadata to an AI-backed image composition endpoint, and display the generated result with a small interactive UX (zoom on hover, preview, etc.).

## Main idea

- Goal: create a POC where the user can upload a front-facing photo and see the product composited onto their image using AI. The app preserves the user's proportions by sending image metadata (width/height/aspect) along with the request.
- Desktop-only POC: the UX focuses on desktop flows, keyboard accessibility, and accessible error feedback.

### Desktop user flow

1. User lands on a product page and clicks "Try me".
2. User uploads a front-facing photo (the UI explains orientation/crop requirements).
3. **The UI immediately displays a preview of the uploaded photo.**
4. The UI computes image metadata (natural width/height, aspect ratio).
5. User provides a short prompt to guide placement (e.g., "place the cap on my head").
6. On submit the app sends a multipart/form-data request containing the user image and a JSON part with product and user metadata.
7. The API route calls the configured AI provider to generate a composited image and returns it to the client.
8. The client **replaces the preview with the generated result** using a polished UI: animated loader, consistent layout, and an interactive zoom-on-hover preview.

### Behind the scenes — step-by-step mapping (UI → client → server → AI)

-1. UI (browser)

- User selects a product and activates the "Try me" action. In this POC the try-on UI (`TryMePanel`) is embedded inline on the product page (see `app/products/[slug]/page.tsx`) and toggled in-place.
- User picks or drops an image file. The client immediately reads the file and computes lightweight metadata.
- **Immediate Feedback:** Structurally, the `TryMePanel` creates a local object URL for the uploaded file and displays it immediately in the preview area, improving perceived responsiveness before the server request begins.
- Form data is validated client-side (required fields, image orientation check).

2. Client serialization & request

- The client constructs a multipart/form-data payload. It contains two parts:
  - A JSON part (key: "json") with product information, selected variant, user-provided prompt, and computed image metadata.
  - A binary part (key: "userImageFile") containing the File/Blob the user uploaded.
- The client sends the request to the app API route (for example: POST /api/tryon).

3. Server API route (Next.js route)

- The route parses the multipart request. It validates the JSON payload server-side (file presence/size/type) and returns structured errors when validation fails.
- The server translates the normalized request into whatever format the chosen AI provider requires (multipart, base64-in-json, or provider-specific SDK call).

4. AI provider call

- The server calls the provider with normalized inputs: the user image (possibly resized), a prompt describing the product and placement, and metadata such as the user's image aspect ratio.
- The provider returns a composite image (or a link/bytes). Monitor and handle provider errors, timeouts, and moderation flags.

5. Server postprocessing

- Store or stream the binary back to the client. Return a small JSON envelope with a result URL or blob data.

6. Client display

- The client receives the result and swaps the loader to the final image.
- Render an accessible preview with tools: zoom-on-hover (or a magnifier), download/save, and an accessible caption describing the product & variant used.

Notes on error handling

- Client-side: show inline errors for validation problems and an accessible toast/region for server-side failures with clear next steps (retry, check image orientation, contact support).
- Server-side: return structured errors (status code + JSON with { code, message, fields? }) so the client can map messages to inputs and focus the first invalid control.

## Stack (what this POC uses)

- Next.js (App Router)
- React 19, TypeScript
- Tailwind CSS for styling
- react-hook-form + zod for form handling and validation
- react-inner-image-zoom for the result magnifier

## Libraries & resources

- react-hook-form — https://react-hook-form.com/
- zod — https://github.com/colinhacks/zod
- @hookform/resolvers — https://github.com/react-hook-form/resolvers
  -- react-inner-image-zoom — https://www.npmjs.com/package/react-inner-image-zoom (docs: https://innerimagezoom.com/docs/react)
  -- Vercel AI / ai package — https://vercel.com/docs/concepts/ai
  -- Google Gemini adapter in `lib/ai/gemini-tryon.ts` (used by the API route when the provider is configured as Gemini)

Check `package.json` for a full list of packages used in this POC.

## Special notes on AI in this POC

This POC implements an AI-powered try-on feature using Google's Gemini models.

### Model Selection

The project supports two main Gemini models for image generation, configurable via the `GOOGLE_GEMINI_IMAGE_MODEL` environment variable (defaults to `gemini-3-pro-preview` in the latest code):

- **Gemini 3 Pro Image Preview (`gemini-3-pro-preview` / `gemini-3-pro-image-preview`)**:

  - **Recommended for production.**
  - Designed for professional asset production and complex instructions.
  - Features real-world grounding using Google Search and a "Thinking" process for refined composition.
  - Capable of generating images up to 4K resolution.
  - Currently implemented via `lib/ai/gemini-tryon-b.ts` using an "Advanced Composition" approach (natural language instructions with multiple image inputs).

- **Gemini 2.5 Flash Image (`gemini-2.5-flash-image`)**:
  - Designed for speed and efficiency.
  - Optimized for high-volume, low-latency tasks.
  - Generates images at 1024px resolution.
  - Previously used as the default.

### Implementation Details

- The API route at `POST /api/tryon` handles the request.
- It delegates to `tryOnWithGeminiFiles` (currently imported from `lib/ai/gemini-tryon-b.ts`).
- The implementation uses the Vercel AI SDK (`ai` package) and the `@ai-sdk/google` provider.

### Note on Sizing Data

The UI collects user measurements (Height, Chest, Waist, Hips, Foot Size) to demonstrate a complete data collection flow.

**Important:** In this specific POC implementation, while these measurements are passed to the AI prompt context, the current generative models primarily rely on visual composition (fitting the garment image onto the user image) rather than strict physics-based sizing simulation. The sizing data is included to show how such data would be collected and passed for future discovery paths or more specialized physics-based try-on models.

## AI instructions and system fields (how this POC composes prompts)

This project adopts an **Advanced Composition** approach (recommended for newer multimodal models like Gemini 3 Pro), moving away from strict system-role constraints in favor of direct, natural language task descriptions with multiple image inputs.

### Advanced Composition Strategy (Gemini 3 Pro)

The current implementation (`lib/ai/gemini-tryon-b.ts`) constructs a single multimodal prompt that:

1.  **Defines the Task:** "Generate a realistic image of the person provided in the first image wearing the garment provided in the second image."
2.  **Provides Context:** Includes the product title, description, and user measurements (as text).
3.  **Sets Quality Goals:** Instructions to "ensure the garment fits naturally", "preserve the person's identity", and "maintain lighting conditions".
4.  **Attaches Inputs:** Sends two image parts directly in the user message:
    - `USER_PHOTO` (First image)
    - `PRODUCT_PHOTO` (Second image)

This "show, don't just tell" approach leverages the model's native ability to understand and merge visual contexts without requiring complex "system" role engineering.

### Legacy Prompting (Gemini 2.5 Flash)

The previous implementation (`lib/ai/gemini-tryon.ts`) used a more traditional structure with a distinct "System Message" (defining strict rules like "do not change proportions") and a structured "Instruction" block. This method is still available for older or faster models where explicit constraints may be more necessary.

How the code wires these together

- `app/api/tryon/route.ts` parses the multipart payload and calls only one of the implementation files (currently `lib/ai/gemini-tryon-b.ts`).
- The chosen implementation builds the prompt string and calls `generateText` with the model-specific configuration.
- `lib/ai/gemini-tryon-b.ts` uses `pickImageFromPro` to handle the specific response format of the newer models (handling `inlineData` in candidates), whereas the older implementation used `pickImageFromFlash`.

Where to look in the code

- Server route: `app/api/tryon/route.ts`
- Advanced Composition Implementation: `lib/ai/gemini-tryon-b.ts` (Active)
- Legacy Implementation: `lib/ai/gemini-tryon.ts` (Reference)

Why this matters

- System messages set non-negotiable constraints and reduce undesirable outputs by instructing the model which transformations are allowed. The instruction gives the model the task and context (measures, any user prompt). Together with the attached images they form the full multimodal request.
- The current code does not compute explicit x/y placement coordinates. Instead it relies on the system+instruction text and optional measures/aspect metadata to guide the provider's composition.

Where to look in the code

- Server route: `app/api/tryon/route.ts`
- Gemini flow / prompt assembly: `lib/ai/gemini-tryon.ts`
- Response handling and binary extraction: `lib/ai/gemini-tryon.ts` (functions `pickFirstImageFile` and `extractBytesAndMime`)

## Findings & important AI notes

Right now this POC handles every product the same way: it uses the same `system` prompt and the same product-updated `instruction` for each item. Consider exploring edge cases and **tuning the `system` and `instruction` per product category** (or by specific product composition/materials).

_Note:_ image-to-image multimodal models are still relatively new and can be inconsistent. Targeted prompt and system adjustments per category often improve fidelity and reduce failure modes.

## Findings & notes (what the code does)

- This POC currently uses the Gemini file-based flow (see `lib/ai/gemini-tryon.ts`) to request a composed image when the server is configured for Gemini. The API route then returns a data URI that the client displays.
- The client computes and sends lightweight image metadata (natural width, height, aspect) with the multipart request so the server/provider can preserve proportions.
- The request/response is synchronous in the sense that the client waits for the provider response and displays a loader; the API route is intentionally simple and returns HTTP 501 for providers other than Gemini to make switching explicit during testing.

## How to run (dev)

1. Install dependencies:

```bash
npm install
# or yarn
```

2. Start dev server (Node >= 20 recommended for current Next.js):

```bash
npm run dev
```

3. Visit http://localhost:3000. Set AI provider keys in environment variables before using try-on.

Environment variables

This project reads runtime configuration from environment variables. For local development create a file named `.env.local` in the repository root (Next.js automatically loads `.env.local` during local dev). Do NOT commit this file to source control if it contains real API keys.

Gemini (Google) example `.env.local`

```env
# Provider used by the server for try-on (the POC currently implements the Gemini flow)
TRYME_PROVIDER=gemini

# Google Generative AI API key (used by the `@ai-sdk/google` adapter)
GOOGLE_GENERATIVE_AI_API_KEY=your_google_generative_ai_api_key_here

# Optional: which Gemini image model to call (defaults to gemini-2.5-flash-image)
GOOGLE_GEMINI_IMAGE_MODEL=gemini-2.5-flash-image

# Base URL used when the server resolves public product image paths (useful in dev)
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# NOTE: keep secrets out of git. Use .env.local (ignored by default) or your
# platform's secret manager when deploying to production.
```

Helpful links & notes

- Google Generative AI / Gemini docs: https://developers.generativeai.google/
- The code uses the `@ai-sdk/google` adapter via `ai` — the adapter expects an API key in `GOOGLE_GENERATIVE_AI_API_KEY` (see `lib/ai/gemini-tryon.ts`).
- `NEXT_PUBLIC_BASE_URL` is used by the API route to build absolute URLs for product images during local development (see `app/api/tryon/route.ts`).

Note: the repo currently targets the Gemini (Google) flow. Switching to other providers requires adding or enabling the corresponding server-side implementation and credentials.

## Next steps / improvements

- Extract a `components/MagnifiedImage.tsx` wrapper to centralize magnifier library usage and fallbacks.
- Add server-side validation for file size/type and return structured errors from the API route.
- Add an integration test harness that mocks AI provider responses and verifies the full flow.
- Add analytics and retries for slow/failed AI calls.

---
