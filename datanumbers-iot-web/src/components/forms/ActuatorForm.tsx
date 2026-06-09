import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Hint, Input, Label, Textarea } from "@/components/ui/Input";
import type { Actuator, CreateActuatorPayload } from "@/api/types";

export function ActuatorForm({
  initial,
  defaultTopicPrefix,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
  pending = false,
}: {
  initial?: Partial<Actuator>;
  /** Prefixo do tópico (ex.: gateway.cmd/<deviceId>) usado na UI. */
  defaultTopicPrefix?: string;
  onSubmit: (value: CreateActuatorPayload) => void;
  onCancel: () => void;
  submitLabel?: string;
  pending?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [topic, setTopic] = useState(initial?.command_topic ?? defaultTopicPrefix ?? "");
  const [schemaText, setSchemaText] = useState(
    initial?.payload_schema
      ? JSON.stringify(initial.payload_schema, null, 2)
      : `{\n  "open": true,\n  "duration_s": 300\n}`,
  );
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const disabled = !name.trim() || !topic.trim() || pending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        let schema: Record<string, unknown> | undefined;
        if (schemaText.trim()) {
          try {
            schema = JSON.parse(schemaText) as Record<string, unknown>;
            setSchemaError(null);
          } catch (err) {
            setSchemaError((err as Error).message);
            return;
          }
        }
        onSubmit({
          name: name.trim(),
          command_topic: topic.trim(),
          payload_schema: schema,
        });
      }}
      className="flex flex-col gap-3.5"
    >
      <div>
        <Label>Nome</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Válvula de irrigação"
          autoFocus
          required
        />
      </div>
      <div>
        <Label>Tópico de comando MQTT</Label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="font-mono"
          required
        />
        <Hint>
          O gateway-emqx republica nesse tópico quando uma regra dispara.
        </Hint>
      </div>
      <div>
        <Label>Payload schema (JSON)</Label>
        <Textarea
          value={schemaText}
          onChange={(e) => setSchemaText(e.target.value)}
          rows={6}
          className="font-mono text-[12px]"
        />
        {schemaError && (
          <div className="text-[11px] text-danger mt-1">JSON inválido: {schemaError}</div>
        )}
        <Hint>
          Documentação informativa. As regras usam `payload_template` separado
          que interpola placeholders <code>{`\${payload.x}`}</code>.
        </Hint>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={disabled}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
