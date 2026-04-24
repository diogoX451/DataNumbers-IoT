"use client";

import { Row, Col, Card, Table, Button, Badge } from "react-bootstrap";
import useGetAxios from "../../../../server/GetAxios";
import Link from "next/link";
import { Fragment } from "react";
import { Rule } from "@/interfaces/Automation";

const RulesList = () => {
  const { data, loaded } = useGetAxios<Rule[]>("/api/rules/rules", true);

  return (
    <Fragment>
      <div className="bg-primary pt-10 pb-21"></div>
      <div className="container-fluid mt-n22 px-6">
        <Row>
          <Col lg={12} md={12} xs={12}>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="mb-2 mb-lg-0">
                <h3 className="mb-0 text-white">Regras de Automação</h3>
              </div>
              <div>
                <Link href="/dashboard/automation/rules/add" className="btn btn-white">
                  Nova Regra
                </Link>
              </div>
            </div>
          </Col>
        </Row>
        <Row>
          <Col md={12} xs={12}>
            <Card className="shadow-sm border-0 animate-fade-in-up">
              <Card.Header className="bg-white py-4 border-bottom-0">
                <h4 className="mb-0 fw-bold">Todas as Regras</h4>
              </Card.Header>
              <Table responsive className="text-nowrap mb-0 table-custom">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Condição</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loaded && data ? (
                    data.map((rule: Rule, index: number) => (
                      <tr key={index}>
                        <td className="align-middle">
                          <div className="d-flex align-items-center">
                            <div className="icon-shape icon-sm bg-light-info text-info rounded me-3">
                              <i className="fe fe-zap"></i>
                            </div>
                            <div>
                                <span className="fw-semibold text-dark d-block">{rule.name}</span>
                                <small className="text-muted">{rule.description}</small>
                            </div>
                          </div>
                        </td>
                        <td className="align-middle">
                          <code className="text-primary bg-light px-2 py-1 rounded">{rule.trigger_condition}</code>
                        </td>
                        <td className="align-middle">
                          <Badge bg={rule.is_active ? "success" : "secondary"}>
                            {rule.is_active ? "Ativa" : "Inativa"}
                          </Badge>
                        </td>
                        <td className="align-middle text-end">
                          <Link href={`/dashboard/automation/rules/edit/${rule.rule_id}`} className="btn btn-light btn-sm me-2">
                            Editar
                          </Link>
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
                            <i className="fe fe-activity mb-2 fs-2 d-block"></i>
                            Nenhuma regra cadastrada
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

export default RulesList;
