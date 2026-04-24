"use client";

import { Row, Col, Card, Table, Button, Form, Modal } from "react-bootstrap";
import { useState, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import useGetAxios from "../../../../../server/GetAxios";
import axios from "axios";
import cookieCutter from 'cookie-cutter';
import { Actuator } from "@/interfaces/Automation";

const DeviceActuators = () => {
  const { id } = useParams();
  const router = useRouter();
  const { data, loaded, reload } = useGetAxios<any>(`/api/devices/devices/${id}/actuators`, true);
  
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [schema, setSchema] = useState('{"type": "object"}');

  const handleAddActuator = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = cookieCutter.get('@data-token');

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/devices/devices/${id}/actuators`,
        {
          name: name,
          command_topic: topic,
          payload_schema: JSON.parse(schema)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowModal(false);
      setName("");
      setTopic("");
      // @ts-ignore
      reload(); 
    } catch (error) {
      console.error("Erro ao cadastrar atuador:", error);
    }
  };

  return (
    <Fragment>
      <div className="bg-primary pt-10 pb-21"></div>
      <div className="container-fluid mt-n22 px-6">
        <Row>
          <Col lg={12} md={12} xs={12}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="mb-2 mb-lg-0">
                <h3 className="mb-0 text-white">Atuadores do Dispositivo</h3>
                <code className="text-white opacity-75">{id}</code>
              </div>
              <div>
                <Button variant="white" onClick={() => setShowModal(true)}>
                  Novo Atuador
                </Button>
                <Button variant="outline-white" className="ms-2" onClick={() => router.back()}>
                    Voltar
                </Button>
              </div>
            </div>
          </Col>
        </Row>
        <Row>
          <Col md={12} xs={12}>
            <Card className="shadow-sm border-0">
              <Table responsive className="text-nowrap mb-0 table-custom">
                <thead>
                  <tr>
                    <th>Nome do Atuador</th>
                    <th>Tópico de Comando</th>
                    <th>Schema</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loaded && data?.data ? (
                    data.data.map((act: Actuator, index: number) => (
                      <tr key={index}>
                        <td className="align-middle fw-semibold">{act.name}</td>
                        <td className="align-middle">
                          <code className="text-success">{act.command_topic}</code>
                        </td>
                        <td className="align-middle">
                          <small className="text-muted">{JSON.stringify(act.payload_schema)}</small>
                        </td>
                        <td className="align-middle">
                          <Button variant="light" size="sm" className="text-danger">
                            <i className="fe fe-trash-2"></i>
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-5">
                        {loaded ? "Nenhum atuador configurado" : "Carregando..."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card>
          </Col>
        </Row>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Adicionar Atuador</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddActuator}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome</Form.Label>
              <Form.Control type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Relé de Luz" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tópico MQTT de Comando</Form.Label>
              <Form.Control type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Ex: gateway.command/device/relay1" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>JSON Schema do Payload</Form.Label>
              <Form.Control as="textarea" rows={3} value={schema} onChange={(e) => setSchema(e.target.value)} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Fechar</Button>
            <Button variant="primary" type="submit">Salvar Atuador</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Fragment>
  );
};

export default DeviceActuators;
