'use client';

import { useChat } from '@ai-sdk/react';
import { ChefHat, Loader2, RotateCcw, SendHorizonal, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { ChatMessage } from './chat-message';
import { SuggestedQuestions } from './suggested-questions';
import { runningLabel, toolPartsOf } from './tool-trace';

export function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, error, stop, regenerate, setMessages } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status]);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    sendMessage({ text: trimmed });
    setInput('');
  };

  // While the answer has no text yet, show what the assistant is doing.
  const last = messages[messages.length - 1];
  const waitingForText =
    busy && (last?.role !== 'assistant' || !last.parts.some((p) => p.type === 'text' && p.text));
  const runningTool = last?.role === 'assistant' ? toolPartsOf(last).at(-1) : undefined;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
      <div className="flex-1 space-y-4 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-5 pt-8 text-center sm:pt-16">
            <ChefHat className="h-12 w-12 text-primary" aria-hidden />
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">Mit főzzünk ma?</h1>
              <p className="max-w-lg text-sm text-muted-foreground">
                Jeff Thompson 85 receptje és a feltöltött dokumentumaid alapján válaszolok.
                Ha valami nincs a gyűjteményben, megmondom, és hasonlót ajánlok.
              </p>
            </div>
            <SuggestedQuestions onPick={send} disabled={busy} />
          </div>
        )}

        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}

        {waitingForText && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {runningTool ? `${runningLabel(runningTool)}…` : 'Gondolkodom…'}
          </div>
        )}

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm" role="alert">
            <p className="font-medium text-destructive">Hiba történt a válasz közben.</p>
            <p className="text-muted-foreground">{error.message}</p>
            <Button size="sm" variant="outline" className="mt-2" onClick={() => regenerate()}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Újrapróbálom
            </Button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 pb-4 pt-3 backdrop-blur">
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Kérdezz egy receptről, hozzávalóról vagy technikáról…"
            aria-label="Kérdés"
            className="max-h-40 min-h-10 flex-1 resize-none rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {busy ? (
            <Button type="button" size="icon" variant="outline" onClick={() => stop()} aria-label="Leállítás">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Küldés">
              <SendHorizonal className="h-4 w-4" />
            </Button>
          )}
        </form>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Enter: küldés · Shift+Enter: új sor</span>
          {messages.length > 0 && !busy && (
            <button type="button" className="hover:text-foreground hover:underline" onClick={() => setMessages([])}>
              Új beszélgetés
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
