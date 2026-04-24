# NATS Contracts

NATS is the canonical messaging layer for DataNumbers IoT.

## Subject Naming

- `iot.telemetry.received`: telemetry accepted from MQTT ingress.
- `device.created`: device created or registered.
- `device.updated`: device metadata updated.
- `device.deleted`: device removed.
- `template.created`: telemetry template created.
- `template.updated`: telemetry template updated.
- `template.deleted`: telemetry template removed.
- `acl.created`: MQTT/NATS access rule created.

## Telemetry Envelope

Telemetry messages use a stable envelope and dynamic payload:

```json
{
  "event_id": "fd36d17d-73d8-4f6f-b8ed-a87e3bb04d58",
  "device_id": "084cb486-024a-462c-b040-c8db6f7e6c69",
  "template_id": "f5f785f9-8145-4f2b-8625-63442f72b076",
  "schema_version": 1,
  "topic": "gateway.data/084cb486-024a-462c-b040-c8db6f7e6c69",
  "timestamp": "2026-04-24T12:00:00Z",
  "payload": {
    "temperatura": 25.4,
    "umidade": 68.2
  },
  "metadata": {
    "source": "emqx"
  }
}
```

`payload` is intentionally open-ended. Its valid fields and field types are defined by the device template.
