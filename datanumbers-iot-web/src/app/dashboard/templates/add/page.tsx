"use client";

import { Row, Col, Card, Form, Button, ListGroup } from "react-bootstrap";
import { useState } from "react";
import axios from "axios";
import cookieCutter from 'cookie-cutter';
import { useRouter } from "next/navigation";

const AddTemplate = () => {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sensors, setSensors] = useState<{ name: string; type: string; unit: string }[]>([]);
  const [sensorName, setSensorName] = useState("");
  const [sensorType, setSensorType] = useState("number");
  const [sensorUnit, setSensorUnit] = useState("");

  const addSensor = () => {
    if (sensorName) {
      setSensors([...sensors, { name: sensorName, type: sensorType, unit: sensorUnit }]);
      setSensorName("");
      setSensorUnit("");
    }
  };

  const removeSensor = (index: number) => {
    setSensors(sensors.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = cookieCutter.get('@data-token');
    
    const fields = sensors.map(s => ({
      name: s.name,
      type: s.type === "number" ? "float" : s.type,
      required: true
    }));

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/devices/templates`,
        { 
          name: name, 
          description: description, 
          fields: fields 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push("/dashboard/templates");
    } catch (error) {
      console.error("Erro ao criar template:", error);
    }
  };

  return (
    <Row className="justify-content-center">
      <Col md={8}>
        <Card>
          <Card.Header>
            <h4 className="mb-0">Novo Template de Dispositivo</h4>
          </Card.Header>
          <Card.Body>
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Nome do Template</Form.Label>
                <Form.Control
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Sensor Ambiental"
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Descrição</Form.Label>
                <Form.Control
                  as="textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva a finalidade deste template"
                />
              </Form.Group>

              <hr />
              <h5>Sensores</h5>
              <Row className="mb-3 align-items-end">
                <Col md={4}>
                  <Form.Label>Nome do Sensor</Form.Label>
                  <Form.Control
                    type="text"
                    value={sensorName}
                    onChange={(e) => setSensorName(e.target.value)}
                    placeholder="Ex: Temperatura"
                  />
                </Col>
                <Col md={3}>
                  <Form.Label>Tipo</Form.Label>
                  <Form.Select value={sensorType} onChange={(e) => setSensorType(e.target.value)}>
                    <option value="number">Número</option>
                    <option value="boolean">Booleano</option>
                    <option value="string">Texto</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Label>Unidade (Opcional)</Form.Label>
                  <Form.Control
                    type="text"
                    value={sensorUnit}
                    onChange={(e) => setSensorUnit(e.target.value)}
                    placeholder="Ex: °C"
                  />
                </Col>
                <Col md={2}>
                  <Button variant="secondary" onClick={addSensor} className="w-100">Add</Button>
                </Col>
              </Row>

              <ListGroup className="mb-4">
                {sensors.map((sensor, index) => (
                  <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                    {sensor.name} ({sensor.type}) {sensor.unit ? `- ${sensor.unit}` : ""}
                    <Button variant="danger" size="sm" onClick={() => removeSensor(index)}>X</Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>

              <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                <Button variant="secondary" onClick={() => router.back()}>Cancelar</Button>
                <Button variant="primary" type="submit">Salvar Template</Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default AddTemplate;
