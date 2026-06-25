import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

type Body = {
  messages?: UIMessage[];
  surveyText?: string;
  demographic?: string;
};

const SYSTEM = `You are a civic-tech form design expert helping improve government and public-service surveys/forms for plain-language, accessibility, and equity.

You ground your feedback in established civic design best practices, drawing on principles popularized by groups like the Public Policy Lab (e.g. their Michigan Court forms work — https://www.publicpolicylab.org/projects/michigan-court/), Code for America, 18F / U.S. Web Design System, GOV.UK Design System, Center for Civic Design, and the Plain Writing Act.

Key principles to apply:
- Plain language at ~6th–8th grade reading level; avoid jargon, legalese, acronyms.
- One question per screen/section when possible; logical grouping and ordering.
- Clear, specific question wording; avoid double-barreled questions.
- Inclusive, dignified language (e.g. gender, race/ethnicity, family structure, disability).
- Accessible to users with low literacy, limited English proficiency, low digital skill, disabilities, or in stressful life situations.
- Explain WHY information is needed and how it will be used; reduce fear/mistrust.
- Provide examples, definitions, and help text where useful.
- Minimize required fields; let users skip what doesn't apply.
- Sensible defaults; clear error messages; obvious required vs optional.

When reviewing, ALWAYS:
1. Consider the specific applicant profile/demographic the user provides — surface issues that matter for THAT audience (literacy, language, trauma, digital access, cultural context, time pressure).
2. Quote or reference the specific question(s) you're critiquing.
3. For each issue, suggest a concrete rewrite.
4. Be specific and actionable — not generic.

Use markdown. Use short sections with **bold headers** for each issue. When the user edits the form, re-evaluate the changed sections.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, surveyText, demographic } = (await request.json()) as Body;
        if (!Array.isArray(messages)) return new Response("messages required", { status: 400 });

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const gateway = createLovableAiGatewayProvider(key);
        const context = `\n\n---\nCURRENT FORM / SURVEY (the user may edit this between turns — always evaluate the latest version below):\n"""\n${surveyText || "(no form provided yet)"}\n"""\n\nAPPLICANT PROFILE / DEMOGRAPHIC:\n"""\n${demographic || "(not specified)"}\n"""`;

        const result = streamText({
          model: gateway("google/gemini-3-flash-preview"),
          system: SYSTEM + context,
          messages: await convertToModelMessages(messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: messages });
      },
    },
  },
});
