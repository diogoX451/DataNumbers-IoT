"use client";

import { Row, Col, Card, Form, Button, Image } from "react-bootstrap";
import Link from "next/link";
import useMounted from "../../../../hooks/useMounted";
import useAxios from "axios-hooks";
import { cookies } from "next/dist/client/components/headers";
import { setCookie } from "nookies";

interface SignInProps {
  email: string;
  password: string;
}

interface Response {
  token: string;
}

const SignIn = () => {
  const [{ data, loading, error }, execute] = useAxios(
    {
      baseURL: "http://localhost:3000",
      url: "/auth/login",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    },
    { manual: true }
  );

  const handleConfirm = async (event) => {
    event.preventDefault();
    const target = event.target as typeof event.target & SignInProps;
    const email = target.username.value;
    const password = target.password.value;
    await Save(email, password);
  };

  const Save = async (email: string, pass: string) => {
    try {
      const response = await execute({
        data: {
          email: email,
          password: pass,
        },
      });
      if (response.status === 200) {
        const { token } = response.data.data as Response;
        setCookie(null, "@data-token", token, {
          maxAge: 30 * 24 * 60 * 60,
          path: "/",
        });
        window.location.href = "/dashboard";
      }
    } catch (error) {
      console.log(error);
    }
  };

  const hasMounted = useMounted();

  return (
    <Row className="align-items-center justify-content-center g-0 min-vh-100">
      <Col xxl={4} lg={6} md={8} xs={12} className="py-8 py-xl-0">
        <Card className="smooth-shadow-md">
          <Card.Body className="p-6">
            <div className="md-4">
              <Image
                src="/images/avatar/logo-iot.png"
                className="mb-2 img-fluid d-flex align-items-center justify-content-center mx-auto"
                alt="Logo With Iot"
                width={75}
                height={75}
              />
              <p className="text-center fs-4 fw-bold">DataNumbERS-IOT</p>
            </div>
            {hasMounted && (
              <Form onSubmit={handleConfirm}>
                <Form.Group className="mb-3" controlId="username">
                  <Form.Label>E-mail</Form.Label>
                  <Form.Control
                    type="email"
                    name="username"
                    placeholder="Coloque seu e-mail aqui"
                    required={true}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="password">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    placeholder="**************"
                    required={true}
                  />
                </Form.Group>

                <div className="d-lg-flex justify-content-between align-items-center mb-4">
                  <Form.Check type="checkbox" id="rememberme">
                    <Form.Check.Input type="checkbox" />
                    <Form.Check.Label>Lembre de mim</Form.Check.Label>
                  </Form.Check>
                </div>

                <div>
                  <div className="d-grid">
                    <Button variant="primary" type="submit">
                      Acesse Aqui
                    </Button>
                  </div>
                  <div className="d-md-flex justify-content-between mt-4">
                    <div className="mb-2 mb-md-0">
                      <Link href="/authentication/sign-up" className="fs-5">
                        Crie sua conta agora !!
                      </Link>
                    </div>
                    <div>
                      <Link
                        href="/authentication/forget-password"
                        className="text-inherit fs-5"
                      >
                        Esqueceu sua senha?
                      </Link>
                    </div>
                  </div>
                </div>
              </Form>
            )}
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default SignIn;
