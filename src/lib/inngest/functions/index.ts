import { adWorkflow } from "./adWorkflow";
import { helloFunction } from "./hello";
import { translateWorkflow } from "./translateWorkflow";

/** Every function the app registers with Inngest. Add new workflows here. */
export const functions = [helloFunction, adWorkflow, translateWorkflow];
