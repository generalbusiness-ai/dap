/** Node/container adapter entry. The platform-neutral entry imports no engine or filesystem owner. */
export { containerRunner } from "./container.ts";
export type { ContainerRunnerOptions, ContainerRunnerOrigin } from "./container.ts";
export { gatewayOrigin } from "./container-origin.ts";
