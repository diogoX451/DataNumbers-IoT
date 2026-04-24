"use client";

import { Row, Col, Card, Table, Badge } from "react-bootstrap";
import { useState, useEffect, Fragment } from "react";

const LiveMonitoring = () => {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8080/api/stream";
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setMessages((prev) => [data, ...prev].slice(0, 50)); 
      } catch (err) {
        console.error("Erro ao parsear mensagem WS:", err);
      }
    };

    return () => socket.close();
  }, []);

  return (
    <Fragment>
      <div className="bg-primary pt-10 pb-21"></div>
      <div className="container-fluid mt-n22 px-6">
        <Row>
          <Col lg={12} md={12} xs={12}>
            <div className="mb-4">
              <h2 className="text-white mb-0 fw-bold">Live Stream de Dados</h2>
              <p className="text-white opacity-75">Fluxo contínuo de telemetrias capturadas em tempo real.</p>
            </div>
          </Col>
        </Row>
        <Row>
          <Col md={12}>
            <Card className="shadow-sm border-0 animate-fade-in-up">
              <Card.Header className="bg-white py-4">
                <h4 className="mb-0 fw-bold">Console de Eventos</h4>
              </Card.Header>
              <div className="table-responsive">
                <Table className="text-nowrap mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="border-0">Horário</th>
                      <th className="border-0">Dispositivo</th>
                      <th className="border-0">Tópico</th>
                      <th className="border-0">Payload de Dados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.length > 0 ? (
                      messages.map((msg, index) => (
                        <tr key={index} className="animate-fade-in">
                          <td className="align-middle">
                            <div className="d-flex align-items-center">
                               <i className="fe fe-clock me-2 text-muted"></i>
                               <span className="text-muted small">{new Date(msg.timestamp || new Date()).toLocaleTimeString()}</span>
                            </div>
                          </td>
                          <td className="align-middle">
                            <Badge bg="light-primary" className="text-primary fw-bold">
                               {msg.device_id?.substring(0, 8)}...
                            </Badge>
                          </td>
                          <td className="align-middle">
                            <code className="text-info small">{msg.topic}</code>
                          </td>
                          <td className="align-middle">
                            <div className="bg-light p-2 rounded border-start border-primary border-4">
                               <pre className="mb-0 text-dark" style={{ fontSize: '0.8rem', fontWeight: '500' }}>
                                 {JSON.stringify(msg.payload, null, 2)}
                               </pre>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-10">
                          <div className="spinner-border text-primary spinner-border-sm me-3" role="status"></div>
                          <span className="text-muted fw-bold uppercase tracking-widest small">Escaneando rede em busca de pacotes...</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

export default LiveMonitoring;
