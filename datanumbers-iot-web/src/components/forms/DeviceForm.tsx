import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queries } from "@/api/queries";
import { Button } from "@/components/ui/Button";
import { Hint, Input, Label, Select } from "@/components/ui/Input";
import type { CreateDevicePayload, Device } from "@/api/types";

export type DeviceFormValue = CreateDevicePayload;

export function DeviceForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = "Salvar",
  pending = false,
  isEdit = false,
}: {
  initial?: Partial<Device>;
  onSubmit: (value: DeviceFormValue) => void;
  onCancel: () => void;
  submitLabel?: string;
  pending?: boolean;
  isEdit?: boolean;
}) {
  const { data: templates = [], isLoading } = useQuery(queries.templates());
  const [name, setName] = useState(initial?.device_name ?? "");
  const [templateId, setTemplateId] = useState(
    initial?.template_id ?? templates[0]?.template_id ?? "",
  );
  const [status, setStatus] = useState(initial?.device_status ?? "OFFLINE");

  const disabled = !name.trim() || !templateId || pending;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (disabled) return;
        onSubmit({
          device_name: name.trim(),
          template_id: templateId,
          device_status: status,
        });
      }}
      className="flex flex-col gap-3.5"
    >
      <div>
        <Label>Nome do dispositivo</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Estufa · Setor A"
          autoFocus
          required
        />
      </div>
      <div>
        <Label>Template</Label>
        <Select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          required
        >
          {isLoading && <option>Carregando…</option>}
          {!isLoading && templates.length === 0 && (
            <option value="">Crie um template primeiro</option>
          )}
          {templates.map((t) => (
            <option key={t.template_id} value={t.template_id}>
              {t.name}
            </option>
          ))}
        </Select>
        <Hint>
          Define o schema dos dados que esse device vai mandar (não pode mudar
          via API após o cadastro — recrie se precisar).
        </Hint>
      </div>
      {isEdit && (
        <div>
          <Label>Status inicial</Label>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ONLINE">ONLINE</option>
            <option value="OFFLINE">OFFLINE</option>
          </Select>
          <Hint>
            Em produção o status é atualizado automaticamente pelo gateway via
            EMQX. Use só pra forçar um estado inicial.
          </Hint>
        </div>
      )}

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
