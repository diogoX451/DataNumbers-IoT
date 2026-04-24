"use client";

import { Row, Col, Card, Form, Button } from "react-bootstrap";
import { useState, useEffect } from "react";
import axios from "axios";
import cookieCutter from 'cookie-cutter';
import { useRouter } from "next/navigation";
import useGetAxios from "../../../../server/GetAxios";

const AddDevice = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [templateId, setTemplateId] = useState("");

  const { data: templatesData, loaded: templatesLoaded } = useGetAxios<any>("/api/devices/templates", true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = cookieCutter.get('@data-token');

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/devices/devices`,
        {
          device_name: name,
          template_id: templateId,
          mqtt_topic: `gateway.data/${deviceId}`
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Também cria as regras de ACL MQTT
      try {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/gateway/create-acl`,
          { deviceId, templateId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } catch (aclError) {
        console.error("Erro ao criar ACL:", aclError);
      }

      router.push("/dashboard/devices");
    } catch (error) {
      console.error("Erro ao cadastrar dispositivo:", error);
    }
  };

  return (
    <Row className="justify-content-center">
      <Col md={8}>
        <Card>
          <Card.Header>
            <h4 className="mb-0">Cadastrar Novo Dispositivo</h4>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Nome Amigável</Form.Label>
                <Form.Control
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Sensor Sala de Estar"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>ID Único do Dispositivo (Client ID MQTT)</Form.Label>
                <Form.Control
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  placeholder="Ex: sensor_001"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Template</Form.Label>
                <Form.Select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  required
                >
                  <option value="">Selecione um template</option>
                  {templatesLoaded && templatesData?.data?.map((template: any) => (
                    <option key={template.template_id} value={template.template_id}>
                      {template.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <div className="d-grid gap-2 d-md-flex justify-content-md-end mt-4">
                <Button variant="secondary" onClick={() => router.back()}>Cancelar</Button>
                <Button variant="primary" type="submit">Cadastrar Dispositivo</Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default AddDevice;
