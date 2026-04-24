"use client";

import { Row, Col, Card, Button, ListGroup, Badge } from "react-bootstrap";
import useGetAxios from "../../server/GetAxios";
import { Cpu, Layers, Activity, Zap, Map, Radio } from "react-feather";
import Link from "next/link";
import { Fragment } from "react";

const Home = () => {
  const { data: devicesData, loaded: devicesLoaded } = useGetAxios<any>("/api/devices/devices", true);
  const { data: templatesData } = useGetAxios<any>("/api/devices/templates", true);
  const { data: rulesData } = useGetAxios<any[]>("/api/rules/rules", true);
  const { data: scenariosData } = useGetAxios<any[]>("/api/rules/scenarios", true);

  const stats = [
    {
      title: "Dispositivos",
      value: devicesData?.data?.length || 0,
      icon: <Cpu size={20} />,
      variant: "primary",
    },
    {
      title: "Online",
      value: devicesData?.data?.filter((d: any) => d.device_status === 'ONLINE').length || 0,
      icon: <Radio size={20} />,
      variant: "success",
    },
    {
      title: "Cenários",
      value: scenariosData?.length || 0,
      icon: <Map size={20} />,
      variant: "info",
    },
    {
      title: "Regras Ativas",
      value: rulesData?.filter((r: any) => r.is_active).length || 0,
      icon: <Zap size={20} />,
      variant: "warning",
    }
  ];

  return (
    <Fragment>
      <div className="bg-primary pt-10 pb-21"></div>
      <div className="container-fluid mt-n22 px-6">
        <Row>
          <Col lg={12} md={12} xs={12}>
            <div className="d-flex justify-content-between align-items-center mb-5">
              <div className="mb-2 mb-lg-0">
                <h2 className="text-white mb-0 fw-bold">Visão Geral do Ecossistema</h2>
                <p className="text-white opacity-75 mb-0">Gerencie e monitore sua infraestrutura IoT em tempo real.</p>
              </div>
              <div>
                <Link href="/dashboard/devices/add" className="btn btn-white text-primary fw-bold">
                  Novo Dispositivo
                </Link>
              </div>
            </div>
          </Col>
        </Row>

        <Row>
          {stats.map((item, index) => (
            <Col xl={3} lg={6} md={12} xs={12} key={index} className="mb-4">
              <Card className="border-0 shadow-sm animate-fade-in-up">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h4 className="mb-0 text-muted fw-semi-bold">{item.title}</h4>
                    </div>
                    <div className={`icon-shape icon-md bg-light-${item.variant} text-${item.variant} rounded-3`}>
                      {item.icon}
                    </div>
                  </div>
                  <div>
                    <h1 className="fw-bold mb-1">{item.value}</h1>
                    <Badge bg={`light-${item.variant}`} className={`text-${item.variant}`}>
                       Ativo na rede
                    </Badge>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        <Row className="mt-2">
          <Col xl={8} lg={12} md={12} xs={12} className="mb-4">
            <Card className="h-100 border-0 shadow-sm">
              <Card.Header className="bg-white py-4 d-flex justify-content-between align-items-center">
                <h4 className="mb-0 fw-bold">Fluxo de Dados Recente</h4>
                <Link href="/dashboard/monitoring" className="btn btn-outline-primary btn-sm">Ver Live Stream</Link>
              </Card.Header>
              <Card.Body className="d-flex flex-column justify-content-center align-items-center py-10">
                 <div className="icon-shape icon-xl bg-light-soft text-primary rounded-circle mb-4">
                    <Activity size={40} className="animate-pulse" />
                 </div>
                 <h5 className="text-muted">Aguardando telemetrias...</h5>
                 <p className="text-muted small">Os dados aparecerão aqui assim que seus dispositivos publicarem.</p>
              </Card.Body>
            </Card>
          </Col>
          
          <Col xl={4} lg={12} md={12} xs={12} className="mb-4">
             <Card className="h-100 border-0 shadow-sm">
                <Card.Header className="bg-white py-4">
                   <h4 className="mb-0 fw-bold">Dispositivos Críticos</h4>
                </Card.Header>
                <ListGroup variant="flush">
                   {devicesLoaded && devicesData?.data?.slice(0, 6).map((device: any, index: number) => (
                      <ListGroup.Item key={index} className="px-4 py-3">
                         <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center">
                               <div className={`icon-shape icon-sm ${device.device_status === 'ONLINE' ? 'bg-light-success text-success' : 'bg-light-secondary text-secondary'} rounded me-3`}>
                                  <Cpu size={14} />
                               </div>
                               <div>
                                  <h5 className="mb-0 fw-bold">{device.device_name}</h5>
                                  <small className="text-muted">{device.device_id}</small>
                               </div>
                            </div>
                            <div>
                               <Badge bg={device.device_status === 'ONLINE' ? "success" : "light"} className={device.device_status === 'ONLINE' ? "" : "text-secondary border"}>
                                  {device.device_status}
                               </Badge>
                            </div>
                         </div>
                      </ListGroup.Item>
                   ))}
                   {(!devicesData?.data || devicesData.data.length === 0) && (
                      <div className="text-center py-10 text-muted">Nenhum dispositivo encontrado</div>
                   )}
                </ListGroup>
                <Card.Footer className="bg-white text-center border-0">
                   <Link href="/dashboard/devices" className="btn btn-link btn-sm text-primary fw-bold">Ver todos os dispositivos</Link>
                </Card.Footer>
             </Card>
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

export default Home;
