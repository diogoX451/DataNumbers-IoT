"use client";

import { Row, Col, Card, Table, Button, Form, Modal, ListGroup } from "react-bootstrap";
import { useState, Fragment } from "react";
import { useParams, useRouter } from "next/navigation";
import useGetAxios from "../../../../../server/GetAxios";
import axios from "axios";
import cookieCutter from 'cookie-cutter';

const ScenarioDetails = () => {
  const { id } = useParams();
  const router = useRouter();
  const token = cookieCutter.get('@data-token');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  const { data: scenario, loaded: scenarioLoaded } = useGetAxios<any>(`/api/rules/scenarios`, true);
  const { data: linkedDevices, loaded: devicesLoaded, reload: reloadDevices } = useGetAxios<any[]>(`/api/rules/scenarios/${id}/devices`, true);
  const { data: rules, loaded: rulesLoaded } = useGetAxios<any[]>(`/api/rules/rules?scenario_id=${id}`, true);
  const { data: allDevices } = useGetAxios<any>("/api/devices/devices", true);

  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState("");

  const handleLinkDevice = async () => {
    try {
      await axios.post(
        `${apiUrl}/api/rules/scenarios/${id}/devices`,
        { device_id: selectedDevice },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowDeviceModal(false);
      // @ts-ignore
      reloadDevices();
    } catch (error) {
      console.error("Erro ao vincular dispositivo:", error);
    }
  };

  // Encontrar o cenário atual no array de cenários (simplificação)
  const currentScenario = Array.isArray(scenario) ? scenario.find((s: any) => s.scenario_id === id) : null;

  return (
    <Fragment>
      <div className="bg-primary pt-10 pb-21"></div>
      <div className="container-fluid mt-n22 px-6">
        <Row>
          <Col lg={12} md={12} xs={12}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="mb-2 mb-lg-0">
                <h3 className="mb-0 text-white">Gestão do Cenário: {currentScenario?.name || "Carregando..."}</h3>
                <p className="text-white opacity-75 mb-0">{currentScenario?.description}</p>
              </div>
              <div>
                <Button variant="white" onClick={() => router.back()}>Voltar</Button>
              </div>
            </div>
          </Col>
        </Row>
        
        <Row>
          <Col md={4}>
            <Card className="shadow-sm border-0 mb-4">
              <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Dispositivos Vinculados</h5>
                <Button variant="outline-primary" size="sm" onClick={() => setShowDeviceModal(true)}>
                    <i className="fe fe-plus"></i>
                </Button>
              </Card.Header>
              <ListGroup variant="flush">
                {devicesLoaded && linkedDevices?.length ? (
                  linkedDevices.map((dev: any) => (
                    <ListGroup.Item key={dev.device_id} className="d-flex justify-content-between align-items-center">
                      <div>
                        <span className="fw-semibold d-block">{dev.name}</span>
                        <small className="text-muted">{dev.topic}</small>
                      </div>
                      <Button variant="link" size="sm" className="text-danger"><i className="fe fe-x"></i></Button>
                    </ListGroup.Item>
                  ))
                ) : (
                  <ListGroup.Item className="text-center py-4 text-muted">Nenhum dispositivo</ListGroup.Item>
                )}
              </ListGroup>
            </Card>
          </Col>

          <Col md={8}>
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Regras do Cenário</h5>
                <Button variant="primary" size="sm" onClick={() => router.push(`/dashboard/automation/rules/add?scenario_id=${id}`)}>
                    Nova Regra
                </Button>
              </Card.Header>
              <Table responsive className="mb-0">
                <thead>
                  <tr>
                    <th>Regra</th>
                    <th>Condição</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rulesLoaded && rules?.length ? (
                    rules.map((rule: any) => (
                      <tr key={rule.rule_id}>
                        <td className="align-middle fw-semibold">{rule.name}</td>
                        <td className="align-middle"><code>{rule.trigger_condition}</code></td>
                        <td className="align-middle">
                          <Badge bg={rule.is_active ? "success" : "secondary"}>
                            {rule.is_active ? "Ativa" : "Inativa"}
                          </Badge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={3} className="text-center py-4 text-muted">Nenhuma regra vinculada</td></tr>
                  )}
                </tbody>
              </Table>
            </Card>
          </Col>
        </Row>
      </div>

      <Modal show={showDeviceModal} onHide={() => setShowDeviceModal(false)}>
        <Modal.Header closeButton><Modal.Title>Vincular Dispositivo</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Selecione um Dispositivo</Form.Label>
            <Form.Select value={selectedDevice} onChange={(e) => setSelectedDevice(e.target.value)}>
              <option value="">Escolha...</option>
              {allDevices?.data?.map((d: any) => (
                <option key={d.device_id} value={d.device_id}>{d.device_name} ({d.mqtt_topic})</option>
              ))}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeviceModal(false)}>Cancelar</Button>
          <Button variant="primary" onClick={handleLinkDevice} disabled={!selectedDevice}>Vincular</Button>
        </Modal.Footer>
      </Modal>
    </Fragment>
  );
};

export default ScenarioDetails;
