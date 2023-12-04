#include <WiFi.h>
#define MQTT_MAX_PACKET_SIZE 512
#include <PubSubClient.h>
#include <Adafruit_Sensor.h>
#include "DHT.h"

#define DHTPIN 17
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// Wifi
const char *ssid = "CLARO_2GEB15A6";
const char *pass = "B8EB15A6";

// EMQX
const char *mqtt_broker = "192.168.0.29";
const char *topic = "topic/3cb23058-9be0-4d08-8cf9-6f0183acd7a2";
const int mqtt_port = 1883;
const char* mqtt_username = "diogoX451";

WiFiClient espClient;
PubSubClient client(espClient);

void setup()
{
    // Set software serial baud to 115200;
    Serial.begin(115200);
    
    // Initialize DHT sensor
    dht.begin();
    
    // Connecting to a WiFi network
    WiFi.begin(ssid, pass);
    while (WiFi.status() != WL_CONNECTED)
    {
        delay(500);
        Serial.println("Connecting to WiFi..");
    }
    Serial.println("Connected to the WiFi network");
    
    // Connecting to a mqtt broker
    client.setServer(mqtt_broker, mqtt_port);
    client.setCallback(callback);
    while (!client.connected())
    {
        String client_id = "hello";
        Serial.printf("The client %s connects to the public mqtt broker\n", client_id.c_str());
        if (client.connect(client_id.c_str(), mqtt_username, ""))
        {
            Serial.println("Public emqx mqtt broker connected");
        }
        else
        {
            Serial.print("failed with state ");
            Serial.print(client.state());
            delay(2000);
        }
    }
    Serial.print(client.state());
}

void callback(char *topic, byte *payload, unsigned int length)
{
    Serial.print("Message arrived in topic: ");
    Serial.println(topic);
    Serial.print("Message:");
    for (int i = 0; i < length; i++)
    {
        Serial.print((char)payload[i]);
    }
    Serial.println();
    Serial.println("-----------------------");
}

void loop()
{
    client.loop();

    float t = dht.readTemperature();
    float h = dht.readHumidity();
    
    if (isnan(t) || isnan(h))
    {
        Serial.println("Failed to read from DHT sensor!");
        delay(2000);
        return;
    }

    char msg[128];
    snprintf(msg, sizeof(msg), "{\"topic\": \"%s\", \"payload\": [{\"temperatura\": %.2f}, {\"umidade\": %.2f}]}", topic, t, h);

    if (client.connected() && client.publish(topic, msg))
    {
        Serial.println("Data published successfully");
    }
    
    delay(5000); 
}
