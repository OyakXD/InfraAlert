/*

CODIGO AJUSTADO PARA ARDUINO.

*/
#define LED 2
#define NOTIFICACAO 3
#define Pindataout 1

int P = 0;

typedef enum {
	ESPERA,
    ALARME,
    ALARME_ESPERA
} Estado;
	
void setup()
{
  pinMode(LED, OUTPUT);
  pinMode(NOTIFICACAO, OUTPUT);
  pinMode(Pindataout, INPUT);
}

void loop()
{
  P = digitalRead(Pindataout);
  verificarEstado(P);
}

void verificarEstado(int P){
	static Estado estado_atual = ESPERA;
  	
    switch (estado_atual)
    {
    case ESPERA:
        if (P == 0) estado_atual = ESPERA;
        else if(P == 1) estado_atual = ALARME;
        break;
    case ALARME:
        if (P == 0) estado_atual = ESPERA;
        else if (P == 1) estado_atual = ALARME_ESPERA;
        break;
    case ALARME_ESPERA:
        if (P == 0) estado_atual = ESPERA;
        else if (P == 1) estado_atual = ALARME_ESPERA;
        break;
    }
  
  if (estado_atual == ESPERA){
  	digitalWrite(LED,LOW);
  } else if(estado_atual == ALARME){
  	// codigo principal deve ter uma lógica para notificação
    delay(500);
  } else {
  	digitalWrite(LED, HIGH);
  }

  
}
