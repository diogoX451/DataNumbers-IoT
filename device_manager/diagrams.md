casos de uso:

1-
@startuml
left to right direction
actor "Usuário" as user
package "Sistema de Gerenciamento de Dispositivos" {
    usecase "Registrar Novo Dispositivo" as UC1
    usecase "Editar Configuração do Dispositivo" as UC2
    usecase "Visualizar Dispositivos Registrados" as UC3
    usecase "Remover Dispositivo" as UC4
}

user --> UC1
user --> UC2
user --> UC3
user --> UC4
@enduml



2- 
@startuml
left to right direction
actor "Usuário" as user
package "Sistema de Gerenciamento de Templates" {
    usecase "Registrar Novo Template" as UC1
    usecase "Editar Template" as UC2
    usecase "Deletar Template" as UC3
    usecase "Adicionar Field ao Template" as UC4
    usecase "Editar Field do Template" as UC5
    usecase "Remover Field do Template" as UC6
}

user --> UC1
user --> UC2
user --> UC3
user --> UC4
user --> UC5
user --> UC6
@enduml

3-
@startuml
left to right direction
actor "Usuário" as user
actor "Sensor" as sensor

package "Sistema de Monitoramento em Tempo Real" {
    usecase "Enviar Dados do Sensor" as UC1
    usecase "Visualizar Dados em Tempo Real" as UC2
}

sensor --> UC1 : Envio de dados
user --> UC2 : Visualização de dados
@enduml

4- 
@startuml
left to right direction
actor "Usuário" as user
actor "Sensor" as sensor

package "Sistema de Recuperação de Dados Armazenados" {
    usecase "Enviar Dados para Armazenamento" as UC1
    usecase "Acessar API de Dados" as UC2
    usecase "Armazenar dados" as UC3
}

sensor --> UC1 : Envio de dados
UC1 --> UC2 : Armazena e disponibiliza dados
user --> UC2 : Solicita dados
UC2 --> UC3 : Disponibiliza dados
@enduml


5-@startuml
left to right direction
actor "Usuário" as user

package "Sistema de Gestão de Usuários" {
    usecase "Cadastrar" as UC1
    usecase "Editar Perfil" as UC2
    usecase "Deletar conta" as UC3
}

user --> UC1
user --> UC2
user --> UC3
@enduml



diagrama de classes:

1-
@startuml
class Device {
    - Long id
    - String name
    - DeviceStatus status
    - Template template
    + getters/setters
}

class Template {
    - Long id
    - String name
    - String description
    - List<TemplateField> fields
    + getters/setters
}

class TemplateField {
    - Long id
    - String name
    - FieldType type
    - Template template
    + getters/setters
}

Device --> "1" Template : uses >
Template --> "*" TemplateField : contains >
@enduml