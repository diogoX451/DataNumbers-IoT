'use client'

// import node module libraries
import { Row, Col, Card, Form, Button, Image } from 'react-bootstrap';
import Link from 'next/link';
import useMounted from '@/hooks/useMounted';

// import hooks

const ForgetPassword = () => {
  const hasMounted = useMounted();
  return (
    <Row className="align-items-center justify-content-center g-0 min-vh-100">
      <Col xxl={4} lg={6} md={8} xs={12} className="py-8 py-xl-0">
        {/* Card */}
        <Card className="smooth-shadow-md">
          {/* Card body */}
          <Card.Body className="p-6">
            <div className="mb-4">
              <Link href="/"><Image src="/images/brand/logo/logo-primary.svg" className="mb-2" alt="" /></Link>
              <p className="mb-6">Insira um email para redefinir sua senha.</p>
            </div>
            {/* Form */}
            <Form>
              {/* Email */}
              <Form.Group className="mb-3" controlId="email">
                <Form.Label>Email</Form.Label>
                <Form.Control type="email" name="email" placeholder="Enter Your Email" />
              </Form.Group>
              {/* Button */}
              <div className="mb-3 d-grid">
                <Button variant="primary" type="submit">Redefina sua senha</Button>
              </div>
              <span>Possui uma conta? <Link href="/authentication/sign-in">Entrar</Link></span>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  )
}

export default ForgetPassword