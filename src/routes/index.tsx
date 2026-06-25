import { createFileRoute } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Send, Upload, Users, Sparkles, ScanSearch } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FormSense — Civic Form Equity Reviewer" },
      {
        name: "description",
        content:
          "Upload a public-service form, describe your applicants, and get a plain-language equity review grounded in civic design best practices.",
      },
    ],
  }),
  component: Index,
});

const SAMPLE_SURVEY = `1. Full legal name: ________________
2. Aliases / Other names used: ________________
3. Date of birth (MM/DD/YYYY): ________________
4. Social Security Number: ________________
5. Marital status: [ ] Single  [ ] Married  [ ] Divorced  [ ] Widowed
6. Have you or any member of your household ever been convicted of a felony? Y / N
7. Gross monthly household income from all sources prior to deductions: $______
8. List all dependents and their relationship to the petitioner:
9. Have you previously filed a petition pursuant to MCL 600.2529? Y / N
10. Affirm under penalty of perjury that the foregoing is true and correct: ____`;

const SAMPLE_DEMO = `Low-income parents applying for fee waivers in a county court. Many are first-time filers, some have limited English proficiency, varying literacy levels, and are often filling out the form during a stressful life event (eviction, custody dispute).`;

function Index() {
  const [survey, setSurvey] = useState(SAMPLE_SURVEY);
  const [demographic, setDemographic] = useState(SAMPLE_DEMO);
  const [input, setInput] = useState("");
  const surveyRef = useRef(survey);
  const demoRef = useRef(demographic);
  useEffect(() => {
    surveyRef.current = survey;
  }, [survey]);
  useEffect(() => {
    demoRef.current = demographic;
  }, [demographic]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages, id }) => ({
          body: {
            id,
            messages,
            surveyText: surveyRef.current,
            demographic: demoRef.current,
          },
        }),
      }),
    [],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    transport,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  const isLoading = status === "submitted" || status === "streaming";

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setSurvey(text);
  };

  const runAssessment = async () => {
    if (!survey.trim()) return;
    await sendMessage({
      text: `Please review the form for the applicant profile I described. Highlight where applicants are likely to get confused, drop off, or feel mistrust. For each issue cite the specific question, explain the risk, and suggest a concrete rewrite.`,
    });
  };

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const text = input.trim();
    setInput("");
    await sendMessage({ text });
  };

  const reset = () => setMessages([]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ScanSearch className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">FormSense</h1>
              <p className="text-xs text-muted-foreground">
                Civic form equity review — grounded in public-interest design best practices
              </p>
            </div>
          </div>
          <a
            href="https://www.publicpolicylab.org/projects/michigan-court/"
            target="_blank"
            rel="noreferrer"
            className="hidden text-xs text-muted-foreground underline-offset-4 hover:underline md:inline"
          >
            Reference: Public Policy Lab — Michigan Court forms
          </a>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-[1.1fr_1fr]">
        {/* LEFT: Form & demographic */}
        <section className="flex flex-col gap-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <Label htmlFor="demo" className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" /> Applicant profile / demographic
            </Label>
            <Textarea
              id="demo"
              value={demographic}
              onChange={(e) => setDemographic(e.target.value)}
              placeholder="Describe who fills out this form: literacy, language, life context, digital access, time pressure..."
              className="mt-2 min-h-[80px] resize-y"
            />
          </div>

          <div className="flex-1 rounded-lg border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <Label className="flex items-center gap-2 text-sm font-medium">
                <FileText className="h-4 w-4" /> The form
              </Label>
              <div className="flex items-center gap-2">
                <Label
                  htmlFor="upload"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload .txt / .md
                </Label>
                <Input
                  id="upload"
                  type="file"
                  accept=".txt,.md,.csv,text/*"
                  className="hidden"
                  onChange={handleFile}
                />
                <Button size="sm" onClick={runAssessment} disabled={isLoading}>
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {messages.length === 0 ? "Run assessment" : "Re-assess"}
                </Button>
              </div>
            </div>
            <Tabs defaultValue="edit" className="p-4">
              <TabsList>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              <TabsContent value="edit" className="mt-3">
                <Textarea
                  value={survey}
                  onChange={(e) => setSurvey(e.target.value)}
                  placeholder="Paste form questions here, or upload a .txt file..."
                  className="min-h-[480px] resize-y font-mono text-sm leading-relaxed"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Tip: edit inline, then ask the chatbot to re-evaluate just the changed
                  questions.
                </p>
              </TabsContent>
              <TabsContent value="preview" className="mt-3">
                <div className="min-h-[480px] whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
                  {survey || (
                    <span className="text-muted-foreground">No form content yet.</span>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        {/* RIGHT: Chat */}
        <section className="flex h-[calc(100vh-140px)] flex-col rounded-lg border bg-card shadow-sm lg:sticky lg:top-6">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Equity reviewer</p>
                <p className="text-[11px] text-muted-foreground">
                  Plain-language · accessibility · trust
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <Button size="sm" variant="ghost" onClick={reset}>
                Clear
              </Button>
            )}
          </div>

          <ScrollArea className="flex-1">
            <div ref={scrollRef} className="space-y-4 px-4 py-4">
              {messages.length === 0 && (
                <EmptyState onPrompt={(t) => sendMessage({ text: t })} />
              )}
              {messages.map((m) => (
                <ChatMessage key={m.id} message={m} />
              ))}
              {status === "submitted" && (
                <div className="text-sm text-muted-foreground">Thinking…</div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="Ask about a specific question, request a rewrite, or re-evaluate after editing…"
                className="min-h-[56px] resize-none"
                disabled={isLoading}
              />
              <Button onClick={send} disabled={isLoading || !input.trim()} className="h-auto">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function EmptyState({ onPrompt }: { onPrompt: (t: string) => void }) {
  const prompts = [
    "Which questions are most likely to confuse a first-time filer?",
    "Flag any questions that could feel intrusive or build mistrust.",
    "Rewrite question 6 in plain language at a 6th-grade level.",
    "What's missing? Where should we add help text or examples?",
  ];
  return (
    <div className="space-y-3 rounded-md border border-dashed bg-muted/20 p-4">
      <p className="text-sm text-muted-foreground">
        Describe your applicants and click <span className="font-medium">Run assessment</span>, or
        start with a prompt:
      </p>
      <div className="flex flex-col gap-1.5">
        {prompts.map((p) => (
          <button
            key={p}
            onClick={() => onPrompt(p)}
            className="rounded border bg-card px-3 py-2 text-left text-xs hover:border-primary hover:bg-accent/30"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: UIMessage }) {
  const text = message.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .join("")
    .trim();
  const isUser = message.role === "user";
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
          {text}
        </div>
      </div>
    );
  }
  return (
    <div className="prose prose-sm max-w-none text-sm leading-relaxed text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-xs">
      <ReactMarkdown>{text || "…"}</ReactMarkdown>
    </div>
  );
}
