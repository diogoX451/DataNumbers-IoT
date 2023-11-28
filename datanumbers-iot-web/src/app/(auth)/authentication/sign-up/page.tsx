"use client";

import React, { useEffect, useState } from "react";
import { Row, Col, Card, Form, Button, Image, Modal } from "react-bootstrap";
import Link from "next/link";
import useMounted from "../../../../hooks/useMounted";
import useAxios from "axios-hooks";

interface UserProps {
  name: string;
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
}

interface MessageProps {
  show: boolean;
  message: string;
  type: "danger" | "success" | "warning" | "info";
}

interface ModalProps {
  open: boolean;
  message: string;
  type: "danger" | "success" | "warning" | "info";
  title: string;
  button?: () => void;
}

const SignUp = () => {
  const hasMounted = useMounted();

  const [{ data, loading, error }, execute] = useAxios({
    baseURL: "http://localhost:3000",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });

  const [showMensage, setShowMensage] = useState<MessageProps>({
    show: false,
    message: "",
    type: "success",
  });

  const [showModal, setShowModal] = useState<ModalProps>({
    open: false,
    message: "",
    type: "success",
    title: "",
  });

  const handleCheckUsername = async (event) => {
    event.preventDefault();
    const username = event.target.value;
    if (username === "") return;
    try {
      const response = await execute({
        url: "/auth/check-username",
        data: {
          username: username,
        },
      });

      if (response.status === 200 && response.data.data) {
        setShowMensage({
          show: true,
          message: "Este nome de usuário já existe",
          type: "danger",
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");

  const handleConfirm = async (event) => {
    event.preventDefault();
    const target = event.target as typeof event.target & UserProps;
    const name = target.name.value;
    const email = target.email.value;
    const username = target.username.value;
    const password = target.password.value;

    await Save(name, email, username, password);
  };

  const Save = async (
    name: string,
    email: string,
    username: string,
    password: string
  ) => {
    try {
      const response = await execute({
        url: "/auth/register-user",
        data: {
          name: name,
          email: email,
          username: username,
          password: password,
        },
      });

      if (response.status === 200) {
        setShowModal({
          open: true,
          message: "Usuário cadastrado com sucesso",
          type: "success",
          title: "Sucesso",
          button: () => {
            window.location.href = "/authentication/sign-in";
          },
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (password !== confirmPassword) {
      setShowMensage({
        show: true,
        message: "As senhas não conferem",
        type: "danger",
      });
    } else {
      setShowMensage({
        show: false,
        message: "",
        type: "success",
      });
    }
  }, [password, confirmPassword]);

  return (
    <Row className="align-items-center justify-content-center g-0 min-vh-100">
      <Col xxl={4} lg={6} md={8} xs={12} className="py-8 py-xl-0">
        <Card className="smooth-shadow-md">
          <Card.Body className="p-6">
            <div className="mb-4">
              <Image
                src="/images/avatar/logo-iot.png"
                className="mb-2 img-fluid d-flex align-items-center justify-content-center mx-auto"
                alt="Logo"
                width={75}
                height={75}
              />
              <p className="text-center fs-4 fw-bold">DataNumbERS-IOT</p>
            </div>
            {hasMounted && (
              <Form onSubmit={handleConfirm}>
                <Form.Group className="mb-3" controlId="name">
                  <Form.Label>Nome Completo</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    placeholder="Coloque seu nome completo aqui"
                    required={true}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="email">
                  <Form.Label>E-mail</Form.Label>
                  <Form.Control
                    type="text"
                    name="email"
                    placeholder="Coloque seu e-mail aqui"
                    required={true}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="username">
                  <Form.Label>Username</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    placeholder="Coloque um nome de usuário aqui"
                    required={true}
                    onBlur={handleCheckUsername}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="password">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    placeholder="**************"
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Form.Group>

                <Form.Group className="mb-3" controlId="confirm-password">
                  <Form.Label>Confirmar a Senha</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    placeholder="**************"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </Form.Group>

                <div className="mb-3">
                  <Form.Check type="checkbox" id="check-api-checkbox">
                    <Form.Check.Input type="checkbox" />
                    <Form.Check.Label>
                      Eu concordo com <Link href="#"> Termos </Link> e{" "}
                      <Link href="#"> Privacidade Política.</Link>
                    </Form.Check.Label>
                  </Form.Check>
                </div>

                <div>
                  <div className="d-grid">
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={showMensage.show}
                    >
                      Criar Conta
                    </Button>
                  </div>
                  <div className="d-md-flex justify-content-between mt-4">
                    <div className="mb-2 mb-md-0">
                      <Link href="/authentication/sign-in" className="fs-5">
                        Já é um usuário? Login{" "}
                      </Link>
                    </div>
                    <div>
                      <Link
                        href="/authentication/forget-password"
                        className="text-inherit fs-5"
                      >
                        Esqueceu a senha?
                      </Link>
                    </div>
                  </div>
                </div>
              </Form>
            )}
            {showModal.open && (
              <>
                <Modal
                  show={showModal.open}
                  onHide={() => setShowModal({ ...showModal, open: false })}
                >
                  <Modal.Header closeButton>
                    <Modal.Title>{showModal.title}</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>{showModal.message}</Modal.Body>
                  <Modal.Footer>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        showModal.button
                          ? showModal.button()
                          : setShowModal({ ...showModal, open: false })
                      }
                    >
                      Fechar
                    </Button>
                  </Modal.Footer>
                </Modal>
              </>
            )}
            {
              <div
                className={
                  showMensage.show
                    ? "alert alert-danger mt-4"
                    : "alert alert-danger mt-4 d-none"
                }
                role="alert"
              >
                {showMensage.message}
              </div>
            }
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default SignUp;
