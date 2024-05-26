"user-client";

import { Fragment } from "react";
import { Col, Container, Image, Row } from "react-bootstrap";
import Link from "next/link";
import useMounted from "../hooks/useMounted";

const NotFound = () => {
  return (
    <Fragment>
      <Container>
        <Row>
          <Col sm={12}>
            <div className="text-center">
              <div className="mb-3">
                <Image
                  src="/images/error/404-error-img.png"
                  alt="Not-Found"
                  className="img-fluid"
                />
              </div>
              <h1 className="display-4 fw-bold">
                Oops! Acredito que essa pagina não existe!
              </h1>
              <p className="mb-4">
                Vamos voltar para a pagina inicial e tentar novamente?
              </p>
              <Link href="/" className="btn btn-primary">
                Go Dashboard
              </Link>
            </div>
          </Col>
        </Row>
      </Container>
    </Fragment>
  );
};

export default NotFound;
