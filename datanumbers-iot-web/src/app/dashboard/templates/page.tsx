"use client";

import { Row, Col, Card, Table, Button, Badge } from "react-bootstrap";
import useGetAxios from "../../../server/GetAxios";
import Link from "next/link";
import { Fragment } from "react";

const TemplatesList = () => {
  const { data, error, loaded } = useGetAxios<any>("/api/devices/templates", true);

  return (
    <Fragment>
      <div className="bg-primary pt-10 pb-21"></div>
      <div className="container-fluid mt-n22 px-6">
        <Row>
          <Col lg={12} md={12} xs={12}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="mb-2 mb-lg-0">
                <h3 className="mb-0  text-white">Templates de Dispositivos</h3>
              </div>
              <div>
                <Link href="/dashboard/templates/add" className="btn btn-white">
                  Novo Template
                </Link>
              </div>
            </div>
          </Col>
        </Row>
        <Row>
          <Col md={12} xs={12}>
            <Card className="shadow-sm border-0 animate-fade-in-up">
              <Card.Header className="bg-white py-4 border-bottom-0">
                <h4 className="mb-0 fw-bold">Todos os Templates</h4>
              </Card.Header>
              <Table responsive className="text-nowrap mb-0 table-custom">
                <thead>
                  <tr>
                    <th>Nome do Template</th>
                    <th>Descrição</th>
                    <th>Sensores Configurados</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loaded && data?.data ? (
                    data.data.map((template: any, index: number) => (
                      <tr key={index}>
                        <td className="align-middle">
                          <div className="d-flex align-items-center">
                            <div className="icon-shape icon-sm bg-light-primary text-primary rounded me-3">
                              <i className="fe fe-layers"></i>
                            </div>
                            <span className="fw-semibold text-dark">{template.name}</span>
                          </div>
                        </td>
                        <td className="align-middle text-muted">{template.description}</td>
                        <td className="align-middle">
                          {template.fields?.map((field: any, idx: number) => (
                            <Badge bg="light" className="text-primary border border-light-primary me-1 px-2 py-1" key={idx}>
                              {field.name}
                            </Badge>
                          ))}
                        </td>
                        <td className="align-middle text-end">
                            <Button variant="light" size="sm" className="me-2 text-primary">
                              <i className="fe fe-edit-2"></i>
                            </Button>
                            <Button variant="light" size="sm" className="text-danger">
                              <i className="fe fe-trash-2"></i>
                            </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-5">
                        {loaded ? (
                          <div className="text-muted">
                            <i className="fe fe-database mb-2 fs-2 d-block"></i>
                            Nenhum template encontrado
                          </div>
                        ) : "Carregando..."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </Card>
          </Col>
        </Row>
      </div>
    </Fragment>
  );
};

export default TemplatesList;
