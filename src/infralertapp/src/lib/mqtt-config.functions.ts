import { createServerFn } from "@tanstack/react-start";

export type PublicMqttConfig = {
  host: string;
  port: string;
  path: string;
  topic: string;
  username?: string;
  password?: string;
};

export const getMqttConfig = createServerFn({ method: "GET" }).handler(async (): Promise<PublicMqttConfig> => {
  return {
    host: "a84c5bcb1296499392aca7ece8acf090.s1.eu.hivemq.cloud",
    port: "8884",
    path: "/mqtt",
    topic: "infralert/alertas",
    username: "infralertapp",
    password: "Infralert1234",
  };
});
