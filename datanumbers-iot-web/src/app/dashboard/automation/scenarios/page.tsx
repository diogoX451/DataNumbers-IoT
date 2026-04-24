"use client";

import { Row, Col, Card, Table, Button, Badge, Modal, Form } from "react-bootstrap";
import useGetAxios from "../../../../server/GetAxios";
import Link from "next/link";
import { useState, Fragment } from "react";
import axios from "axios";
import cookieCutter from 'cookie-cutter';

const ScenariosList = () => {
  const { data, loaded, reload } = useGetAxios<any[]>("/api/rules/scenarios", true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleAddScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = cookieCutter.get('@data-token');
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/api/rules/scenarios`,
        { name, description },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShowModal(false);
      setName("");
      setDescription("");
      // @ts-ignore
      reload();
    } catch (error) {
      console.error("Erro ao criar cenário:", error);
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
                <h3 className="mb-0 text-white">Cenários (Edge-Cases)</h3>
                <p className="text-white opacity-75 mb-0">Agrupe seus dispositivos por ambiente ou contexto</p>
              </div>
              <div>
                <Button variant="white" onClick={() => setShowModal(true)}>
                  Novo Cenário
                </Button>
              </div>
            </div>
          </Col>
        </Row>
        <Row>
          <Col md={12} xs={12}>
            <Card className="shadow-sm border-0 animate-fade-in-up">
              <Table responsive className="text-nowrap mb-0 table-custom">
                <thead>
                  <tr>
                    <th>Cenário</th>
                    <th>Descrição</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loaded && data ? (
                    data.map((scenario: any, index: number) => (
                      <tr key={index}>
                        <td className="align-middle">
                          <div className="d-flex align-items-center">
                            <div className="icon-shape icon-sm bg-light-primary text-primary rounded me-3">
                              <i className="fe fe-map"></i>
                            </div>
                            <span className="fw-semibold text-dark">{scenario.name}</span>
                          </div>
                        </td>
                        <td className="align-middle text-muted text-truncate" style={{ maxWidth: '300px' }}>
                          {scenario.description || "Sem descrição"}
                        </td>
                        <td className="align-middle text-end">
                          <Link href={`/dashboard/automation/scenarios/${scenario.scenario_id}`} className="btn btn-primary btn-sm me-2">
                            Gerenciar
                          </Link>
                          <Button variant="light" size="sm" className="text-danger">
                            <i className="fe fe-trash-2"></i>
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="text-center py-5">
                        {loaded ? "Nenhum cenário cadastrado" : "Carregando..."}
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
          <Modal.Title>Criar Novo Cenário</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddScenario}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome do Cenário</Form.Label>
              <Form.Control type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Quarto Principal" required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Descrição</Form.Label>
              <Form.Control as="textarea" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>Cancelar</Button>
            <Button variant="primary" type="submit">Criar Cenário</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Fragment>
  );
};

export default ScenariosList;
