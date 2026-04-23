# Projeto Data Numbers IoT

## Descrição
Este repositório contém o código-fonte e a documentação para a construção de uma plataforma IoT inovadora, onde todo o processamento e acesso de dados ocorrem de forma centralizada. A plataforma utiliza gateways para protocolos MQTT, sendo o EMQX o escolhido para essa função. Além disso, incorpora o Pulsa como broker de fila, encarregado de capturar dados, enquanto diversos microserviços aguardam para processá-los.

## Funcionalidades Principais
- Integração de gateways MQTT utilizando EMQX para a comunicação eficiente entre dispositivos IoT e a plataforma.
- Utilização do Pulsa como broker de fila para gerenciar e distribuir dados de forma escalável e confiável.
- Arquitetura de microserviços para processamento modular e distribuído de dados.

## Tecnologias Utilizadas
- [EMQX](https://www.emqx.io/): Gateway MQTT para comunicação eficiente entre dispositivos.
- [Pulsa](https://github.com/sebymiano/pulsar): Broker de fila para gerenciamento de mensagens e distribuição assíncrona.
- [Golang](https://go.dev/)
- [Spring Boot](https://spring.io/projects/spring-boot)

## Status do Projeto
Este projeto está em desenvolvimento ativo. Novas funcionalidades, melhorias e correções estão sendo implementadas regularmente. Fique atento para atualizações futuras.

## Contato para contribuição
Para sugestões, dúvidas ou problemas relacionados ao projeto, entre em contato através do email diogosgn@gmail.com e huakson@gmail.com.

---
**Nota:** Este projeto está em constante evolução. Fique à vontade para contribuir, reportar problemas ou sugerir melhorias. Obrigado por fazer parte do desenvolvimento desta plataforma IoT!
