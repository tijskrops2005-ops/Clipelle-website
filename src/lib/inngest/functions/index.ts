import { adWorkflow } from "./adWorkflow";
import { helloFunction } from "./hello";

/** Every function the app registers with Inngest. Add new workflows here. */
export const functions = [helloFunction, adWorkflow];
