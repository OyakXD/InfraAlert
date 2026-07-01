#include <WiFiScan.h>
#include <WiFiServer.h>
#include <WiFiMulti.h>
#include <WiFiClient.h>
#include <WiFiAP.h>
#include <WiFiUdp.h>
#include <WiFiSTA.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WiFiType.h>
#include <WiFiGeneric.h>

#include <PubSubClient.h>
#define DATA_IN_PIN 15 
bool estadoAnterior = LOW;

/* Variáveis necessárias para configuração do WIFI e do broker MQTT */
const char* ssid = "";
const char* password = "";
const char* mqtt_server = "";
const char* topic = ""; /* Tópico do MQTT */
/* -------------------------------------------------------------------*/


WiFiClientSecure espClient;
PubSubClient client(espClient);

/* Função responsável por reconectar o cliente, caso haja erros, a função vai apontar o que há de errado */
void reconnect()
{
  while(!client.connected()){
      if(client.connect("ESP32_Client", "meu_cliente", "meu_client_senha")) {
          Serial.println("Conectado!");
        } else {
          Serial.println("Falhou, rc=");
          Serial.print(client.state());
          Serial.println(" Tentando novamente em 5 segundos");
          delay(5000);
      }
    }
}

/* ---------------------------------------------------*/


/* Função responsável pelas configurações de WIFI da ESP32*/
void setup_wifi()
{
  Serial.println("\n --- Established connection --- ");
  Serial.print("SSID: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while(WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }

  WiFi.setSleep(false);

  Serial.println("\nWifi Connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());

  espClient.setInsecure();
}
/* ---------------------------------------------------*/

void setup() 
{
  Serial.begin(115200);
  pinMode(DATA_IN_PIN, INPUT_PULLDOWN);
  setup_wifi();
  client.setServer(mqtt_server, 8883);
  client.setBufferSize(512);
}


void loop() {

  if(!client.connected())
  {
    reconnect();  
  }
  
  client.loop();
  bool estadoAtual = digitalRead(DATA_IN_PIN);

  if (estadoAtual == HIGH && estadoAnterior == LOW)
  {
    client.publish(topic, "Presença detectada!");  
  }

  estadoAnterior = estadoAtual;
}