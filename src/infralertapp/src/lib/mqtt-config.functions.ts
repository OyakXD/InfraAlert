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
    host: "",
    port: "",
    path: "",
    topic: "",
    username: "",
    password: "",
  };
});
