"use client";

import { Row, Col, Card, Form, Button } from "react-bootstrap";
import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import cookieCutter from 'cookie-cutter';
import useGetAxios from "../../../../../server/GetAxios";

const AddRule = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [condition, setCondition] = useState("");

  // Para a Ação
  const [selectedDevice, setSelectedDevice] = useState("");
  const [selectedActuator, setSelectedActuator] = useState("");
  const [payloadTemplate, setPayloadTemplate] = useState('{"state": "ON"}');

  const { data: devicesData, loaded: devicesLoaded } = useGetAxios<any>("/api/devices/devices", true);
  const { data: actuatorsData, loaded: actuatorsLoaded, reload: reloadActuators } = useGetAxios<any>(
    selectedDevice ? `/api/devices/devices/${selectedDevice}/actuators` : null,
    true
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = cookieCutter.get('@data-token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

    try {
      // 1. Criar a Regra
      const ruleRes = await axios.post(
        `${apiUrl}/api/rules/rules`,
        {
          name: name,
          description: description,
          trigger_condition: condition,
          is_active: true
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const ruleId = ruleRes.data.rule_id;

      // 2. Criar a Ação vinculada
      if (selectedActuator) {
        await axios.post(
          `${apiUrl}/api/rules/rules/${ruleId}/actions`,
          {
            actuator_id: selectedActuator,
            payload_template: payloadTemplate
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      router.push("/dashboard/automation/rules");
    } catch (error) {
      console.error("Erro ao cadastrar regra:", error);
    }
  };

  return (
    <Row className="justify-content-center">
      <Col md={10}>
        <Card className="shadow-sm border-0">
          <Card.Header className="bg-white py-3">
            <h4 className="mb-0">Configurar Nova Regra de Automação</h4>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Row>
                <Col md={6}>
                  <h5>Gatilho (Trigger)</h5>
                  <Form.Group className="mb-3">
                    <Form.Label>Nome da Regra</Form.Label>
                    <Form.Control type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Alerta de Alta Temperatura" required />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Descrição</Form.Label>
                    <Form.Control as="textarea" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Condição Lógica (Sintaxe: payload.campo  valor)</Form.Label>
                    <Form.Control type="text" value={condition} onChange={(e) => setCondition(e.target.value)} placeholder="Ex: payload.temp > 25" required />
                    <Form.Text className="text-muted">
                      A condição é avaliada sempre que novos dados chegam.
                    </Form.Text>
                  </Form.Group>
                </Col>

                <Col md={6} className="border-start">
                  <h5>Ação (Action)</h5>
                  <Form.Group className="mb-3">
                    <Form.Label>Dispositivo Alvo</Form.Label>
                    <Form.Select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)} required>
                      <option value="">Selecione o dispositivo</option>
                      {devicesLoaded && devicesData?.data?.map((d: any) => (
                        <option key={d.device_id} value={d.device_id}>{d.device_name}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Atuador</Form.Label>
                    <Form.Select value={selectedActuator} onChange={(e) => setSelectedActuator(e.target.value)} required disabled={!selectedDevice}>
                      <option value="">Selecione o atuador</option>
                      {actuatorsLoaded && actuatorsData?.data?.map((a: any) => (
                        <option key={a.actuator_id} value={a.actuator_id}>{a.name} ({a.command_topic})</option>
                      ))}
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Payload de Comando (JSON)</Form.Label>
                    <Form.Control as="textarea" rows={3} value={payloadTemplate} onChange={(e) => setPayloadTemplate(e.target.value)} required />
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-grid gap-2 d-md-flex justify-content-md-end mt-4 pt-3 border-top">
                <Button variant="secondary" onClick={() => router.back()}>Cancelar</Button>
                <Button variant="primary" type="submit">Ativar Regra</Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default AddRule;
