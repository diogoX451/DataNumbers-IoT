"use client";

import Link from "next/link";
import { Container, Row, Col, Button, Navbar, Nav, Card } from "react-bootstrap";
import { Activity, Shield, Cpu, ArrowRight } from "react-feather";
import Image from "next/image";

export default function LandingPage() {
  return (
    <div className="landing-page">
      {/* Navigation */}
      <Navbar expand="lg" className="navbar-landing">
        <Container>
          <Navbar.Brand href="/">
            <Image
              src="/images/brand/logo/logo.svg"
              alt="DataNumbers-IoT"
              width={150}
              height={40}
              priority
            />
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
            <Nav className="align-items-center">
              <Link href="/authentication/sign-in" className="nav-link me-3 fw-medium">
                Login
              </Link>
              <Link href="/authentication/sign-up">
                <Button variant="primary" className="px-4 shadow-sm">
                  Começar agora
                </Button>
              </Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      {/* Hero Section */}
      <section className="hero-section">
        <Container>
          <Row className="align-items-center">
            <Col lg={6} className="mb-5 mb-lg-0">
              <h1 className="hero-title">
                Monitore seus dispositivos <span>IoT</span> com precisão em tempo real.
              </h1>
              <p className="hero-subtitle">
                A plataforma completa para gerenciar dados de sensores, automatizar processos e visualizar insights inteligentes em um único lugar.
              </p>
              <div className="cta-buttons">
                <Link href="/authentication/sign-up">
                  <Button size="lg" variant="primary" className="px-5 py-3 shadow">
                    Criar conta gratuita <ArrowRight className="ms-2" size={20} />
                  </Button>
                </Link>
                <Link href="/authentication/sign-in">
                  <Button size="lg" variant="outline-primary" className="px-5 py-3">
                    Acessar painel
                  </Button>
                </Link>
              </div>
            </Col>
            <Col lg={6} className="text-center">
              <Image
                src="/images/avatar/iot.png"
                alt="IoT Illustration"
                width={500}
                height={500}
                className="img-fluid animate-up"
                priority
              />
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-10 bg-white">
        <Container>
          <Row className="justify-content-center mb-8">
            <Col lg={8} className="text-center">
              <h2 className="fw-bold mb-3">Tudo o que você precisa para seu ecossistema IoT</h2>
              <p className="text-muted fs-4">Tecnologia de ponta para análise e controle de dispositivos conectados.</p>
            </Col>
          </Row>
          <Row>
            <Col md={4} className="mb-4">
              <Card className="feature-card h-100">
                <div className="icon-shape">
                  <Activity size={24} />
                </div>
                <h3>Monitoramento 24/7</h3>
                <p className="text-muted mb-0">
                  Acompanhe seus sensores em tempo real com atualizações instantâneas e notificações de alerta.
                </p>
              </Card>
            </Col>
            <Col md={4} className="mb-4">
              <Card className="feature-card h-100">
                <div className="icon-shape">
                  <Shield size={24} />
                </div>
                <h3>Segurança Máxima</h3>
                <p className="text-muted mb-0">
                  Dados criptografados de ponta a ponta e controle de acesso rigoroso para seus dispositivos.
                </p>
              </Card>
            </Col>
            <Col md={4} className="mb-4">
              <Card className="feature-card h-100">
                <div className="icon-shape">
                  <Cpu size={24} />
                </div>
                <h3>Escalabilidade</h3>
                <p className="text-muted mb-0">
                  De um único dispositivo a milhares. Nossa infraestrutura cresce junto com o seu projeto.
                </p>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Footer */}
      <footer className="py-6 bg-light mt-auto">
        <Container>
          <Row className="align-items-center">
            <Col md={6} className="text-center text-md-start">
              <p className="mb-0 text-muted">&copy; {new Date().getFullYear()} DataNumbers-IoT. Todos os direitos reservados.</p>
            </Col>
            <Col md={6} className="text-center text-md-end mt-3 mt-md-0">
              <Link href="#" className="text-muted me-4 text-decoration-none">Termos</Link>
              <Link href="#" className="text-muted text-decoration-none">Privacidade</Link>
            </Col>
          </Row>
        </Container>
      </footer>
    </div>
  );
}
