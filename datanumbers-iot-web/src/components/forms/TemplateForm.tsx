import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Hint, Input, Label, Select } from "@/components/ui/Input";
import { Icon } from "@/components/Icon";
import type {
  CreateTemplatePayload,
  Template,
  TemplateField,
} from "@/api/types";

const FIELD_TYPES: TemplateField["type"][] = ["float", "int", "bool", "string"];

export type TemplateFormValue = CreateTemplatePayload;

export function TemplateForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
  pending = false,
}: {
  initial?: Partial<Template> & { fields?: TemplateField[] };
  onSubmit: (value: TemplateFormValue) => void;
  onCancel: () => void;
  submitLabel?: string;
  pending?: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [fields, setFields] = useState<TemplateField[]>(
    initial?.fields?.length
      ? initial.fields
      : [{ name: "temp", type: "float", required: true }],
  );

  function update(i: number, patch: Partial<TemplateField>) {
    setFields((f) => f.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  function remove(i: number) {
    setFields((f) => f.filter((_, j) => j !== i));
  }

  const disabled =
    !name.trim() ||
    fields.length === 0 ||
    fields.some((f) => !f.name.trim()) ||
    pending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        onSubmit({
          name: name.trim(),
          description: description.trim() || undefined,
          fields: fields.map((f) => ({
            name: f.name.trim(),
            type: f.type,
            required: f.required,
          })),
        });
      }}
      className="flex flex-col gap-3.5"
    >
      <div>
        <Label>Nome do template</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Sensor Ambiental"
          autoFocus
          required
        />
      </div>
      <div>
        <Label>Descrição</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Opcional"
        />
      </div>
      <div>
        <Label>Campos</Label>
        <Hint>Define o schema dos dados que esse tipo de dispositivo envia.</Hint>
        <div className="mt-2 flex flex-col gap-2">
          {fields.map((f, i) => (
            <div
              key={i}
              className="flex gap-2 items-center bg-bg-subtle border border-border rounded p-2"
            >
              <Input
                value={f.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="nome"
                className="flex-1 bg-bg-elev"
              />
              <Select
                value={f.type}
                onChange={(e) =>
                  update(i, { type: e.target.value as TemplateField["type"] })
                }
                className="w-24 bg-bg-elev"
              >
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
              <label className="flex items-center gap-1 text-[11px] text-fg-muted whitespace-nowrap px-1">
                <input
                  type="checkbox"
                  checked={f.required}
                  onChange={(e) => update(i, { required: e.target.checked })}
                />
                obrigatório
              </label>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Remover campo"
                className="w-7 h-7 grid place-items-center rounded text-fg-muted hover:bg-bg-hover hover:text-danger"
                disabled={fields.length === 1}
              >
                <Icon name="trash" size={13} />
              </button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() =>
            setFields((f) => [...f, { name: "", type: "float", required: false }])
          }
        >
          <Icon name="plus" size={12} /> Adicionar campo
        </Button>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={disabled}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
