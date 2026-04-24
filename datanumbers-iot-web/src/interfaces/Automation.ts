export interface Actuator {
    actuator_id?: string;
    device_id: string;
    name: string;
    command_topic: string;
    payload_schema?: any;
}

export interface Rule {
    rule_id?: string;
    tenant_id?: string;
    name: string;
    description: string;
    is_active: boolean;
    trigger_condition: string;
    actions?: RuleAction[];
}

export interface RuleAction {
    action_id?: string;
    rule_id: string;
    actuator_id: string;
    payload_template: string;
    command_topic?: string;
}
